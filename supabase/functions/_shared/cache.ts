// Simple in-memory + Supabase-based cache for AI analysis results.
// Caches are keyed by a hash of the input parameters.
// TTL: 7 days for body/color analyses.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Simple hash function for cache keys (FNV-1a inspired)
function hashInput(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Gera uma cache key baseada nos parâmetros relevantes da análise.
 * Exclui dados voláteis (timestamps, etc.) para maximizar cache hits.
 */
export function buildCacheKey(
  feature: string,
  userId: string,
  params: Record<string, unknown>
): string {
  // Para imagens, usa apenas os primeiros 200 chars do data URL como fingerprint
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value.startsWith("data:image/")) {
      // Use image size + first/last bytes as fingerprint (não o conteúdo inteiro)
      normalized[key] = `img:${value.length}:${value.slice(0, 80)}:${value.slice(-40)}`;
    } else if (value !== undefined && value !== null) {
      normalized[key] = value;
    }
  }
  const raw = `${feature}:${userId}:${JSON.stringify(normalized)}`;
  return `${feature}_${hashInput(raw)}`;
}

/**
 * Tenta buscar resultado cacheado do banco.
 * Retorna null se não encontrado ou expirado.
 */
export async function getCachedResult(
  cacheKey: string
): Promise<unknown | null> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("analysis_cache")
      .select("result, created_at")
      .eq("cache_key", cacheKey)
      .maybeSingle();

    if (error || !data) return null;

    // Verifica TTL
    const age = Date.now() - new Date(data.created_at).getTime();
    if (age > CACHE_TTL_MS) {
      // Expirado — limpa async (fire and forget)
      supabase.from("analysis_cache").delete().eq("cache_key", cacheKey).then(() => {});
      return null;
    }

    return data.result;
  } catch {
    return null;
  }
}

/**
 * Salva resultado no cache.
 */
export async function setCachedResult(
  cacheKey: string,
  userId: string,
  feature: string,
  result: unknown
): Promise<void> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase.from("analysis_cache").upsert(
      {
        cache_key: cacheKey,
        user_id: userId,
        feature,
        result,
        created_at: new Date().toISOString(),
      },
      { onConflict: "cache_key" }
    );
  } catch (err) {
    console.error("Cache write failed (non-blocking):", err);
  }
}
