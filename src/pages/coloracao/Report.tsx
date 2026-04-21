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
  const [exporting, setExporting] = useState(false);
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
  const fileBase = `coloracao-${analysis.season}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // Renderiza o relatório em largura fixa para garantir layout consistente
  const captureReport = async (renderWidth = 1240): Promise<HTMLCanvasElement> => {
    const node = reportRef.current!;
    const originalWidth = node.style.width;
    const originalMaxWidth = node.style.maxWidth;
    node.style.width = `${renderWidth}px`;
    node.style.maxWidth = `${renderWidth}px`;
    // aguardar layout/fontes
    await document.fonts?.ready;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    try {
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#F4EBD3",
        windowWidth: renderWidth,
        imageTimeout: 15000,
      });
      return canvas;
    } finally {
      node.style.width = originalWidth;
      node.style.maxWidth = originalMaxWidth;
    }
  };

  const fitToCanvas = (source: HTMLCanvasElement, targetW: number, targetH: number, bg = "#F4EBD3") => {
    const out = document.createElement("canvas");
    out.width = targetW;
    out.height = targetH;
    const ctx = out.getContext("2d")!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, targetW, targetH);
    // largura cheia, altura proporcional, alinhado ao topo
    const scale = targetW / source.width;
    const drawW = targetW;
    const drawH = source.height * scale;
    ctx.drawImage(source, 0, 0, drawW, drawH);
    return out;
  };

  const exportPng = async () => {
    if (exporting) return;
    setExporting(true);
    toast({ title: "Gerando PNG em alta resolução..." });
    try {
      const canvas = await captureReport(1240);
      const link = document.createElement("a");
      link.download = `${fileBase}-relatorio.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao exportar PNG", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const exportInstagram = async (format: "post" | "story") => {
    if (exporting) return;
    setExporting(true);
    const sizes = format === "post"
      ? { w: 1080, h: 1350, label: "Instagram 4:5" }
      : { w: 1080, h: 1920, label: "Instagram Stories" };
    toast({ title: `Gerando ${sizes.label}...` });
    try {
      const captured = await captureReport(1080);
      const aspect = sizes.w / sizes.h;
      const sourceAspect = captured.width / captured.height;
      let outCanvas: HTMLCanvasElement;
      if (sourceAspect <= aspect) {
        // mais alto: encaixa por largura, várias fatias possivelmente
        outCanvas = fitToCanvas(captured, sizes.w, sizes.h);
      } else {
        outCanvas = fitToCanvas(captured, sizes.w, sizes.h);
      }
      // Para conteúdo longo, geramos múltiplas imagens (carrossel) cobrindo toda a altura
      const scale = sizes.w / captured.width;
      const totalScaledH = captured.height * scale;
      const slides = Math.max(1, Math.ceil(totalScaledH / sizes.h));
      if (slides === 1) {
        const link = document.createElement("a");
        link.download = `${fileBase}-${format}.png`;
        link.href = outCanvas.toDataURL("image/png");
        link.click();
      } else {
        for (let i = 0; i < slides; i++) {
          const slide = document.createElement("canvas");
          slide.width = sizes.w;
          slide.height = sizes.h;
          const ctx = slide.getContext("2d")!;
          ctx.fillStyle = "#F4EBD3";
          ctx.fillRect(0, 0, sizes.w, sizes.h);
          // mapear pedaço da imagem original
          const srcY = (i * sizes.h) / scale;
          const srcH = Math.min(captured.height - srcY, sizes.h / scale);
          ctx.drawImage(captured, 0, srcY, captured.width, srcH, 0, 0, sizes.w, srcH * scale);
          // marca d'água sutil de página
          ctx.fillStyle = "rgba(34,40,68,0.55)";
          ctx.font = "600 22px 'DM Sans', system-ui, sans-serif";
          ctx.textAlign = "right";
          ctx.fillText(`${i + 1}/${slides}`, sizes.w - 32, sizes.h - 28);
          const link = document.createElement("a");
          link.download = `${fileBase}-${format}-${i + 1}.png`;
          link.href = slide.toDataURL("image/png");
          link.click();
          await new Promise((r) => setTimeout(r, 250));
        }
        toast({ title: `${slides} imagens geradas`, description: "Use como carrossel no Instagram." });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao exportar imagem", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const exportPdf = async () => {
    if (exporting) return;
    setExporting(true);
    toast({ title: "Gerando PDF Premium..." });
    try {
      const canvas = await captureReport(1240);
      // A4 retrato: 210 x 297 mm
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
      // Total páginas necessárias
      const totalPages = Math.max(1, Math.ceil(imgH / pageH));
      // Para qualidade, fatiamos o canvas em pedaços do tamanho de uma página A4
      const pxPerMm = canvas.width / pageW;
      const pageHeightInPx = Math.floor(pageH * pxPerMm);
      for (let i = 0; i < totalPages; i++) {
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = Math.min(pageHeightInPx, canvas.height - i * pageHeightInPx);
        const ctx = slice.getContext("2d")!;
        ctx.fillStyle = "#F4EBD3";
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, -i * pageHeightInPx);
        const dataUrl = slice.toDataURL("image/jpeg", 0.95);
        if (i > 0) pdf.addPage();
        pdf.addImage(dataUrl, "JPEG", 0, 0, imgW, (slice.height * imgW) / slice.width, undefined, "FAST");
      }
      pdf.setProperties({
        title: `Análise de Coloração Pessoal — ${seasonFull}`,
        subject: "Relatório de Coloração Pessoal IA",
        author: "Atelier de Coloração",
        creator: "Atelier de Coloração",
      });
      pdf.save(`${fileBase}-premium.pdf`);
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao exportar PDF", variant: "destructive" });
    } finally {
      setExporting(false);
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
            <Button size="sm" variant="outline" className="rounded-full gap-2" onClick={share} disabled={exporting}>
              <Share2 className="h-4 w-4" /><span className="hidden sm:inline">Compartilhar</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="rounded-full gap-2" disabled={exporting}>
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  <span className="hidden sm:inline">{exporting ? "Exportando..." : "Exportar"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Documentos</DropdownMenuLabel>
                <DropdownMenuItem onClick={exportPdf} className="gap-3">
                  <FileText className="h-4 w-4" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">PDF Premium · A4</p>
                    <p className="text-[11px] text-muted-foreground">Alta resolução, multi-página</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportPng} className="gap-3">
                  <ImageIcon className="h-4 w-4" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">PNG do Relatório</p>
                    <p className="text-[11px] text-muted-foreground">Imagem única em alta</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Instagram</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => exportInstagram("post")} className="gap-3">
                  <Instagram className="h-4 w-4" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Post 4:5 · 1080×1350</p>
                    <p className="text-[11px] text-muted-foreground">Carrossel se necessário</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportInstagram("story")} className="gap-3">
                  <Square className="h-4 w-4" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Stories 9:16 · 1080×1920</p>
                    <p className="text-[11px] text-muted-foreground">Carrossel de stories</p>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
