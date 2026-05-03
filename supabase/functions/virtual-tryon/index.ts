import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkAndIncrementQuota, quotaExceededResponse } from "../_shared/quota.ts";

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
  category?: "auto" | "tops" | "bottoms" | "one-pieces";
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
          formats: ["markdown", "summary", { type: "json", prompt: "Liste todas as URLs de imagens do produto principal (campo product_images: array de URLs absolutas), nome, marca, cor, tecido e tabela de tamanhos (campo size_chart: objeto com medidas por tamanho). Em pt-BR." }],
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
        const sizeChart = json.size_chart ? JSON.stringify(json.size_chart).slice(0, 1500) : "";
        const context = `Produto: ${json.name ?? ""} | Marca: ${json.brand ?? ""} | Cor: ${json.color ?? ""} | Tecido: ${json.fabric ?? ""} | Tabela de tamanhos: ${sizeChart} | Resumo: ${doc.summary ?? ""}`.slice(0, 3000);
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

// ============================================================================
// FASHN AI Integration
// Docs: https://docs.fashn.ai/api-reference/tryon-v1-6
// ============================================================================

const FASHN_API_URL = "https://api.fashn.ai/v1";
const FASHN_POLL_INTERVAL_MS = 2000;
const FASHN_MAX_POLL_ATTEMPTS = 45; // max ~90 seconds

type FashnStatus = {
  id: string;
  status: "starting" | "in_queue" | "processing" | "completed" | "failed";
  output?: string[];
  error?: string;
};

/**
 * Submete um job de try-on ao FASHN AI e faz polling até completar.
 * Retorna a URL da imagem gerada ou undefined em caso de falha.
 */
async function runFashnTryon(
  fashnApiKey: string,
  modelImage: string,
  garmentImage: string,
  category: "auto" | "tops" | "bottoms" | "one-pieces" = "auto"
): Promise<{ imageUrl?: string; error?: string }> {
  // 1. Submit the job
  const runResponse = await fetch(`${FASHN_API_URL}/run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${fashnApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model_name: "fashn/tryon",
      inputs: {
        model_image: modelImage,
        garment_image: garmentImage,
        category,
        mode: "balanced",
        segmentation_free: true,
        garment_photo_type: "auto",
        output_format: "jpeg",
        return_base64: true,
        num_samples: 1,
      },
    }),
  });

  if (!runResponse.ok) {
    const errText = await runResponse.text();
    console.error("FASHN /run error:", runResponse.status, errText);
    if (runResponse.status === 401) return { error: "FASHN API key inválida." };
    if (runResponse.status === 402) return { error: "Créditos FASHN esgotados." };
    if (runResponse.status === 429) return { error: "Limite FASHN atingido. Aguarde." };
    return { error: "Falha ao iniciar provador virtual." };
  }

  const runData = await runResponse.json();
  const predictionId = runData.id;
  if (!predictionId) {
    console.error("FASHN no prediction ID:", runData);
    return { error: "Resposta inesperada do provador." };
  }

  // 2. Poll for completion
  for (let attempt = 0; attempt < FASHN_MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, FASHN_POLL_INTERVAL_MS));

    const statusResponse = await fetch(`${FASHN_API_URL}/status/${predictionId}`, {
      headers: { Authorization: `Bearer ${fashnApiKey}` },
    });

    if (!statusResponse.ok) {
      console.error("FASHN /status error:", statusResponse.status);
      continue;
    }

    const statusData = (await statusResponse.json()) as FashnStatus;

    if (statusData.status === "completed") {
      const imageUrl = statusData.output?.[0];
      if (!imageUrl) return { error: "Provador completou mas sem imagem." };
      return { imageUrl };
    }

    if (statusData.status === "failed") {
      console.error("FASHN prediction failed:", statusData.error);
      return { error: statusData.error ?? "Falha na geração da imagem." };
    }

    // Still processing — continue polling
  }

  return { error: "Timeout: provador demorou demais. Tente novamente." };
}

// ============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const payload = (await req.json()) as TryonPayload;
    if (!payload.userImageDataUrl?.startsWith("data:image/")) {
      return new Response(JSON.stringify({ error: "Envie uma foto do usuário (frente)." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- Quota check (2 créditos — feature mais cara) ---
    const authHeader = req.headers.get("Authorization") ?? "";
    const quota = await checkAndIncrementQuota(authHeader, "tryon", 2);
    if (!quota.allowed) {
      return quotaExceededResponse(quota, corsHeaders);
    }

    // --- Resolve garment image ---
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

    // --- FASHN AI: Generate try-on image ---
    const fashnApiKey = Deno.env.get("FASHN_API_KEY");
    if (!fashnApiKey) {
      return new Response(JSON.stringify({ error: "Provador virtual indisponível (FASHN_API_KEY não configurada)." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const category = payload.category ?? "auto";
    const fashnResult = await runFashnTryon(fashnApiKey, payload.userImageDataUrl, garmentDataUrl, category);

    if (fashnResult.error || !fashnResult.imageUrl) {
      return new Response(JSON.stringify({ error: fashnResult.error ?? "Falha ao gerar provador virtual." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Gemini Flash: Styling advice (parallel-safe, runs after image is ready) ---
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    let advice: Record<string, unknown> = {};

    if (lovableApiKey) {
      const measurementsText = payload.measurements
        ? Object.entries(payload.measurements).filter(([, v]) => v).map(([k, v]) => `${k}=${v}cm`).join(", ")
        : "sem medidas informadas";

      const advicePrompt = `Você é o consultor de moda e sizing do app Encaixe. Com base nos dados abaixo, responda APENAS JSON válido em pt-BR.

DADOS DO CLIENTE:
- Medidas corporais: ${measurementsText}
- Tipo corporal: ${payload.bodyType ?? "não informado"}
- Gênero/modelagem: ${payload.gender ?? "não informado"}
- Tamanho indicado pelo cliente: ${payload.brandSize ?? "não informado"}

DADOS DO PRODUTO:
${productContext || "Imagem da peça fornecida (sem dados de tabela de medidas)."}
- Notas do cliente: ${payload.notes ?? "nenhuma"}

RESPONDA no formato exato:
{
  "size_advice": "Recomendação clara de tamanho (P/M/G/GG ou número) com justificativa baseada nas medidas vs tabela da marca. Se não houver tabela, use heurísticas padrão brasileiras.",
  "fit_notes": ["ponto de atenção 1 sobre caimento", "ponto 2", "ponto 3"],
  "confidence": "alta|media|baixa",
  "combinations": [
    {"title": "Look 1", "pieces": ["peça complementar 1", "peça 2"], "occasion": "ocasião"}
  ],
  "color_harmony": {
    "garment_color_name": "nome da cor da peça",
    "harmony_with_skin": "alta|media|baixa",
    "explanation": "como a cor dialoga com o subtom do cliente",
    "combine_with": [{"piece": "calça/saia/sapato", "color": "cor sugerida", "why": "motivo"}]
  }
}

Se não tiver dados suficientes para algum campo, use "confidence": "baixa" e explique.`;

      try {
        const adviceResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "Você é consultor de moda especialista em sizing e colorimetria. Responda apenas JSON válido em pt-BR." },
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

        if (adviceResp.ok) {
          const adviceData = await adviceResp.json();
          const content = adviceData.choices?.[0]?.message?.content;
          try {
            advice = typeof content === "string" ? JSON.parse(content.replace(/^```json\s*|\s*```$/g, "")) : (content ?? {});
          } catch (e) {
            console.error("Advice parse error", e);
          }
        }
      } catch (e) {
        console.error("Advice call failed (non-blocking):", e);
      }
    }

    // --- Return combined result ---
    return new Response(JSON.stringify({
      tryonImage: fashnResult.imageUrl,
      advice,
      productContext: productContext.slice(0, 500),
      provider: "fashn-v1.6",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("virtual-tryon error", error);
    return new Response(JSON.stringify({ error: "Erro inesperado ao gerar provador." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
