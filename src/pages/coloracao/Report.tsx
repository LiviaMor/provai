import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Download, Image as ImageIcon, Share2, ArrowLeft, Check, X, Droplet, Thermometer, Eye, Sun, Sparkles, Flower2, Contrast, Layers, FileText, Instagram, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ColorAnalysis, ColorChip } from "@/types/colorAnalysis";
import { toast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { exampleAnalysis, examplePhoto } from "@/data/exampleAnalysis";

const Swatch = ({ chip, size = "md" }: { chip: ColorChip; size?: "sm" | "md" | "lg" }) => {
  const sz = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-8 w-8" : "h-11 w-11";
  return (
    <div className="flex flex-col items-center text-center gap-1.5 min-w-0">
      <span className={`${sz} rounded-full border border-border shadow-sm shrink-0`} style={{ background: chip.hex }} />
      <span className="text-[10px] sm:text-xs leading-tight font-medium max-w-[72px] truncate">{chip.name}</span>
    </div>
  );
};

const FaceTile = ({ photo, color, label, ok, why }: { photo: string; color: string; label: string; ok: boolean; why?: string }) => (
  <div className="rounded-2xl overflow-hidden border border-border bg-card">
    <div className="px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-primary-foreground" style={{ background: color }}>{label}</div>
    <div className="aspect-[3/4] relative overflow-hidden">
      <img src={photo} alt={label} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 h-1/2" style={{ background: `linear-gradient(to top, ${color} 30%, transparent)` }} />
      <span className={`absolute top-2 right-2 h-6 w-6 rounded-full grid place-items-center ${ok ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}`}>
        {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      </span>
    </div>
    {why && <p className="px-3 py-2 text-[11px] leading-snug text-muted-foreground">{why}</p>}
  </div>
);

const charIcons: Record<string, typeof Droplet> = {
  depth: Layers,
  contrast: Contrast,
  undertone: Droplet,
  temperature: Thermometer,
  intensity: Eye,
  luminosity: Sun,
  harmony: Flower2,
};
const charLabels: Record<string, string> = {
  depth: "Profundidade",
  contrast: "Contraste",
  undertone: "Subtom",
  temperature: "Temperatura",
  intensity: "Intensidade",
  luminosity: "Luminosidade",
  harmony: "Harmonia Geral",
};

export default function Report({ demo = false }: { demo?: boolean }) {
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<ColorAnalysis | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (demo) {
      setAnalysis(exampleAnalysis);
      setPhotos([examplePhoto]);
      return;
    }
    const raw = sessionStorage.getItem("coloracao_result");
    if (!raw) {
      navigate("/coloracao/upload", { replace: true });
      return;
    }
    try {
      const { analysis, images } = JSON.parse(raw);
      setAnalysis(analysis);
      setPhotos(images || []);
    } catch {
      navigate("/coloracao/upload", { replace: true });
    }
  }, [demo, navigate]);

  if (!analysis) return null;

  const primary = photos[0] || examplePhoto;
  const seasonFull = `${analysis.season}${analysis.season_modifier ? ` (${analysis.season_modifier})` : ""}`.toUpperCase();

  const exportPng = async () => {
    if (!reportRef.current) return;
    toast({ title: "Gerando imagem..." });
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: "#F4EBD3" });
      const link = document.createElement("a");
      link.download = `analise-coloracao-${analysis.season}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      toast({ title: "Erro ao exportar", variant: "destructive" });
    }
  };

  const exportPdf = async () => {
    if (!reportRef.current) return;
    toast({ title: "Gerando PDF..." });
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: "#F4EBD3" });
      const img = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [canvas.width, canvas.height] });
      pdf.addImage(img, "JPEG", 0, 0, canvas.width, canvas.height);
      pdf.save(`analise-coloracao-${analysis.season}.pdf`);
    } catch {
      toast({ title: "Erro ao exportar PDF", variant: "destructive" });
    }
  };

  const share = async () => {
    const text = `Minha análise de coloração pessoal: ${seasonFull}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Coloração Pessoal", text }); } catch { /* canceled */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copiado!", description: "Texto copiado para a área de transferência." });
    }
  };

  const compareColors = analysis.face_comparison?.valorizam ?? [];
  const apagamColors = analysis.face_comparison?.apagam ?? [];

  return (
    <div className="min-h-screen bg-app-radial">
      {/* Action bar */}
      <div className="sticky top-0 z-30 backdrop-blur bg-background/80 border-b border-border">
        <div className="container flex items-center justify-between py-4 gap-3">
          <Link to="/coloracao" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Início
          </Link>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="rounded-full gap-2" onClick={share}><Share2 className="h-4 w-4" /><span className="hidden sm:inline">Compartilhar</span></Button>
            <Button size="sm" variant="outline" className="rounded-full gap-2" onClick={exportPng}><ImageIcon className="h-4 w-4" /><span className="hidden sm:inline">PNG</span></Button>
            <Button size="sm" className="rounded-full gap-2" onClick={exportPdf}><Download className="h-4 w-4" /><span className="hidden sm:inline">PDF Premium</span></Button>
          </div>
        </div>
      </div>

      {/* REPORT */}
      <div className="container py-10">
        <motion.div ref={reportRef} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="rounded-[28px] bg-card border border-border shadow-panel overflow-hidden">
          {/* Header */}
          <div className="px-6 sm:px-10 pt-10 pb-6 text-center border-b border-border">
            <p className="uppercase tracking-[0.3em] text-xs text-muted-foreground">Análise de Coloração Pessoal</p>
            <h1 className="mt-2 font-display text-3xl sm:text-5xl">Sua Cartela: <span className="italic">{seasonFull}</span></h1>
            {analysis.season_subtitle && <p className="mt-3 text-muted-foreground italic max-w-2xl mx-auto">{analysis.season_subtitle}</p>}
          </div>

          {/* Hero: foto + características */}
          <div className="grid lg:grid-cols-[1fr_1.1fr_1fr] gap-6 p-6 sm:p-10">
            {/* Coluna esquerda */}
            <div className="rounded-2xl bg-secondary/40 p-6">
              <p className="font-display text-lg italic">Análise de</p>
              <h2 className="font-display text-3xl leading-tight">COLORAÇÃO<br/>PESSOAL</h2>
              <p className="mt-4 text-sm text-muted-foreground">Seu guia de cores para realçar sua beleza com harmonia e autenticidade.</p>
              <div className="mt-6 inline-block rounded-full bg-primary text-primary-foreground text-xs uppercase tracking-[0.18em] px-3 py-1.5">Sua cartela</div>
              <p className="mt-3 font-display text-2xl">{seasonFull}</p>
              {analysis.season_description && <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{analysis.season_description}</p>}
            </div>

            {/* Foto principal */}
            <div className="rounded-2xl overflow-hidden border border-border min-h-[320px] bg-secondary">
              <img src={primary} alt="Foto principal" className="h-full w-full object-cover" />
            </div>

            {/* Características */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-center text-[11px] uppercase tracking-[0.22em] text-muted-foreground border-b border-border pb-3">Características Principais</p>
              <ul className="mt-3 space-y-3">
                {Object.entries(analysis.characteristics || {}).map(([key, v]) => {
                  const Icon = charIcons[key] || Droplet;
                  return (
                    <li key={key} className="flex items-start gap-3">
                      <span className="h-8 w-8 rounded-full bg-secondary grid place-items-center shrink-0"><Icon className="h-4 w-4" /></span>
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{charLabels[key] || key}</p>
                        <p className="text-sm font-medium leading-tight">{v.value}{v.note ? <span className="text-muted-foreground font-normal"> · {v.note}</span> : null}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Melhor Paleta */}
          <section className="px-6 sm:px-10 py-8 border-t border-border">
            <h3 className="text-center font-display text-xl">Melhor Paleta — {seasonFull}</h3>
            <div className="mt-6 grid grid-cols-6 sm:grid-cols-12 gap-3">
              {(analysis.best_palette || []).slice(0, 12).map((c, i) => <Swatch key={i} chip={c} size="lg" />)}
            </div>
            <p className="mt-6 text-center text-xs text-muted-foreground max-w-2xl mx-auto">Cores que harmonizam com seu subtom e realçam sua beleza natural.</p>
          </section>

          {/* Comparação no rosto */}
          {compareColors.length > 0 && (
            <section className="px-6 sm:px-10 py-8 border-t border-border bg-secondary/20">
              <h3 className="text-center font-display text-xl">Comparação de Cores no Rosto</h3>
              <p className="mt-1 text-center text-xs text-muted-foreground">Veja como cada cor reage com seu rosto real.</p>
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {compareColors.map((c, i) => <FaceTile key={`v${i}`} photo={primary} color={c.hex} label={c.name} ok why={c.why} />)}
              </div>
              {apagamColors.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {apagamColors.map((c, i) => <FaceTile key={`a${i}`} photo={primary} color={c.hex} label={c.name} ok={false} why={c.why} />)}
                </div>
              )}
            </section>
          )}

          {/* Neutros + Evitar */}
          <section className="grid md:grid-cols-2 gap-0 border-t border-border">
            <div className="p-6 sm:p-10 border-b md:border-b-0 md:border-r border-border">
              <h3 className="text-center font-display text-lg">Melhores Neutros</h3>
              <div className="mt-6 grid grid-cols-3 sm:grid-cols-6 gap-3">
                {(analysis.neutrals || []).map((c, i) => <Swatch key={i} chip={c} />)}
              </div>
              <p className="mt-5 text-center text-xs text-muted-foreground">Neutros que harmonizam e elevam qualquer combinação.</p>
            </div>
            <div className="p-6 sm:p-10">
              <h3 className="text-center font-display text-lg">Evitar / Usar Menos</h3>
              <div className="mt-6 grid grid-cols-3 sm:grid-cols-5 gap-3">
                {(analysis.avoid || []).map((c, i) => <Swatch key={i} chip={c} />)}
              </div>
              <p className="mt-5 text-center text-xs text-muted-foreground">Cores que tendem a apagar sua beleza natural.</p>
            </div>
          </section>

          {/* Cabelo */}
          <section className="px-6 sm:px-10 py-10 border-t border-border bg-secondary/20">
            <h3 className="text-center font-display text-xl">Coloração de Cabelo — Ideal para sua paleta</h3>
            <div className="mt-6 grid md:grid-cols-2 gap-8">
              <div>
                <p className="flex items-center justify-center gap-2 text-sm font-medium"><span className="h-5 w-5 rounded-full bg-success text-success-foreground grid place-items-center"><Check className="h-3 w-3" /></span> Melhores Escolhas</p>
                <div className="mt-4 grid grid-cols-5 gap-3">
                  {(analysis.hair?.best || []).map((c, i) => (
                    <div key={i} className="text-center">
                      <span className="block aspect-square rounded-2xl border border-border" style={{ background: `linear-gradient(135deg, ${c.hex}, ${c.hex}dd)` }} />
                      <p className="mt-1.5 text-[11px] leading-tight">{c.name}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="flex items-center justify-center gap-2 text-sm font-medium"><span className="h-5 w-5 rounded-full bg-destructive text-destructive-foreground grid place-items-center"><X className="h-3 w-3" /></span> Evitar / Usar com moderação</p>
                <div className="mt-4 grid grid-cols-4 gap-3">
                  {(analysis.hair?.avoid || []).map((c, i) => (
                    <div key={i} className="text-center">
                      <span className="block aspect-square rounded-2xl border border-border" style={{ background: `linear-gradient(135deg, ${c.hex}, ${c.hex}dd)` }} />
                      <p className="mt-1.5 text-[11px] leading-tight">{c.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Makeup */}
          <section className="px-6 sm:px-10 py-10 border-t border-border">
            <h3 className="text-center font-display text-xl">Makeup Ideal</h3>
            <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: "Base", chips: [], desc: analysis.makeup?.base },
                { title: "Blush", chips: analysis.makeup?.blush || [] },
                { title: "Batom", chips: analysis.makeup?.lipstick || [] },
                { title: "Sombra", chips: analysis.makeup?.eyeshadow || [] },
              ].map((b) => (
                <div key={b.title} className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{b.title}</p>
                  {b.chips.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-3">
                      {b.chips.map((c, i) => <Swatch key={i} chip={c} size="sm" />)}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm">{b.desc}</p>
                  )}
                </div>
              ))}
            </div>
            {analysis.makeup?.highlighter && (
              <p className="mt-5 text-center text-sm"><span className="font-medium">Iluminador:</span> <span className="text-muted-foreground">{analysis.makeup.highlighter}</span></p>
            )}
          </section>

          {/* Acessórios + dicas */}
          <section className="px-6 sm:px-10 py-10 border-t border-border bg-secondary/30 grid lg:grid-cols-[1fr_1.5fr] gap-8">
            <div>
              <h3 className="font-display text-xl">Acessórios & Metais</h3>
              <p className="mt-2 text-sm text-muted-foreground">Metais que iluminam seu rosto.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(analysis.metals || []).map((m) => <span key={m} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs">{m}</span>)}
              </div>
              {analysis.metals_avoid && analysis.metals_avoid.length > 0 && (
                <>
                  <p className="mt-5 text-xs uppercase tracking-[0.2em] text-muted-foreground">Evitar</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {analysis.metals_avoid.map((m) => <span key={m} className="rounded-full border border-destructive/40 bg-destructive/5 text-destructive px-3 py-1.5 text-xs">{m}</span>)}
                  </div>
                </>
              )}
              {analysis.prints && (
                <>
                  <p className="mt-5 text-xs uppercase tracking-[0.2em] text-muted-foreground">Estampas</p>
                  <p className="mt-2 text-sm">{analysis.prints}</p>
                </>
              )}
            </div>
            <div>
              <h3 className="font-display text-xl">Dicas de Ouro</h3>
              <ul className="mt-4 grid sm:grid-cols-2 gap-3">
                {(analysis.golden_tips || []).map((t, i) => (
                  <li key={i} className="rounded-2xl bg-card border border-border p-4 text-sm flex items-start gap-3">
                    <span className="h-7 w-7 rounded-full bg-accent/20 text-accent grid place-items-center shrink-0"><Sparkles className="h-3.5 w-3.5" /></span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Closing */}
          <section className="px-6 sm:px-10 py-12 text-center border-t border-border">
            <p className="font-display text-xl sm:text-2xl italic max-w-2xl mx-auto text-balance">
              {analysis.final_quote || "Cores certas iluminam seu rosto, suavizam imperfeições e destacam sua presença natural."}
            </p>
            <p className="mt-6 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Atelier de Coloração · Análise por IA</p>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
