import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import {
  ArrowRight,
  Camera,
  Check,
  ChevronRight,
  Palette,
  Ruler,
  ScanLine,
  Shirt,
  ShoppingBag,
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
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
};

const stats = [
  { value: "30s", label: "para análise completa" },
  { value: "85%", label: "acurácia de tamanho" },
  { value: "12", label: "estações cromáticas" },
  { value: "R$0", label: "para começar" },
];

export default function Landing() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/30">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-5 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src="/provai.png" alt="provAI" className="h-8 w-auto" />
          </Link>
          <div className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#como-funciona" className="hover:text-foreground transition-colors">Como funciona</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Preços</a>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">Entrar</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="rounded-full gap-1.5 px-5">
                Testar grátis <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-5 pt-16 pb-8 sm:pt-24 sm:pb-12">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
            {/* Left — Copy */}
            <motion.div initial="hidden" animate="visible">
              <motion.div variants={fadeUp} custom={0}>
                <Badge variant="secondary" className="rounded-full px-4 py-1.5 text-xs gap-1.5">
                  <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-accent" /></span>
                  Usado por consultoras em 4 estados
                </Badge>
              </motion.div>

              <motion.h1 variants={fadeUp} custom={1} className="mt-6 font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.06] tracking-tight">
                O provador virtual que
                <span className="block bg-gradient-to-r from-primary via-accent to-primary-glow bg-clip-text text-transparent"> recomenda o tamanho certo</span>
              </motion.h1>

              <motion.p variants={fadeUp} custom={2} className="mt-5 text-lg text-muted-foreground max-w-lg">
                Foto do cliente + link da roupa = imagem vestindo a peça + recomendação de tamanho com justificativa. Tudo em 30 segundos.
              </motion.p>

              <motion.div variants={fadeUp} custom={3} className="mt-8 flex flex-wrap gap-3">
                <Link to="/auth">
                  <Button size="lg" className="rounded-full gap-2 text-base px-8 shadow-glow">
                    Começar grátis <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="#como-funciona">
                  <Button size="lg" variant="outline" className="rounded-full text-base px-6">
                    Ver demo
                  </Button>
                </a>
              </motion.div>

              <motion.div variants={fadeUp} custom={4} className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {["3 análises grátis", "Sem cartão", "Setup em 30s"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" /> {t}</span>
                ))}
              </motion.div>
            </motion.div>

            {/* Right — Scanner visual */}
            <motion.div
              style={{ y: heroY, opacity: heroOpacity }}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="relative mx-auto w-full max-w-xs lg:max-w-sm"
            >
              <div className="relative aspect-[3/4] rounded-[2rem] border border-primary/20 bg-gradient-to-b from-card via-card/80 to-secondary/40 overflow-hidden shadow-panel">
                {/* Silhouette */}
                <div className="absolute left-1/2 top-[10%] size-[18%] -translate-x-1/2 rounded-full border-2 border-primary/30" />
                <div className="absolute left-1/2 top-[26%] h-[38%] w-[28%] -translate-x-1/2 rounded-[40%] border-2 border-accent/40" />
                <div className="absolute left-1/2 top-[58%] h-[30%] w-[18%] -translate-x-1/2 border-x-2 border-primary/20 rounded-b-lg" />

                {/* Scan */}
                <div className="absolute inset-x-4 top-0 h-24 animate-scan bg-scanner-line" />
                <div className="absolute inset-0 scan-grid rounded-[2rem] opacity-30" />

                {/* Floating measurement chips */}
                <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  className="absolute top-[22%] left-2 text-[10px] font-mono bg-card/90 backdrop-blur border border-border/60 px-2 py-1 rounded-lg shadow-sm">
                  <span className="text-primary font-bold">busto</span> 92cm
                </motion.div>
                <motion.div animate={{ y: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 0.5 }}
                  className="absolute top-[42%] right-2 text-[10px] font-mono bg-card/90 backdrop-blur border border-accent/40 px-2 py-1 rounded-lg shadow-sm">
                  <span className="text-accent font-bold">cintura</span> 74cm
                </motion.div>
                <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut", delay: 1 }}
                  className="absolute top-[58%] left-2 text-[10px] font-mono bg-card/90 backdrop-blur border border-border/60 px-2 py-1 rounded-lg shadow-sm">
                  <span className="text-primary font-bold">quadril</span> 99cm
                </motion.div>

                {/* Result badge */}
                <div className="absolute bottom-3 inset-x-3">
                  <div className="bg-card/95 backdrop-blur border border-border/60 rounded-2xl p-3 shadow-lg">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="h-7 w-7 rounded-lg bg-accent/20 grid place-items-center"><Shirt className="h-3.5 w-3.5 text-accent" /></div>
                      <div>
                        <p className="font-bold text-foreground">Tamanho ideal: <span className="text-accent">M</span></p>
                        <p className="text-muted-foreground text-[10px]">Cintura 74cm → faixa M (72-80cm)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Glow effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/5 via-accent/10 to-primary/5 rounded-[3rem] blur-3xl -z-10" />
            </motion.div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="border-y border-border/30 bg-card/30 backdrop-blur">
          <div className="mx-auto max-w-6xl px-5 py-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
                <p className="font-display text-2xl sm:text-3xl text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem → Solution */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Problem */}
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <Card className="h-full border-destructive/20 bg-destructive/5">
                <CardContent className="p-7">
                  <p className="text-xs uppercase tracking-[0.2em] text-destructive/70 font-bold">O problema</p>
                  <h3 className="mt-3 font-display text-xl">Compras online devolvem 30-40% das roupas</h3>
                  <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                    {[
                      "Cliente não sabe se é P, M ou G naquela marca",
                      "Foto do site não mostra como fica no corpo real",
                      "Consultora gasta 45min por cliente com fita métrica",
                      "Loja perde margem com frete de devolução",
                    ].map((t) => (
                      <li key={t} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-destructive/50 shrink-0" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
            {/* Solution */}
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <Card className="h-full border-accent/20 bg-accent/5">
                <CardContent className="p-7">
                  <p className="text-xs uppercase tracking-[0.2em] text-accent/70 font-bold">A solução provAI</p>
                  <h3 className="mt-3 font-display text-xl">Foto + link = tamanho certo + provador virtual</h3>
                  <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                    {[
                      "IA estima medidas pela foto em 30 segundos",
                      "Cruza com tabela da marca e recomenda P, M ou G",
                      "Provador virtual mostra a roupa no corpo do cliente",
                      "Colorimetria identifica as cores que valorizam",
                    ].map((t) => (
                      <li key={t} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-card/40 border-y border-border/30 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center max-w-2xl mx-auto">
            <Badge variant="secondary" className="rounded-full">Plataforma completa</Badge>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl">Três ferramentas, um resultado</h2>
            <p className="mt-3 text-muted-foreground">Cada feature funciona sozinha, mas juntas criam algo que nenhum concorrente oferece.</p>
          </div>

          <div className="mt-14 grid lg:grid-cols-3 gap-6">
            {[
              {
                icon: ScanLine, color: "from-primary/20 to-primary/5", accent: "text-primary",
                title: "Análise Corporal",
                desc: "Foto frontal + lateral com captura guiada. Checklist de 8 pontos, calibração por marcador físico, grid postural. Medidas manuais opcionais para maior precisão.",
                features: ["Medidas em cm por visão computacional", "IMC, % gordura, tipo corporal", "Recomendação de tamanho por marca"],
              },
              {
                icon: Palette, color: "from-pink-500/20 to-amber-500/5", accent: "text-pink-500",
                title: "Colorimetria Pessoal",
                desc: "Análise de subtom, contraste e profundidade. Identifica sua estação entre 12 possíveis com paleta completa.",
                features: ["Paleta de 12 cores ideais + neutros", "Makeup: base, blush, batom, sombra", "Metais, cabelo e guarda-roupa ideal"],
              },
              {
                icon: Shirt, color: "from-violet-500/20 to-blue-500/5", accent: "text-violet-500",
                title: "Provador Virtual",
                desc: "Modelo de difusão especializado (FASHN AI). Preserva identidade, tom de pele e transfere textura da roupa com fidelidade de e-commerce.",
                features: ["Imagem realista em 5-8 segundos", "Suporta tops, bottoms, vestidos", "Consultoria de sizing integrada"],
              },
            ].map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }}>
                <Card className="h-full bg-background/80 border-border/50 hover:shadow-panel transition-shadow">
                  <CardContent className="p-7">
                    <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${f.color} grid place-items-center`}>
                      <f.icon className={`h-6 w-6 ${f.accent}`} />
                    </div>
                    <h3 className="mt-5 font-display text-xl">{f.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                    <ul className="mt-4 space-y-2">
                      {f.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2 text-sm">
                          <ChevronRight className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
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
            <Badge variant="secondary" className="rounded-full">3 passos</Badge>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl">Da foto ao resultado em 30 segundos</h2>
          </div>

          <div className="mt-14 relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-12 left-[16.5%] right-[16.5%] h-0.5 bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30" />

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: "01", title: "Tire a foto", desc: "Captura guiada com checklist ao vivo. Foto frontal + lateral, calibração de escala com cartão ou A4.", icon: Camera, color: "bg-primary" },
                { step: "02", title: "Cole o link", desc: "Link da loja online. Extraímos imagens, tabela de medidas, tecido e dados da peça automaticamente.", icon: Zap, color: "bg-accent" },
                { step: "03", title: "Resultado completo", desc: "Provador virtual + tamanho ideal + notas de caimento + paleta de cores. Compartilhe via WhatsApp.", icon: Sparkles, color: "bg-primary" },
              ].map((item, i) => (
                <motion.div key={item.step} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} className="text-center relative">
                  <div className={`mx-auto h-14 w-14 rounded-2xl ${item.color} text-primary-foreground grid place-items-center shadow-lg relative z-10`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <span className="mt-4 block text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Passo {item.step}</span>
                  <h3 className="mt-2 font-display text-xl">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="bg-card/40 border-y border-border/30 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display text-3xl sm:text-4xl">provAI vs o mercado</h2>
            <p className="mt-3 text-muted-foreground">O único que combina provador virtual + sizing + colorimetria.</p>
          </div>

          <div className="mt-10 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-3 px-4 text-muted-foreground font-normal">Feature</th>
                  <th className="py-3 px-4 font-display text-base text-accent">provAI</th>
                  <th className="py-3 px-4 text-muted-foreground">Zara VTON</th>
                  <th className="py-3 px-4 text-muted-foreground">AI Wardrobe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {[
                  ["Provador virtual", true, true, false],
                  ["Recomendação de tamanho", true, false, false],
                  ["Colorimetria pessoal", true, false, false],
                  ["Análise corporal com medidas", true, false, false],
                  ["Extração de tabela da marca", true, false, false],
                  ["B2B multi-seat", true, false, false],
                  ["Organização de closet", false, false, true],
                ].map(([feature, provai, zara, aiw]) => (
                  <tr key={feature as string} className="hover:bg-card/60 transition-colors">
                    <td className="py-3 px-4">{feature as string}</td>
                    <td className="py-3 px-4 text-center">{provai ? <Check className="h-5 w-5 text-accent mx-auto" /> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="py-3 px-4 text-center">{zara ? <Check className="h-5 w-5 text-muted-foreground/50 mx-auto" /> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="py-3 px-4 text-center">{aiw ? <Check className="h-5 w-5 text-muted-foreground/50 mx-auto" /> : <span className="text-muted-foreground">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-6xl px-5 text-center">
          <Badge variant="secondary" className="rounded-full">Preços transparentes</Badge>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl">Comece grátis, escale quando precisar</h2>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
            3 análises gratuitas. Sem cartão. Upgrade quando fizer sentido.
          </p>

          <div className="mt-10 grid sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
            {[
              { name: "Free", price: "R$0", period: "para sempre", desc: "3 análises para testar", cta: "Criar conta grátis", features: ["3 análises completas", "Provador virtual", "Colorimetria", "Recomendação de tamanho"] },
              { name: "Growth", price: "R$99,90", period: "/seat/mês", desc: "Para consultoras e lojas", cta: "Começar agora", highlight: true, features: ["40 análises/seat/mês", "Tudo do Free", "Painel B2B", "Suporte prioritário", "Histórico ilimitado"] },
              { name: "Enterprise", price: "Sob consulta", period: "", desc: "Para redes e franquias", cta: "Falar com vendas", features: ["Análises ilimitadas", "Integrações customizadas", "SLA dedicado", "Onboarding guiado"] },
            ].map((plan) => (
              <motion.div key={plan.name} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <Card className={`h-full ${plan.highlight ? "border-accent/50 ring-2 ring-accent/20 shadow-lg relative" : "border-border/50"} bg-background/80`}>
                  {plan.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><Badge className="rounded-full bg-accent text-accent-foreground shadow-sm">Mais escolhido</Badge></div>}
                  <CardContent className="p-6 text-center flex flex-col h-full">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{plan.name}</p>
                    <div className="mt-2 flex items-baseline justify-center gap-1">
                      <span className="font-display text-3xl">{plan.price}</span>
                      {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{plan.desc}</p>
                    <ul className="mt-5 space-y-2 text-left flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-accent shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                    <Link to={plan.name === "Enterprise" ? "/planos" : "/auth"} className="mt-5">
                      <Button variant={plan.highlight ? "default" : "outline"} className="w-full rounded-full" size="sm">
                        {plan.cta}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <Link to="/planos" className="inline-block mt-8 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Ver todos os planos e simulador →
          </Link>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-5">
          <div className="rounded-3xl bg-gradient-to-br from-primary via-primary to-accent p-10 sm:p-14 text-center text-primary-foreground shadow-panel relative overflow-hidden">
            <div className="absolute inset-0 scan-grid opacity-10" />
            <div className="relative z-10">
              <ShoppingBag className="h-10 w-10 mx-auto opacity-80" />
              <h2 className="mt-4 font-display text-3xl sm:text-4xl">Pronto para vender com mais confiança?</h2>
              <p className="mt-3 opacity-80 max-w-lg mx-auto">
                Crie sua conta em 30 segundos. 3 análises grátis. Sem cartão, sem compromisso.
              </p>
              <Link to="/auth">
                <Button size="lg" variant="secondary" className="mt-8 rounded-full gap-2 text-base px-8 shadow-lg">
                  Começar agora <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8">
        <div className="mx-auto max-w-6xl px-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src="/provai.png" alt="provAI" className="h-5 w-auto opacity-50" />
            <span>© 2026 provAI. Todos os direitos reservados.</span>
          </div>
          <div className="flex gap-5">
            <Link to="/planos" className="hover:text-foreground transition-colors">Planos</Link>
            <Link to="/coloracao" className="hover:text-foreground transition-colors">Colorimetria</Link>
            <Link to="/auth" className="hover:text-foreground transition-colors">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
