import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Camera,
  Check,
  Palette,
  Ruler,
  Shirt,
  Sparkles,
  Star,
  TrendingDown,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2 font-display text-xl tracking-tight">
            <span className="h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center text-sm font-bold">P</span>
            <span>provAI</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/planos">
              <Button variant="ghost" size="sm">Planos</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="rounded-full gap-1.5">
                Entrar <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <motion.div
          initial="hidden"
          animate="visible"
          className="text-center max-w-3xl mx-auto"
        >
          <motion.div variants={fadeUp} custom={0}>
            <Badge variant="secondary" className="rounded-full px-4 py-1.5 text-xs">
              <Sparkles className="h-3 w-3 mr-1.5" /> Provador virtual com IA para profissionais
            </Badge>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            custom={1}
            className="mt-6 font-display text-4xl sm:text-6xl leading-[1.08] tracking-tight text-balance"
          >
            Vista seu cliente antes
            <br />
            <span className="text-primary">da compra acontecer</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={2}
            className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto"
          >
            Análise corporal, colorimetria pessoal e provador virtual em uma única plataforma.
            Reduza devoluções e aumente conversões com recomendações de tamanho precisas.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link to="/auth">
              <Button size="lg" className="rounded-full gap-2 text-base px-8">
                Começar grátis <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#como-funciona">
              <Button size="lg" variant="outline" className="rounded-full text-base px-8">
                Ver como funciona
              </Button>
            </a>
          </motion.div>

          <motion.div variants={fadeUp} custom={4} className="mt-6 flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5 text-primary" /> 3 análises grátis</span>
            <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5 text-primary" /> Sem cartão</span>
            <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5 text-primary" /> Resultado em segundos</span>
          </motion.div>
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 flex items-center justify-center gap-6 text-sm text-muted-foreground"
        >
          <div className="flex -space-x-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/60 to-accent/60 border-2 border-background" />
            ))}
          </div>
          <span>
            <strong className="text-foreground">150+</strong> consultoras já usam esta semana
          </span>
        </motion.div>

        {/* Scanner visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-14 mx-auto max-w-sm"
        >
          <div className="relative aspect-[3/4] rounded-[2rem] border-2 border-primary/30 bg-gradient-to-b from-card/80 to-secondary/60 overflow-hidden shadow-panel">
            {/* Body silhouette */}
            <div className="absolute left-1/2 top-12 size-16 -translate-x-1/2 rounded-full border-2 border-primary/40" />
            <div className="absolute left-1/2 top-28 h-48 w-24 -translate-x-1/2 rounded-full border-2 border-accent/50" />
            <div className="absolute left-1/2 top-[11rem] h-36 w-16 -translate-x-1/2 border-x-2 border-primary/30" />

            {/* Scan line animation */}
            <div className="absolute inset-x-4 top-0 h-20 animate-scan bg-scanner-line" />

            {/* Grid overlay */}
            <div className="absolute inset-0 scan-grid rounded-[2rem] opacity-40" />

            {/* Measurement labels */}
            <div className="absolute top-20 left-3 text-[9px] font-mono text-primary/70 bg-card/80 px-1.5 py-0.5 rounded">busto 92cm</div>
            <div className="absolute top-36 right-3 text-[9px] font-mono text-accent/80 bg-card/80 px-1.5 py-0.5 rounded">cintura 74cm</div>
            <div className="absolute top-52 left-3 text-[9px] font-mono text-primary/70 bg-card/80 px-1.5 py-0.5 rounded">quadril 99cm</div>

            {/* Bottom badge */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur border border-border rounded-full px-4 py-1.5 text-xs font-medium text-foreground shadow-lg">
              <Sparkles className="h-3 w-3 inline mr-1.5 text-accent" />
              Escaneando medidas...
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features grid */}
      <section className="bg-card/50 border-y border-border/40 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display text-3xl sm:text-4xl">Tudo que você precisa para vender com confiança</h2>
            <p className="mt-3 text-muted-foreground">
              Da foto do cliente à recomendação de tamanho — em segundos, não em horas.
            </p>
          </div>

          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Camera, title: "Análise Corporal", desc: "Foto frontal + lateral → medidas precisas, tipo corporal, IMC e composição estimada." },
              { icon: Palette, title: "Colorimetria Pessoal", desc: "Identifica a estação cromática (12 estações) com paleta completa, makeup e metais." },
              { icon: Shirt, title: "Provador Virtual", desc: "Veja a roupa no corpo do cliente com IA de difusão — qualidade de e-commerce." },
              { icon: Ruler, title: "Recomendação de Tamanho", desc: "Cruza medidas reais com a tabela da marca. Diz P, M ou G com justificativa." },
              { icon: TrendingDown, title: "Menos Devoluções", desc: "Clientes compram o tamanho certo na primeira vez. Menos troca = mais margem." },
              { icon: Users, title: "Painel B2B Multi-seat", desc: "Gerencie seu time de consultoras com quotas, histórico e insights por seat." },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Card className="h-full bg-background/60 border-border/60 hover:border-primary/40 transition-colors">
                  <CardContent className="p-6">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="mt-4 font-display text-lg">{feature.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{feature.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center max-w-2xl mx-auto">
            <Badge variant="secondary" className="rounded-full">3 passos simples</Badge>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl">Da foto à recomendação em segundos</h2>
          </div>

          <div className="mt-14 grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Envie a foto",
                desc: "Foto frontal do cliente (e lateral opcional). Pode ser selfie ou foto profissional.",
                icon: Camera,
              },
              {
                step: "02",
                title: "Cole o link do produto",
                desc: "Link da loja online. Extraímos imagens, tabela de medidas e dados da peça automaticamente.",
                icon: Zap,
              },
              {
                step: "03",
                title: "Receba tudo pronto",
                desc: "Provador virtual + tamanho ideal + notas de caimento + harmonia de cor. Tudo em um resultado.",
                icon: Sparkles,
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 grid place-items-center">
                  <item.icon className="h-7 w-7 text-primary" />
                </div>
                <span className="mt-4 block text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{item.step}</span>
                <h3 className="mt-2 font-display text-xl">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiators */}
      <section className="bg-card/50 border-y border-border/40 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display text-3xl sm:text-4xl">Por que o provAI é diferente</h2>
            <p className="mt-3 text-muted-foreground">
              Não somos um organizador de closet. Somos a ferramenta que faz a venda acontecer.
            </p>
          </div>

          <div className="mt-12 grid md:grid-cols-2 gap-6">
            <Card className="bg-background/60 border-border/60">
              <CardContent className="p-6">
                <h3 className="font-display text-lg flex items-center gap-2">
                  <Star className="h-5 w-5 text-accent" /> Provador Virtual Real
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Modelo de difusão especializado (FASHN AI) — não é um filtro genérico.
                  Preserva identidade facial, tom de pele e transfere textura da roupa com fidelidade.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-background/60 border-border/60">
              <CardContent className="p-6">
                <h3 className="font-display text-lg flex items-center gap-2">
                  <Ruler className="h-5 w-5 text-accent" /> Sizing Inteligente
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Cruza medidas corporais reais com a tabela de medidas da marca (extraída automaticamente do link).
                  Diz "compre M porque sua cintura é 78cm e a faixa M é 76-82cm".
                </p>
              </CardContent>
            </Card>
            <Card className="bg-background/60 border-border/60">
              <CardContent className="p-6">
                <h3 className="font-display text-lg flex items-center gap-2">
                  <Palette className="h-5 w-5 text-accent" /> Colorimetria Completa
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  12 estações cromáticas com paleta de cores, makeup, metais e guarda-roupa ideal.
                  Nenhum concorrente oferece isso integrado ao provador.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-background/60 border-border/60">
              <CardContent className="p-6">
                <h3 className="font-display text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-accent" /> Feito para B2B
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Multi-seat, quotas por time, histórico de clientes, cupons promocionais.
                  Ideal para consultoras de imagem, personal stylists e lojas de moda.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5 text-center">
          <h2 className="font-display text-3xl sm:text-4xl">Comece grátis, escale quando precisar</h2>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
            3 análises gratuitas para experimentar. Depois, planos a partir de R$79,90/seat/mês com quotas generosas.
          </p>

          <div className="mt-10 grid sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
            {[
              { name: "Free", price: "R$0", desc: "3 análises para testar", cta: "Criar conta" },
              { name: "Growth", price: "R$99,90", desc: "/seat/mês · 40 análises", cta: "Começar agora", highlight: true },
              { name: "Enterprise", price: "Sob consulta", desc: "Ilimitado + integrações", cta: "Falar com vendas" },
            ].map((plan) => (
              <Card
                key={plan.name}
                className={`${plan.highlight ? "border-primary/60 ring-1 ring-primary/30 shadow-lg" : "border-border/60"} bg-background/60`}
              >
                <CardContent className="p-6 text-center">
                  {plan.highlight && (
                    <Badge className="rounded-full mb-3">Mais escolhido</Badge>
                  )}
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{plan.name}</p>
                  <p className="mt-2 font-display text-2xl">{plan.price}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.desc}</p>
                  <Link to={plan.name === "Enterprise" ? "/planos" : "/auth"}>
                    <Button
                      variant={plan.highlight ? "default" : "outline"}
                      className="w-full mt-4 rounded-full"
                      size="sm"
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          <Link to="/planos" className="inline-block mt-6 text-sm text-muted-foreground hover:text-foreground">
            Ver todos os planos →
          </Link>
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t border-border/40 py-16">
        <div className="mx-auto max-w-6xl px-5 text-center">
          <h2 className="font-display text-2xl sm:text-3xl">Pronto para vender com mais confiança?</h2>
          <p className="mt-3 text-muted-foreground">
            Crie sua conta em 30 segundos. Sem cartão, sem compromisso.
          </p>
          <Link to="/auth">
            <Button size="lg" className="mt-6 rounded-full gap-2 text-base px-8">
              Começar agora <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="mx-auto max-w-6xl px-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>© 2026 provAI. Todos os direitos reservados.</span>
          <div className="flex gap-4">
            <Link to="/planos" className="hover:text-foreground">Planos</Link>
            <Link to="/coloracao" className="hover:text-foreground">Colorimetria</Link>
            <Link to="/auth" className="hover:text-foreground">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
