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

const fallbackAnalysis = (payload: BodyPayload) => {
  const manual = payload.manualMeasurements ?? {};
  const height = manual.height_cm ?? payload.heightCm ?? 170;
  const weight = manual.estimated_weight_kg ?? payload.weightKg ?? Math.round((height - 100) * 0.9);
  const waist = manual.waist_cm ?? Math.round(height * 0.43 + (weight - 65) * 0.35);
  const hip = manual.hip_cm ?? Math.round(waist * 1.18);
  const bust = manual.bust_cm ?? Math.round(waist * 1.1);
  const bmi = Math.round((weight / Math.pow(height / 100, 2)) * 10) / 10;
  const bmiClass = bmi < 18.5 ? "Abaixo do peso" : bmi < 25 ? "Normal" : bmi < 30 ? "Sobrepeso" : "Obeso";
  return {
    confidence: 42,
    disclaimer: "Estimativa demonstrativa: envie foto frontal de corpo inteiro e informe altura/peso para melhorar a precisão. Não substitui avaliação clínica.",
    measurements: {
      height_cm: height,
      estimated_weight_kg: weight,
      bust_cm: bust,
      waist_cm: waist,
      hip_cm: hip,
      inseam_cm: manual.inseam_cm ?? Math.round(height * 0.455),
      outseam_cm: Math.round(height * 0.59),
      arm_length_cm: manual.arm_length_cm ?? Math.round(height * 0.33),
      shoulder_width_cm: manual.shoulder_width_cm ?? Math.round(height * 0.255),
      neck_cm: Math.round(height * 0.21),
      thigh_cm: Math.round(hip * 0.56),
    },
    fitProfile: "Regular com atenção ao caimento na cintura e comprimento.",
    bodyType: hip > bust + 7 ? "Triângulo" : bust > hip + 7 ? "Triângulo invertido" : Math.abs(bust - hip) <= 6 && waist < bust - 18 ? "Ampulheta" : waist > hip * 0.86 ? "Oval" : "Retangular",
    sizeRecommendations: {
      Brasil: bust < 92 ? "P/M" : bust < 104 ? "M/G" : "G/GG",
      Internacional: bust < 92 ? "S/M" : bust < 104 ? "M/L" : "L/XL",
      Europeu: waist < 76 ? "36/38" : waist < 88 ? "40/42" : "44+",
      "Calça número": waist < 78 ? "38/40" : waist < 90 ? "42/44" : "46+",
      Sutiã: "Confirme busto e tórax com fita métrica",
    },
    styleRecommendations: [
      { title: "Cintura marcada", tag: "Casual", tip: "Peças transpassadas e cós médio valorizam a proporção.", avoid: "Modelagens sem estrutura se quiser destacar a cintura.", emoji: "👖" },
      { title: "Linha vertical", tag: "Trabalho", tip: "Blazer aberto e decote V alongam com naturalidade.", avoid: "Contrastes muito horizontais no ponto de maior volume.", emoji: "🧥" },
      { title: "Movimento leve", tag: "Festa", tip: "Saias evasê e tecidos fluidos dão equilíbrio ao caimento.", emoji: "✨" },
    ],
    fitnessAssessment: {
      bmi,
      bmiClass,
      waistRisk: waist >= 88 ? "Atenção: cintura elevada; converse com profissional de saúde." : "Circunferência dentro de uma faixa usual para acompanhamento.",
      bodyFatEstimate: "Estimativa visual conservadora",
      summary: `Segundo os dados informados, o IMC está classificado como ${bmiClass.toLowerCase()}.`,
    },
    clothing: [
      { category: "Blusas/Camisetas", size: bust < 92 ? "P/M" : bust < 104 ? "M/G" : "G/GG", fitTip: "Priorize busto e ombros; ajuste punho se manga passar do pulso." },
      { category: "Calças", size: waist < 78 ? "38/40" : waist < 90 ? "42/44" : "46+", fitTip: "Escolha pela maior medida entre cintura e quadril; barra provável pelo entrepernas." },
      { category: "Vestidos", size: hip > bust + 8 ? "Base pelo quadril" : "Base pelo busto", fitTip: "Modelagens envelope e evasê toleram melhor pequenas variações." },
    ],
    adjustments: [
      "Compare o entrepernas estimado com a tabela da marca para prever barra.",
      "Compare o comprimento do braço com a manga para prever ajuste de punho.",
      "Use fita métrica real para confirmar medidas antes de compras caras.",
    ],
    nutritionNotes: [
      "Peso e medidas são estimativas visuais, úteis para triagem e acompanhamento, não diagnóstico.",
      "Para evolução nutricional, registre medidas sempre no mesmo horário e postura.",
    ],
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

    const system = `Você é o motor de visão por IA do app Encaixe, equivalente a um GPT-4o Vision para análise multimodal de fotos corporais, tamanhos de roupa, estilo e avaliação fitness em português brasileiro. Responda somente JSON válido. Use fotos frontal/lateral quando existirem, medidas manuais e contexto da página do produto para estimar medidas em centímetros, calcular IMC, classificar tipo corporal (Triângulo, Retangular, Ampulheta, Oval, Triângulo invertido), sugerir tamanhos Brasil/internacional/europeu/calça/sutiã quando aplicável, ajustes de barra/punho/ombro e recomendações de estilo acolhedoras. Seja conservador, indique confiança, não seja clínico ou harsh, não identifique pessoa, idade real ou atributos sensíveis pela imagem e sempre diga que avaliação nutricional é estimativa e não substitui profissional de saúde.`;

    const userText = `Dados opcionais: altura=${payload.heightCm ?? "não informado"}cm, peso=${payload.weightKg ?? "não informado"}kg, idade=${payload.age ?? "não informado"}, gênero/modelagem=${payload.gender ?? "não informado"}, objetivo=${payload.shoppingGoal ?? "compra online e avaliação física"}. Contexto da loja/produto extraído do link: ${productContext}. Retorne JSON com: confidence number 0-100, disclaimer string, measurements {height_cm, estimated_weight_kg, bust_cm, waist_cm, hip_cm, inseam_cm, outseam_cm, arm_length_cm, shoulder_width_cm, thigh_cm}, fitProfile string, bodyType string, sizeRecommendations com Brasil, Internacional, Europeu, Calça número e Sutiã quando aplicável, clothing array de {category,size,fitTip} incluindo recomendação específica do produto quando houver tabela, adjustments array citando barra para peças inferiores e manga/punho/ombro para blusas/camisas quando aplicável, nutritionNotes array.`;

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
