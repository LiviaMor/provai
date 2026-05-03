import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Sparkles, History, Palette, Heart, TrendingUp,
  Plus, Trash2, ExternalLink, Store, ShoppingBag, Calendar, Loader2,
  Camera, ArrowRight, Search, Filter, Check,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Area, AreaChart,
} from "recharts";
import { suggestSize, categoryLabel, detectCategory, HEM_PREFERENCE_LABELS, HEM_OPTIONS_BY_CATEGORY, resolveHemPreference, type UserMeasurements, type SizeSuggestion, type HemPreference, type GarmentCategory } from "@/lib/sizing";
import { calcCompatScore, scoreColorClass, type ScoreResult } from "@/lib/compatScore";
import { Ruler } from "lucide-react";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { CouponRedeem } from "@/components/CouponRedeem";
import { UsageQuota } from "@/components/UsageQuota";

// ---------- Tipos enxutos das tabelas ----------
type BodyAssessment = {
  id: string;
  title: string;
  source: string;
  gender: string | null;
  objective: string | null;
  confidence: number;
  measurements: Record<string, number | string>;
  fitness_assessment: Record<string, unknown>;
  size_recommendations: Record<string, unknown>;
  notes: string | null;
  created_at: string;
};

type ColorAnalysisRow = {
  id: string;
  title: string;
  season: string | null;
  analysis: Record<string, unknown> & {
    season?: string;
    season_modifier?: string;
    palette?: { best?: { hex: string; name?: string }[]; neutrals?: { hex: string; name?: string }[] };
  };
  reference_photo: string | null;
  notes: string | null;
  created_at: string;
};

type FavoriteStore = {
  id: string;
  name: string;
  url: string | null;
  notes: string | null;
  seasons: string[] | null;
  tags: string[] | null;
  created_at: string;
};

type FavoriteProduct = {
  id: string;
  store_id: string | null;
  name: string;
  url: string | null;
  image_url: string | null;
  price: number | null;
  season: string | null;
  notes: string | null;
  created_at: string;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

// ============================================================================
export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState("historico");

  const [bodyHistory, setBodyHistory] = useState<BodyAssessment[]>([]);
  const [colorHistory, setColorHistory] = useState<ColorAnalysisRow[]>([]);
  const [stores, setStores] = useState<FavoriteStore[]>([]);
  const [products, setProducts] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(false);

  // Auth: redireciona quem não está logado
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Carrega tudo em paralelo
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    (async () => {
      const [b, c, s, p] = await Promise.all([
        supabase.from("body_assessments").select("*").order("created_at", { ascending: false }),
        supabase.from("color_analyses").select("*").order("created_at", { ascending: false }),
        supabase.from("favorite_stores").select("*").order("created_at", { ascending: false }),
        supabase.from("favorite_products").select("*").order("created_at", { ascending: false }),
      ]);
      setBodyHistory((b.data ?? []) as unknown as BodyAssessment[]);
      setColorHistory((c.data ?? []) as unknown as ColorAnalysisRow[]);
      setStores((s.data ?? []) as unknown as FavoriteStore[]);
      setProducts((p.data ?? []) as unknown as FavoriteProduct[]);
      setLoading(false);
    })();
  }, [user]);

  const counters = useMemo(() => ({
    body: bodyHistory.length,
    color: colorHistory.length,
    stores: stores.length,
    products: products.length,
  }), [bodyHistory, colorHistory, stores, products]);

  const dominantSeason = useMemo(() => {
    const counts: Record<string, number> = {};
    colorHistory.forEach((c) => {
      const s = c.season ?? c.analysis?.season ?? "";
      if (s) counts[s] = (counts[s] ?? 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] ?? null;
  }, [colorHistory]);

  // Medidas mais recentes (para sugestão de tamanho na wishlist)
  const latestMeasurements = useMemo<UserMeasurements>(() => {
    const last = bodyHistory[0]?.measurements ?? {};
    const out: Record<string, number> = {};
    Object.entries(last).forEach(([k, v]) => {
      const n = typeof v === "number" ? v : Number(v);
      if (Number.isFinite(n) && n > 0) out[k] = n;
    });
    return out as UserMeasurements;
  }, [bodyHistory]);

  // Dicas de paleta extraídas da análise de cor mais recente — alimentam o score
  const paletteHints = useMemo<string[]>(() => {
    const a = colorHistory[0]?.analysis;
    if (!a) return [];
    const best = (a.palette?.best ?? []).map((c) => c.name).filter(Boolean) as string[];
    const neutrals = (a.palette?.neutrals ?? []).map((c) => c.name).filter(Boolean) as string[];
    return [...best, ...neutrals];
  }, [colorHistory]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-app-radial grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-app-radial grid place-items-center p-6">
        <Card className="max-w-md w-full bg-card/80 backdrop-blur shadow-panel border-border">
          <CardHeader className="text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-primary text-primary-foreground grid place-items-center mb-2">
              <Sparkles className="h-6 w-6" />
            </div>
            <CardTitle className="font-display text-2xl">Acesse seu painel</CardTitle>
            <CardDescription>
              Faça login para ver seu histórico, colorimetria, lojas favoritas e insights de evolução.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button className="rounded-full" onClick={() => navigate("/auth")}>
              Ir para login <ArrowRight className="h-4 w-4" />
            </Button>
            <Link to="/coloracao" className="text-sm text-center text-muted-foreground hover:text-foreground">
              Conhecer a análise de coloração
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-radial pb-24">
      {/* Nav */}
      <nav className="container flex items-center justify-between py-6">
        <Link to="/" className="flex items-center gap-2 font-display text-xl tracking-tight">
          <span className="h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center text-sm">P</span>
          <span>provAI</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-1.5"><ArrowLeft className="h-4 w-4" /> Início</Button>
          </Link>
        </div>
      </nav>

      {/* Header */}
      <header className="container">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Seu painel
          </span>
          <h1 className="mt-4 font-display text-3xl sm:text-5xl leading-[1.05] text-balance">
            Olá, <em className="not-italic text-accent">{user.email?.split("@")[0]}</em>
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Aqui mora seu histórico de análises corporais, sua colorimetria, suas lojas favoritas e a evolução das suas medidas e cartelas.
          </p>
        </motion.div>

        {/* Cupom promocional */}
        <div className="mt-8 space-y-4">
          <CouponRedeem />
          <UsageQuota />
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={History} label="Análises corporais" value={counters.body} />
          <StatCard icon={Palette} label="Análises de cor" value={counters.color} accent />
          <StatCard icon={Store} label="Lojas favoritas" value={counters.stores} />
          <StatCard icon={Heart} label="Wishlist" value={counters.products} />
        </div>

        {dominantSeason && (
          <Card className="mt-6 bg-panel-glow border-border shadow-panel">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5">
              <div className="h-12 w-12 rounded-2xl bg-accent/20 grid place-items-center shrink-0">
                <Palette className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sua estação dominante</p>
                <p className="font-display text-xl mt-1">{dominantSeason}</p>
              </div>
              <Link to="/coloracao/upload">
                <Button variant="outline" className="rounded-full gap-2">
                  Nova análise <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </header>

      {/* Tabs */}
      <main className="container mt-10">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="w-full max-w-2xl bg-card/70 backdrop-blur border border-border rounded-2xl p-1 h-auto flex-wrap">
            <TabsTrigger value="historico" className="rounded-xl gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><History className="h-3.5 w-3.5" />Histórico</TabsTrigger>
            <TabsTrigger value="colorimetria" className="rounded-xl gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Palette className="h-3.5 w-3.5" />Colorimetria</TabsTrigger>
            <TabsTrigger value="lojas" className="rounded-xl gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Store className="h-3.5 w-3.5" />Lojas</TabsTrigger>
            <TabsTrigger value="insights" className="rounded-xl gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><TrendingUp className="h-3.5 w-3.5" />Insights</TabsTrigger>
          </TabsList>

          {/* ---------- HISTÓRICO ---------- */}
          <TabsContent value="historico" className="mt-8">
            <HistoryTab loading={loading} body={bodyHistory} color={colorHistory}
              onDeleteBody={async (id) => {
                await supabase.from("body_assessments").delete().eq("id", id);
                setBodyHistory((p) => p.filter((x) => x.id !== id));
                toast({ title: "Análise removida" });
              }}
              onDeleteColor={async (id) => {
                await supabase.from("color_analyses").delete().eq("id", id);
                setColorHistory((p) => p.filter((x) => x.id !== id));
                toast({ title: "Análise removida" });
              }}
              onReopenColor={(row) => {
                sessionStorage.setItem("coloracao_result", JSON.stringify({
                  analysis: row.analysis,
                  images: row.reference_photo ? [row.reference_photo] : [],
                }));
                navigate("/coloracao/relatorio");
              }}
            />
          </TabsContent>

          {/* ---------- COLORIMETRIA ---------- */}
          <TabsContent value="colorimetria" className="mt-8">
            <ColorimetryTab analyses={colorHistory} loading={loading} />
          </TabsContent>

          {/* ---------- LOJAS ---------- */}
          <TabsContent value="lojas" className="mt-8">
            <StoresTab
              stores={stores}
              products={products}
              userId={user.id}
              dominantSeason={dominantSeason}
              latestMeasurements={latestMeasurements}
              paletteHints={paletteHints}
              onAddStore={async (data) => {
                const { data: row, error } = await supabase.from("favorite_stores").insert({ ...data, user_id: user.id }).select().single();
                if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
                setStores((p) => [row as unknown as FavoriteStore, ...p]);
                toast({ title: "Loja adicionada" });
              }}
              onAddProduct={async (data) => {
                const { data: row, error } = await supabase.from("favorite_products").insert({ ...data, user_id: user.id }).select().single();
                if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
                setProducts((p) => [row as unknown as FavoriteProduct, ...p]);
                toast({ title: "Item salvo na wishlist" });
              }}
              onDeleteStore={async (id) => {
                await supabase.from("favorite_stores").delete().eq("id", id);
                setStores((p) => p.filter((x) => x.id !== id));
              }}
              onDeleteProduct={async (id) => {
                await supabase.from("favorite_products").delete().eq("id", id);
                setProducts((p) => p.filter((x) => x.id !== id));
              }}
            />
          </TabsContent>

          {/* ---------- INSIGHTS ---------- */}
          <TabsContent value="insights" className="mt-8">
            <InsightsTab body={bodyHistory} colors={colorHistory} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ============================================================================
// Cards de estatística
function StatCard({ icon: Icon, label, value, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; accent?: boolean }) {
  return (
    <Card className={`${accent ? "bg-accent/15 border-accent/40" : "bg-card/70 backdrop-blur border-border"} shadow-panel`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div className={`h-9 w-9 rounded-xl grid place-items-center ${accent ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"}`}>
            <Icon className="h-4 w-4" />
          </div>
          <span className="font-display text-2xl">{value}</span>
        </div>
        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// HISTÓRICO
function HistoryTab({
  loading, body, color, onDeleteBody, onDeleteColor, onReopenColor,
}: {
  loading: boolean;
  body: BodyAssessment[];
  color: ColorAnalysisRow[];
  onDeleteBody: (id: string) => Promise<void>;
  onDeleteColor: (id: string) => Promise<void>;
  onReopenColor: (row: ColorAnalysisRow) => void;
}) {
  if (loading) return <div className="py-16 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (body.length === 0 && color.length === 0) {
    return (
      <EmptyState
        title="Sua linha do tempo começa aqui"
        description="Faça sua primeira análise corporal ou de coloração para ver tudo organizado neste painel."
        actions={
          <>
            <Link to="/"><Button className="rounded-full gap-2"><Camera className="h-4 w-4" /> Análise corporal</Button></Link>
            <Link to="/coloracao/upload"><Button variant="outline" className="rounded-full gap-2"><Palette className="h-4 w-4" /> Análise de cor</Button></Link>
          </>
        }
      />
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Coloração */}
      <section>
        <SectionHeader title="Análises de coloração" count={color.length} icon={Palette} />
        <div className="mt-4 space-y-3">
          {color.length === 0 && <EmptyMini text="Nenhuma análise de cor ainda." cta={{ to: "/coloracao/upload", label: "Fazer análise" }} />}
          {color.map((c) => {
            const palette = c.analysis?.palette?.best?.slice(0, 6) ?? [];
            return (
              <Card key={c.id} className="bg-card/80 border-border shadow-panel hover:shadow-lift transition-all">
                <CardContent className="p-4 flex gap-4">
                  {c.reference_photo ? (
                    <img src={c.reference_photo} alt="" className="h-20 w-20 rounded-2xl object-cover border border-border shrink-0" />
                  ) : (
                    <div className="h-20 w-20 rounded-2xl bg-muted grid place-items-center shrink-0"><Palette className="h-6 w-6 text-muted-foreground" /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-display text-base truncate">{c.season ?? c.analysis?.season ?? "Análise"}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Calendar className="h-3 w-3" />{formatDate(c.created_at)}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onDeleteColor(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {palette.length > 0 && (
                      <div className="mt-2 flex gap-1">
                        {palette.map((p, i) => <span key={i} className="h-5 w-5 rounded-full border border-border" style={{ background: p.hex }} />)}
                      </div>
                    )}
                    <Button size="sm" variant="outline" className="mt-3 rounded-full h-7 text-xs" onClick={() => onReopenColor(c)}>
                      Reabrir relatório <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Corpo */}
      <section>
        <SectionHeader title="Análises corporais" count={body.length} icon={History} />
        <div className="mt-4 space-y-3">
          {body.length === 0 && <EmptyMini text="Nenhuma análise corporal ainda." cta={{ to: "/", label: "Fazer análise" }} />}
          {body.map((b) => (
            <Card key={b.id} className="bg-card/80 border-border shadow-panel hover:shadow-lift transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display text-base truncate">{b.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Calendar className="h-3 w-3" />{formatDate(b.created_at)}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onDeleteBody(b.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {b.gender && <Badge variant="secondary" className="text-[10px]">{b.gender}</Badge>}
                  {b.objective && <Badge variant="secondary" className="text-[10px]">{b.objective}</Badge>}
                  <Badge variant="outline" className="text-[10px]">Confiança {b.confidence}%</Badge>
                  <Badge variant="outline" className="text-[10px]">{b.source}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ title, count, icon: Icon }: { title: string; count: number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-display text-lg">{title}</h2>
      </div>
      <span className="text-xs text-muted-foreground">{count} {count === 1 ? "registro" : "registros"}</span>
    </div>
  );
}

function EmptyMini({ text, cta }: { text: string; cta: { to: string; label: string } }) {
  return (
    <Card className="bg-card/40 border-dashed border-border">
      <CardContent className="p-5 text-center">
        <p className="text-sm text-muted-foreground">{text}</p>
        <Link to={cta.to}><Button size="sm" variant="outline" className="mt-3 rounded-full">{cta.label}</Button></Link>
      </CardContent>
    </Card>
  );
}

function EmptyState({ title, description, actions }: { title: string; description: string; actions: React.ReactNode }) {
  return (
    <Card className="bg-panel-glow border-border shadow-panel">
      <CardContent className="p-10 text-center">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-accent/20 grid place-items-center"><Sparkles className="h-6 w-6 text-accent" /></div>
        <h3 className="mt-5 font-display text-2xl">{title}</h3>
        <p className="mt-2 text-muted-foreground max-w-md mx-auto">{description}</p>
        <div className="mt-6 flex flex-wrap gap-3 justify-center">{actions}</div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COLORIMETRIA
function ColorimetryTab({ analyses, loading }: { analyses: ColorAnalysisRow[]; loading: boolean }) {
  if (loading) return <div className="py-16 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (analyses.length === 0) {
    return <EmptyState title="Sua cartela ainda está em branco" description="Faça uma análise de coloração e ela aparece aqui — com paleta, makeup e metais."
      actions={<Link to="/coloracao/upload"><Button className="rounded-full gap-2"><Palette className="h-4 w-4" /> Iniciar análise</Button></Link>} />;
  }
  // Pega a última como destaque
  const latest = analyses[0];
  const a = latest.analysis;
  const best = (a?.palette?.best ?? []) as { hex: string; name?: string }[];
  const neutrals = (a?.palette?.neutrals ?? []) as { hex: string; name?: string }[];

  return (
    <div className="space-y-6">
      <Card className="bg-panel-glow border-border shadow-panel overflow-hidden">
        <CardContent className="p-0">
          <div className="grid lg:grid-cols-[280px_1fr]">
            {latest.reference_photo ? (
              <img src={latest.reference_photo} alt="" className="h-64 lg:h-auto w-full object-cover" />
            ) : (
              <div className="h-64 lg:h-auto bg-muted grid place-items-center"><Palette className="h-10 w-10 text-muted-foreground" /></div>
            )}
            <div className="p-6 lg:p-8">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Última análise · {formatDate(latest.created_at)}</p>
              <h3 className="mt-2 font-display text-3xl">{latest.season ?? a?.season}</h3>
              {a?.season_modifier && <p className="text-muted-foreground italic">{a.season_modifier}</p>}

              {best.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">Melhor paleta</p>
                  <div className="grid grid-cols-6 gap-2">
                    {best.slice(0, 12).map((c, i) => (
                      <div key={i} className="text-center">
                        <span className="block aspect-square rounded-full border border-border" style={{ background: c.hex }} />
                        {c.name && <span className="block mt-1 text-[9px] truncate">{c.name}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {neutrals.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">Neutros</p>
                  <div className="flex flex-wrap gap-2">
                    {neutrals.map((c, i) => (
                      <span key={i} className="h-8 w-8 rounded-full border border-border" style={{ background: c.hex }} title={c.name} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {analyses.length > 1 && (
        <div>
          <h3 className="font-display text-lg">Histórico de cartelas</h3>
          <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {analyses.slice(1).map((c) => {
              const chips = (c.analysis?.palette?.best ?? []).slice(0, 6) as { hex: string }[];
              return (
                <Card key={c.id} className="bg-card/70 border-border shadow-panel">
                  <CardContent className="p-4">
                    <p className="font-display text-base">{c.season ?? c.analysis?.season}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(c.created_at)}</p>
                    <div className="mt-3 flex gap-1">
                      {chips.map((p, i) => <span key={i} className="h-6 w-6 rounded-full border border-border" style={{ background: p.hex }} />)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// LOJAS + WISHLIST
function StoresTab({
  stores, products, userId, dominantSeason, latestMeasurements, paletteHints,
  onAddStore, onAddProduct, onDeleteStore, onDeleteProduct,
}: {
  stores: FavoriteStore[];
  products: FavoriteProduct[];
  userId: string;
  dominantSeason: string | null;
  latestMeasurements: UserMeasurements;
  paletteHints: string[];
  onAddStore: (d: { name: string; url: string | null; notes: string | null; seasons: string[]; tags: string[] }) => Promise<void>;
  onAddProduct: (d: { name: string; url: string | null; image_url: string | null; price: number | null; season: string | null; notes: string | null; store_id: string | null }) => Promise<void>;
  onDeleteStore: (id: string) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
}) {
  void userId;

  // ---------- Filtros & busca ----------
  const [query, setQuery] = useState("");
  const [seasonFilter, setSeasonFilter] = useState<string>("compat"); // compat | all | <season>
  const [sortBy, setSortBy] = useState<string>("compat"); // compat | recent | price-asc | price-desc
  const [hemPref, setHemPref] = useState<HemPreference>(() => {
    if (typeof window === "undefined") return "ankle";
    return (localStorage.getItem("hem_pref") as HemPreference) || "ankle";
  });
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("hem_pref", hemPref);
  }, [hemPref]);

  // ---------- Override manual de medidas (altura/peso) ----------
  // O usuário pode informar manualmente mesmo sem análise corporal,
  // ou ajustar valores existentes para recalcular barra/tamanho.
  type ManualMeasures = { height_cm?: number; estimated_weight_kg?: number };
  const [manualMeasures, setManualMeasures] = useState<ManualMeasures>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem("manual_measures") || "{}"); } catch { return {}; }
  });
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("manual_measures", JSON.stringify(manualMeasures));
  }, [manualMeasures]);

  // Mescla: override do usuário tem prioridade sobre o que veio da análise.
  const effectiveMeasurements: UserMeasurements = useMemo(() => ({
    ...latestMeasurements,
    ...(manualMeasures.height_cm ? { height_cm: manualMeasures.height_cm } : {}),
    ...(manualMeasures.estimated_weight_kg ? { estimated_weight_kg: manualMeasures.estimated_weight_kg } : {}),
  }), [latestMeasurements, manualMeasures]);

  const hasReferenceMeasure = Boolean(
    effectiveMeasurements.height_cm || effectiveMeasurements.estimated_weight_kg ||
    effectiveMeasurements.bust_cm || effectiveMeasurements.waist_cm || effectiveMeasurements.hip_cm,
  );

  // Conjunto de estações disponíveis (vindas das lojas + produtos)
  const availableSeasons = useMemo(() => {
    const set = new Set<string>();
    stores.forEach((s) => s.seasons?.forEach((x) => x && set.add(x)));
    products.forEach((p) => p.season && set.add(p.season));
    if (dominantSeason) set.add(dominantSeason);
    return Array.from(set).sort();
  }, [stores, products, dominantSeason]);

  // Tokens normalizados da estação dominante (ex: "Outono Profundo" -> ["outono","profundo"])
  const dominantTokens = useMemo(
    () => (dominantSeason ?? "").toLowerCase().split(/\s+/).filter(Boolean),
    [dominantSeason],
  );

  const matchesDominant = (raw: string | null | undefined) => {
    if (!dominantTokens.length || !raw) return false;
    const v = raw.toLowerCase();
    // compatível se compartilhar pelo menos a "família" da estação (ex.: outono)
    return dominantTokens.some((t) => v.includes(t));
  };

  const matchesSeason = (raw: string | null | undefined, target: string) => {
    if (!raw) return false;
    return raw.toLowerCase().includes(target.toLowerCase());
  };

  // ---------- LOJAS filtradas ----------
  const filteredStores = useMemo(() => {
    let list = stores.filter((s) => {
      const q = query.trim().toLowerCase();
      if (q && !`${s.name} ${(s.tags ?? []).join(" ")} ${(s.seasons ?? []).join(" ")}`.toLowerCase().includes(q)) return false;
      if (seasonFilter === "all") return true;
      if (seasonFilter === "compat") return (s.seasons ?? []).some((x) => matchesDominant(x));
      return (s.seasons ?? []).some((x) => matchesSeason(x, seasonFilter));
    });
    if (sortBy === "compat") {
      list = [...list].sort((a, b) => {
        const ac = (a.seasons ?? []).some((x) => matchesDominant(x)) ? 1 : 0;
        const bc = (b.seasons ?? []).some((x) => matchesDominant(x)) ? 1 : 0;
        return bc - ac;
      });
    } else if (sortBy === "recent") {
      list = [...list].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    }
    return list;
  }, [stores, query, seasonFilter, sortBy, dominantTokens]);

  // ---------- PRODUTOS filtrados + agrupados ----------
  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => {
      const q = query.trim().toLowerCase();
      if (q && !`${p.name} ${p.season ?? ""} ${p.notes ?? ""}`.toLowerCase().includes(q)) return false;
      if (seasonFilter === "all") return true;
      if (seasonFilter === "compat") return matchesDominant(p.season);
      return matchesSeason(p.season, seasonFilter);
    });
    if (sortBy === "price-asc") list = [...list].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    else if (sortBy === "price-desc") list = [...list].sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
    else if (sortBy === "recent") list = [...list].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    else if (sortBy === "compat") {
      list = [...list].sort((a, b) => {
        const ac = matchesDominant(a.season) ? 1 : 0;
        const bc = matchesDominant(b.season) ? 1 : 0;
        return bc - ac;
      });
    }
    return list;
  }, [products, query, seasonFilter, sortBy, dominantTokens]);

  // Agrupa por estação compatível vs. outras
  const groupedProducts = useMemo(() => {
    const compat: FavoriteProduct[] = [];
    const others: FavoriteProduct[] = [];
    filteredProducts.forEach((p) => (matchesDominant(p.season) ? compat.push(p) : others.push(p)));
    return { compat, others };
  }, [filteredProducts, dominantTokens]);

  // Categorias detectadas nos produtos visíveis — usado para desabilitar
  // opções de barra que não se aplicam a nenhum item da lista atual.
  const visibleCategories = useMemo(() => {
    const set = new Set<GarmentCategory>();
    filteredProducts.forEach((p) => set.add(detectCategory(`${p.name} ${p.notes ?? ""}`)));
    return set;
  }, [filteredProducts]);
  const hemOptionApplies = (opt: HemPreference): boolean => {
    const inBottom = HEM_OPTIONS_BY_CATEGORY.bottom.includes(opt);
    const inDress = HEM_OPTIONS_BY_CATEGORY.dress.includes(opt);
    return (inBottom && visibleCategories.has("bottom")) || (inDress && visibleCategories.has("dress"));
  };

  const compatStoresCount = stores.filter((s) => (s.seasons ?? []).some((x) => matchesDominant(x))).length;
  const compatProductsCount = products.filter((p) => matchesDominant(p.season)).length;

  return (
    <div className="space-y-6">
      {/* ---------- MEDIDAS DE REFERÊNCIA ---------- */}
      <ReferenceMeasuresCard
        measurements={effectiveMeasurements}
        manual={manualMeasures}
        hasFromAnalysis={Boolean(latestMeasurements.height_cm || latestMeasurements.estimated_weight_kg || latestMeasurements.bust_cm)}
        required={!hasReferenceMeasure}
        onChange={setManualMeasures}
      />
      {/* ---------- BARRA DE FILTROS ---------- */}
      <Card className="bg-card/60 border-border shadow-panel">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar loja, peça ou tag..."
                className="pl-9"
              />
            </div>
            <Select value={seasonFilter} onValueChange={setSeasonFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-3.5 w-3.5 mr-1" />
                <SelectValue placeholder="Estação" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="compat">
                  ✨ Compatível {dominantSeason ? `(${dominantSeason})` : ""}
                </SelectItem>
                <SelectItem value="all">Todas as estações</SelectItem>
                {availableSeasons.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="compat">Compatibilidade</SelectItem>
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="price-asc">Menor preço</SelectItem>
                <SelectItem value="price-desc">Maior preço</SelectItem>
              </SelectContent>
            </Select>
            <Select value={hemPref} onValueChange={(v) => setHemPref(v as HemPreference)}>
              <SelectTrigger className="w-[200px]">
                <Ruler className="h-3.5 w-3.5 mr-1" />
                <SelectValue placeholder="Altura da barra" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectGroup>
                  <SelectLabel className="flex items-center justify-between gap-2">
                    <span>Calças & saias</span>
                    {!visibleCategories.has("bottom") && (
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60">sem itens</span>
                    )}
                  </SelectLabel>
                  {HEM_OPTIONS_BY_CATEGORY.bottom.map((k) => (
                    <SelectItem
                      key={`b-${k}`}
                      value={k}
                      disabled={!hemOptionApplies(k) && !HEM_OPTIONS_BY_CATEGORY.dress.includes(k)}
                    >
                      {HEM_PREFERENCE_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel className="flex items-center justify-between gap-2">
                    <span>Vestidos & macacões</span>
                    {!visibleCategories.has("dress") && (
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60">sem itens</span>
                    )}
                  </SelectLabel>
                  {HEM_OPTIONS_BY_CATEGORY.dress.map((k) => (
                    <SelectItem
                      key={`d-${k}`}
                      value={k}
                      disabled={!hemOptionApplies(k) && !HEM_OPTIONS_BY_CATEGORY.bottom.includes(k)}
                    >
                      {HEM_PREFERENCE_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          {dominantSeason && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span>
                Sua estação atual: <span className="font-medium text-foreground">{dominantSeason}</span>
              </span>
              <Badge variant="outline" className="text-[10px]">{compatStoresCount} lojas compatíveis</Badge>
              <Badge variant="outline" className="text-[10px]">{compatProductsCount} peças para comprar agora</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
        {/* Lojas */}
        <section>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-display text-lg">Lojas favoritas</h2>
              <Badge variant="outline" className="text-[10px]">{filteredStores.length}</Badge>
            </div>
            <AddStoreDialog onAdd={onAddStore} dominantSeason={dominantSeason} />
          </div>

          <div className="mt-4 space-y-3">
            {filteredStores.length === 0 && (
              <Card className="bg-card/40 border-dashed border-border">
                <CardContent className="p-5 text-center">
                  <p className="text-sm text-muted-foreground">
                    {stores.length === 0 ? "Comece salvando lojas onde você ama comprar." : "Nenhuma loja com esse filtro."}
                  </p>
                </CardContent>
              </Card>
            )}
            {filteredStores.map((s) => {
              const isCompat = (s.seasons ?? []).some((x) => matchesDominant(x));
              const score = calcCompatScore({
                itemSeasons: s.seasons ?? [],
                itemTags: s.tags ?? [],
                itemText: `${s.name} ${s.notes ?? ""}`,
                dominantSeason,
                paletteHints,
              });
              return (
                <Card key={s.id} className={`bg-card/80 border-border shadow-panel hover:shadow-lift transition-all ${isCompat ? "ring-1 ring-accent/40" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-display text-base truncate">{s.name}</p>
                          <CompatScoreBadge score={score} />
                        </div>
                        {s.url && (
                          <a href={s.url} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline inline-flex items-center gap-1 mt-0.5">
                            Visitar <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {s.notes && <p className="text-sm text-muted-foreground mt-2">{s.notes}</p>}
                        {(s.seasons?.length || s.tags?.length) ? (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {s.seasons?.map((x) => <Badge key={x} className="text-[10px] bg-accent/20 text-accent-foreground border-accent/40">{x}</Badge>)}
                            {s.tags?.map((x) => <Badge key={x} variant="outline" className="text-[10px]">{x}</Badge>)}
                          </div>
                        ) : null}
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onDeleteStore(s.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Wishlist */}
        <section>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-display text-lg">Wishlist</h2>
              <Badge variant="outline" className="text-[10px]">{filteredProducts.length}</Badge>
            </div>
            <AddProductDialog stores={stores} onAdd={onAddProduct} dominantSeason={dominantSeason} />
          </div>

          {filteredProducts.length === 0 ? (
            <Card className="bg-card/40 border-dashed border-border mt-4">
              <CardContent className="p-5 text-center">
                <p className="text-sm text-muted-foreground">
                  {products.length === 0 ? "Salve peças que combinam com sua estação." : "Nenhuma peça com esse filtro."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="mt-4 space-y-5">
              {/* Comprar agora */}
              {groupedProducts.compat.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-3.5 w-3.5 text-accent" />
                    <h3 className="text-xs font-medium uppercase tracking-wider text-accent">Comprar agora · combina com você</h3>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {groupedProducts.compat.map((p) => (
                      <ProductCard key={p.id} product={p} stores={stores} highlight measurements={effectiveMeasurements} dominantSeason={dominantSeason} paletteHints={paletteHints} hemPref={hemPref} onDelete={onDeleteProduct} />
                    ))}
                  </div>
                </div>
              )}
              {/* Outras peças */}
              {groupedProducts.others.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Outras peças salvas</h3>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {groupedProducts.others.map((p) => (
                      <ProductCard key={p.id} product={p} stores={stores} measurements={effectiveMeasurements} dominantSeason={dominantSeason} paletteHints={paletteHints} hemPref={hemPref} onDelete={onDeleteProduct} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ReferenceMeasuresCard({
  measurements, manual, hasFromAnalysis, required, onChange,
}: {
  measurements: UserMeasurements;
  manual: { height_cm?: number; estimated_weight_kg?: number };
  hasFromAnalysis: boolean;
  required: boolean;
  onChange: (m: { height_cm?: number; estimated_weight_kg?: number }) => void;
}) {
  const [open, setOpen] = useState(required);
  useEffect(() => { if (required) setOpen(true); }, [required]);
  const [height, setHeight] = useState<string>(manual.height_cm ? String(manual.height_cm) : "");
  const [weight, setWeight] = useState<string>(manual.estimated_weight_kg ? String(manual.estimated_weight_kg) : "");

  const apply = () => {
    const h = Number(height);
    const w = Number(weight);
    onChange({
      ...(Number.isFinite(h) && h > 0 ? { height_cm: h } : {}),
      ...(Number.isFinite(w) && w > 0 ? { estimated_weight_kg: w } : {}),
    });
    setOpen(false);
  };
  const clear = () => { setHeight(""); setWeight(""); onChange({}); };

  return (
    <Card className={`border-border shadow-panel ${required ? "bg-accent/5 border-accent/40" : "bg-card/60"}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <Ruler className="h-4 w-4 text-accent mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-display text-sm">Medidas de referência</p>
              <p className="text-[11px] text-muted-foreground">
                {required
                  ? "Informe ao menos altura ou peso para calcular tamanho e barra."
                  : hasFromAnalysis
                    ? `Usando análise corporal${manual.height_cm || manual.estimated_weight_kg ? " + ajustes manuais" : ""}.`
                    : "Valores informados manualmente."}
              </p>
              {!open && (measurements.height_cm || measurements.estimated_weight_kg) && (
                <p className="text-[11px] text-foreground/80 mt-1">
                  {measurements.height_cm ? `${measurements.height_cm} cm` : "—"}
                  {" · "}
                  {measurements.estimated_weight_kg ? `${measurements.estimated_weight_kg} kg` : "—"}
                </p>
              )}
            </div>
          </div>
          {!required && (
            <Button variant="ghost" size="sm" className="h-7 text-[11px] shrink-0" onClick={() => setOpen((v) => !v)}>
              {open ? "Fechar" : "Ajustar"}
            </Button>
          )}
        </div>
        {open && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Altura (cm)</label>
              <Input
                inputMode="numeric"
                value={height}
                onChange={(e) => setHeight(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="ex.: 168"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Peso (kg)</label>
              <Input
                inputMode="numeric"
                value={weight}
                onChange={(e) => setWeight(e.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))}
                placeholder="ex.: 62"
                className="h-9"
              />
            </div>
            <div className="col-span-2 flex items-center gap-2 pt-1">
              <Button size="sm" className="h-8 text-xs" onClick={apply} disabled={!height && !weight}>
                Recalcular recomendações
              </Button>
              {(manual.height_cm || manual.estimated_weight_kg) && (
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={clear}>
                  Limpar ajustes
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProductCard({
  product: p, stores, highlight, measurements, dominantSeason, paletteHints, hemPref, onDelete,
}: {
  product: FavoriteProduct;
  stores: FavoriteStore[];
  highlight?: boolean;
  measurements: UserMeasurements;
  dominantSeason: string | null;
  paletteHints: string[];
  hemPref: HemPreference;
  onDelete: (id: string) => Promise<void>;
}) {
  const store = stores.find((s) => s.id === p.store_id);
  const productText = `${p.name} ${p.notes ?? ""}`;
  const itemCategory = useMemo(() => detectCategory(productText), [productText]);
  const [hemOverride, setHemOverride] = useState<HemPreference | null>(null);
  const effectivePref = useMemo(
    () => resolveHemPreference(itemCategory, hemOverride ?? hemPref),
    [itemCategory, hemOverride, hemPref],
  );
  // Reseta override se o global mudar para um valor já aplicável (alinha sem surpresa)
  useEffect(() => { setHemOverride(null); }, [hemPref]);

  const sizing: SizeSuggestion | null = useMemo(
    () => suggestSize(productText, measurements, effectivePref),
    [productText, measurements, effectivePref],
  );
  const hasMeasurements = Boolean(measurements.bust_cm || measurements.waist_cm || measurements.hip_cm);
  const score = useMemo(() => calcCompatScore({
    itemSeasons: p.season ? [p.season] : [],
    itemTags: store?.tags ?? [],
    itemText: productText,
    dominantSeason,
    paletteHints,
  }), [productText, p.season, store, dominantSeason, paletteHints]);

  const itemHemOptions: HemPreference[] | null =
    itemCategory === "bottom" ? HEM_OPTIONS_BY_CATEGORY.bottom :
    itemCategory === "dress" ? HEM_OPTIONS_BY_CATEGORY.dress :
    null;

  return (
    <Card className={`bg-card/80 border-border shadow-panel hover:shadow-lift transition-all overflow-hidden ${highlight ? "ring-1 ring-accent/40" : ""}`}>
      {p.image_url ? (
        <div className="aspect-[4/5] bg-muted overflow-hidden relative">
          <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
          {highlight && (
            <Badge className="absolute top-2 left-2 text-[9px] bg-accent text-accent-foreground border-accent gap-1">
              <Check className="h-2.5 w-2.5" /> combina
            </Badge>
          )}
          {sizing && (
            <Badge className="absolute top-2 right-2 text-[10px] bg-foreground/90 text-background border-foreground gap-1 backdrop-blur">
              <Ruler className="h-2.5 w-2.5" /> {sizing.letter}{sizing.numeric ? ` · ${sizing.numeric}` : ""}
            </Badge>
          )}
        </div>
      ) : (
        <div className="aspect-[4/5] bg-gradient-to-br from-secondary to-muted grid place-items-center relative">
          <ShoppingBag className="h-8 w-8 text-muted-foreground" />
          {highlight && (
            <Badge className="absolute top-2 left-2 text-[9px] bg-accent text-accent-foreground border-accent gap-1">
              <Check className="h-2.5 w-2.5" /> combina
            </Badge>
          )}
          {sizing && (
            <Badge className="absolute top-2 right-2 text-[10px] bg-foreground/90 text-background border-foreground gap-1">
              <Ruler className="h-2.5 w-2.5" /> {sizing.letter}
            </Badge>
          )}
        </div>
      )}
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm truncate">{p.name}</p>
            {store && <p className="text-[10px] text-muted-foreground truncate">{store.name}</p>}
            <div className="mt-1.5"><CompatScoreBadge score={score} compact /></div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => onDelete(p.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          {p.price && <span className="text-xs font-medium">R$ {p.price.toFixed(2)}</span>}
          {p.season && <Badge className="text-[9px] bg-accent/20 text-accent-foreground border-accent/40">{p.season}</Badge>}
        </div>

        {/* Bloco de sugestão de tamanho */}
        {sizing ? (
          <div className="mt-2.5 rounded-lg border border-border bg-muted/40 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Ruler className="h-3 w-3 text-accent shrink-0" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                  {categoryLabel(sizing.category)}
                </span>
              </div>
              <span className="text-[9px] text-muted-foreground">
                confiança {sizing.confidence}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-base text-foreground">{sizing.letter}</span>
              {sizing.numeric && <span className="text-xs text-muted-foreground">/ {sizing.numeric}</span>}
            </div>
            {sizing.fitNotes.length > 0 && (
              <ul className="text-[10px] text-muted-foreground leading-relaxed space-y-0.5">
                {sizing.fitNotes.slice(0, 3).map((n, i) => (
                  <li key={i}>• {n}</li>
                ))}
              </ul>
            )}
            {itemHemOptions && (
              <div className="pt-1.5 border-t border-border/60 flex items-center gap-1.5">
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground shrink-0">Barra</span>
                <Select
                  value={effectivePref}
                  onValueChange={(v) => setHemOverride(v as HemPreference)}
                >
                  <SelectTrigger className="h-6 text-[10px] px-1.5 py-0 border-border/60 bg-background/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {itemHemOptions.map((k) => (
                      <SelectItem key={k} value={k} className="text-[11px]">
                        {HEM_PREFERENCE_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hemOverride && (
                  <button
                    type="button"
                    onClick={() => setHemOverride(null)}
                    className="text-[9px] text-muted-foreground hover:text-foreground underline shrink-0"
                  >
                    usar padrão
                  </button>
                )}
              </div>
            )}
          </div>
        ) : !hasMeasurements ? (
          <p className="mt-2.5 text-[10px] text-muted-foreground italic">
            Faça uma análise corporal para ver o tamanho recomendado.
          </p>
        ) : null}

        {p.url && (
          <a href={p.url} target="_blank" rel="noreferrer" className="mt-2 text-[11px] text-accent inline-flex items-center gap-1 hover:underline">
            Ver produto <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}

function AddStoreDialog({ onAdd, dominantSeason }: { onAdd: (d: { name: string; url: string | null; notes: string | null; seasons: string[]; tags: string[] }) => Promise<void>; dominantSeason: string | null }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [seasons, setSeasons] = useState(dominantSeason ?? "");
  const [tags, setTags] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="rounded-full gap-1.5"><Plus className="h-3.5 w-3.5" /> Loja</Button>
      </DialogTrigger>
      <DialogContent className="bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Nova loja favorita</DialogTitle>
          <DialogDescription>Salve marcas que combinam com a sua estação.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Animale" /></div>
          <div><Label>Site</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" /></div>
          <div><Label>Estações compatíveis</Label><Input value={seasons} onChange={(e) => setSeasons(e.target.value)} placeholder="Outono, Inverno (separar por vírgula)" /></div>
          <div><Label>Tags</Label><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="alfaiataria, cores quentes" /></div>
          <div><Label>Notas</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="O que mais te conquista nessa loja?" /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button disabled={!name.trim()} onClick={async () => {
            await onAdd({
              name: name.trim(),
              url: url.trim() || null,
              notes: notes.trim() || null,
              seasons: seasons.split(",").map((s) => s.trim()).filter(Boolean),
              tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
            });
            setName(""); setUrl(""); setNotes(""); setTags(""); setSeasons(dominantSeason ?? "");
            setOpen(false);
          }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddProductDialog({ stores, onAdd, dominantSeason }: { stores: FavoriteStore[]; onAdd: (d: { name: string; url: string | null; image_url: string | null; price: number | null; season: string | null; notes: string | null; store_id: string | null }) => Promise<void>; dominantSeason: string | null }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [price, setPrice] = useState("");
  const [season, setSeason] = useState(dominantSeason ?? "");
  const [storeId, setStoreId] = useState<string>("");
  const [notes, setNotes] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="rounded-full gap-1.5"><Plus className="h-3.5 w-3.5" /> Peça</Button>
      </DialogTrigger>
      <DialogContent className="bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Salvar na wishlist</DialogTitle>
          <DialogDescription>Marque peças que combinam com sua estação para comprar depois.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome da peça *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Blazer terracota" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Preço (R$)</Label><Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
            <div><Label>Estação</Label><Input value={season} onChange={(e) => setSeason(e.target.value)} placeholder="Outono Profundo" /></div>
          </div>
          <div><Label>Link do produto</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" /></div>
          <div><Label>Imagem (URL)</Label><Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." /></div>
          {stores.length > 0 && (
            <div>
              <Label>Loja</Label>
              <select className="w-full mt-1 rounded-md border border-input bg-background h-10 px-3 text-sm" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
                <option value="">— sem loja —</option>
                {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <div><Label>Notas</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button disabled={!name.trim()} onClick={async () => {
            await onAdd({
              name: name.trim(),
              url: url.trim() || null,
              image_url: imageUrl.trim() || null,
              price: price ? Number(price) : null,
              season: season.trim() || null,
              notes: notes.trim() || null,
              store_id: storeId || null,
            });
            setName(""); setUrl(""); setImageUrl(""); setPrice(""); setNotes(""); setStoreId("");
            setOpen(false);
          }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// INSIGHTS
function InsightsTab({ body, colors }: { body: BodyAssessment[]; colors: ColorAnalysisRow[] }) {
  // Constrói série temporal de medidas e %BF
  const timeline = useMemo(() => {
    return [...body].reverse().map((b) => {
      const m = b.measurements ?? {};
      const fa = (b.fitness_assessment ?? {}) as Record<string, unknown>;
      const num = (v: unknown) => {
        if (typeof v === "number") return v;
        if (typeof v === "string") { const n = parseFloat(v.replace(",", ".")); return Number.isFinite(n) ? n : undefined; }
        return undefined;
      };
      return {
        date: new Date(b.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        cintura: num(m.cintura ?? m.waist),
        quadril: num(m.quadril ?? m.hip),
        peito: num(m.peito ?? m.bust ?? m.chest),
        bodyFat: num(fa.body_fat_percentage ?? fa.bodyFatPercentage),
      };
    });
  }, [body]);

  // Cartela cromática consolidada (frequência de hex em todas análises)
  const consolidated = useMemo(() => {
    const counts = new Map<string, { count: number; name?: string }>();
    colors.forEach((c) => {
      const best = (c.analysis?.palette?.best ?? []) as { hex: string; name?: string }[];
      best.forEach((chip) => {
        const k = chip.hex.toLowerCase();
        const prev = counts.get(k);
        counts.set(k, { count: (prev?.count ?? 0) + 1, name: chip.name ?? prev?.name });
      });
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 18)
      .map(([hex, v]) => ({ hex, count: v.count, name: v.name }));
  }, [colors]);

  if (body.length === 0 && colors.length === 0) {
    return <EmptyState title="Insights vão aparecer aqui" description="Faça pelo menos uma análise para começarmos a montar gráficos de evolução e sua paleta consolidada."
      actions={<Link to="/"><Button className="rounded-full">Fazer análise</Button></Link>} />;
  }

  return (
    <div className="space-y-6">
      {timeline.length > 0 && (
        <Card className="bg-card/80 border-border shadow-panel">
          <CardHeader>
            <CardTitle className="font-display text-xl">Evolução das medidas (cm)</CardTitle>
            <CardDescription>Histórico das suas análises corporais</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline} margin={{ top: 10, right: 16, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                  <Line type="monotone" dataKey="cintura" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="quadril" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="peito" stroke="hsl(var(--primary-glow))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <LegendDot color="hsl(var(--accent))" label="Cintura" />
              <LegendDot color="hsl(var(--primary))" label="Quadril" />
              <LegendDot color="hsl(var(--primary-glow))" label="Peito" />
            </div>
          </CardContent>
        </Card>
      )}

      {timeline.some((t) => t.bodyFat !== undefined) && (
        <Card className="bg-card/80 border-border shadow-panel">
          <CardHeader>
            <CardTitle className="font-display text-xl">% Gordura corporal</CardTitle>
            <CardDescription>Evolução estimada nas suas análises</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline} margin={{ top: 10, right: 16, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="bfFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                  <Area type="monotone" dataKey="bodyFat" stroke="hsl(var(--accent))" fill="url(#bfFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {consolidated.length > 0 && (
        <Card className="bg-panel-glow border-border shadow-panel">
          <CardHeader>
            <CardTitle className="font-display text-xl">Cartela cromática consolidada</CardTitle>
            <CardDescription>Cores mais recorrentes nas suas análises</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 sm:grid-cols-9 gap-3">
              {consolidated.map((c) => (
                <div key={c.hex} className="text-center">
                  <span className="block aspect-square rounded-2xl border border-border shadow-sm" style={{ background: c.hex }} />
                  <span className="block mt-1.5 text-[9px] truncate">{c.name ?? c.hex}</span>
                  <span className="block text-[9px] text-muted-foreground">×{c.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />{label}</span>;
}

// ============================================================================
// Badge de score de compatibilidade com tooltip explicativo
function CompatScoreBadge({ score, compact }: { score: ScoreResult; compact?: boolean }) {
  const colorClass = scoreColorClass(score.level);
  const positives = score.reasons.filter((r) => r.positive);
  const negatives = score.reasons.filter((r) => !r.positive);

  return (
    <TooltipProvider delayDuration={150}>
      <UITooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 ${compact ? "py-0.5 text-[10px]" : "py-1 text-xs"} font-medium ${colorClass} cursor-help transition-transform hover:scale-105`}
          >
            <Sparkles className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
            <span>{score.score}%</span>
            {!compact && <span className="opacity-70">· {score.level}</span>}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs bg-popover border-border z-50">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-display">Compatibilidade {score.level}</span>
              <span className="text-xs font-medium">{score.score}/100</span>
            </div>
            <Progress value={score.score} className="h-1.5" />
            {positives.length > 0 && (
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase tracking-wider text-accent">A favor</p>
                <ul className="text-[11px] text-foreground/90 space-y-0.5">
                  {positives.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-accent mt-0.5">+{r.weight}</span>
                      <span>{r.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {negatives.length > 0 && (
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Atenção</p>
                <ul className="text-[11px] text-muted-foreground space-y-0.5">
                  {negatives.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="mt-0.5">{r.weight !== 0 ? r.weight : "·"}</span>
                      <span>{r.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TooltipContent>
      </UITooltip>
    </TooltipProvider>
  );
}
