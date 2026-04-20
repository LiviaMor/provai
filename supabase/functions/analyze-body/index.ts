import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type BodyPayload = {
  imageDataUrl?: string;
  heightCm?: number;
  weightKg?: number;
  age?: number;
  gender?: string;
  shoppingGoal?: string;
};

const isFiniteNumber = (value: unknown, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;

const fallbackAnalysis = (payload: BodyPayload) => {
  const height = payload.heightCm ?? 170;
  const weight = payload.weightKg ?? Math.round((height - 100) * 0.9);
  const waist = Math.round(height * 0.43 + (weight - 65) * 0.35);
  const hip = Math.round(waist * 1.18);
  const bust = Math.round(waist * 1.1);
  return {
    confidence: 42,
    disclaimer: "Estimativa demonstrativa: envie foto frontal de corpo inteiro e informe altura/peso para melhorar a precisão. Não substitui avaliação clínica.",
    measurements: {
      height_cm: height,
      estimated_weight_kg: weight,
      bust_cm: bust,
      waist_cm: waist,
      hip_cm: hip,
      inseam_cm: Math.round(height * 0.455),
      outseam_cm: Math.round(height * 0.59),
      arm_length_cm: Math.round(height * 0.33),
      shoulder_width_cm: Math.round(height * 0.255),
      thigh_cm: Math.round(hip * 0.56),
    },
    fitProfile: "Regular com atenção ao caimento na cintura e comprimento.",
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

    if (!payload.imageDataUrl || !payload.imageDataUrl.startsWith("data:image/")) {
      return new Response(JSON.stringify({ error: "Envie uma foto em formato de imagem." }), {
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

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return new Response(JSON.stringify(fallbackAnalysis(payload)), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const system = `Você é um assistente de análise antropométrica virtual para e-commerce de roupas e acompanhamento físico. Responda somente JSON válido. Use a foto e os dados informados para estimar medidas corporais em centímetros, indicar confiança, recomendações de tamanho e ajustes de barra/punho. Seja conservador, explique que é estimativa visual, não diagnóstico médico, e recomende confirmação com fita métrica. Não identifique pessoa, idade real ou atributos sensíveis pela imagem.`;

    const userText = `Dados opcionais: altura=${payload.heightCm ?? "não informado"}cm, peso=${payload.weightKg ?? "não informado"}kg, idade=${payload.age ?? "não informado"}, gênero/modelagem=${payload.gender ?? "não informado"}, objetivo=${payload.shoppingGoal ?? "compra online e avaliação física"}. Retorne JSON com: confidence number 0-100, disclaimer string, measurements {height_cm, estimated_weight_kg, bust_cm, waist_cm, hip_cm, inseam_cm, outseam_cm, arm_length_cm, shoulder_width_cm, thigh_cm}, fitProfile string, clothing array de {category,size,fitTip}, adjustments array, nutritionNotes array.`;

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
              { type: "image_url", image_url: { url: payload.imageDataUrl } },
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
