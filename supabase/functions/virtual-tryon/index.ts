import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type TryonPayload = {
  userImageDataUrl?: string;
  garmentImageDataUrl?: string;
  productUrl?: string;
  measurements?: Record<string, number>;
  gender?: string;
  bodyType?: string;
  brandSize?: string;
  notes?: string;
};

const safeUrl = (raw?: string) => {
  if (!raw || raw.length > 600) return undefined;
  try {
    const url = new URL(raw);
    if (!["https:", "http:"].includes(url.protocol)) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
};

const fetchProductImages = async (raw?: string): Promise<{ images: string[]; context: string }> => {
  const url = safeUrl(raw);
  if (!url) return { images: [], context: "Sem link de produto." };
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  try {
    if (apiKey) {
      const response = await fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          formats: ["markdown", "summary", { type: "json", prompt: "Liste todas as URLs de imagens do produto principal (campo product_images: array de URLs absolutas), nome, marca, cor, tecido e tabela de tamanhos. Em pt-BR." }],
          onlyMainContent: true,
          waitFor: 2500,
          location: { country: "BR", languages: ["pt-BR"] },
        }),
      });
      if (response.ok) {
        const data = await response.json();
        const doc = data.data ?? data;
        const json = doc.json ?? {};
        const images: string[] = Array.isArray(json.product_images) ? json.product_images.filter((u: unknown) => typeof u === "string").slice(0, 4) : [];
        const context = `Produto: ${json.name ?? ""} | Marca: ${json.brand ?? ""} | Cor: ${json.color ?? ""} | Tecido: ${json.fabric ?? ""} | Resumo: ${doc.summary ?? ""}`.slice(0, 2000);
        return { images, context };
      }
    }
  } catch (error) {
    console.error("Firecrawl tryon failed", error);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);
    const response = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "Mozilla/5.0 EncaixeTryOn/1.0" } });
    clearTimeout(timeout);
    const html = (await response.text()).slice(0, 200000);
    const ogImages = [...html.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi)].map((m) => m[1]);
    const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi)].map((m) => m[1]);
    const all = [...new Set([...ogImages, ...imgs])].filter((u) => /^https?:/.test(u)).slice(0, 4);
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
    return { images: all, context: `URL: ${url} | Título: ${title}` };
  } catch {
    return { images: [], context: `URL: ${url} (sem extração).` };
  }
};

const urlToDataUrl = async (url: string): Promise<string | undefined> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return undefined;
    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.byteLength > 6 * 1024 * 1024) return undefined;
    let binary = "";
    for (let i = 0; i < buffer.length; i++) binary += String.fromCharCode(buffer[i]);
    return `data:${contentType};base64,${btoa(binary)}`;
  } catch {
    return undefined;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = (await req.json()) as TryonPayload;
    if (!payload.userImageDataUrl?.startsWith("data:image/")) {
      return new Response(JSON.stringify({ error: "Envie uma foto do usuário (frente)." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ error: "IA indisponível no momento." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let garmentDataUrl = payload.garmentImageDataUrl;
    let productContext = "";
    if (!garmentDataUrl && payload.productUrl) {
      const { images, context } = await fetchProductImages(payload.productUrl);
      productContext = context;
      for (const url of images) {
        garmentDataUrl = await urlToDataUrl(url);
        if (garmentDataUrl) break;
      }
    }

    if (!garmentDataUrl) {
      return new Response(JSON.stringify({ error: "Não foi possível obter a imagem da roupa. Tente outro link ou faça upload da peça." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const measurementsText = payload.measurements ? Object.entries(payload.measurements).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join(", ") : "sem medidas";

    const tryonPrompt = `Crie uma fotografia ultra-realista, fotogênica e respeitosa, mostrando a MESMA pessoa da primeira imagem vestindo a roupa exata da segunda imagem. Mantenha rosto, tom de pele, cabelo, altura e proporções corporais idênticos à foto original. A peça deve cair naturalmente respeitando estas medidas reais (cm): ${measurementsText}. Gênero/modelagem: ${payload.gender ?? "neutro"}. Tipo corporal: ${payload.bodyType ?? "natural"}. Tamanho indicado: ${payload.brandSize ?? "—"}. Iluminação de estúdio difusa, fundo neutro claro, pose frontal natural, qualidade editorial de e-commerce. Não distorça o corpo, não altere identidade, não adicione marcas d'água ou texto.`;

    const imageGen = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: tryonPrompt },
              { type: "image_url", image_url: { url: payload.userImageDataUrl } },
              { type: "image_url", image_url: { url: garmentDataUrl } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (imageGen.status === 429) return new Response(JSON.stringify({ error: "Limite de IA atingido. Aguarde alguns minutos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (imageGen.status === 402) return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!imageGen.ok) {
      console.error("Image gen error", imageGen.status, await imageGen.text());
      return new Response(JSON.stringify({ error: "Falha ao gerar provador virtual." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const imageData = await imageGen.json();
    const generatedImageUrl: string | undefined = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    const advicePrompt = `Você é o estilista do app Encaixe. Com base na peça (${productContext || "imagem fornecida"}), nas medidas (${measurementsText}), tipo corporal ${payload.bodyType ?? "—"}, tamanho indicado ${payload.brandSize ?? "—"} e contexto: ${payload.notes ?? "—"}, responda APENAS JSON com: {"size_advice": "frase com tamanho ideal e por quê", "fit_notes": ["pontos de atenção de caimento"], "combinations": [{"title": "look 1", "pieces": ["peça 1", "peça 2"], "occasion": "ocasião"}], "color_palette": {"undertone": "quente|frio|neutro", "best_colors": ["cor1","cor2","cor3","cor4"], "avoid_colors": ["cor1","cor2"], "rationale": "explicação curta de colorimetria"}, "confidence": "alta|media|baixa"} em pt-BR.`;

    const adviceResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é estilista de moda especialista em colorimetria e caimento. Responda apenas JSON válido em pt-BR." },
          {
            role: "user",
            content: [
              { type: "text", text: advicePrompt },
              { type: "image_url", image_url: { url: payload.userImageDataUrl } },
              { type: "image_url", image_url: { url: garmentDataUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    let advice: any = {};
    if (adviceResp.ok) {
      const adviceData = await adviceResp.json();
      const content = adviceData.choices?.[0]?.message?.content;
      try {
        advice = typeof content === "string" ? JSON.parse(content.replace(/^```json\s*|\s*```$/g, "")) : content;
      } catch (e) {
        console.error("Advice parse error", e);
      }
    }

    return new Response(JSON.stringify({ tryonImage: generatedImageUrl, advice, productContext }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("virtual-tryon error", error);
    return new Response(JSON.stringify({ error: "Erro inesperado ao gerar provador." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
