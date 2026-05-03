// Shared quota check + increment for edge functions
// Usage: import { checkAndIncrementQuota } from "../_shared/quota.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type QuotaResult = {
  allowed: boolean;
  error?: string;
  used?: number;
  limit?: number;
  remaining?: number;
  resets_at?: string;
};

/**
 * Verifica e incrementa a quota do usuário autenticado.
 * Retorna { allowed: true } se pode prosseguir, ou { allowed: false, error } se excedeu.
 *
 * @param authHeader - Header "Bearer <token>" do request
 * @param feature - 'body' | 'color' | 'tryon' | 'scale'
 * @param credits - Número de créditos a consumir (default: 1)
 */
export async function checkAndIncrementQuota(
  authHeader: string,
  feature: "body" | "color" | "tryon" | "scale",
  credits = 1
): Promise<QuotaResult> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Extrair user_id do token
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData?.user) {
    return { allowed: false, error: "not_authenticated" };
  }

  // Chamar a função RPC com o contexto do usuário
  const userSupabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data, error } = await userSupabase.rpc("increment_usage", {
    _feature: feature,
    _credits: credits,
  });

  if (error) {
    console.error("Quota check failed:", error);
    // Em caso de erro no sistema de quota, permite (fail-open para não bloquear)
    return { allowed: true };
  }

  const result = data as unknown as QuotaResult;
  return result;
}

/**
 * Gera uma Response HTTP 429 padronizada quando quota é excedida.
 */
export function quotaExceededResponse(
  quota: QuotaResult,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: "Limite de análises atingido este mês.",
      quota_used: quota.used,
      quota_limit: quota.limit,
      resets_at: quota.resets_at,
      upgrade_url: "/planos",
    }),
    {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
