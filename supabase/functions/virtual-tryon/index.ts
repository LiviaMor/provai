import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
    if (isBlockedHost(url.hostname)) return undefined;
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
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return undefined;
    if (isBlockedHost(parsed.hostname)) return undefined;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, { signal: controller.signal, redirect: "manual" });
    clearTimeout(timeout);
    if (response.status >= 300 && response.status < 400) return undefined;
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

  const authError = await requireAuth(req);
  if (authError) return authError;

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

    const advicePrompt = `Você é o estilista e color analyst do app Encaixe. Analise visualmente a PRIMEIRA imagem (pessoa) para detectar automaticamente o subtom de pele observando bochechas, pescoço e veias aparentes; identifique também a estação cromática (primavera quente, verão frio, outono quente, inverno frio etc.). Analise a SEGUNDA imagem (peça) para extrair a cor dominante da roupa em hex aproximado. Com base na peça (${productContext || "imagem fornecida"}), nas medidas (${measurementsText}), tipo corporal ${payload.bodyType ?? "—"}, tamanho indicado ${payload.brandSize ?? "—"} e contexto: ${payload.notes ?? "—"}, responda APENAS JSON em pt-BR no formato exato: {"size_advice": "frase com tamanho ideal e por quê", "fit_notes": ["pontos de atenção de caimento"], "combinations": [{"title": "look 1", "pieces": ["peça 1", "peça 2"], "occasion": "ocasião"}], "color_palette": {"undertone": "quente|frio|neutro", "season": "primavera quente|verão frio|outono quente|inverno frio|...", "skin_tone_hex": "#hex aproximado da pele", "garment_color_hex": "#hex da peça", "garment_color_name": "nome da cor da peça", "harmony_with_garment": "alta|media|baixa", "harmony_explanation": "como a cor da peça dialoga com seu subtom", "best_colors": [{"name":"nome","hex":"#hex"}, ...4-6 itens], "avoid_colors": [{"name":"nome","hex":"#hex"}, ...2-3 itens], "neutrals": [{"name":"nome","hex":"#hex"}, ...2-3 itens], "metals": ["dourado|prateado|rose gold"], "combine_guide": [{"role":"calça/saia","suggestion":"cor sugerida + por quê","hex":"#hex"}, {"role":"sapato","suggestion":"...","hex":"#hex"}, {"role":"acessório","suggestion":"...","hex":"#hex"}], "rationale": "explicação curta de colorimetria personalizada"}, "confidence": "alta|media|baixa"}. Use hex válidos (#RRGGBB). Se não conseguir detectar com segurança, marque confidence baixa e explique no rationale.`;

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
