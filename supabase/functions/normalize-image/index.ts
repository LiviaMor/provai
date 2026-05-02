// Edge Function: normalize-image
// Recebe uma imagem (data URL base64 ou URL http(s)) e devolve sempre
// um PNG válido binário (Content-Type: image/png) para download.
// Se a entrada não for uma imagem reconhecível, tenta re-encodar via canvas server-side
// (usando ImageScript) garantindo um PNG válido como saída.

import { decode as decodeImage, Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

const SUPPORTED_INPUT_MIMES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];

function sniffMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return "image/webp";
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return "image/gif";
  return null;
}

async function bytesFromInput(src: string): Promise<{ bytes: Uint8Array; mime: string }> {
  if (typeof src !== "string" || src.length === 0) {
    throw new Error("Entrada vazia");
  }

  if (src.startsWith("data:")) {
    const commaIdx = src.indexOf(",");
    if (commaIdx === -1) throw new Error("Data URL malformada");
    const meta = src.slice(0, commaIdx);
    const payload = src.slice(commaIdx + 1);
    const declaredMime = meta.match(/data:(.*?)(;base64)?$/)?.[1] ?? "";
    const isBase64 = /;base64/i.test(meta);
    if (!isBase64) throw new Error("Esperado data URL em base64");
    const cleaned = payload.replace(/\s+/g, "");
    if (!/^[A-Za-z0-9+/=]+$/.test(cleaned)) throw new Error("Base64 inválido");
    let bin: string;
    try {
      bin = atob(cleaned);
    } catch {
      throw new Error("Falha ao decodificar base64");
    }
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const sniffed = sniffMime(bytes);
    const mime = sniffed ?? (SUPPORTED_INPUT_MIMES.includes(declaredMime) ? declaredMime : "");
    if (!mime) throw new Error("Tipo de imagem não reconhecido");
    return { bytes, mime };
  }

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    throw new Error("URL inválida");
  }
  if (!/^https?:$/.test(url.protocol)) throw new Error("Protocolo não suportado");
  if (isBlockedHost(url.hostname)) throw new Error("Host não permitido");
  const res = await fetch(url.toString(), { redirect: "manual" });
  if (res.status >= 300 && res.status < 400) throw new Error("Redirecionamentos não são permitidos");
  if (!res.ok) throw new Error(`HTTP ${res.status} ao baixar imagem`);
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length === 0) throw new Error("Resposta vazia");
  const sniffed = sniffMime(buf);
  const headerMime = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
  const mime = sniffed ?? (SUPPORTED_INPUT_MIMES.includes(headerMime) ? headerMime : "");
  if (!mime) throw new Error("Conteúdo retornado não é uma imagem suportada");
  return { bytes: buf, mime };
}

async function toPng(bytes: Uint8Array, mime: string): Promise<Uint8Array> {
  // Se já é PNG e decodifica corretamente, devolve direto.
  if (mime === "image/png") {
    try {
      const img = await decodeImage(bytes);
      if (img && (img as Image).width > 0 && (img as Image).height > 0) {
        return bytes;
      }
    } catch {
      // cai no re-encode abaixo
    }
  }
  // Re-encoda para PNG válido
  const decoded = await decodeImage(bytes);
  if (!(decoded instanceof Image)) {
    throw new Error("Formato animado/multi-frame não suportado para conversão");
  }
  if (decoded.width <= 0 || decoded.height <= 0) {
    throw new Error("Dimensões inválidas");
  }
  return await decoded.encode();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json().catch(() => ({}));
    const src: string | undefined = body?.src ?? body?.image ?? body?.url;
    if (!src) {
      return new Response(JSON.stringify({ error: "Campo 'src' obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { bytes, mime } = await bytesFromInput(src);
    const png = await toPng(bytes, mime);

    const filename = `provador-encaixe-${Date.now()}.png`;
    return new Response(png, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("normalize-image failed", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 422,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
