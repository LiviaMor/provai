import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

type MeasurementKey = "height_cm" | "estimated_weight_kg" | "weight_kg" | "bust_cm" | "underbust_cm" | "waist_cm" | "hip_cm" | "inseam_cm" | "outseam_cm" | "arm_length_cm" | "shoulder_width_cm" | "neck_cm" | "thigh_cm" | "torso_length_cm";

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
  muscleMassEstimate?: string;
  abdominalFatEstimate?: string;
  tissueDistribution?: string;
  bmr?: number;
  summary?: string;
};

type BioimpedanceData = {
  bodyFatPct?: number;
  muscleMassKg?: number;
  visceralFat?: number;
  waterPct?: number;
  bmr?: number;
  source?: string;
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

type PurchaseRisk = {
  region: string;
  risk: "Baixo" | "Médio" | "Alto";
  score: number;
  detail: string;
};

type UserProfile = {
  user_id: string;
  display_name?: string | null;
  account_type: "b2c" | "b2b";
  company_name?: string | null;
};

const measureLabels: Record<string, string> = {
  height_cm: "Altura",
  estimated_weight_kg: "Peso",
  weight_kg: "Peso",
  bust_cm: "Busto/Tórax",
  underbust_cm: "Abaixo do busto",
  waist_cm: "Cintura",
  hip_cm: "Quadril",
  inseam_cm: "Perna (inseam)",
  outseam_cm: "Perna externa",
  arm_length_cm: "Braço",
  shoulder_width_cm: "Ombros",
  neck_cm: "Pescoço",
  thigh_cm: "Coxa",
  torso_length_cm: "Tronco",
};

const manualFields: Array<{ key: MeasurementKey; label: string; placeholder: string }> = [
  { key: "height_cm", label: "Altura (cm)", placeholder: "170" },
  { key: "estimated_weight_kg", label: "Peso (kg)", placeholder: "68" },
  { key: "bust_cm", label: "Busto/Tórax (cm)", placeholder: "92" },
  { key: "underbust_cm", label: "Abaixo do busto (cm)", placeholder: "76" },
  { key: "waist_cm", label: "Cintura (cm)", placeholder: "74" },
  { key: "hip_cm", label: "Quadril (cm)", placeholder: "99" },
  { key: "thigh_cm", label: "Coxa (cm)", placeholder: "58" },
  { key: "inseam_cm", label: "Comprimento da perna (cm)", placeholder: "76" },
  { key: "arm_length_cm", label: "Comprimento do braço (cm)", placeholder: "58" },
];

const bioimpedanceFields: Array<{ key: keyof BioimpedanceData; label: string; placeholder: string }> = [
  { key: "bodyFatPct", label: "Gordura corporal (%)", placeholder: "28" },
  { key: "muscleMassKg", label: "Massa muscular (kg)", placeholder: "42" },
  { key: "visceralFat", label: "Gordura visceral", placeholder: "8" },
  { key: "waterPct", label: "Água corporal (%)", placeholder: "52" },
  { key: "bmr", label: "TMB do exame", placeholder: "1450" },
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

const brandSizeGuide = [
  { brand: "Renner", top: "P 88-92 | M 94-98 | G 100-106", bottom: "38 72-76/96-100 | 40 78-82/102-106", note: "Modelagem brasileira regular; confira elasticidade." },
  { brand: "C&A", top: "P 86-92 | M 94-100 | G 102-108", bottom: "38 70-76/94-100 | 40 78-84/102-108", note: "Boa base para peças casuais e jeans." },
  { brand: "Shein", top: "S 86-90 | M 90-96 | L 96-102", bottom: "M 70-76/96-102 | L 76-82/102-108", note: "Costuma variar por vendedor; priorize tabela do produto." },
  { brand: "Zara", top: "S 84-90 | M 90-96 | L 96-102", bottom: "38 70-74/96-100 | 40 74-78/100-104", note: "Tende a ter caimento mais ajustado." },
  { brand: "Farm", top: "P 86-92 | M 92-98 | G 98-106", bottom: "P 68-74/94-100 | M 74-82/100-108", note: "Peças fluidas toleram mais variação no quadril." },
];

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

const formatMeasure = (key: string, value?: number | null) => {
  if (!value) return "—";
  if (key.includes("kg")) return `${Math.round(value)}kg`;
  return `${Math.round(value)}cm`;
};

const TEMP_PHOTOS_KEY = "encaixe-temporary-photos";
const TEMP_PHOTOS_TTL_MS = 2 * 60 * 60 * 1000;

const asTextArray = (value: unknown) => Array.isArray(value) ? value.map(textOf).filter(Boolean) : value ? [textOf(value)] : [];

const readTemporaryPhotos = () => {
  try {
    const stored = sessionStorage.getItem(TEMP_PHOTOS_KEY);
    if (!stored) return { frontPreview: "", sidePreview: "" };
    const parsed = JSON.parse(stored) as { frontPreview?: string; sidePreview?: string; savedAt?: number };
    if (!parsed.savedAt || Date.now() - parsed.savedAt > TEMP_PHOTOS_TTL_MS) {
      sessionStorage.removeItem(TEMP_PHOTOS_KEY);
      return { frontPreview: "", sidePreview: "" };
    }
    return { frontPreview: parsed.frontPreview ?? "", sidePreview: parsed.sidePreview ?? "" };
  } catch {
    return { frontPreview: "", sidePreview: "" };
  }
};

const textOf = (value: unknown) => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const item = value as Record<string, unknown>;
    return String(item.recommendation ?? item.tip ?? item.summary ?? JSON.stringify(item));
  }
  return String(value ?? "");
};

const confidenceScore = (value: unknown) => {
  if (typeof value === "number") return value;
  const text = String(value ?? "").toLowerCase();
  if (text.includes("alta")) return 82;
  if (text.includes("media") || text.includes("média")) return 62;
  if (text.includes("baixa")) return 42;
  return 55;
};

const normalizeMeasurements = (raw: unknown): Measurements => {
  const source = (raw ?? {}) as Record<string, unknown>;
  return Object.entries(source).reduce<Measurements>((acc, [key, value]) => {
    const numeric = typeof value === "object" && value ? Number((value as Record<string, unknown>).value) : Number(value);
    if (Number.isFinite(numeric)) acc[key === "weight_kg" ? "estimated_weight_kg" : (key as MeasurementKey)] = numeric;
    return acc;
  }, {});
};

const normalizeAnalysis = (raw: unknown): Analysis => {
  const data = (raw ?? {}) as Record<string, any>;
  if (data.body_analysis || data.clothing_sizes || data.tailoring) {
    const measurements = normalizeMeasurements(data.measurements);
    const tailoring = data.tailoring ?? {};
    const style = data.style_recommendations ?? {};
    return {
      confidence: confidenceScore(data.quality_assessment?.overall_confidence),
      disclaimer: data.body_analysis?.body_fat_disclaimer ?? "Estimativa visual. Consulte um profissional para avaliação precisa.",
      measurements,
      fitProfile: style.body_type_description ?? tailoring.waist_fit_suggestion ?? "Perfil de caimento calculado por medidas e produto.",
      bodyType: data.body_analysis?.body_type,
      sizeRecommendations: {
        Brasil: data.clothing_sizes?.size_brazil ?? "—",
        Internacional: data.clothing_sizes?.size_international ?? "—",
        Europeu: String(data.clothing_sizes?.size_european ?? "—"),
        "Calça número": String(data.clothing_sizes?.pants_number_brazil ?? "—"),
        Sutiã: data.clothing_sizes?.bra_size ?? "—",
      },
      fitnessAssessment: {
        bmi: data.body_analysis?.bmi,
        bmiClass: data.body_analysis?.bmi_category,
        waistRisk: `Risco abdominal: ${data.body_analysis?.abdominal_risk ?? "em avaliação"}. Relação cintura/quadril: ${data.body_analysis?.waist_to_hip_ratio ?? "—"}`,
        bodyFatEstimate: data.body_analysis?.body_fat_estimate_pct ? `${data.body_analysis.body_fat_estimate_pct}%` : "Estimativa visual conservadora",
        summary: data.body_analysis?.body_fat_disclaimer,
      },
      clothing: [
        { category: "Blusas/Camisas", size: data.clothing_sizes?.size_brazil ?? "—", fitTip: tailoring.waist_fit_suggestion ?? "Confira busto, cintura e ombro na tabela da marca." },
        { category: "Calças", size: String(data.clothing_sizes?.pants_number_brazil ?? "—"), fitTip: tailoring.hem_note ?? "Compare cintura, quadril e entrepernas." },
      ],
      adjustments: [tailoring.hem_note, tailoring.sleeve_note, `Ombro: ${tailoring.shoulder_fit ?? "em avaliação"}`].filter(Boolean).map(String),
      nutritionNotes: [data.body_analysis?.body_fat_disclaimer, data.quality_assessment?.accuracy_note].filter(Boolean).map(String),
      styleRecommendations: [
        { title: "Valorize", tag: "Estilo", tip: [...asTextArray(style.what_to_wear), ...asTextArray(style.best_necklines)].join(", ") || style.body_type_description || "Peças que equilibram proporções.", emoji: "✨" },
        { title: "Evite", tag: "Atenção", tip: asTextArray(style.what_to_avoid).join(", ") || "Modelagens que prejudiquem o caimento desejado.", emoji: "⚠️" },
        { title: "Calças", tag: "Caimento", tip: asTextArray(style.best_pants_styles).join(", ") || "Confira cintura, quadril e barra.", emoji: "👖" },
        { title: "Vestidos", tag: "Ocasião", tip: asTextArray(style.best_dress_styles).join(", ") || style.pattern_tips || "Modelagens com cintura definida.", emoji: "👗" },
      ],
    };
  }
  return data as Analysis;
};

const calculateFallbackFitness = (measurements: Measurements): FitnessAssessment => {
  const heightM = measurements.height_cm ? measurements.height_cm / 100 : undefined;
  const weight = measurements.estimated_weight_kg;
  const bmi = heightM && weight ? Number((weight / (heightM * heightM)).toFixed(1)) : undefined;
  const bmiClass = !bmi ? "Dados insuficientes" : bmi < 18.5 ? "Abaixo do peso" : bmi < 25 ? "Normal" : bmi < 30 ? "Sobrepeso" : "Obeso";
  const waist = measurements.waist_cm;
  const hip = measurements.hip_cm;
  const waistHip = waist && hip ? Number((waist / hip).toFixed(2)) : undefined;
  const bodyFatPct = bmi ? Math.max(12, Math.min(48, Math.round(bmi * 1.18 + (waistHip ? waistHip * 18 : 5)))) : undefined;
  const muscleMass = weight && bodyFatPct ? Number((weight * (1 - bodyFatPct / 100) * 0.72).toFixed(1)) : undefined;
  const bmr = weight && measurements.height_cm ? Math.round(10 * weight + 6.25 * measurements.height_cm - 5 * 35 + 5) : undefined;
  const waistRisk = waist && waist >= 88 ? "Atenção: cintura elevada" : "Dentro de uma faixa usual";
  return { bmi, bmiClass, waistRisk, bodyFatEstimate: bodyFatPct ? `${bodyFatPct}% estimado` : "Estimativa visual conservadora", muscleMassEstimate: muscleMass ? `${muscleMass}kg estimados` : "Informe bioimpedância para refinar", abdominalFatEstimate: waistHip ? `RCQ ${waistHip} com distribuição ${waistHip >= 0.85 ? "central" : "periférica/equilibrada"}` : "Depende de cintura e quadril", tissueDistribution: "Estimativa por peso, cintura, quadril e proporções visuais; use bioimpedância para acompanhar evolução clínica.", bmr, summary: "Avaliação estimativa para apoio a médicos e nutricionistas, sem substituir consulta, exame físico ou laudo clínico." };
};

const mergeBioimpedanceFitness = (fitness: FitnessAssessment, bio: BioimpedanceData): FitnessAssessment => ({
  ...fitness,
  bodyFatEstimate: bio.bodyFatPct ? `${bio.bodyFatPct}% informado por bioimpedância` : fitness.bodyFatEstimate,
  muscleMassEstimate: bio.muscleMassKg ? `${bio.muscleMassKg}kg informados` : fitness.muscleMassEstimate,
  abdominalFatEstimate: bio.visceralFat ? `Gordura visceral ${bio.visceralFat}` : fitness.abdominalFatEstimate,
  bmr: bio.bmr ?? fitness.bmr,
  tissueDistribution: [
    bio.bodyFatPct ? `Gordura corporal ${bio.bodyFatPct}%` : undefined,
    bio.muscleMassKg ? `massa muscular ${bio.muscleMassKg}kg` : undefined,
    bio.waterPct ? `água corporal ${bio.waterPct}%` : undefined,
    bio.source,
  ].filter(Boolean).join(" · ") || fitness.tissueDistribution,
});

const buildPurchaseRisks = (analysis: Analysis): PurchaseRisk[] => {
  const measurements = analysis.measurements;
  const context = [analysis.fitProfile, ...analysis.adjustments, ...analysis.clothing.map((item) => `${item.category} ${item.size} ${item.fitTip}`)].map(textOf).join(" ").toLowerCase();
  const has = (terms: string[]) => terms.some((term) => context.includes(term));
  const level = (base: number, terms: string[]) => {
    const score = Math.min(92, base + (has(terms) ? 24 : 0) + (analysis.confidence < 55 ? 12 : 0));
    return { score, risk: score >= 70 ? "Alto" : score >= 45 ? "Médio" : "Baixo" } as const;
  };
  const rows = [
    { region: "Cintura", ...level(measurements.waist_cm && measurements.hip_cm && measurements.waist_cm > measurements.hip_cm * 0.82 ? 52 : 28, ["cintura", "cós", "apert"]), detail: "Confira cós, cintura alta/baixa e folga para sentar." },
    { region: "Quadril", ...level(measurements.hip_cm && measurements.waist_cm && measurements.hip_cm - measurements.waist_cm > 24 ? 50 : 30, ["quadril", "anca", "modelagem reta"]), detail: "Priorize a maior medida entre cintura e quadril." },
    { region: "Busto", ...level(measurements.bust_cm && measurements.shoulder_width_cm && measurements.bust_cm > measurements.shoulder_width_cm * 2.4 ? 48 : 26, ["busto", "tórax", "peito"]), detail: "Observe fechamento, pences e elasticidade do tecido." },
    { region: "Barra", ...level(measurements.inseam_cm ? 42 : 58, ["barra", "entrepernas", "comprimento"]), detail: "Compare entrepernas com a tabela para prever ajuste de barra." },
    { region: "Manga", ...level(measurements.arm_length_cm ? 40 : 55, ["manga", "punho", "braço"]), detail: "Confira comprimento da manga até o punho." },
    { region: "Ombro", ...level(measurements.shoulder_width_cm ? 38 : 54, ["ombro", "ombros", "cava"]), detail: "Blusas e camisas devem alinhar costura ao ombro." },
  ];
  return rows;
};

const Index = () => {
  const [mode, setMode] = useState<FlowMode>("home");
  const temporaryPhotos = useMemo(readTemporaryPhotos, []);
  const [frontPreview, setFrontPreview] = useState(temporaryPhotos.frontPreview);
  const [sidePreview, setSidePreview] = useState(temporaryPhotos.sidePreview);
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [manual, setManual] = useState<Record<string, string>>({});
  const [gender, setGender] = useState("Feminino");
  const [objective, setObjective] = useState("Ambos");
  const [productUrl, setProductUrl] = useState("");
  const [notes, setNotes] = useState("Comprar roupas online com menos troca");
  const [bioimpedance, setBioimpedance] = useState<Record<string, string>>({});
  const [bioFileName, setBioFileName] = useState("");
  const [consent, setConsent] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [history, setHistory] = useState(historySeed);

  const currentMeasurements = analysis?.measurements ?? {};
  const fitness = analysis?.fitnessAssessment ?? calculateFallbackFitness(currentMeasurements);
  const styles = analysis?.styleRecommendations?.length ? analysis.styleRecommendations : defaultStyles;
  const sizes = analysis?.sizeRecommendations ?? brandSizes;
  const purchaseRisks = analysis ? buildPurchaseRisks(analysis) : [];
  const activeStep = isAnalyzing ? 3 : sidePreview ? 2 : frontPreview ? 1 : 0;
  const accountType = profile?.account_type ?? "b2c";

  const bioimpedanceData = useMemo<BioimpedanceData>(() => ({
    bodyFatPct: parseNumber(bioimpedance.bodyFatPct ?? ""),
    muscleMassKg: parseNumber(bioimpedance.muscleMassKg ?? ""),
    visceralFat: parseNumber(bioimpedance.visceralFat ?? ""),
    waterPct: parseNumber(bioimpedance.waterPct ?? ""),
    bmr: parseNumber(bioimpedance.bmr ?? ""),
    source: bioFileName ? `Arquivo temporário: ${bioFileName}` : undefined,
  }), [bioFileName, bioimpedance]);

  const measurementRows = useMemo(() => {
    const keys: MeasurementKey[] = ["bust_cm", "underbust_cm", "waist_cm", "hip_cm", "inseam_cm", "outseam_cm", "arm_length_cm", "shoulder_width_cm", "thigh_cm", "neck_cm", "torso_length_cm"];
    return keys.map((key) => ({
      key,
      label: measureLabels[key],
      value: formatMeasure(key, currentMeasurements[key]),
      status: key === "inseam_cm" ? "→ barra: +3cm" : key === "arm_length_cm" ? "→ punho padrão" : "✓",
    }));
  }, [currentMeasurements]);

  useEffect(() => {
    const ensureProfile = async (id: string, metadata?: Record<string, unknown>) => {
      const { data } = await (supabase as any).from("profiles").select("user_id, display_name, account_type, company_name").eq("user_id", id).maybeSingle();
      if (data) return setProfile(data);
      const fallbackProfile = {
        user_id: id,
        display_name: String(metadata?.full_name ?? metadata?.name ?? ""),
        avatar_url: String(metadata?.avatar_url ?? ""),
        account_type: "b2c",
      };
      const { data: created } = await (supabase as any).from("profiles").insert(fallbackProfile).select("user_id, display_name, account_type, company_name").single();
      setProfile(created ?? fallbackProfile);
    };

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id ?? "";
      setUserId(id);
      if (!id) return setProfile(null);
      setTimeout(() => ensureProfile(id, session?.user.user_metadata), 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      const id = data.session?.user.id ?? "";
      setUserId(id);
      if (id) ensureProfile(id, data.session?.user.user_metadata);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!frontPreview && !sidePreview) {
      sessionStorage.removeItem(TEMP_PHOTOS_KEY);
      return;
    }
    sessionStorage.setItem(TEMP_PHOTOS_KEY, JSON.stringify({ frontPreview, sidePreview, savedAt: Date.now() }));
  }, [frontPreview, sidePreview]);

  const onImageChange = (event: ChangeEvent<HTMLInputElement>, kind: "front" | "side") => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Envie uma imagem válida.");
    if (file.size > 7 * 1024 * 1024) return toast.error("Use uma foto de até 7MB para análise mais rápida.");
    const reader = new FileReader();
    reader.onload = () => {
      kind === "front" ? setFrontPreview(String(reader.result)) : setSidePreview(String(reader.result));
      toast.success("Foto salva temporariamente neste dispositivo.");
    };
    reader.readAsDataURL(file);
  };

  const manualMeasurements = () =>
    manualFields.reduce<Measurements>((acc, field) => {
      const value = parseNumber(manual[field.key] ?? "");
      if (value) acc[field.key] = value;
      return acc;
    }, {});

  const updateAnalysisMeasurement = (key: MeasurementKey, value: string) => {
    setManual((prev) => ({ ...prev, [key]: value }));
    const numeric = parseNumber(value);
    if (!analysis || !numeric) return;
    const measurements = { ...analysis.measurements, [key]: numeric };
    const recalculatedFitness = mergeBioimpedanceFitness(calculateFallbackFitness(measurements), bioimpedanceData);
    setAnalysis({ ...analysis, measurements, fitnessAssessment: recalculatedFitness });
  };

  const onBioFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Envie um exame de até 5MB.");
    setBioFileName(file.name);
    toast.success("Exame anexado temporariamente; digite os valores principais para refinar a análise.");
  };

  const saveHistory = async (result: Analysis) => {
    const item = {
      id: String(Date.now()),
      date: "Hoje",
      waist: Number(result.measurements.waist_cm ?? 0),
      hip: Number(result.measurements.hip_cm ?? 0),
      weight: Number(result.measurements.estimated_weight_kg ?? 0),
    };
    setHistory((prev) => [...prev.filter((entry) => entry.date !== "Hoje"), item]);

    if (!userId) {
      toast.info("Faça login para salvar esta análise no histórico.");
      return;
    }

    await (supabase as any).from("body_assessments").insert({
      user_id: userId,
      title: "Avaliação Encaixe",
      source: frontPreview ? `photo-${accountType}-temporary` : `manual-${accountType}`,
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

    const result = normalizeAnalysis(data);
    setAnalysis(result);
    setMode("results");
    await saveHistory(result);
    toast.success("Análise Encaixe concluída.");
  };

  const exportPdf = () => {
    if (!analysis) return toast.error("Faça uma análise antes de exportar.");
    const pdf = new jsPDF();
    pdf.setFillColor(20, 31, 61);
    pdf.roundedRect(14, 12, 182, 22, 4, 4, "F");
    pdf.setTextColor(250, 248, 245);
    pdf.setFontSize(18);
    pdf.text("Encaixe", 20, 26);
    pdf.setFontSize(10);
    pdf.text("Laudo de medidas e recomendação de compra", 52, 26);
    pdf.setTextColor(20, 31, 61);
    pdf.setFontSize(11);
    pdf.text(`Confiança: ${confidenceLabel(analysis.confidence)} (${Math.round(analysis.confidence)}%)`, 16, 46);
    pdf.text(`Tipo corporal: ${analysis.bodyType ?? "Em avaliação"}`, 16, 54);
    let y = 68;
    pdf.setFontSize(13);
    pdf.text("Medidas", 16, y);
    y += 8;
    pdf.setFontSize(10);
    Object.entries(analysis.measurements).forEach(([key, value]) => {
      pdf.text(`${measureLabels[key] ?? key}: ${formatMeasure(key, Number(value))}`, 16, y);
      y += 7;
    });
    y += 4;
    pdf.setFontSize(13);
    pdf.text("Recomendações", 16, y);
    y += 8;
    pdf.setFontSize(10);
    [...analysis.clothing.map((item) => `${item.category}: ${item.size} — ${item.fitTip}`), ...analysis.adjustments].slice(0, 8).forEach((item) => {
      const lines = pdf.splitTextToSize(`• ${textOf(item)}`, 176);
      pdf.text(lines, 16, y);
      y += lines.length * 6;
    });
    pdf.text("Observação: esta é uma estimativa. Consulte um profissional de saúde.", 16, Math.min(y + 8, 282));
    pdf.save("relatorio-encaixe.pdf");
  };

  const signIn = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.href });
    if (result?.error) toast.error("Não foi possível iniciar o login.");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada.");
  };

  const toggleAccountType = async () => {
    if (!userId) return toast.error("Entre para definir B2C ou B2B.");
    const nextType = accountType === "b2b" ? "b2c" : "b2b";
    const { data, error } = await (supabase as any).from("profiles").update({ account_type: nextType }).eq("user_id", userId).select("user_id, display_name, account_type, company_name").single();
    if (error) return toast.error("Não foi possível atualizar o perfil.");
    setProfile(data);
    toast.success(nextType === "b2b" ? "Modo B2B ativado." : "Modo B2C ativado.");
  };

  return (
    <main className="min-h-screen bg-app-radial text-foreground">
      <section className="container min-h-screen max-w-6xl py-5 sm:py-8">
        <nav className="mb-5 flex items-center justify-between rounded-2xl border bg-card/80 px-4 py-3 shadow-panel backdrop-blur">
          <div className="flex items-center gap-2 font-display text-2xl font-semibold">
            <span className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-glow"><ScanLine className="size-5" /></span>
            Encaixe
          </div>
          <div className="flex items-center gap-2">
            {userId && <Button type="button" variant="outline" size="sm" onClick={toggleAccountType}>{accountType.toUpperCase()}</Button>}
            <Button type="button" variant="ghost" size="sm" onClick={userId ? signOut : signIn} className="gap-2">
              <LogIn className="size-4" /> {userId ? "Sair" : "Entrar"}
            </Button>
          </div>
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
              <p className="leading-7 text-muted-foreground">Fique em pé, de frente, com roupa justa. Você pode tirar uma foto na hora ou enviar uma imagem da galeria.</p>
              <div className="grid gap-2">
                {["Foto frente", "Foto lateral", "Processando"].map((step, index) => (
                  <div key={step} className="flex items-center gap-3 rounded-2xl bg-muted p-3 text-sm font-bold">
                    <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">{activeStep > index ? <CheckCircle2 className="size-4" /> : index + 1}</span>
                    {step}
                  </div>
                ))}
              </div>
              {isAnalyzing && <div className="body-scan-loader scan-grid relative min-h-56 overflow-hidden rounded-2xl border bg-secondary p-6 text-center font-bold shadow-inner"><div className="relative z-10 mt-36 rounded-2xl bg-card/90 p-3">IA escaneando medidas, caimento e tabela da loja...</div></div>}
            </div>

            <div className="space-y-4 rounded-2xl border bg-panel-glow p-4 shadow-panel backdrop-blur sm:p-5">
              {mode === "photo" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl border bg-secondary text-center shadow-inner">
                      {frontPreview ? <><img src={frontPreview} alt="Preview da foto frontal para análise de medidas" className="h-full w-full object-cover" /><span className="absolute bottom-3 rounded-full bg-card/90 px-3 py-1 text-xs font-bold">Preview frente</span></> : <span className="grid justify-items-center gap-3 p-6 text-muted-foreground"><Upload className="size-8 text-primary" /> Foto de frente</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Label htmlFor="front-camera" className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-bold"><Camera className="size-4" /> Foto</Label>
                      <Label htmlFor="front-upload" className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-bold"><Upload className="size-4" /> Upload</Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl border bg-secondary text-center shadow-inner">
                      {sidePreview ? <><img src={sidePreview} alt="Preview da foto lateral para análise de medidas" className="h-full w-full object-cover" /><span className="absolute bottom-3 rounded-full bg-card/90 px-3 py-1 text-xs font-bold">Preview lateral</span></> : <span className="grid justify-items-center gap-3 p-6 text-muted-foreground"><Upload className="size-8 text-primary" /> Foto lateral</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Label htmlFor="side-camera" className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-bold"><Camera className="size-4" /> Foto</Label>
                      <Label htmlFor="side-upload" className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-bold"><Upload className="size-4" /> Upload</Label>
                    </div>
                  </div>
                  <Input id="front-camera" type="file" accept="image/*" capture="environment" onChange={(event) => onImageChange(event, "front")} className="sr-only" />
                  <Input id="front-upload" type="file" accept="image/*" onChange={(event) => onImageChange(event, "front")} className="sr-only" />
                  <Input id="side-camera" type="file" accept="image/*" capture="environment" onChange={(event) => onImageChange(event, "side")} className="sr-only" />
                  <Input id="side-upload" type="file" accept="image/*" onChange={(event) => onImageChange(event, "side")} className="sr-only" />
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
              {mode === "photo" && <label className="flex gap-3 rounded-2xl bg-muted p-3 text-sm leading-6"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 size-4 accent-primary" /> Concordo com o uso das minhas fotos para análise de medidas. {accountType === "b2b" ? "No B2B, as fotos ficam temporárias e só a análise é armazenada após login." : "No B2C, as informações da análise são salvas após login e as fotos expiram automaticamente."}</label>}
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

              <TabsContent value="sizes" className="grid gap-4 lg:grid-cols-2"><div className="rounded-2xl border bg-card/80 p-5 shadow-panel"><h3 className="mb-4 flex items-center gap-2 font-display text-2xl font-semibold"><Shirt className="size-5 text-primary" /> Tamanhos sugeridos</h3><div className="grid gap-3">{Object.entries(sizes).map(([label, value]) => <div key={label} className="flex items-center justify-between rounded-2xl bg-muted p-4"><span className="font-bold">{label}</span><span className="text-right font-display text-xl font-semibold">{textOf(value)}</span></div>)}</div></div><div className="rounded-2xl border bg-card/80 p-5 shadow-panel"><h3 className="mb-4 font-display text-2xl font-semibold">Ajustes de alfaiataria</h3><div className="space-y-3">{analysis.adjustments.map((item, index) => <p key={`${textOf(item)}-${index}`} className="flex gap-2 rounded-2xl bg-muted p-3"><BadgeCheck className="mt-0.5 size-4 shrink-0 text-success" />{textOf(item)}</p>)}</div></div><div className="rounded-2xl border bg-card/80 p-5 shadow-panel lg:col-span-2"><h3 className="mb-4 font-display text-2xl font-semibold">Tabela por marca</h3><div className="overflow-x-auto rounded-2xl border"><table className="w-full min-w-[680px] text-sm"><thead className="bg-muted text-left"><tr><th className="p-3">Marca</th><th className="p-3">Blusas/Camisas</th><th className="p-3">Calças/Saias</th><th className="p-3">Observação</th></tr></thead><tbody>{brandSizeGuide.map((row) => <tr key={row.brand} className="border-t"><td className="p-3 font-bold">{row.brand}</td><td className="p-3">{row.top}</td><td className="p-3">{row.bottom}</td><td className="p-3 text-muted-foreground">{row.note}</td></tr>)}</tbody></table></div></div><div className="rounded-2xl border bg-card/80 p-5 shadow-panel lg:col-span-2"><h3 className="mb-4 font-display text-2xl font-semibold">Risco de compra por região</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{purchaseRisks.map((item) => <article key={item.region} className="rounded-2xl bg-muted p-4"><div className="mb-3 flex items-center justify-between gap-2"><span className="font-bold">{item.region}</span><Badge variant={item.risk === "Alto" ? "destructive" : item.risk === "Médio" ? "secondary" : "outline"}>{item.risk}</Badge></div><Progress value={item.score} className="h-2" /><p className="mt-3 text-sm leading-6 text-muted-foreground">{item.detail}</p></article>)}</div></div></TabsContent>

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
