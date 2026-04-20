import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Camera,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  HeartPulse,
  History,
  KeyRound,
  Link2,
  Lock,
  LogIn,
  Ruler,
  ScanLine,
  Shirt,
  Sparkles,
  Upload,
  UserRound,
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

type MeasurementKey = "height_cm" | "estimated_weight_kg" | "bust_cm" | "waist_cm" | "hip_cm" | "inseam_cm" | "arm_length_cm" | "shoulder_width_cm" | "neck_cm";

type Measurements = Partial<Record<MeasurementKey, number>>;

type ClothingTip = {
  category: string;
  size: string;
  fitTip: string;
};

type StyleTip = {
  title: string;
  tag: string;
  tip: string;
  avoid?: string;
  emoji?: string;
};

type FitnessAssessment = {
  bmi?: number;
  bmiClass?: string;
  waistRisk?: string;
  bodyFatEstimate?: string;
  summary?: string;
};

type Analysis = {
  confidence: number;
  disclaimer: string;
  measurements: Measurements;
  fitProfile: string;
  bodyType?: string;
  clothing: ClothingTip[];
  adjustments: string[];
  nutritionNotes: string[];
  sizeRecommendations?: Record<string, string>;
  styleRecommendations?: StyleTip[];
  fitnessAssessment?: FitnessAssessment;
};

type FlowMode = "home" | "photo" | "manual" | "results";

type HistoryItem = {
  id: string;
  date: string;
  waist: number;
  hip: number;
  weight: number;
};

const measureLabels: Record<string, string> = {
  height_cm: "Altura",
  estimated_weight_kg: "Peso",
  bust_cm: "Busto/Tórax",
  waist_cm: "Cintura",
  hip_cm: "Quadril",
  inseam_cm: "Perna (inseam)",
  arm_length_cm: "Braço",
  shoulder_width_cm: "Ombros",
  neck_cm: "Pescoço",
};

const manualFields: Array<{ key: MeasurementKey; label: string; placeholder: string }> = [
  { key: "height_cm", label: "Altura (cm)", placeholder: "170" },
  { key: "estimated_weight_kg", label: "Peso (kg)", placeholder: "68" },
  { key: "bust_cm", label: "Busto/Tórax (cm)", placeholder: "92" },
  { key: "waist_cm", label: "Cintura (cm)", placeholder: "74" },
  { key: "hip_cm", label: "Quadril (cm)", placeholder: "99" },
  { key: "inseam_cm", label: "Comprimento da perna (cm)", placeholder: "76" },
  { key: "arm_length_cm", label: "Comprimento do braço (cm)", placeholder: "58" },
];

const defaultStyles: StyleTip[] = [
  { title: "Cintura em foco", tag: "Casual", tip: "Peças com cintura marcada equilibram proporções e criam um caimento mais seguro.", avoid: "Evite volumes rígidos exatamente na região do quadril.", emoji: "👖" },
  { title: "Linha alongada", tag: "Trabalho", tip: "Blazers abertos, decote V e calças retas ajudam a alongar a silhueta.", avoid: "Evite barras muito curtas se o objetivo for alongamento.", emoji: "🧥" },
  { title: "Volume estratégico", tag: "Festa", tip: "Saias evasê e tecidos com movimento valorizam a cintura sem apertar.", avoid: "Evite estampas horizontais onde você prefere suavizar volume.", emoji: "✨" },
  { title: "Leveza para o calor", tag: "Praia", tip: "Saídas transpassadas e tops com boa sustentação trazem conforto e confiança.", emoji: "🌴" },
];

const brandSizes = {
  Brasil: "P / M / G / GG / XGG",
  Internacional: "XS / S / M / L / XL",
  Europeu: "36 / 38 / 40 / 42 / 44",
  "Calça número": "36, 38, 40, 42...",
  Sutiã: "Ex.: 40B quando aplicável",
};

const historySeed: HistoryItem[] = [
  { id: "1", date: "Jan", waist: 78, hip: 101, weight: 70 },
  { id: "2", date: "Fev", waist: 76, hip: 100, weight: 69 },
  { id: "3", date: "Hoje", waist: 74, hip: 99, weight: 68 },
];

const parseNumber = (value: string) => {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const confidenceLabel = (confidence: number) => {
  if (confidence >= 75) return "Alta confiança";
  if (confidence >= 55) return "Média confiança";
  return "Informe manualmente para maior precisão";
};

const formatMeasure = (key: string, value?: number) => {
  if (!value) return "—";
  if (key.includes("kg")) return `${Math.round(value)}kg`;
  return `${Math.round(value)}cm`;
};

const calculateFallbackFitness = (measurements: Measurements): FitnessAssessment => {
  const heightM = measurements.height_cm ? measurements.height_cm / 100 : undefined;
  const weight = measurements.estimated_weight_kg;
  const bmi = heightM && weight ? Number((weight / (heightM * heightM)).toFixed(1)) : undefined;
  const bmiClass = !bmi ? "Dados insuficientes" : bmi < 18.5 ? "Abaixo do peso" : bmi < 25 ? "Normal" : bmi < 30 ? "Sobrepeso" : "Obeso";
  const waistRisk = measurements.waist_cm && measurements.waist_cm >= 88 ? "Atenção: cintura elevada" : "Dentro de uma faixa usual";
  return { bmi, bmiClass, waistRisk, bodyFatEstimate: "Estimativa visual conservadora", summary: "Segundo os dados informados, seu peso está dentro de uma faixa que deve ser avaliada junto ao contexto individual." };
};

const Index = () => {
  const [mode, setMode] = useState<FlowMode>("home");
  const [frontPreview, setFrontPreview] = useState("");
  const [sidePreview, setSidePreview] = useState("");
  const [manual, setManual] = useState<Record<string, string>>({});
  const [gender, setGender] = useState("Feminino");
  const [objective, setObjective] = useState("Ambos");
  const [productUrl, setProductUrl] = useState("");
  const [notes, setNotes] = useState("Comprar roupas online com menos troca");
  const [consent, setConsent] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [history, setHistory] = useState(historySeed);

  const currentMeasurements = analysis?.measurements ?? {};
  const fitness = analysis?.fitnessAssessment ?? calculateFallbackFitness(currentMeasurements);
  const styles = analysis?.styleRecommendations?.length ? analysis.styleRecommendations : defaultStyles;
  const sizes = analysis?.sizeRecommendations ?? brandSizes;
  const activeStep = isAnalyzing ? 3 : sidePreview ? 2 : frontPreview ? 1 : 0;

  const measurementRows = useMemo(() => {
    const keys: MeasurementKey[] = ["bust_cm", "waist_cm", "hip_cm", "inseam_cm", "arm_length_cm", "shoulder_width_cm", "neck_cm"];
    return keys.map((key) => ({
      key,
      label: measureLabels[key],
      value: formatMeasure(key, currentMeasurements[key]),
      status: key === "inseam_cm" ? "→ barra: +3cm" : key === "arm_length_cm" ? "→ punho padrão" : "✓",
    }));
  }, [currentMeasurements]);

  const onImageChange = (event: ChangeEvent<HTMLInputElement>, kind: "front" | "side") => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Envie uma imagem válida.");
    if (file.size > 7 * 1024 * 1024) return toast.error("Use uma foto de até 7MB para análise mais rápida.");
    const reader = new FileReader();
    reader.onload = () => (kind === "front" ? setFrontPreview(String(reader.result)) : setSidePreview(String(reader.result)));
    reader.readAsDataURL(file);
  };

  const manualMeasurements = () =>
    manualFields.reduce<Measurements>((acc, field) => {
      const value = parseNumber(manual[field.key] ?? "");
      if (value) acc[field.key] = value;
      return acc;
    }, {});

  const saveHistory = async (result: Analysis) => {
    const item = {
      id: String(Date.now()),
      date: "Hoje",
      waist: Number(result.measurements.waist_cm ?? 0),
      hip: Number(result.measurements.hip_cm ?? 0),
      weight: Number(result.measurements.estimated_weight_kg ?? 0),
    };
    setHistory((prev) => [...prev.filter((entry) => entry.date !== "Hoje"), item]);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return;

    await (supabase as any).from("body_assessments").insert({
      user_id: userId,
      title: "Avaliação Encaixe",
      source: frontPreview ? "photo" : "manual",
      gender,
      objective,
      product_url: productUrl || null,
      confidence: Math.round(result.confidence ?? 0),
      measurements: result.measurements,
      size_recommendations: result.sizeRecommendations ?? {},
      style_recommendations: result.styleRecommendations ?? [],
      fitness_assessment: result.fitnessAssessment ?? {},
      notes,
    });
  };

  const analyze = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const measurements = manualMeasurements();

    if (mode === "photo" && !consent) return toast.error("Aceite o consentimento LGPD para analisar fotos.");
    if (mode === "photo" && !frontPreview) return toast.error("Envie a foto de frente para iniciar.");
    if (mode === "manual" && !measurements.height_cm && !measurements.waist_cm) return toast.error("Informe pelo menos altura ou cintura.");

    setIsAnalyzing(true);
    setAnalysis(null);
    setMode("photo");

    const { data, error } = await supabase.functions.invoke("analyze-body", {
      body: {
        imageDataUrl: frontPreview || undefined,
        sideImageDataUrl: sidePreview || undefined,
        heightCm: measurements.height_cm,
        weightKg: measurements.estimated_weight_kg,
        gender,
        shoppingGoal: objective,
        productUrl: productUrl.trim() || undefined,
        manualMeasurements: measurements,
      },
    });

    setIsAnalyzing(false);

    if (error || data?.error) return toast.error(data?.error ?? "Não foi possível concluir a análise.");

    const result = data as Analysis;
    setAnalysis(result);
    setMode("results");
    await saveHistory(result);
    toast.success("Análise Encaixe concluída.");
  };

  const exportPdf = () => {
    if (!analysis) return toast.error("Faça uma análise antes de exportar.");
    const pdf = new jsPDF();
    pdf.setFontSize(20);
    pdf.text("Relatório Encaixe", 16, 20);
    pdf.setFontSize(11);
    pdf.text(`Confiança: ${confidenceLabel(analysis.confidence)} (${Math.round(analysis.confidence)}%)`, 16, 32);
    pdf.text(`Tipo corporal: ${analysis.bodyType ?? "Em avaliação"}`, 16, 40);
    let y = 54;
    Object.entries(analysis.measurements).forEach(([key, value]) => {
      pdf.text(`${measureLabels[key] ?? key}: ${formatMeasure(key, Number(value))}`, 16, y);
      y += 8;
    });
    pdf.text("Observação: esta é uma estimativa. Consulte um profissional de saúde.", 16, y + 8);
    pdf.save("relatorio-encaixe.pdf");
  };

  const signIn = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.href });
    if (result?.error) toast.error("Não foi possível iniciar o login.");
  };

  return (
    <main className="min-h-screen bg-app-radial text-foreground">
      <section className="container min-h-screen max-w-6xl py-5 sm:py-8">
        <nav className="mb-5 flex items-center justify-between rounded-2xl border bg-card/80 px-4 py-3 shadow-panel backdrop-blur">
          <div className="flex items-center gap-2 font-display text-2xl font-semibold">
            <span className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-glow"><ScanLine className="size-5" /></span>
            Encaixe
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={signIn} className="gap-2">
            <LogIn className="size-4" /> Entrar
          </Button>
        </nav>

        {mode === "home" && (
          <div className="grid min-h-[calc(100vh-120px)] items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="animate-reveal space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border bg-card/70 px-4 py-2 text-sm font-bold text-muted-foreground shadow-panel">
                <Sparkles className="size-4 text-accent" /> Medidas, estilo e caimento por IA
              </div>
              <h1 className="font-display text-5xl font-semibold leading-tight text-balance sm:text-6xl">Descubra seu tamanho ideal em segundos</h1>
              <p className="max-w-xl text-lg leading-8 text-muted-foreground">Uma experiência mobile-first para estimar medidas, cruzar links de lojas, sugerir tamanhos e orientar escolhas de estilo com tom leve e acolhedor.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button type="button" variant="hero" size="lg" onClick={() => setMode("photo")}><Camera className="size-5" /> Analisar pelo celular</Button>
                <Button type="button" variant="outline" size="lg" onClick={() => setMode("manual")}><Ruler className="size-5" /> Inserir medidas manualmente</Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {["1 análise grátis/mês", "Premium R$19,90/mês", "B2B API em breve"].map((item) => <div key={item} className="rounded-2xl border bg-card/70 p-4 text-sm font-bold shadow-panel">{item}</div>)}
              </div>
            </div>
            <div className="relative mx-auto aspect-[3/4] w-full max-w-sm rounded-[2rem] border bg-panel-glow p-8 shadow-panel">
              <div className="absolute inset-x-12 top-10 bottom-10 rounded-full border-2 border-primary/30" />
              <div className="absolute left-1/2 top-16 size-20 -translate-x-1/2 rounded-full border-2 border-primary/40" />
              <div className="absolute left-1/2 top-36 h-64 w-28 -translate-x-1/2 rounded-full border-2 border-accent/50" />
              <div className="absolute inset-x-6 top-0 h-24 animate-scan bg-scanner-line" />
              <div className="absolute inset-0 scan-grid rounded-[2rem] opacity-50" />
            </div>
          </div>
        )}

        {(mode === "photo" || mode === "manual") && (
          <form onSubmit={analyze} className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-4 rounded-2xl border bg-card/80 p-5 shadow-panel backdrop-blur">
              <Button type="button" variant="ghost" size="sm" onClick={() => setMode("home")}>← Voltar</Button>
              <h2 className="font-display text-3xl font-semibold">{mode === "photo" ? "Captura guiada" : "Medidas manuais"}</h2>
              <p className="leading-7 text-muted-foreground">Fique em pé, de frente, com roupa justa. A foto lateral melhora a leitura de postura, cintura e quadril.</p>
              <div className="grid gap-2">
                {["Foto frente", "Foto lateral", "Processando"].map((step, index) => (
                  <div key={step} className="flex items-center gap-3 rounded-2xl bg-muted p-3 text-sm font-bold">
                    <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">{activeStep > index ? <CheckCircle2 className="size-4" /> : index + 1}</span>
                    {step}
                  </div>
                ))}
              </div>
              {isAnalyzing && <div className="relative overflow-hidden rounded-2xl border bg-secondary p-6 text-center font-bold"><span className="absolute inset-x-0 top-0 h-20 animate-scan bg-scanner-line" />IA analisando seu encaixe...</div>}
            </div>

            <div className="space-y-4 rounded-2xl border bg-panel-glow p-4 shadow-panel backdrop-blur sm:p-5">
              {mode === "photo" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Label htmlFor="front" className="relative flex aspect-[3/4] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border bg-secondary text-center shadow-inner">
                    {frontPreview ? <img src={frontPreview} alt="Foto frontal para análise de medidas" className="h-full w-full object-cover" /> : <span className="grid justify-items-center gap-3 p-6 text-muted-foreground"><Upload className="size-8 text-primary" /> Foto de frente</span>}
                  </Label>
                  <Label htmlFor="side" className="relative flex aspect-[3/4] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border bg-secondary text-center shadow-inner">
                    {sidePreview ? <img src={sidePreview} alt="Foto lateral para análise de medidas" className="h-full w-full object-cover" /> : <span className="grid justify-items-center gap-3 p-6 text-muted-foreground"><Upload className="size-8 text-primary" /> Foto lateral</span>}
                  </Label>
                  <Input id="front" type="file" accept="image/*" capture="environment" onChange={(event) => onImageChange(event, "front")} className="sr-only" />
                  <Input id="side" type="file" accept="image/*" capture="environment" onChange={(event) => onImageChange(event, "side")} className="sr-only" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {manualFields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key}>{field.label}</Label>
                    <Input id={field.key} inputMode="decimal" value={manual[field.key] ?? ""} onChange={(event) => setManual((prev) => ({ ...prev, [field.key]: event.target.value }))} placeholder={field.placeholder} />
                  </div>
                ))}
                <div className="space-y-2">
                  <Label htmlFor="gender">Gênero</Label>
                  <select id="gender" value={gender} onChange={(event) => setGender(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option>Feminino</option><option>Masculino</option><option>Outro</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="objective">Objetivo</Label>
                  <select id="objective" value={objective} onChange={(event) => setObjective(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option>Comprar roupas</option><option>Avaliação fitness</option><option>Ambos</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2"><Label htmlFor="productUrl" className="flex items-center gap-2"><Link2 className="size-4 text-primary" /> Link da loja ou roupa</Label><Input id="productUrl" type="url" value={productUrl} onChange={(event) => setProductUrl(event.target.value)} placeholder="https://loja.com/produto" maxLength={500} /></div>
              <div className="space-y-2"><Label htmlFor="notes">Contexto</Label><Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={240} /></div>
              {mode === "photo" && <label className="flex gap-3 rounded-2xl bg-muted p-3 text-sm leading-6"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 size-4 accent-primary" /> Concordo com o uso das minhas fotos para análise de medidas. As fotos não são armazenadas após o processamento.</label>}
              <Button type="submit" variant="hero" size="lg" disabled={isAnalyzing} className="w-full">{isAnalyzing ? "Processando" : "Gerar avaliação"}<ArrowRight className="size-4" /></Button>
            </div>
          </form>
        )}

        {mode === "results" && analysis && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card/80 p-4 shadow-panel backdrop-blur">
              <div><p className="text-sm font-bold text-primary">Resultado Encaixe</p><h2 className="font-display text-3xl font-semibold">{confidenceLabel(analysis.confidence)}</h2></div>
              <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setMode("photo")}><Camera className="size-4" /> Nova análise</Button><Button type="button" variant="scan" onClick={exportPdf}><Download className="size-4" /> PDF</Button></div>
            </div>

            <Tabs defaultValue="dashboard" className="space-y-4">
              <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl lg:grid-cols-5"><TabsTrigger value="dashboard">Medidas</TabsTrigger><TabsTrigger value="sizes">Tamanhos</TabsTrigger><TabsTrigger value="style">Estilo</TabsTrigger><TabsTrigger value="fitness">Fitness</TabsTrigger><TabsTrigger value="history">Histórico</TabsTrigger></TabsList>

              <TabsContent value="dashboard" className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                <div className="relative min-h-[420px] rounded-2xl border bg-panel-glow p-6 shadow-panel"><div className="absolute left-1/2 top-12 size-20 -translate-x-1/2 rounded-full border-2 border-primary/40" /><div className="absolute left-1/2 top-32 h-64 w-32 -translate-x-1/2 rounded-full border-2 border-accent/60" /><span className="absolute left-8 top-32 rounded-full bg-card px-3 py-1 text-sm font-bold">Busto {formatMeasure("bust_cm", currentMeasurements.bust_cm)}</span><span className="absolute right-8 top-52 rounded-full bg-card px-3 py-1 text-sm font-bold">Cintura {formatMeasure("waist_cm", currentMeasurements.waist_cm)}</span><span className="absolute left-8 bottom-24 rounded-full bg-card px-3 py-1 text-sm font-bold">Quadril {formatMeasure("hip_cm", currentMeasurements.hip_cm)}</span></div>
                <div className="space-y-4 rounded-2xl border bg-card/80 p-5 shadow-panel"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-muted p-4"><p className="text-sm text-muted-foreground">IMC</p><p className="font-display text-3xl font-semibold">{fitness.bmi ?? "—"}</p><p className="font-bold">{fitness.bmiClass}</p></div><div className="rounded-2xl bg-muted p-4"><p className="text-sm text-muted-foreground">Tipo corporal</p><p className="font-display text-2xl font-semibold">{analysis.bodyType ?? "Triângulo"}</p></div><div className="rounded-2xl bg-muted p-4"><p className="text-sm text-muted-foreground">% gordura</p><p className="font-display text-xl font-semibold">{fitness.bodyFatEstimate}</p></div></div><div className="overflow-hidden rounded-2xl border"><table className="w-full text-sm"><tbody>{measurementRows.map((row) => <tr key={row.key} className="border-b last:border-0"><td className="p-3 font-bold">{row.label}</td><td className="p-3">{row.value}</td><td className="p-3 text-muted-foreground">{row.status}</td></tr>)}</tbody></table></div></div>
              </TabsContent>

              <TabsContent value="sizes" className="grid gap-4 lg:grid-cols-2"><div className="rounded-2xl border bg-card/80 p-5 shadow-panel"><h3 className="mb-4 flex items-center gap-2 font-display text-2xl font-semibold"><Shirt className="size-5 text-primary" /> Tamanhos sugeridos</h3><div className="grid gap-3">{Object.entries(sizes).map(([label, value]) => <div key={label} className="flex items-center justify-between rounded-2xl bg-muted p-4"><span className="font-bold">{label}</span><span className="text-right font-display text-xl font-semibold">{value}</span></div>)}</div></div><div className="rounded-2xl border bg-card/80 p-5 shadow-panel"><h3 className="mb-4 font-display text-2xl font-semibold">Ajustes de alfaiataria</h3><div className="space-y-3">{analysis.adjustments.map((item) => <p key={item} className="flex gap-2 rounded-2xl bg-muted p-3"><BadgeCheck className="mt-0.5 size-4 shrink-0 text-success" />{item}</p>)}</div></div></TabsContent>

              <TabsContent value="style" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{styles.map((item) => <article key={item.title} className="rounded-2xl border bg-card/80 p-5 shadow-panel"><div className="mb-4 text-4xl">{item.emoji ?? "✨"}</div><span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">{item.tag}</span><h3 className="mt-4 font-display text-xl font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{item.tip}</p>{item.avoid && <p className="mt-3 text-sm font-bold">Evite: {item.avoid}</p>}</article>)}</TabsContent>

              <TabsContent value="fitness" className="grid gap-4 lg:grid-cols-3"><div className="rounded-2xl border bg-card/80 p-5 shadow-panel"><HeartPulse className="mb-4 size-8 text-primary" /><p className="text-sm text-muted-foreground">IMC visual</p><div className="mt-3 h-3 overflow-hidden rounded-full bg-muted"><div className="h-full w-2/3 rounded-full bg-primary" /></div><p className="mt-4 font-display text-3xl font-semibold">{fitness.bmi ?? "—"}</p><p className="font-bold">{fitness.bmiClass}</p></div><div className="rounded-2xl border bg-card/80 p-5 shadow-panel"><Activity className="mb-4 size-8 text-accent" /><h3 className="font-display text-2xl font-semibold">Risco abdominal</h3><p className="mt-3 leading-7 text-muted-foreground">{fitness.waistRisk}</p></div><div className="rounded-2xl border bg-card/80 p-5 shadow-panel"><FileText className="mb-4 size-8 text-primary" /><h3 className="font-display text-2xl font-semibold">Resumo</h3><p className="mt-3 leading-7 text-muted-foreground">{fitness.summary}</p><p className="mt-4 rounded-2xl bg-muted p-3 text-sm">Esta é uma estimativa. Consulte um profissional de saúde.</p><Button type="button" variant="outline" className="mt-4 w-full">Compartilhe com seu nutricionista</Button></div></TabsContent>

              <TabsContent value="history" className="grid gap-4 lg:grid-cols-[1fr_0.8fr]"><div className="rounded-2xl border bg-card/80 p-5 shadow-panel"><h3 className="mb-4 flex items-center gap-2 font-display text-2xl font-semibold"><History className="size-5 text-primary" /> Evolução corporal</h3><div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={history}><XAxis dataKey="date" /><YAxis /><Tooltip /><Line type="monotone" dataKey="waist" stroke="hsl(var(--primary))" strokeWidth={3} /><Line type="monotone" dataKey="hip" stroke="hsl(var(--accent))" strokeWidth={3} /></LineChart></ResponsiveContainer></div></div><div className="space-y-3 rounded-2xl border bg-card/80 p-5 shadow-panel"><h3 className="font-display text-2xl font-semibold">Perfil e monetização</h3>{["Free: 1 análise/mês", "Premium R$19,90/mês: ilimitado + PDF + marcas", "B2B API key: página placeholder"].map((item) => <p key={item} className="flex gap-2 rounded-2xl bg-muted p-3"><KeyRound className="mt-0.5 size-4 shrink-0 text-primary" />{item}</p>)}<p className="flex gap-2 rounded-2xl bg-muted p-3"><Lock className="mt-0.5 size-4 shrink-0 text-primary" />Histórico salvo para usuários autenticados.</p></div></TabsContent>
            </Tabs>
          </div>
        )}
      </section>
    </main>
  );
};

export default Index;
