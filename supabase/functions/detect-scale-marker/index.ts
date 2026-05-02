import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

// Tamanhos físicos de referência conhecidos (lado mais longo, em cm)
const MARKER_SIZES_CM: Record<string, { longSide: number; shortSide?: number; label: string }> = {
  card: { longSide: 8.56, shortSide: 5.398, label: "Cartão CR80 (crédito/RG novo) — 8,56 × 5,40 cm" },
  a4: { longSide: 29.7, shortSide: 21.0, label: "Folha A4 — 29,7 × 21,0 cm" },
  banknote_brl: { longSide: 14.2, shortSide: 6.5, label: "Cédula brasileira (R$) — 14,2 × 6,5 cm" },
};

type Payload = {
  imageDataUrl?: string;
  markerType?: keyof typeof MARKER_SIZES_CM;
  /** Lado real do marcador em cm, usado quando markerType="custom" (régua). Opcional. */
  customLongSideCm?: number;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Payload;
    const image = body.imageDataUrl;

    if (!image || !image.startsWith("data:image/")) {
      return new Response(JSON.stringify({ error: "Envie uma imagem (data URL) válida." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const markerType = (body.markerType ?? "card") as keyof typeof MARKER_SIZES_CM;
    const reference = MARKER_SIZES_CM[markerType];
    if (!reference && !body.customLongSideCm) {
      return new Response(JSON.stringify({ error: "Marcador desconhecido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const longSideCm = reference?.longSide ?? body.customLongSideCm!;
    const shortSideCm = reference?.shortSide;
    const label = reference?.label ?? `Marcador personalizado — ${longSideCm} cm`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `Você é um detector de objetos de calibração de escala em fotos de avaliação corporal. Sua tarefa: localizar UM marcador físico de tamanho conhecido na foto (${label}) e devolver suas coordenadas em pixels.

REGRAS:
1. Trabalhe nas dimensões nativas (em pixels) da imagem recebida.
2. Encontre a melhor caixa delimitadora retangular (axis-aligned) ao redor do marcador.
3. Estime também o lado mais longo do marcador em pixels considerando perspectiva (se houver leve rotação, use a maior diagonal/lado projetado real do objeto).
4. Se não tiver certeza razoável, devolva "found": false e explique por quê em "reason".
5. Não invente. Não retorne nada fora do JSON.
6. Confidence entre 0 e 1.`;

    const userText = `Detecte o marcador "${label}" nesta foto. Devolva JSON exatamente neste formato:
{
  "found": true|false,
  "image_width_px": number,
  "image_height_px": number,
  "bbox_px": { "x": number, "y": number, "width": number, "height": number },
  "marker_long_side_px": number,
  "marker_short_side_px": number|null,
  "confidence": number,
  "reason": string
}

Tamanho físico conhecido: lado maior = ${longSideCm} cm${shortSideCm ? `, lado menor = ${shortSideCm} cm` : ""}.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiResponse.status === 429) {
      return new Response(JSON.stringify({ error: "Limite de IA atingido. Tente novamente em alguns minutos." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResponse.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no workspace para continuar." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      console.error("AI gateway error", aiResponse.status, text);
      return new Response(JSON.stringify({ error: "Falha ao analisar a imagem." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResponse.json();
    const content = data.choices?.[0]?.message?.content;
    let parsed: any;
    try {
      parsed = typeof content === "string" ? JSON.parse(content.replace(/^```json\s*|\s*```$/g, "")) : content;
    } catch {
      return new Response(JSON.stringify({ error: "Resposta da IA inválida." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!parsed?.found || typeof parsed.marker_long_side_px !== "number" || parsed.marker_long_side_px <= 0) {
      return new Response(
        JSON.stringify({
          found: false,
          reason: parsed?.reason ?? "Marcador não localizado com confiança suficiente.",
          marker_label: label,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const pxPerCm = parsed.marker_long_side_px / longSideCm;

    return new Response(
      JSON.stringify({
        found: true,
        marker_type: markerType,
        marker_label: label,
        marker_long_side_cm: longSideCm,
        marker_short_side_cm: shortSideCm ?? null,
        marker_long_side_px: parsed.marker_long_side_px,
        marker_short_side_px: parsed.marker_short_side_px ?? null,
        bbox_px: parsed.bbox_px ?? null,
        image_width_px: parsed.image_width_px ?? null,
        image_height_px: parsed.image_height_px ?? null,
        px_per_cm: Number(pxPerCm.toFixed(3)),
        cm_per_px: Number((1 / pxPerCm).toFixed(5)),
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : null,
        reason: parsed.reason ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("detect-scale-marker error", error);
    return new Response(JSON.stringify({ error: "Erro inesperado ao detectar marcador." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
