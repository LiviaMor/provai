import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Users, Sparkles, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

type Tier = {
  id: string;
  name: string;
  range: string;
  min: number;
  max: number | null;
  price: number | null;
  perks: string[];
  cta: string;
  highlight?: boolean;
};

const TIERS: Tier[] = [
  {
    id: "starter",
    name: "Starter",
    range: "1–5 usuários",
    min: 1,
    max: 5,
    price: 149.9,
    perks: [
      "30 análises/seat/mês incluídas",
      "Análise corporal + coloração",
      "Recomendações de tamanho",
      "Suporte por e-mail",
    ],
    cta: "Começar com Starter",
  },
  {
    id: "growth",
    name: "Growth",
    range: "6–20 usuários",
    min: 6,
    max: 20,
    price: 99.9,
    perks: [
      "Tudo do Starter",
      "40 análises/seat/mês incluídas",
      "Provador virtual incluso",
      "Painel B2B com múltiplos seats",
      "Suporte prioritário",
    ],
    cta: "Escolher Growth",
    highlight: true,
  },
  {
    id: "scale",
    name: "Scale",
    range: "21–50 usuários",
    min: 21,
    max: 50,
    price: 79.9,
    perks: [
      "Tudo do Growth",
      "60 análises/seat/mês incluídas",
      "Onboarding guiado",
      "Branding personalizado",
      "SLA dedicado",
    ],
    cta: "Escolher Scale",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    range: "100+ usuários",
    min: 100,
    max: null,
    price: null,
    perks: [
      "Tudo do Scale",
      "Análises ilimitadas",
      "Integrações customizadas",
      "Gestor de conta dedicado",
      "Contrato e faturamento sob medida",
    ],
    cta: "Falar com vendas",
  },
];

const tierForUsers = (n: number): Tier => {
  if (n >= 100) return TIERS[3];
  if (n >= 21) return TIERS[2];
  if (n >= 6) return TIERS[1];
  return TIERS[0];
};

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Planos() {
  const [users, setUsers] = useState(8);
  const tier = useMemo(() => tierForUsers(users), [users]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border/60">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-5 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <Building2 className="h-4 w-4" /> Planos B2B
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-2xl mx-auto"
        >
          <Badge variant="secondary" className="rounded-full">Para times e marcas</Badge>
          <h1 className="font-display text-4xl sm:text-5xl mt-4 leading-tight">
            Escalone conforme o seu time cresce
          </h1>
          <p className="text-muted-foreground mt-3">
            Cobrança mensal por faixa de usuários. Comece pequeno e expanda quando precisar.
          </p>
        </motion.div>

        {/* Simulator */}
        <Card className="mt-10 border-border/60 bg-card/70 backdrop-blur-xl shadow-panel">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row gap-8 lg:items-center">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  <Users className="h-4 w-4" /> Simulador de preço
                </div>
                <p className="font-display text-2xl mt-2">
                  Quantos usuários no seu time?
                </p>
                <div className="mt-6">
                  <Slider
                    value={[users]}
                    min={1}
                    max={120}
                    step={1}
                    onValueChange={(v) => setUsers(v[0] ?? 1)}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>1</span>
                    <span>120+</span>
                  </div>
                </div>
              </div>

              <div className="lg:w-80 rounded-2xl border border-border/60 bg-background/40 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{tier.name} • {tier.range}</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-display text-4xl">{users}</span>
                  <span className="text-muted-foreground text-sm">usuário{users > 1 ? "s" : ""}</span>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  {tier.price !== null ? (
                    <>
                      <span className="font-display text-3xl">{formatBRL(tier.price)}</span>
                      <span className="text-muted-foreground text-sm">/seat/mês</span>
                    </>
                  ) : (
                    <span className="font-display text-2xl">Sob consulta</span>
                  )}
                </div>
                <Button asChild className="w-full mt-5 rounded-full">
                  <a
                    href={
                      tier.price === null
                        ? "mailto:contato@provai.app?subject=Plano%20Enterprise"
                        : "/auth"
                    }
                  >
                    {tier.cta}
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tiers grid */}
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {TIERS.map((t) => {
            const isCurrent = t.id === tier.id;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35 }}
              >
                <Card
                  className={`h-full border bg-card/70 backdrop-blur-xl transition ${
                    isCurrent
                      ? "border-primary/60 shadow-panel ring-1 ring-primary/30"
                      : "border-border/60"
                  } ${t.highlight ? "relative" : ""}`}
                >
                  {t.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="rounded-full">
                        <Sparkles className="h-3 w-3 mr-1" /> Mais escolhido
                      </Badge>
                    </div>
                  )}
                  <CardContent className="p-6 flex flex-col h-full">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t.range}</p>
                    <h3 className="font-display text-2xl mt-1">{t.name}</h3>
                    <div className="mt-3 flex items-baseline gap-1">
                      {t.price !== null ? (
                        <>
                          <span className="font-display text-3xl">{formatBRL(t.price)}</span>
                          <span className="text-muted-foreground text-sm">/seat/mês</span>
                        </>
                      ) : (
                        <span className="font-display text-2xl">Sob consulta</span>
                      )}
                    </div>
                    <ul className="mt-4 space-y-2 flex-1">
                      {t.perks.map((p) => (
                        <li key={p} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      asChild
                      variant={isCurrent ? "default" : "outline"}
                      className="w-full mt-5 rounded-full"
                    >
                      <a
                        href={
                          t.price === null
                            ? "mailto:contato@provai.app?subject=Plano%20Enterprise"
                            : "/auth"
                        }
                      >
                        {t.cta}
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Valores em BRL, cobrança mensal. Cupons promocionais podem ter limite de tamanho de time.
        </p>
      </main>
    </div>
  );
}
