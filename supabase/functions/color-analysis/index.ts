import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Payload = { images?: string[] };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { images } = (await req.json()) as Payload;
    const valid = (images ?? []).filter((s) => typeof s === "string" && s.startsWith("data:image/")).slice(0, 5);
    if (valid.length === 0) {
      return new Response(JSON.stringify({ error: "Envie ao menos 1 foto do rosto." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ error: "IA indisponível no momento." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const systemPrompt = `Você é uma consultora de imagem brasileira de altíssimo padrão, especialista em colorimetria pessoal pelos métodos das 12 estações (Sci\\ART, Color Me Beautiful) e harmonia cromática profissional. Analise visualmente as fotos enviadas observando pele (bochechas, pescoço, têmporas, veias), olhos (íris, limbo, brilho), cabelo (raiz, fios, brilho) e contraste natural. Responda APENAS JSON válido em pt-BR com hex válidos #RRGGBB.`;

    const userPrompt = `Analise tecnicamente a coloração pessoal real da pessoa nas fotos. Seja precisa e personalizada (nada genérico). Identifique exatamente uma das 12 estações: "Primavera Clara", "Primavera Quente", "Primavera Brilhante", "Verão Claro", "Verão Suave", "Verão Frio", "Outono Suave", "Outono Quente", "Outono Profundo", "Inverno Frio", "Inverno Brilhante", "Inverno Profundo". Indique se há neutralidade (ex: "Outono Profundo Neutro"). Retorne JSON exatamente neste formato:
{
  "season": "Outono Profundo",
  "season_modifier": "Neutro" | "",
  "season_subtitle": "frase curta poética sobre a cartela",
  "season_description": "parágrafo de 2-3 frases explicando por que essa estação harmoniza com a pessoa, citando observações reais (subtom, contraste, profundidade)",
  "characteristics": {
    "depth": {"value": "Alta|Média|Baixa", "note": "frase curta"},
    "contrast": {"value": "Alto|Médio-Alto|Médio|Médio-Baixo|Baixo", "note": "frase curta"},
    "undertone": {"value": "Quente|Frio|Neutro|Quente Neutro|Frio Neutro|Oliva", "note": "ex: dourado/oliva"},
    "temperature": {"value": "Quente|Fria|Neutra", "note": ""},
    "intensity": {"value": "Profunda|Suave|Brilhante|Média", "note": ""},
    "luminosity": {"value": "Alta|Média|Baixa", "note": ""},
    "harmony": {"value": "frase curta sobre a harmonia geral", "note": "explicação curta"}
  },
  "skin_tone_hex": "#hex aproximado da pele",
  "eye_color_hex": "#hex dos olhos",
  "hair_color_hex": "#hex do cabelo",
  "best_palette": [
    {"name":"Verde Musgo","hex":"#556B2F"},
    ...12 cores ideais com nomes em pt-BR e hex coerentes com a estação
  ],
  "face_comparison": {
    "valorizam": [
      {"name":"Verde Musgo","hex":"#556B2F","why":"frase curta de impacto no rosto"}
      ...5 itens
    ],
    "apagam": [
      {"name":"Rosa Bebê","hex":"#F4C2C2","why":"frase curta sobre por que apaga"}
      ...4 itens
    ]
  },
  "neutrals": [
    {"name":"Marrom Chocolate","hex":"#3B2415"},
    ...6 neutros ideais
  ],
  "avoid": [
    {"name":"Branco Óptico","hex":"#FFFFFF","why":"motivo curto"},
    ...5 a evitar
  ],
  "hair": {
    "best": [
      {"name":"Castanho Chocolate","hex":"#3B2415","why":"frase curta"}
      ...5 melhores escolhas de cabelo
    ],
    "avoid": [
      {"name":"Loiro Platinado","hex":"#EDE6D6","why":"motivo curto"}
      ...4 a evitar
    ]
  },
  "makeup": {
    "base": "instrução técnica sobre subtom da base",
    "blush": [{"name":"Pêssego","hex":"#F2A07B"}, ...3 opções],
    "lipstick": [{"name":"Nude Quente","hex":"#B9745C"}, ...4 opções incluindo dia/noite],
    "highlighter": "champagne dourado | rosado quente | bronze etc + por quê",
    "eyeshadow": [{"name":"Bronze","hex":"#8C6239"}, ...3 opções]
  },
  "metals": ["Ouro", "Bronze", "Cobre" /* metais que valorizam */],
  "metals_avoid": ["Prata fria"],
  "prints": "estampas que combinam (ex: organicas, florais escuros, animal print quente)",
  "golden_tips": [
    "dica elegante 1",
    "dica elegante 2",
    "dica elegante 3",
    "dica elegante 4"
  ],
  "final_quote": "frase poética e luxuosa de fechamento",
  "confidence": "alta|media|baixa"
}`;

    const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [{ type: "text", text: userPrompt }];
    for (const img of valid) content.push({ type: "image_url", image_url: { url: img } });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (response.status === 429) return new Response(JSON.stringify({ error: "Limite de IA atingido. Aguarde alguns minutos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!response.ok) {
      const err = await response.text();
      console.error("color-analysis gateway", response.status, err);
      return new Response(JSON.stringify({ error: "Falha ao gerar análise." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;
    let analysis: unknown = {};
    try {
      analysis = typeof raw === "string" ? JSON.parse(raw.replace(/^```json\s*|\s*```$/g, "")) : raw;
    } catch (e) {
      console.error("parse error", e, raw);
      return new Response(JSON.stringify({ error: "Resposta da IA inválida." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ analysis }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("color-analysis error", error);
    return new Response(JSON.stringify({ error: "Erro inesperado." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
