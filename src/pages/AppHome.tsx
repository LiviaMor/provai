import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Camera,
  Palette,
  Shirt,
  Sparkles,
  LogOut,
  Loader2,
  ArrowRight,
  Ruler,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupaUser } from "@supabase/supabase-js";

export default function AppHome() {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupaUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session?.user) navigate("/auth", { replace: true });
      else setUser(session.user);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) navigate("/auth", { replace: true });
      else {
        setUser(session.user);
        setLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-app-radial grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-radial text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-5 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src="/provai.png" alt="provAI" className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user?.email}
            </span>
            <Link to="/painel">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <User className="h-4 w-4" /> Painel
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5">
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </nav>

      {/* Main content with tabs */}
      <main className="mx-auto max-w-6xl px-5 py-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-3xl sm:text-4xl">
            Olá, <span className="text-accent">{user?.email?.split("@")[0]}</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            Escolha uma ferramenta para começar sua análise.
          </p>
        </motion.div>

        <Tabs defaultValue="analise" className="mt-8">
          <TabsList className="w-full max-w-xl bg-card/70 backdrop-blur border border-border rounded-2xl p-1 h-auto flex-wrap">
            <TabsTrigger value="analise" className="rounded-xl gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Camera className="h-3.5 w-3.5" /> Análise Corporal
            </TabsTrigger>
            <TabsTrigger value="colorimetria" className="rounded-xl gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Palette className="h-3.5 w-3.5" /> Colorimetria
            </TabsTrigger>
            <TabsTrigger value="stylist" className="rounded-xl gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Shirt className="h-3.5 w-3.5" /> Personal Stylist
            </TabsTrigger>
          </TabsList>

          {/* ===== ABA: ANÁLISE CORPORAL ===== */}
          <TabsContent value="analise" className="mt-8">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Análise pelo celular */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="h-full bg-card/70 border-border hover:border-primary/40 transition-colors shadow-panel">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 grid place-items-center">
                      <Camera className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="font-display text-xl mt-3">Analisar pelo celular</CardTitle>
                    <CardDescription>
                      Tire uma foto frontal e lateral com a captura guiada. A IA estima medidas, sugere tamanhos e mostra como a roupa cai.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground mb-5">
                      <li className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                        Checklist ao vivo com 8 pontos de validação
                      </li>
                      <li className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                        Calibração de escala (cartão/A4/cédula)
                      </li>
                      <li className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                        Grid postural + medidas automáticas
                      </li>
                      <li className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                        Provador virtual com IA
                      </li>
                    </ul>
                    <Link to="/analise?mode=photo">
                      <Button className="w-full rounded-full gap-2">
                        <Camera className="h-4 w-4" /> Iniciar captura guiada <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Medidas manuais */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="h-full bg-card/70 border-border hover:border-accent/40 transition-colors shadow-panel">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-2xl bg-accent/10 grid place-items-center">
                      <Ruler className="h-6 w-6 text-accent" />
                    </div>
                    <CardTitle className="font-display text-xl mt-3">Inserir medidas manualmente</CardTitle>
                    <CardDescription>
                      Já tem suas medidas? Insira altura, peso, busto, cintura e quadril para receber recomendações de tamanho e estilo.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground mb-5">
                      <li className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                        Recomendação de tamanho por marca
                      </li>
                      <li className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                        Avaliação de composição corporal (IMC, % gordura)
                      </li>
                      <li className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                        Bioimpedância opcional para maior precisão
                      </li>
                      <li className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                        Link da loja para cruzar com tabela de medidas
                      </li>
                    </ul>
                    <Link to="/analise?mode=manual">
                      <Button variant="outline" className="w-full rounded-full gap-2">
                        <Ruler className="h-4 w-4" /> Inserir medidas <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>

          {/* ===== ABA: COLORIMETRIA ===== */}
          <TabsContent value="colorimetria" className="mt-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-card/70 border-border shadow-panel max-w-2xl">
                <CardHeader>
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-pink-500/20 to-amber-500/20 grid place-items-center">
                    <Palette className="h-6 w-6 text-pink-500" />
                  </div>
                  <CardTitle className="font-display text-xl mt-3">Análise de Colorimetria Pessoal</CardTitle>
                  <CardDescription>
                    Descubra sua estação cromática (12 estações), paleta de cores ideal, makeup, metais e guarda-roupa personalizado.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4 mb-6">
                    <div className="rounded-xl border bg-background/60 p-4">
                      <p className="text-sm font-medium">O que você recebe:</p>
                      <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                        <li>• Estação cromática (Primavera, Verão, Outono, Inverno + modificador)</li>
                        <li>• Paleta de 12 cores ideais + neutros</li>
                        <li>• Cores a evitar com justificativa</li>
                        <li>• Makeup: base, blush, batom, sombra</li>
                        <li>• Metais ideais (ouro, prata, rosé)</li>
                        <li>• Colorações de cabelo recomendadas</li>
                        <li>• Guarda-roupa ideal por peça</li>
                      </ul>
                    </div>
                    <div className="rounded-xl border bg-background/60 p-4">
                      <p className="text-sm font-medium">Como funciona:</p>
                      <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                        <li>1. Envie 1–3 fotos do rosto (luz natural)</li>
                        <li>2. A IA analisa subtom, contraste e profundidade</li>
                        <li>3. Receba relatório completo em segundos</li>
                      </ul>
                      <Badge variant="secondary" className="mt-3 text-[10px]">~30 segundos</Badge>
                    </div>
                  </div>
                  <Link to="/coloracao/upload">
                    <Button className="w-full rounded-full gap-2">
                      <Palette className="h-4 w-4" /> Iniciar análise de cor <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ===== ABA: PERSONAL STYLIST ===== */}
          <TabsContent value="stylist" className="mt-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-card/70 border-border shadow-panel max-w-2xl">
                <CardHeader>
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 grid place-items-center">
                    <Shirt className="h-6 w-6 text-violet-500" />
                  </div>
                  <CardTitle className="font-display text-xl mt-3">Personal Stylist IA</CardTitle>
                  <CardDescription>
                    Descubra quais estilos de roupa mais combinam com seu tipo corporal, estação cromática e estilo de vida.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4 mb-6">
                    <div className="rounded-xl border bg-background/60 p-4">
                      <p className="text-sm font-medium">Recomendações personalizadas:</p>
                      <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                        <li>• Tipo corporal (ampulheta, triângulo, retangular...)</li>
                        <li>• Modelagens que valorizam sua silhueta</li>
                        <li>• Decotes, calças e vestidos ideais</li>
                        <li>• O que evitar e por quê</li>
                        <li>• Looks por ocasião (trabalho, casual, festa)</li>
                        <li>• Combinações de peças com sua paleta</li>
                      </ul>
                    </div>
                    <div className="rounded-xl border bg-background/60 p-4">
                      <p className="text-sm font-medium">Baseado em:</p>
                      <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                        <li>• Suas medidas corporais (análise ou manual)</li>
                        <li>• Sua estação cromática (colorimetria)</li>
                        <li>• Seu objetivo (trabalho, casual, festa)</li>
                        <li>• Proporções reais do seu corpo</li>
                      </ul>
                      <p className="mt-3 text-[10px] text-muted-foreground italic">
                        💡 Faça primeiro a análise corporal e/ou colorimetria para resultados mais precisos.
                      </p>
                    </div>
                  </div>
                  <Link to="/analise?mode=photo">
                    <Button className="w-full rounded-full gap-2">
                      <Shirt className="h-4 w-4" /> Descobrir meu estilo <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
