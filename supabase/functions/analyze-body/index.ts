import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
};

const isFiniteNumber = (value: unknown, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;

const safeProductUrl = (raw?: string) => {
  if (!raw || raw.length > 500) return undefined;
  try {
    const url = new URL(raw);
    if (!["https:", "http:"].includes(url.protocol)) return undefined;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || host.startsWith("127.") || host.startsWith("10.") || host.startsWith("192.168.")) return undefined;
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

    const productContext = await fetchProductContext(payload.productUrl);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return new Response(JSON.stringify(fallbackAnalysis(payload)), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const system = `Você é o motor de visão por IA do app Encaixe, equivalente a um GPT-4o Vision para análise multimodal de fotos corporais, tamanhos de roupa, estilo e avaliação nutricional/fitness em português brasileiro. Responda somente JSON válido. Use fotos frontal/lateral quando existirem, medidas manuais, bioimpedância quando informada e contexto da página do produto para estimar medidas em centímetros, calcular IMC, TMB, percentual de gordura, massa muscular, gordura abdominal/visceral e distribuição dos tecidos, classificar tipo corporal, sugerir tamanhos Brasil/internacional/europeu/calça/sutiã quando aplicável, ajustes de barra/punho/ombro e recomendações de estilo acolhedoras. Seja conservador, indique confiança, não seja clínico ou harsh, não identifique pessoa, idade real ou atributos sensíveis pela imagem e sempre diga que avaliação nutricional é estimativa e não substitui médico, nutricionista, exame físico ou laudo.`;

    const userText = `Dados opcionais: altura=${payload.heightCm ?? "não informado"}cm, peso=${payload.weightKg ?? "não informado"}kg, idade=${payload.age ?? "não informado"}, gênero/modelagem=${payload.gender ?? "não informado"}, objetivo=${payload.shoppingGoal ?? "compra online e avaliação física"}, bioimpedância=${JSON.stringify(payload.bioimpedance ?? {})}. Contexto da loja/produto extraído do link: ${productContext}. Retorne exatamente um JSON no formato: scan_id, analyzed_at, input_data {photos_provided, user_provided_height_cm, user_provided_weight_kg, gender, goal}, measurements com cada medida como {value, confidence} para height_cm, weight_kg, bust_cm, underbust_cm, waist_cm, hip_cm, shoulder_width_cm, inseam_cm, outseam_cm, arm_length_cm, thigh_cm, neck_cm, torso_length_cm; body_analysis {bmi, bmi_category, body_fat_estimate_pct, muscle_mass_kg, visceral_fat, basal_metabolic_rate_kcal, tissue_distribution, body_fat_disclaimer, body_type, waist_to_hip_ratio, abdominal_risk}; clothing_sizes {size_brazil, size_international, size_european, pants_number_brazil, bra_size, shoe_size_br}; tailoring {hem_adjustment_cm, hem_note, sleeve_adjustment_cm, sleeve_note, shoulder_fit, waist_fit_suggestion}; style_recommendations {body_type_description, what_to_wear, what_to_avoid, best_necklines, best_pants_styles, best_dress_styles, pattern_tips}; quality_assessment {overall_confidence, photo_quality_issues, manual_input_recommended, accuracy_note}.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              ...(payload.imageDataUrl ? [{ type: "image_url", image_url: { url: payload.imageDataUrl } }] : []),
              ...(payload.sideImageDataUrl ? [{ type: "image_url", image_url: { url: payload.sideImageDataUrl } }] : []),
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Limite de IA atingido. Tente novamente em alguns minutos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no workspace para continuar." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!response.ok) {
      console.error("AI gateway returned", response.status, await response.text());
      return new Response(JSON.stringify(fallbackAnalysis(payload)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const parsed = typeof content === "string" ? JSON.parse(content.replace(/^```json\s*|\s*```$/g, "")) : content;

    return new Response(JSON.stringify(parsed ?? fallbackAnalysis(payload)), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-body error", error);
    return new Response(JSON.stringify(fallbackAnalysis({})), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
