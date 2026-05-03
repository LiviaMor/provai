import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap, TrendingUp, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

type UsageStatus = {
  credits_used: number;
  credits_limit: number;
  remaining: number;
  resets_at: string;
  breakdown: {
    body_analyses: number;
    color_analyses: number;
    tryon_uses: number;
    scale_detections: number;
  };
};

export function UsageQuota() {
  const [usage, setUsage] = useState<UsageStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_usage_status" as never);
      setLoading(false);
      if (error || !data) return;
      const result = data as unknown as UsageStatus;
      if (result.credits_limit !== undefined) {
        setUsage(result);
      }
    })();
  }, []);

  if (loading || !usage) return null;

  const isUnlimited = usage.credits_limit <= 0;
  const percentage = isUnlimited ? 0 : Math.min(100, Math.round((usage.credits_used / usage.credits_limit) * 100));
  const isWarning = percentage >= 80;
  const isCritical = percentage >= 95;

  const resetDate = new Date(usage.resets_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={`border shadow-panel ${
        isCritical ? "bg-destructive/10 border-destructive/40" :
        isWarning ? "bg-yellow-500/10 border-yellow-500/40" :
        "bg-card/70 backdrop-blur border-border"
      }`}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`h-9 w-9 rounded-xl grid place-items-center ${
                isCritical ? "bg-destructive text-destructive-foreground" :
                isWarning ? "bg-yellow-500 text-white" :
                "bg-primary/15 text-primary"
              }`}>
                {isCritical ? <AlertTriangle className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Uso mensal</p>
                <p className="font-display text-sm">
                  {isUnlimited ? "Ilimitado" : `${usage.credits_used} / ${usage.credits_limit} créditos`}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px]">
              Renova {resetDate}
            </Badge>
          </div>

          {!isUnlimited && (
            <>
              <Progress value={percentage} className="h-2" />
              <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
                <span>{usage.remaining} restantes</span>
                <span>{percentage}% usado</span>
              </div>
            </>
          )}

          {/* Breakdown */}
          <div className="mt-3 grid grid-cols-4 gap-2">
            <BreakdownItem label="Corpo" value={usage.breakdown.body_analyses} />
            <BreakdownItem label="Cor" value={usage.breakdown.color_analyses} />
            <BreakdownItem label="Try-on" value={usage.breakdown.tryon_uses} cost={2} />
            <BreakdownItem label="Escala" value={usage.breakdown.scale_detections} />
          </div>

          {isCritical && (
            <p className="mt-3 text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Quota quase esgotada. Considere fazer upgrade do plano.
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function BreakdownItem({ label, value, cost = 1 }: { label: string; value: number; cost?: number }) {
  return (
    <div className="text-center">
      <p className="font-display text-lg">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      {cost > 1 && <p className="text-[9px] text-muted-foreground">({cost} créd.)</p>}
    </div>
  );
}
