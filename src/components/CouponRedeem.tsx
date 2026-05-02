import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Ticket, Sparkles, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: "Faça login para resgatar.",
  invalid_code: "Cupom inválido.",
  inactive: "Cupom desativado.",
  expired: "Cupom expirado ou ainda não disponível.",
  limit_reached: "Limite de usos atingido.",
  audience_mismatch: "Este cupom não é elegível para o seu tipo de conta.",
  already_redeemed: "Você já resgatou este cupom.",
  no_profile: "Perfil não encontrado.",
  team_too_large: "Este cupom é válido apenas para times menores. Veja /planos.",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

export function CouponRedeem() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [accessUntil, setAccessUntil] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("premium_access_until")
        .maybeSingle();
      const until = (data as { premium_access_until?: string | null } | null)?.premium_access_until ?? null;
      if (until && new Date(until) > new Date()) setAccessUntil(until);
    })();
  }, []);

  const handleRedeem = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    if (trimmed.length > 64) {
      toast({ title: "Código inválido", description: "Máximo 64 caracteres.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("redeem_coupon" as never, { _code: trimmed } as never);
    setLoading(false);

    if (error) {
      toast({ title: "Erro ao resgatar", description: error.message, variant: "destructive" });
      return;
    }
    const result = data as { success: boolean; error?: string; access_until?: string; access_days?: number };
    if (!result?.success) {
      toast({
        title: "Não foi possível resgatar",
        description: ERROR_MESSAGES[result?.error ?? ""] ?? "Tente novamente.",
        variant: "destructive",
      });
      if (result?.error === "already_redeemed" && result.access_until) {
        setAccessUntil(result.access_until);
      }
      return;
    }
    setAccessUntil(result.access_until ?? null);
    setCode("");
    toast({
      title: "Cupom aplicado! 🎉",
      description: `Acesso liberado até ${formatDate(result.access_until!)}.`,
    });
  };

  if (accessUntil) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="bg-gradient-to-br from-accent/15 via-card/80 to-primary/10 border-accent/40 shadow-panel">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5">
            <div className="h-12 w-12 rounded-2xl bg-accent/25 grid place-items-center shrink-0">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Acesso premium ativo</p>
              <p className="font-display text-lg mt-1 flex items-center gap-2">
                <Check className="h-4 w-4 text-accent" /> Liberado até {formatDate(accessUntil)}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <Card className="bg-card/70 backdrop-blur border-border shadow-panel">
      <CardContent className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-5">
        <div className="flex items-center gap-3 flex-1">
          <div className="h-11 w-11 rounded-2xl bg-primary/15 grid place-items-center shrink-0">
            <Ticket className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Tem um cupom?</p>
            <p className="text-sm text-foreground/80">Resgate seu código de acesso promocional.</p>
          </div>
        </div>
        <div className="flex gap-2 sm:w-auto w-full">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="LANCAMENTO100"
            maxLength={64}
            className="uppercase tracking-wider"
            onKeyDown={(e) => e.key === "Enter" && handleRedeem()}
          />
          <Button onClick={handleRedeem} disabled={loading || !code.trim()} className="rounded-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
