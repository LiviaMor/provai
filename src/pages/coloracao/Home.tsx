import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Camera, Palette, Wand2, Star, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  { icon: Camera, title: "Envie suas fotos", desc: "1 a 5 fotos do rosto em luz natural, sem filtro." },
  { icon: Wand2, title: "IA analisa sua coloração", desc: "Subtom, contraste, profundidade e harmonia natural." },
  { icon: Palette, title: "Receba seu relatório premium", desc: "Cartela ideal, makeup, cabelo e cores que valorizam." },
];

const benefits = [
  "Descubra exatamente quais cores iluminam seu rosto",
  "Pare de errar em maquiagem, cabelo e roupas",
  "Economize comprando apenas o que valoriza você",
  "Relatório nível consultoria de imagem premium",
];

const testimonials = [
  { name: "Marina S.", quote: "Finalmente entendi por que algumas cores me apagavam. Análise impecável." },
  { name: "Camila R.", quote: "Pareceu uma consultoria de R$ 1.500. O relatório é lindo e preciso." },
  { name: "Júlia T.", quote: "Mudei o cabelo seguindo a paleta e o resultado foi outro nível." },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-app-radial">
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="container flex items-center justify-between py-4">
          <Link to="/app" className="flex items-center gap-2">
            <img src="/provai.png" alt="provAI" className="h-8 w-auto" />
          </Link>
          <div className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#como" className="hover:text-foreground">Como funciona</a>
            <a href="#beneficios" className="hover:text-foreground">Benefícios</a>
            <a href="#depoimentos" className="hover:text-foreground">Depoimentos</a>
            <Link to="/app" className="hover:text-foreground inline-flex items-center gap-1.5"><ArrowRight className="h-3.5 w-3.5 rotate-180" /> Voltar</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="container grid lg:grid-cols-2 gap-12 items-center pt-8 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Análise por IA
          </span>
          <h1 className="mt-6 font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.05] text-balance">
            Descubra sua <em className="not-italic text-accent">Coloração Pessoal</em> Real com IA
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl text-balance">
            Envie suas fotos e receba uma análise técnica completa com paleta ideal, cabelo, maquiagem e as cores que realmente valorizam sua beleza natural.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/coloracao/upload">
              <Button size="lg" className="gap-2 rounded-full px-7">
                Enviar Fotos <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/coloracao/exemplo">
              <Button size="lg" variant="outline" className="rounded-full px-7">Ver Exemplo</Button>
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex -space-x-2">
              {["#C97E5C", "#3B5A6E", "#8C6239", "#4A6741"].map((c) => (
                <span key={c} className="h-7 w-7 rounded-full border-2 border-background" style={{ background: c }} />
              ))}
            </div>
            <span>+2.300 análises geradas com 96% de satisfação</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.1 }} className="relative">
          <div className="aspect-[4/5] rounded-3xl bg-panel-glow border border-border shadow-panel p-6 backdrop-blur">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <span>Análise</span><span>OUTONO PROFUNDO</span>
            </div>
            <div className="mt-4 aspect-[4/3] rounded-2xl bg-gradient-to-br from-[#3B2415] via-[#8C6239] to-[#C97E5C] relative overflow-hidden">
              <div className="absolute inset-0 scan-grid opacity-30" />
              <div className="absolute bottom-4 left-4 right-4 grid grid-cols-6 gap-1.5">
                {["#556B2F","#3B5A6E","#C97E5C","#8C6239","#3B2415","#A0522D"].map((c) => (
                  <span key={c} className="aspect-square rounded-full border-2 border-card/70" style={{ background: c }} />
                ))}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
              {[["Subtom","Quente"],["Contraste","Médio-Alto"],["Profundidade","Alta"]].map(([k,v]) => (
                <div key={k} className="rounded-xl bg-background/60 p-3">
                  <p className="uppercase tracking-[0.18em] text-muted-foreground text-[10px]">{k}</p>
                  <p className="mt-1 font-display text-sm">{v}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute -bottom-6 -left-6 rounded-2xl bg-card border border-border shadow-lift px-5 py-4 hidden sm:block">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent/20 grid place-items-center"><Sparkles className="h-5 w-5 text-accent" /></div>
              <div>
                <p className="font-display text-sm">96% de precisão</p>
                <p className="text-xs text-muted-foreground">Validado por consultoras</p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Como funciona */}
      <section id="como" className="container py-20">
        <div className="text-center max-w-2xl mx-auto">
          <p className="uppercase tracking-[0.2em] text-xs text-muted-foreground">Processo</p>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl">Como funciona</h2>
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <motion.div key={s.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="rounded-3xl border border-border bg-card/70 backdrop-blur p-7 shadow-panel">
              <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground grid place-items-center"><s.icon className="h-5 w-5" /></div>
              <p className="mt-5 text-xs uppercase tracking-[0.2em] text-muted-foreground">Passo 0{i+1}</p>
              <h3 className="mt-2 font-display text-xl">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Antes e depois */}
      <section className="container py-20">
        <div className="rounded-3xl bg-panel-glow border border-border shadow-panel p-8 sm:p-12">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <p className="uppercase tracking-[0.2em] text-xs text-muted-foreground">Antes & Depois</p>
              <h2 className="mt-3 font-display text-3xl sm:text-4xl">A diferença que cores certas fazem.</h2>
              <p className="mt-4 text-muted-foreground">Quando você usa cores fora da sua cartela, o rosto perde brilho, ganha sombras e marcas. As cores certas iluminam, suavizam e revelam sua beleza natural.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Cor Errada", colors: ["#F4C2C2","#E8E4DD","#DDE6F0"], tone: "from-[#9b8a7a] to-[#c2b3a3]" },
                { label: "Cor Certa", colors: ["#556B2F","#8C6239","#3B5A6E"], tone: "from-[#7a4a2a] to-[#c97e5c]" },
              ].map((b) => (
                <div key={b.label} className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className={`aspect-[3/4] bg-gradient-to-br ${b.tone}`} />
                  <div className="p-4">
                    <p className="font-display text-sm">{b.label}</p>
                    <div className="mt-2 flex gap-1.5">{b.colors.map((c) => <span key={c} className="h-4 w-4 rounded-full" style={{ background: c }} />)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section id="beneficios" className="container py-20 grid lg:grid-cols-2 gap-12">
        <div>
          <p className="uppercase tracking-[0.2em] text-xs text-muted-foreground">Benefícios</p>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl">Uma consultoria completa, na palma da sua mão.</h2>
          <p className="mt-4 text-muted-foreground">Tecnologia de ponta com olhar editorial e linguagem de consultoria de imagem premium.</p>
        </div>
        <ul className="space-y-4">
          {benefits.map((b) => (
            <li key={b} className="flex items-start gap-3 rounded-2xl border border-border bg-card/70 p-5">
              <span className="mt-0.5 h-6 w-6 rounded-full bg-primary text-primary-foreground grid place-items-center"><Check className="h-3.5 w-3.5" /></span>
              <span className="text-sm">{b}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Depoimentos */}
      <section id="depoimentos" className="container py-20">
        <div className="text-center max-w-2xl mx-auto">
          <p className="uppercase tracking-[0.2em] text-xs text-muted-foreground">Depoimentos</p>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl">Histórias reais</h2>
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div key={t.name} className="rounded-3xl border border-border bg-card/70 p-7 shadow-panel">
              <div className="flex gap-1 text-accent">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
              <p className="mt-4 font-display text-lg leading-snug">"{t.quote}"</p>
              <p className="mt-4 text-sm text-muted-foreground">— {t.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-16">
        <div className="rounded-3xl bg-primary text-primary-foreground p-10 sm:p-14 text-center shadow-panel">
          <h2 className="font-display text-3xl sm:text-5xl text-balance">Sua cartela ideal está a 3 fotos de distância.</h2>
          <p className="mt-4 opacity-80 max-w-xl mx-auto">Comece sua análise agora e receba um relatório premium em poucos minutos.</p>
          <Link to="/coloracao/upload" className="mt-8 inline-flex">
            <Button size="lg" variant="secondary" className="rounded-full px-8 gap-2">Iniciar Análise <ArrowRight className="h-4 w-4" /></Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src="/provai.png" alt="provAI" className="h-5 w-auto opacity-60" />
            <span>© 2026 provAI. Todos os direitos reservados.</span>
          </div>
          <div className="flex gap-4">
            <Link to="/app" className="hover:text-foreground">Início</Link>
            <Link to="/planos" className="hover:text-foreground">Planos</Link>
            <Link to="/painel" className="hover:text-foreground">Painel</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
