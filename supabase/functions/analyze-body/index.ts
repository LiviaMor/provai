import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkAndIncrementQuota, quotaExceededResponse } from "../_shared/quota.ts";
import { buildCacheKey, getCachedResult, setCachedResult } from "../_shared/cache.ts";
import { callGemini } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const requireAuth = async (req: Request): Promise<Response | null> => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data, error } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (error || !data?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  return null;
};

const BLOCKED_HOSTS = new Set(["localhost", "0.0.0.0", "::", "::1"]);
const BLOCKED_PREFIXES = ["127.", "10.", "192.168.", "169.254.", "0."];
const isBlockedHost = (hostRaw: string): boolean => {
  const host = hostRaw.toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTS.has(host)) return true;
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (BLOCKED_PREFIXES.some((p) => host.startsWith(p))) return true;
  const m = host.match(/^172\.(\d+)\./);
  if (m && +m[1] >= 16 && +m[1] <= 31) return true;
  if (host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) return true;
  return false;
};

type BodyPayload = {
  imageDataUrl?: string;
  sideImageDataUrl?: string;
  heightCm?: number;
  weightKg?: number;
  age?: number;
  gender?: string;
  shoppingGoal?: string;
  productUrl?: string;
  manualMeasurements?: Record<string, number>;
  bioimpedance?: Record<string, number | string | undefined>;
  scaleCalibration?: {
    front?: { px_per_cm: number; marker_label?: string; confidence?: number | null };
    side?: { px_per_cm: number; marker_label?: string; confidence?: number | null };
  };
};

const isFiniteNumber = (value: unknown, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;

const safeProductUrl = (raw?: string) => {
  if (!raw || raw.length > 500) return undefined;
  try {
    const url = new URL(raw);
    if (!["https:", "http:"].includes(url.protocol)) return undefined;
    if (isBlockedHost(url.hostname)) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
};

const fetchWithFirecrawl = async (url: string) => {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) return undefined;

  const response = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: [
        "markdown",
        "summary",
        {
          type: "json",
          prompt: "Extraia dados de produto de moda: nome, marca, preço, descrição, composição, medidas/tabela de tamanhos, variações, tamanhos disponíveis e qualquer orientação de caimento ou ajuste. Responda em português brasileiro.",
        },
      ],
      onlyMainContent: true,
      waitFor: 2500,
      location: { country: "BR", languages: ["pt-BR", "pt"] },
    }),
  });

  if (!response.ok) throw new Error(`Firecrawl ${response.status}: ${await response.text()}`);
  const data = await response.json();
  const document = data.data ?? data;
  const metadata = document.metadata ?? {};
  const structured = document.json ? JSON.stringify(document.json).slice(0, 6000) : "";
  const summary = document.summary ?? "";
  const markdown = document.markdown ?? "";

  return `URL: ${url}\nFonte: Firecrawl\nTítulo: ${metadata.title ?? ""}\nDescrição: ${metadata.description ?? ""}\nResumo: ${summary}\nDados estruturados: ${structured}\nConteúdo: ${markdown.slice(0, 12000)}`;
};

const fetchProductContext = async (raw?: string) => {
  const url = safeProductUrl(raw);
  if (!url) return "Link de produto não informado ou inválido.";
  try {
    const firecrawlContext = await fetchWithFirecrawl(url);
    if (firecrawlContext) return firecrawlContext;
  } catch (error) {
    console.error("Firecrawl extraction failed", error);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 MedidaCertaAI/1.0" },
    });
    clearTimeout(timeout);
    const html = (await response.text()).slice(0, 120000);
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
    const meta = [...html.matchAll(/<meta[^>]+(?:name|property)=["'](?:description|og:description|product:price:amount|og:title)["'][^>]+content=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1]).join(" | ");
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return `URL: ${url}\nTítulo/metadados: ${title} ${meta}\nConteúdo visível: ${text.slice(0, 9000)}`;
  } catch {
    return `URL: ${url}\nNão foi possível extrair a página automaticamente. Use apenas o domínio/link como contexto e peça conferência manual da tabela de medidas.`;
  }
};

// Fórmulas validadas para % de gordura corporal:
// - CUN-BAE (Gómez-Ambrosi et al., Diabetes Care 2012, validado vs DEXA, R²≈0,86)
// - Deurenberg (Br J Nutr 1991) — BMI + idade + sexo
// - U.S. Navy / DoD (Hodgdon & Beckett, NHRC 1984) — circunferências
const sexFlag = (g?: string): 0 | 1 => {
  const t = String(g ?? "").toLowerCase();
  if (t.startsWith("m") && !t.startsWith("mu") && !t.startsWith("fe")) return 1;
  return 0;
};
const cunBae = (bmi: number, age: number, s: 0 | 1) =>
  -44.988 + 0.503 * age + 10.689 * s + 3.172 * bmi - 0.026 * bmi * bmi
  + 0.181 * bmi * s - 0.02 * bmi * age - 0.005 * bmi * bmi * s + 0.00021 * bmi * bmi * age;
const deurenberg = (bmi: number, age: number, s: 0 | 1) => 1.20 * bmi + 0.23 * age - 10.8 * s - 5.4;
const navyBF = (s: 0 | 1, h: number, w: number, n: number, hip?: number) => {
  if (s === 1) return w > n ? 86.010 * Math.log10(w - n) - 70.041 * Math.log10(h) + 36.76 : undefined;
  if (!hip || w + hip <= n) return undefined;
  return 163.205 * Math.log10(w + hip - n) - 97.684 * Math.log10(h) - 78.387;
};

const fallbackAnalysis = (payload: BodyPayload) => {
  const manual = payload.manualMeasurements ?? {};
  const height = manual.height_cm ?? payload.heightCm ?? 170;
  const weight = manual.estimated_weight_kg ?? payload.weightKg ?? Math.round((height - 100) * 0.9);
  const waist = manual.waist_cm ?? Math.round(height * 0.43 + (weight - 65) * 0.35);
  const hip = manual.hip_cm ?? Math.round(waist * 1.18);
  const bust = manual.bust_cm ?? Math.round(waist * 1.1);
  const neck = manual.neck_cm ?? Math.round(height * 0.21);
  const age = payload.age && payload.age >= 12 && payload.age <= 90 ? payload.age : 30;
  const sex = sexFlag(payload.gender);
  const bmi = Math.round((weight / Math.pow(height / 100, 2)) * 10) / 10;
  const bmiClass = bmi < 18.5 ? "Abaixo do peso" : bmi < 25 ? "Normal" : bmi < 30 ? "Sobrepeso" : "Obeso";
  const bodyType = hip > bust + 7 ? "Triângulo" : bust > hip + 7 ? "Triângulo invertido" : Math.abs(bust - hip) <= 6 && waist < bust - 18 ? "Ampulheta" : waist > hip * 0.86 ? "Oval" : "Retangular";
  const breakdown: Array<{ method: string; value: number; reference: string }> = [];
  const cb = cunBae(bmi, age, sex); if (Number.isFinite(cb)) breakdown.push({ method: "CUN-BAE", value: Math.round(cb * 10) / 10, reference: "Gómez-Ambrosi et al., Diabetes Care 2012 (validado vs. DEXA, R²≈0,86)." });
  const dn = deurenberg(bmi, age, sex); if (Number.isFinite(dn)) breakdown.push({ method: "Deurenberg", value: Math.round(dn * 10) / 10, reference: "Deurenberg, Weststrate & Seidell, Br J Nutr 1991 (EE≈4 p.p.)." });
  const nv = navyBF(sex, height, waist, neck, hip); if (nv !== undefined && Number.isFinite(nv)) breakdown.push({ method: "U.S. Navy", value: Math.round(nv * 10) / 10, reference: "Hodgdon & Beckett, Naval Health Research Center 1984 (EE≈3 p.p.)." });
  const filtered = breakdown.map((b) => ({ ...b, value: Math.max(5, Math.min(60, b.value)) }));
  const bodyFatPct = filtered.length ? Number((filtered.reduce((s, b) => s + b.value, 0) / filtered.length).toFixed(1)) : null;
  const bodyFatLow = bodyFatPct !== null ? Math.max(3, Number((bodyFatPct - 3.5).toFixed(1))) : null;
  const bodyFatHigh = bodyFatPct !== null ? Math.min(65, Number((bodyFatPct + 3.5).toFixed(1))) : null;
  const muscleMass = bodyFatPct !== null ? Number((weight * (1 - bodyFatPct / 100) * 0.72).toFixed(1)) : null;
  const bmr = Math.round(10 * weight + 6.25 * height - 5 * age + (sex === 1 ? 5 : -161));
  return {
    scan_id: crypto.randomUUID(),
    analyzed_at: new Date().toISOString(),
    input_data: { photos_provided: [payload.imageDataUrl ? "front" : undefined, payload.sideImageDataUrl ? "side" : undefined].filter(Boolean), user_provided_height_cm: payload.heightCm ?? null, user_provided_weight_kg: payload.weightKg ?? null, age: payload.age ?? null, gender: payload.gender ?? null, goal: payload.shoppingGoal ?? null },
    measurements: { height_cm: { value: height, confidence: "media" }, weight_kg: { value: weight, confidence: "media" }, bust_cm: { value: bust, confidence: "media" }, underbust_cm: { value: Math.round(bust * 0.83), confidence: "baixa" }, waist_cm: { value: waist, confidence: "media" }, hip_cm: { value: hip, confidence: "media" }, shoulder_width_cm: { value: Math.round(height * 0.255), confidence: "media" }, inseam_cm: { value: manual.inseam_cm ?? Math.round(height * 0.455), confidence: "media" }, outseam_cm: { value: Math.round(height * 0.59), confidence: "media" }, arm_length_cm: { value: manual.arm_length_cm ?? Math.round(height * 0.33), confidence: "media" }, thigh_cm: { value: Math.round(hip * 0.56), confidence: "baixa" }, neck_cm: { value: neck, confidence: "media" }, torso_length_cm: { value: Math.round(height * 0.25), confidence: "media" } },
    body_analysis: {
      bmi,
      bmi_category: bmiClass,
      body_fat_estimate_pct: bodyFatPct,
      body_fat_range_low: bodyFatLow,
      body_fat_range_high: bodyFatHigh,
      body_fat_method: filtered.length > 1 ? `Média de ${filtered.map((b) => b.method).join(" + ")}` : (filtered[0]?.method ?? null),
      body_fat_methodology_note: filtered.length
        ? `Estimativa cruzando ${filtered.map((b) => `${b.method} (${b.value}%)`).join(", ")}. ${filtered.map((b) => b.reference).join(" ")} Bioimpedância/DEXA refinam o resultado.`
        : "Sem dados suficientes para estimar; informe altura, peso, cintura e pescoço.",
      body_fat_breakdown: filtered,
      muscle_mass_kg: muscleMass,
      visceral_fat: payload.bioimpedance?.visceralFat ?? null,
      basal_metabolic_rate_kcal: payload.bioimpedance?.bmr ?? bmr,
      tissue_distribution: "Estimativa por medidas, foto e bioimpedância quando informada.",
      body_fat_disclaimer: "Estimativa por fórmulas validadas (CUN-BAE, Deurenberg, U.S. Navy). Não substitui DEXA, bioimpedância clínica nem consulta médica.",
      body_type: bodyType,
      waist_to_hip_ratio: Number((waist / hip).toFixed(2)),
      abdominal_risk: (sex === 1 ? waist >= 102 : waist >= 88) ? "Atenção" : (sex === 1 ? waist >= 94 : waist >= 80) ? "Aumentado" : "Baixo",
    },
    clothing_sizes: { size_brazil: bust < 92 ? "P/M" : bust < 104 ? "M/G" : "G/GG", size_international: bust < 92 ? "S/M" : bust < 104 ? "M/L" : "L/XL", size_european: waist < 76 ? 38 : waist < 88 ? 42 : 44, pants_number_brazil: waist < 78 ? 40 : waist < 90 ? 44 : 46, bra_size: "Confirme busto e tórax", shoe_size_br: null },
    tailoring: { hem_adjustment_cm: 0, hem_note: "Compare o entrepernas estimado com a tabela da marca para prever barra.", sleeve_adjustment_cm: 0, sleeve_note: "Compare o comprimento do braço com a manga para prever ajuste de punho.", shoulder_fit: "Padrão", waist_fit_suggestion: "Use fita métrica real para confirmar medidas antes de compras caras." },
    style_recommendations: { body_type_description: `Tipo ${bodyType}: recomendações baseadas nas proporções estimadas.`, what_to_wear: ["Peças com cintura marcada", "Blazer aberto", "Tecidos com movimento"], what_to_avoid: ["Modelagens sem estrutura se quiser destacar a cintura"], best_necklines: ["Decote V"], best_pants_styles: ["Reta", "Cintura média"], best_dress_styles: ["Envelope", "Evasê"], pattern_tips: "Evite contrastes horizontais no ponto de maior volume." },
    quality_assessment: { overall_confidence: "media", photo_quality_issues: ["Estimativa demonstrativa"], manual_input_recommended: ["thigh_cm", "underbust_cm", "neck_cm"], accuracy_note: "Para maior precisão, informe medidas manuais (especialmente pescoço para Navy) e use roupa justa na próxima foto." },
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const payload = (await req.json()) as BodyPayload;

    const hasPhoto = payload.imageDataUrl?.startsWith("data:image/");
    const hasManualMeasurements = payload.manualMeasurements && Object.keys(payload.manualMeasurements).length > 0;

    if (!hasPhoto && !hasManualMeasurements) {
      return new Response(JSON.stringify({ error: "Envie uma foto ou informe medidas manuais." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.heightCm !== undefined && !isFiniteNumber(payload.heightCm, 90, 240)) {
      return new Response(JSON.stringify({ error: "Altura deve estar entre 90 e 240 cm." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.weightKg !== undefined && !isFiniteNumber(payload.weightKg, 25, 260)) {
      return new Response(JSON.stringify({ error: "Peso deve estar entre 25 e 260 kg." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Quota check ---
    const authHeader = req.headers.get("Authorization") ?? "";
    const quota = await checkAndIncrementQuota(authHeader, "body", 1);
    if (!quota.allowed) {
      return quotaExceededResponse(quota, corsHeaders);
    }

    // --- Cache check ---
    const supabaseForUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: currentUser } } = await supabaseForUser.auth.getUser();
    const userId = currentUser?.id ?? "anonymous";
    const cacheKey = buildCacheKey("body", userId, {
      imageDataUrl: payload.imageDataUrl,
      sideImageDataUrl: payload.sideImageDataUrl,
      heightCm: payload.heightCm,
      weightKg: payload.weightKg,
      age: payload.age,
      gender: payload.gender,
      productUrl: payload.productUrl,
    });
    const cached = await getCachedResult(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" },
      });
    }
    const productContext = await fetchProductContext(payload.productUrl);

    const system = `Você é o motor de visão por IA do app provAI, equivalente a um GPT-4o Vision para análise multimodal de fotos corporais, tamanhos de roupa, estilo e avaliação nutricional/fitness em português brasileiro. Responda somente JSON válido.

Para a estimativa de PERCENTUAL DE GORDURA CORPORAL, use SEMPRE fórmulas validadas em literatura científica e NUNCA chutes visuais:
1) CUN-BAE (Gómez-Ambrosi et al., Diabetes Care 2012, validado vs. DEXA, R²≈0,86): %BF = -44.988 + 0.503*idade + 10.689*sexo + 3.172*IMC - 0.026*IMC² + 0.181*IMC*sexo - 0.02*IMC*idade - 0.005*IMC²*sexo + 0.00021*IMC²*idade. (sexo: homem=1, mulher=0)
2) Deurenberg (Br J Nutr 1991): %BF = 1.20*IMC + 0.23*idade - 10.8*sexo - 5.4.
3) U.S. Navy / DoD (Hodgdon & Beckett 1984), quando houver pescoço + cintura (e quadril em mulheres): homens %BF = 86.010*log10(cintura-pescoço) - 70.041*log10(altura) + 36.76; mulheres %BF = 163.205*log10(cintura+quadril-pescoço) - 97.684*log10(altura) - 78.387.
4) Se houver bioimpedância informada, ela tem prioridade (EE≈2-3 p.p.).
Calcule cada método disponível, retorne todos em body_fat_breakdown=[{method, value, reference}] e body_fat_estimate_pct = média aritmética dos métodos válidos arredondada a 1 casa. body_fat_range_low/high = ±3.5 p.p. (ou ±1.5 se for bioimpedância). body_fat_method = nome do método ou "Média de X+Y". body_fat_methodology_note = explicação curta com referências bibliográficas e EE de cada método.

Para TMB use Mifflin-St Jeor (1990): homens TMB = 10*peso + 6.25*altura - 5*idade + 5; mulheres = 10*peso + 6.25*altura - 5*idade - 161.

Para risco abdominal use cortes da OMS: mulheres ≥80cm aumentado / ≥88cm elevado; homens ≥94/≥102. RCQ ≥0.85 mulher / ≥0.9 homem = distribuição central.

Use fotos frontal/lateral quando existirem, medidas manuais e contexto da página do produto. Seja conservador, indique confiança, não seja clínico ou harsh, não identifique pessoa, idade real ou atributos sensíveis pela imagem e sempre diga que avaliação nutricional é estimativa e não substitui médico, nutricionista, exame físico ou laudo.`;

    const calibrationParts: string[] = [];
    if (payload.scaleCalibration?.front?.px_per_cm) {
      const c = payload.scaleCalibration.front;
      calibrationParts.push(`FRONTAL: ${c.px_per_cm} px/cm via ${c.marker_label ?? "marcador"}${typeof c.confidence === "number" ? ` (conf=${c.confidence.toFixed(2)})` : ""}`);
    }
    if (payload.scaleCalibration?.side?.px_per_cm) {
      const c = payload.scaleCalibration.side;
      calibrationParts.push(`LATERAL: ${c.px_per_cm} px/cm via ${c.marker_label ?? "marcador"}${typeof c.confidence === "number" ? ` (conf=${c.confidence.toFixed(2)})` : ""}`);
    }
    const calibrationText = calibrationParts.length
      ? `CALIBRAÇÃO DE ESCALA DETECTADA POR MARCADOR FÍSICO (use OBRIGATORIAMENTE como referência absoluta para converter pixels → cm em todas as medidas. Tem prioridade sobre estimativas baseadas só em altura): ${calibrationParts.join(" | ")}. Eleve a confiança das medidas para "alta" quando derivadas dessa calibração.`
      : "Sem calibração por marcador físico — estime escala usando altura informada e proporções antropométricas.";

    const photosDescription = [
      payload.imageDataUrl ? "uma foto FRONTAL (vista de frente, ombros nivelados)" : null,
      payload.sideImageDataUrl ? "uma foto LATERAL (perfil 90°, usada para profundidade sagital, cifose/lordose, projeção abdominal e glútea)" : null,
    ].filter(Boolean).join(" e ");

    const sideGuidance = payload.sideImageDataUrl
      ? "A SEGUNDA imagem enviada é a foto LATERAL: use-a OBRIGATORIAMENTE para estimar profundidade abdominal (sagittal abdominal diameter), projeção do glúteo, alinhamento postural (cabeça/ombro/quadril/joelho) e refinar cintura/quadril cruzando com a frontal. Não confunda largura (frontal) com profundidade (lateral)."
      : "Apenas foto frontal disponível — sinalize que medidas de profundidade são estimadas com menor confiança.";

    const userText = `Você recebeu ${photosDescription || "nenhuma foto"}. ${sideGuidance} Dados opcionais: altura=${payload.heightCm ?? "não informado"}cm, peso=${payload.weightKg ?? "não informado"}kg, idade=${payload.age ?? "não informado"}, gênero/modelagem=${payload.gender ?? "não informado"}, objetivo=${payload.shoppingGoal ?? "compra online e avaliação física"}, bioimpedância=${JSON.stringify(payload.bioimpedance ?? {})}. ${calibrationText} Contexto da loja/produto extraído do link: ${productContext}. Retorne exatamente um JSON no formato: scan_id, analyzed_at, input_data {photos_provided, user_provided_height_cm, user_provided_weight_kg, age, gender, goal, scale_calibration}, measurements com cada medida como {value, confidence} para height_cm, weight_kg, bust_cm, underbust_cm, waist_cm, hip_cm, shoulder_width_cm, inseam_cm, outseam_cm, arm_length_cm, thigh_cm, neck_cm, torso_length_cm; body_analysis {bmi, bmi_category, body_fat_estimate_pct, body_fat_range_low, body_fat_range_high, body_fat_method, body_fat_methodology_note, body_fat_breakdown:[{method, value, reference}], muscle_mass_kg, visceral_fat, basal_metabolic_rate_kcal, tissue_distribution, body_fat_disclaimer, body_type, waist_to_hip_ratio, abdominal_risk}; clothing_sizes {size_brazil, size_international, size_european, pants_number_brazil, bra_size, shoe_size_br}; tailoring {hem_adjustment_cm, hem_note, sleeve_adjustment_cm, sleeve_note, shoulder_fit, waist_fit_suggestion}; style_recommendations {body_type_description, what_to_wear, what_to_avoid, best_necklines, best_pants_styles, best_dress_styles, pattern_tips}; quality_assessment {overall_confidence, photo_quality_issues, manual_input_recommended, accuracy_note}.`;

    const imageMessages: Array<{ type: "text" | "image_url"; text?: string; image_url?: { url: string } }> = [];
    if (payload.imageDataUrl) {
      imageMessages.push({ type: "text", text: "IMAGEM 1 — FOTO FRONTAL:" });
      imageMessages.push({ type: "image_url", image_url: { url: payload.imageDataUrl } });
    }
    if (payload.sideImageDataUrl) {
      imageMessages.push({ type: "text", text: "IMAGEM 2 — FOTO LATERAL (perfil 90°):" });
      imageMessages.push({ type: "image_url", image_url: { url: payload.sideImageDataUrl } });
    }

    let rawText: string;
    try {
      rawText = await callGemini("gemini-2.5-flash", [
        { role: "system", content: system },
        { role: "user", content: [{ type: "text", text: userText }, ...imageMessages] },
      ], { jsonMode: true });
    } catch (e: any) {
      if (e?.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de IA atingido. Tente novamente em alguns minutos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      console.error("analyze-body gemini error", e);
      return new Response(JSON.stringify(fallbackAnalysis(payload)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(rawText.replace(/^```json\s*|\s*```$/g, ""));
    const finalResult = parsed ?? fallbackAnalysis(payload);

    // Cache the result (fire and forget)
    setCachedResult(cacheKey, userId, "body", finalResult).catch(() => {});

    return new Response(JSON.stringify(finalResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-body error", error);
    return new Response(JSON.stringify(fallbackAnalysis({})), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
