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
  Loader2,
  Lock,
  LogIn,
  Palette,
  Ruler,
  ScanLine,
  Shirt,
  Sparkles,
  Upload,
  UserRound,
  Wand2,
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { PosturalGrid } from "@/components/PosturalGrid";

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
  bodyFatPct?: number;
  bodyFatLow?: number;
  bodyFatHigh?: number;
  bodyFatMethod?: string;
  bodyFatReference?: string;
  bodyFatBreakdown?: Array<{ method: string; value: number; reference: string }>;
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

type BrandSizeOption = {
  label: string;
  bust?: number[];
  waist?: number[];
  hip?: number[];
};

type UserProfile = {
  user_id: string;
  display_name?: string | null;
  account_type: "b2c" | "b2b";
  company_name?: string | null;
};

type ColorChip = { name: string; hex: string };

type TryonResult = {
  tryonImage?: string;
  advice?: {
    size_advice?: string;
    fit_notes?: string[];
    combinations?: Array<{ title: string; pieces: string[]; occasion: string }>;
    color_palette?: {
      undertone?: string;
      season?: string;
      skin_tone_hex?: string;
      garment_color_hex?: string;
      garment_color_name?: string;
      harmony_with_garment?: string;
      harmony_explanation?: string;
      best_colors?: Array<ColorChip | string>;
      avoid_colors?: Array<ColorChip | string>;
      neutrals?: Array<ColorChip | string>;
      metals?: string[];
      combine_guide?: Array<{ role: string; suggestion: string; hex?: string }>;
      rationale?: string;
    };
    confidence?: string;
  };
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
  { brand: "Renner", top: "P 88-92 | M 94-98 | G 100-106", bottom: "38 72-76/96-100 | 40 78-82/102-106", note: "Modelagem brasileira regular; confira elasticidade.", topOptions: [{ label: "P", bust: [88, 92] }, { label: "M", bust: [94, 98] }, { label: "G", bust: [100, 106] }], bottomOptions: [{ label: "38", waist: [72, 76], hip: [96, 100] }, { label: "40", waist: [78, 82], hip: [102, 106] }] },
  { brand: "C&A", top: "P 86-92 | M 94-100 | G 102-108", bottom: "38 70-76/94-100 | 40 78-84/102-108", note: "Boa base para peças casuais e jeans.", topOptions: [{ label: "P", bust: [86, 92] }, { label: "M", bust: [94, 100] }, { label: "G", bust: [102, 108] }], bottomOptions: [{ label: "38", waist: [70, 76], hip: [94, 100] }, { label: "40", waist: [78, 84], hip: [102, 108] }] },
  { brand: "Shein", top: "S 86-90 | M 90-96 | L 96-102", bottom: "M 70-76/96-102 | L 76-82/102-108", note: "Costuma variar por vendedor; priorize tabela do produto.", topOptions: [{ label: "S", bust: [86, 90] }, { label: "M", bust: [90, 96] }, { label: "L", bust: [96, 102] }], bottomOptions: [{ label: "M", waist: [70, 76], hip: [96, 102] }, { label: "L", waist: [76, 82], hip: [102, 108] }] },
  { brand: "Zara", top: "S 84-90 | M 90-96 | L 96-102", bottom: "38 70-74/96-100 | 40 74-78/100-104", note: "Tende a ter caimento mais ajustado.", topOptions: [{ label: "S", bust: [84, 90] }, { label: "M", bust: [90, 96] }, { label: "L", bust: [96, 102] }], bottomOptions: [{ label: "38", waist: [70, 74], hip: [96, 100] }, { label: "40", waist: [74, 78], hip: [100, 104] }] },
  { brand: "Farm", top: "P 86-92 | M 92-98 | G 98-106", bottom: "P 68-74/94-100 | M 74-82/100-108", note: "Peças fluidas toleram mais variação no quadril.", topOptions: [{ label: "P", bust: [86, 92] }, { label: "M", bust: [92, 98] }, { label: "G", bust: [98, 106] }], bottomOptions: [{ label: "P", waist: [68, 74], hip: [94, 100] }, { label: "M", waist: [74, 82], hip: [100, 108] }] },
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
        bodyFatEstimate: data.body_analysis?.body_fat_estimate_pct
          ? `${data.body_analysis.body_fat_estimate_pct}%${data.body_analysis?.body_fat_range_low && data.body_analysis?.body_fat_range_high ? ` (faixa ${data.body_analysis.body_fat_range_low}–${data.body_analysis.body_fat_range_high}%)` : ""}`
          : "Estimativa visual conservadora",
        bodyFatPct: typeof data.body_analysis?.body_fat_estimate_pct === "number" ? data.body_analysis.body_fat_estimate_pct : undefined,
        bodyFatLow: typeof data.body_analysis?.body_fat_range_low === "number" ? data.body_analysis.body_fat_range_low : undefined,
        bodyFatHigh: typeof data.body_analysis?.body_fat_range_high === "number" ? data.body_analysis.body_fat_range_high : undefined,
        bodyFatMethod: data.body_analysis?.body_fat_method,
        bodyFatReference: data.body_analysis?.body_fat_methodology_note,
        bodyFatBreakdown: Array.isArray(data.body_analysis?.body_fat_breakdown) ? data.body_analysis.body_fat_breakdown.filter((b: any) => b && typeof b.value === "number" && b.method) : undefined,
        muscleMassEstimate: data.body_analysis?.muscle_mass_kg ? `${data.body_analysis.muscle_mass_kg}kg` : undefined,
        abdominalFatEstimate: data.body_analysis?.visceral_fat ? `Gordura visceral ${data.body_analysis.visceral_fat}` : undefined,
        tissueDistribution: data.body_analysis?.tissue_distribution,
        bmr: data.body_analysis?.basal_metabolic_rate_kcal,
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

// Estimativas de % gordura corporal por fórmulas validadas em literatura.
// - CUN-BAE (Gómez-Ambrosi et al., Diabetes Care 2012): BMI + idade + sexo, validado contra DEXA.
// - Deurenberg (Br J Nutr 1991, "BMI as a measure of body fatness"): BMI + idade + sexo, populacional.
// - U.S. Navy / DoD circumference method: cintura, pescoço (e quadril em mulheres) + altura.
// Cada método retorna intervalo ±erro padrão típico (~3-4 p.p. para CUN-BAE/Deurenberg, ~3 p.p. para Navy).
const sexFactor = (gender?: string) => {
  const g = String(gender ?? "").toLowerCase();
  if (g.startsWith("m") && !g.startsWith("mu") && !g.startsWith("fe")) return 1; // masculino
  return 0; // feminino/padrão
};

const cunBae = (bmi: number, age: number, sex: 0 | 1) =>
  -44.988 + 0.503 * age + 10.689 * sex + 3.172 * bmi - 0.026 * bmi * bmi
  + 0.181 * bmi * sex - 0.02 * bmi * age - 0.005 * bmi * bmi * sex + 0.00021 * bmi * bmi * age;

const deurenberg = (bmi: number, age: number, sex: 0 | 1) =>
  1.20 * bmi + 0.23 * age - 10.8 * sex - 5.4;

const usNavyBodyFat = (sex: 0 | 1, heightCm: number, waistCm: number, neckCm: number, hipCm?: number) => {
  if (sex === 1) {
    if (waistCm <= neckCm) return undefined;
    return 86.010 * Math.log10(waistCm - neckCm) - 70.041 * Math.log10(heightCm) + 36.76;
  }
  if (!hipCm || waistCm + hipCm <= neckCm) return undefined;
  return 163.205 * Math.log10(waistCm + hipCm - neckCm) - 97.684 * Math.log10(heightCm) - 78.387;
};

const calculateFallbackFitness = (measurements: Measurements, options?: { gender?: string; age?: number }): FitnessAssessment => {
  const heightCm = measurements.height_cm;
  const heightM = heightCm ? heightCm / 100 : undefined;
  const weight = measurements.estimated_weight_kg;
  const waist = measurements.waist_cm;
  const hip = measurements.hip_cm;
  const neck = measurements.neck_cm;
  const sex: 0 | 1 = sexFactor(options?.gender) as 0 | 1;
  const age = options?.age && options.age >= 12 && options.age <= 90 ? options.age : 30;

  const bmi = heightM && weight ? Number((weight / (heightM * heightM)).toFixed(1)) : undefined;
  const bmiClass = !bmi ? "Dados insuficientes" : bmi < 18.5 ? "Abaixo do peso" : bmi < 25 ? "Normal" : bmi < 30 ? "Sobrepeso" : "Obeso";
  const waistHip = waist && hip ? Number((waist / hip).toFixed(2)) : undefined;

  const breakdown: Array<{ method: string; value: number; reference: string }> = [];
  if (bmi) {
    const cb = cunBae(bmi, age, sex);
    if (Number.isFinite(cb)) breakdown.push({ method: "CUN-BAE", value: Math.round(cb * 10) / 10, reference: "Gómez-Ambrosi et al., Diabetes Care 2012 (validado vs. DEXA, R²≈0,86)." });
    const dn = deurenberg(bmi, age, sex);
    if (Number.isFinite(dn)) breakdown.push({ method: "Deurenberg", value: Math.round(dn * 10) / 10, reference: "Deurenberg, Weststrate & Seidell, Br J Nutr 1991 (erro padrão ≈ 4 p.p.)." });
  }
  if (heightCm && waist && neck) {
    const navy = usNavyBodyFat(sex, heightCm, waist, neck, hip);
    if (navy !== undefined && Number.isFinite(navy)) breakdown.push({ method: "U.S. Navy", value: Math.round(navy * 10) / 10, reference: "Hodgdon & Beckett, Naval Health Research Center 1984 (erro padrão ≈ 3 p.p.)." });
  }

  const filtered = breakdown.map((b) => ({ ...b, value: Math.max(5, Math.min(60, b.value)) }));
  const bodyFatPct = filtered.length ? Number((filtered.reduce((sum, b) => sum + b.value, 0) / filtered.length).toFixed(1)) : undefined;
  const bodyFatLow = bodyFatPct !== undefined ? Math.max(3, Number((bodyFatPct - 3.5).toFixed(1))) : undefined;
  const bodyFatHigh = bodyFatPct !== undefined ? Math.min(65, Number((bodyFatPct + 3.5).toFixed(1))) : undefined;
  const primaryMethod = filtered.length === 0 ? undefined : filtered.find((b) => b.method === "U.S. Navy")?.method ?? filtered[0].method;
  const methodLabel = filtered.length > 1 ? `Média de ${filtered.map((b) => b.method).join(" + ")}` : primaryMethod;
  const reference = filtered.length
    ? filtered.map((b) => `${b.method}: ${b.value}% — ${b.reference}`).join(" | ")
    : "Sem dados suficientes (precisa de IMC; cintura/pescoço para Navy).";

  const muscleMass = weight && bodyFatPct ? Number((weight * (1 - bodyFatPct / 100) * 0.72).toFixed(1)) : undefined;
  // Mifflin-St Jeor (1990), padrão clínico para TMB.
  const bmr = weight && heightCm ? Math.round(10 * weight + 6.25 * heightCm - 5 * age + (sex === 1 ? 5 : -161)) : undefined;
  const waistRisk = waist
    ? (sex === 1 ? (waist >= 102 ? "Atenção: cintura ≥102cm (risco elevado, OMS)" : waist >= 94 ? "Cintura ≥94cm (risco aumentado, OMS)" : "Dentro da faixa usual")
                 : (waist >= 88 ? "Atenção: cintura ≥88cm (risco elevado, OMS)" : waist >= 80 ? "Cintura ≥80cm (risco aumentado, OMS)" : "Dentro da faixa usual"))
    : "Informe a cintura para avaliar risco";

  return {
    bmi,
    bmiClass,
    waistRisk,
    bodyFatEstimate: bodyFatPct ? `${bodyFatPct}% (faixa ${bodyFatLow}–${bodyFatHigh}%)` : "Estimativa visual conservadora",
    bodyFatPct,
    bodyFatLow,
    bodyFatHigh,
    bodyFatMethod: methodLabel,
    bodyFatReference: reference,
    bodyFatBreakdown: filtered,
    muscleMassEstimate: muscleMass ? `${muscleMass}kg estimados` : "Informe bioimpedância para refinar",
    abdominalFatEstimate: waistHip ? `RCQ ${waistHip} (${waistHip >= (sex === 1 ? 0.9 : 0.85) ? "distribuição central, OMS" : "distribuição equilibrada"})` : "Depende de cintura e quadril",
    tissueDistribution: filtered.length
      ? `Estimativa cruzando ${filtered.map((b) => b.method).join(", ")} com IMC, cintura, quadril e proporções; bioimpedância/DEXA refina o resultado.`
      : "Estimativa por peso, cintura, quadril e proporções visuais; use bioimpedância para acompanhar evolução clínica.",
    bmr,
    summary: "Avaliação estimativa para apoio a médicos e nutricionistas, sem substituir consulta, exame físico ou laudo.",
  };
};

const mergeBioimpedanceFitness = (fitness: FitnessAssessment, bio: BioimpedanceData): FitnessAssessment => ({
  ...fitness,
  bodyFatPct: bio.bodyFatPct ?? fitness.bodyFatPct,
  bodyFatLow: bio.bodyFatPct ? Math.max(3, Number((bio.bodyFatPct - 1.5).toFixed(1))) : fitness.bodyFatLow,
  bodyFatHigh: bio.bodyFatPct ? Math.min(65, Number((bio.bodyFatPct + 1.5).toFixed(1))) : fitness.bodyFatHigh,
  bodyFatMethod: bio.bodyFatPct ? "Bioimpedância (informada pelo usuário)" : fitness.bodyFatMethod,
  bodyFatReference: bio.bodyFatPct
    ? `Valor de bioimpedância ${bio.source ? `(${bio.source})` : ""}. Bioimpedância tem erro típico ±2-3 p.p. e varia com hidratação; DEXA continua sendo padrão-ouro.`
    : fitness.bodyFatReference,
  bodyFatEstimate: bio.bodyFatPct
    ? `${bio.bodyFatPct}% (bioimpedância)`
    : fitness.bodyFatEstimate,
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

const chooseBestSize = (options: BrandSizeOption[], measurements: Measurements, kind: "top" | "bottom") => {
  const relevant = kind === "top" ? [measurements.bust_cm] : [measurements.waist_cm, measurements.hip_cm];
  if (relevant.every((value) => !value)) return "Informe medidas";
  const scoreOption = (option: BrandSizeOption) => {
    const checks = kind === "top" ? [{ value: measurements.bust_cm, range: option.bust }] : [{ value: measurements.waist_cm, range: option.waist }, { value: measurements.hip_cm, range: option.hip }];
    return checks.reduce((score, check) => {
      if (!check.value || !check.range) return score + 12;
      const [min, max] = check.range;
      if (check.value >= min && check.value <= max) return score;
      return score + Math.min(Math.abs(check.value - min), Math.abs(check.value - max));
    }, 0);
  };
  return [...options].sort((a, b) => scoreOption(a) - scoreOption(b))[0]?.label ?? "Conferir tabela";
};

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

type CalibrationEntry = { px_per_cm: number; marker_label: string; confidence: number | null; at: number };

const CalibrationHistory = ({ entries }: { entries: CalibrationEntry[] }) => {
  if (!entries.length) return null;
  const current = entries[0];
  const previous = entries[1];
  const diff = previous ? current.px_per_cm - previous.px_per_cm : 0;
  const diffPct = previous && previous.px_per_cm ? (diff / previous.px_per_cm) * 100 : 0;
  const fmtTime = (t: number) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="rounded-lg border bg-secondary/40 p-2 text-[11px]">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold uppercase tracking-wider text-muted-foreground">Histórico px/cm</span>
        {previous && (
          <span className={`font-bold ${Math.abs(diffPct) < 1 ? "text-muted-foreground" : diff > 0 ? "text-emerald-600" : "text-amber-600"}`}>
            {diff > 0 ? "▲" : diff < 0 ? "▼" : "•"} {diff > 0 ? "+" : ""}{diff.toFixed(2)} ({diffPct > 0 ? "+" : ""}{diffPct.toFixed(1)}%)
          </span>
        )}
      </div>
      <ul className="mt-1 space-y-0.5">
        {entries.map((e, i) => (
          <li key={e.at} className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">
              {i === 0 ? "Atual" : i === 1 ? "Anterior" : `#${i + 1}`} · {fmtTime(e.at)}
            </span>
            <span className="font-bold tabular-nums">{e.px_per_cm} px/cm</span>
          </li>
        ))}
      </ul>
    </div>
  );
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
  const [age, setAge] = useState<string>("");
  const [objective, setObjective] = useState("Ambos");
  const [productUrl, setProductUrl] = useState("");
  const [notes, setNotes] = useState("Comprar roupas online com menos troca");
  const [bioimpedance, setBioimpedance] = useState<Record<string, string>>({});
  const [bioFileName, setBioFileName] = useState("");
  const [consent, setConsent] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [history, setHistory] = useState(historySeed);
  const [garmentPreview, setGarmentPreview] = useState("");
  const [tryon, setTryon] = useState<TryonResult | null>(null);
  const [isTryingOn, setIsTryingOn] = useState(false);
  const [isDownloadingTryon, setIsDownloadingTryon] = useState(false);
  const [markerType, setMarkerType] = useState<"card" | "a4" | "banknote_brl">("card");
  const [scaleCalibration, setScaleCalibration] = useState<{
    front?: { px_per_cm: number; marker_label: string; confidence: number | null };
    side?: { px_per_cm: number; marker_label: string; confidence: number | null };
  }>({});
  const [calibrationHistory, setCalibrationHistory] = useState<{
    front: Array<{ px_per_cm: number; marker_label: string; confidence: number | null; at: number }>;
    side: Array<{ px_per_cm: number; marker_label: string; confidence: number | null; at: number }>;
  }>({ front: [], side: [] });
  const [calibratingSide, setCalibratingSide] = useState<"front" | "side" | null>(null);

  const currentMeasurements = analysis?.measurements ?? {};
  const bioimpedanceData = useMemo<BioimpedanceData>(() => ({
    bodyFatPct: parseNumber(bioimpedance.bodyFatPct ?? ""),
    muscleMassKg: parseNumber(bioimpedance.muscleMassKg ?? ""),
    visceralFat: parseNumber(bioimpedance.visceralFat ?? ""),
    waterPct: parseNumber(bioimpedance.waterPct ?? ""),
    bmr: parseNumber(bioimpedance.bmr ?? ""),
    source: bioFileName ? `Arquivo temporário: ${bioFileName}` : undefined,
  }), [bioFileName, bioimpedance]);
  const fitness = mergeBioimpedanceFitness(analysis?.fitnessAssessment ?? calculateFallbackFitness(currentMeasurements, { gender, age: parseNumber(age) }), bioimpedanceData);
  const styles = analysis?.styleRecommendations?.length ? analysis.styleRecommendations : defaultStyles;
  const sizes = analysis?.sizeRecommendations ?? brandSizes;
  const purchaseRisks = analysis ? buildPurchaseRisks(analysis) : [];
  const activeStep = isAnalyzing ? 3 : sidePreview ? 2 : frontPreview ? 1 : 0;
  const accountType = profile?.account_type ?? "b2c";
  const brandFitGuide = useMemo(() => brandSizeGuide.map((row) => ({
    ...row,
    suggestedTop: chooseBestSize(row.topOptions, currentMeasurements, "top"),
    suggestedBottom: chooseBestSize(row.bottomOptions, currentMeasurements, "bottom"),
  })), [currentMeasurements]);

  const measurementRows = useMemo(() => {
    const keys: MeasurementKey[] = ["height_cm", "estimated_weight_kg", "bust_cm", "underbust_cm", "waist_cm", "hip_cm", "inseam_cm", "outseam_cm", "arm_length_cm", "shoulder_width_cm", "thigh_cm", "neck_cm", "torso_length_cm"];
    const statusFor = (key: MeasurementKey) => {
      if (key === "height_cm" || key === "estimated_weight_kg") return "✎ ajustável";
      if (key === "inseam_cm") return "→ barra: +3cm";
      if (key === "arm_length_cm") return "→ punho padrão";
      return "✓";
    };
    return keys.map((key) => ({
      key,
      label: measureLabels[key],
      value: formatMeasure(key, currentMeasurements[key]),
      status: statusFor(key),
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
    try {
      if (!frontPreview && !sidePreview) {
        sessionStorage.removeItem(TEMP_PHOTOS_KEY);
        return;
      }
      const payload = JSON.stringify({ frontPreview, sidePreview, savedAt: Date.now() });
      // sessionStorage is ~5MB; base64 photos can blow the quota. Skip persistence if too big.
      if (payload.length > 4_500_000) {
        sessionStorage.removeItem(TEMP_PHOTOS_KEY);
        return;
      }
      sessionStorage.setItem(TEMP_PHOTOS_KEY, payload);
    } catch (err) {
      // QuotaExceededError or private-mode failure: keep photos in memory only.
      try { sessionStorage.removeItem(TEMP_PHOTOS_KEY); } catch {}
      console.warn("Não foi possível salvar fotos temporárias (quota excedida).", err);
    }
  }, [frontPreview, sidePreview]);

  const onImageChange = (event: ChangeEvent<HTMLInputElement>, kind: "front" | "side") => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Envie uma imagem válida.");
    if (file.size > 7 * 1024 * 1024) return toast.error("Use uma foto de até 7MB para análise mais rápida.");
    const reader = new FileReader();
    reader.onload = () => {
      if (kind === "front") {
        setFrontPreview(String(reader.result));
        setScaleCalibration((prev) => ({ ...prev, front: undefined }));
        setCalibrationHistory((prev) => ({ ...prev, front: [] }));
      } else {
        setSidePreview(String(reader.result));
        setScaleCalibration((prev) => ({ ...prev, side: undefined }));
        setCalibrationHistory((prev) => ({ ...prev, side: [] }));
      }
      toast.success("Foto salva temporariamente neste dispositivo.");
    };
    reader.readAsDataURL(file);
  };

  const calibrateScale = async (kind: "front" | "side") => {
    const image = kind === "front" ? frontPreview : sidePreview;
    if (!image) return toast.error(`Envie a foto ${kind === "front" ? "frontal" : "lateral"} antes de calibrar.`);
    setCalibratingSide(kind);
    try {
      const { data, error } = await supabase.functions.invoke("detect-scale-marker", {
        body: { imageDataUrl: image, markerType },
      });
      if (error) throw new Error(error.message ?? "Falha na chamada");
      if (data?.error) throw new Error(data.error);
      if (!data?.found) {
        toast.error(data?.reason ?? "Marcador não detectado. Reenquadre a foto deixando o marcador bem visível.");
        return;
      }
      const entry = {
        px_per_cm: data.px_per_cm,
        marker_label: data.marker_label,
        confidence: data.confidence,
      };
      setScaleCalibration((prev) => ({ ...prev, [kind]: entry }));
      setCalibrationHistory((prev) => ({
        ...prev,
        [kind]: [{ ...entry, at: Date.now() }, ...prev[kind]].slice(0, 5),
      }));
      toast.success(`Escala calibrada: ${data.px_per_cm} px/cm (${data.marker_label.split(" — ")[0]}).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao calibrar escala.");
    } finally {
      setCalibratingSide(null);
    }
  };

  const updateAnalysisMeasurement = (key: MeasurementKey, value: string) => {
    setManual((prev) => ({ ...prev, [key]: value }));
    const numeric = parseNumber(value);
    if (!analysis || !numeric) return;
    const measurements = { ...analysis.measurements, [key]: numeric };
    const recalculatedFitness = mergeBioimpedanceFitness(calculateFallbackFitness(measurements, { gender, age: parseNumber(age) }), bioimpedanceData);
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
      fitness_assessment: { ...(result.fitnessAssessment ?? {}), bioimpedance: bioimpedanceData },
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
        age: parseNumber(age),
        shoppingGoal: objective,
        productUrl: productUrl.trim() || undefined,
        manualMeasurements: measurements,
        bioimpedance: bioimpedanceData,
        scaleCalibration: (scaleCalibration.front || scaleCalibration.side) ? scaleCalibration : undefined,
      },
    });

    setIsAnalyzing(false);

    if (error || data?.error) return toast.error(data?.error ?? "Não foi possível concluir a análise.");

    const result = normalizeAnalysis(data);
    result.fitnessAssessment = mergeBioimpedanceFitness(result.fitnessAssessment ?? calculateFallbackFitness(result.measurements, { gender, age: parseNumber(age) }), bioimpedanceData);
    // Sempre cruzar com fórmulas locais como sanity-check, preservando valores vindos do backend.
    const local = calculateFallbackFitness(result.measurements, { gender, age: parseNumber(age) });
    result.fitnessAssessment = {
      ...local,
      ...result.fitnessAssessment,
      bodyFatBreakdown: result.fitnessAssessment?.bodyFatBreakdown?.length ? result.fitnessAssessment.bodyFatBreakdown : local.bodyFatBreakdown,
    };
    setManual((prev) => ({ ...prev, ...Object.fromEntries(Object.entries(result.measurements).map(([key, value]) => [key, String(value)])) }));
    setAnalysis(result);
    setMode("results");
    await saveHistory(result);
    toast.success("Análise Encaixe concluída.");
  };

  const onGarmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Envie uma imagem da roupa.");
    if (file.size > 6 * 1024 * 1024) return toast.error("Use uma imagem de até 6MB da peça.");
    const reader = new FileReader();
    reader.onload = () => {
      setGarmentPreview(String(reader.result));
      toast.success("Roupa carregada para o provador.");
    };
    reader.readAsDataURL(file);
  };

  const isValidImageMime = (mime: string) => /^image\/(png|jpeg|jpg|webp|gif)$/i.test(mime);

  const sniffImageMimeFromBytes = (bytes: Uint8Array): string | null => {
    if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
    if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
    if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return "image/gif";
    return null;
  };

  const extFromMime = (mime: string) => {
    if (/png/i.test(mime)) return "png";
    if (/jpe?g/i.test(mime)) return "jpg";
    if (/webp/i.test(mime)) return "webp";
    if (/gif/i.test(mime)) return "gif";
    return "png";
  };

  const downloadTryonImage = async (src: string) => {
    if (isDownloadingTryon) return;
    if (!src || typeof src !== "string") {
      toast.error("Imagem inválida para download.");
      return;
    }
    setIsDownloadingTryon(true);
    try {
      let blob: Blob;
      let detectedMime = "image/png";

      if (src.startsWith("data:")) {
        const commaIdx = src.indexOf(",");
        if (commaIdx === -1) throw new Error("Data URL malformada");
        const meta = src.slice(0, commaIdx);
        const b64 = src.slice(commaIdx + 1);
        const mimeMatch = meta.match(/data:(.*?)(;base64)?$/);
        const declaredMime = mimeMatch?.[1] ?? "";
        if (!declaredMime.startsWith("image/") || !isValidImageMime(declaredMime)) {
          throw new Error(`Tipo de mídia não suportado: ${declaredMime || "desconhecido"}`);
        }
        if (!/^[A-Za-z0-9+/=\s]+$/.test(b64) || b64.length === 0) {
          throw new Error("Conteúdo base64 inválido");
        }
        let bin: string;
        try {
          bin = atob(b64.replace(/\s+/g, ""));
        } catch {
          throw new Error("Falha ao decodificar base64");
        }
        if (bin.length < 8) throw new Error("Imagem muito pequena para ser válida");
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const sniffed = sniffImageMimeFromBytes(bytes);
        if (!sniffed) throw new Error("Assinatura de imagem não reconhecida");
        detectedMime = sniffed;
        blob = new Blob([bytes], { type: detectedMime });
      } else {
        let url: URL;
        try {
          url = new URL(src, window.location.href);
        } catch {
          throw new Error("URL de imagem inválida");
        }
        if (!/^https?:$/.test(url.protocol)) throw new Error("Protocolo não suportado");
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const fetched = await res.blob();
        if (fetched.size === 0) throw new Error("Resposta vazia");
        const headerMime = fetched.type;
        const buf = new Uint8Array(await fetched.slice(0, 16).arrayBuffer());
        const sniffed = sniffImageMimeFromBytes(buf);
        const finalMime = sniffed ?? (isValidImageMime(headerMime) ? headerMime : "");
        if (!finalMime) throw new Error("Conteúdo retornado não é uma imagem válida");
        detectedMime = finalMime;
        blob = sniffed && headerMime !== sniffed ? new Blob([fetched], { type: finalMime }) : fetched;
      }

      // Validação final: o navegador consegue decodificar?
      const objectUrl = URL.createObjectURL(blob);
      try {
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => (img.naturalWidth > 0 && img.naturalHeight > 0 ? resolve() : reject(new Error("Imagem com dimensões inválidas")));
          img.onerror = () => reject(new Error("Falha ao decodificar imagem"));
          img.src = objectUrl;
        });
      } catch (decodeErr) {
        URL.revokeObjectURL(objectUrl);
        throw decodeErr;
      }

      const filename = `provador-encaixe-${Date.now()}.${extFromMime(detectedMime)}`;
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
    } catch (err) {
      console.error("download tryon failed, tentando fallback do servidor", err);
      const clientMessage = err instanceof Error ? err.message : "Erro desconhecido";
      try {
        const MIN_BYTES = 100; // PNG mínimo realista
        const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

        const functionsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/normalize-image`;
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        const res = await fetch(functionsUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken}`,
            Accept: "image/png",
          },
          body: JSON.stringify({ src }),
        });

        if (!res.ok) {
          let serverMsg = `HTTP ${res.status}`;
          try {
            const errBody = await res.json();
            if (errBody?.error) serverMsg = String(errBody.error);
          } catch { /* ignora */ }
          throw new Error(serverMsg);
        }

        // Validação de Content-Type
        const contentType = (res.headers.get("Content-Type") ?? "").split(";")[0]?.trim().toLowerCase();
        if (contentType !== "image/png") {
          throw new Error(`Content-Type inesperado: ${contentType || "vazio"}`);
        }

        // Validação de Content-Length declarado (quando presente)
        const declaredLengthHeader = res.headers.get("Content-Length");
        if (declaredLengthHeader) {
          const declaredLength = Number(declaredLengthHeader);
          if (!Number.isFinite(declaredLength) || declaredLength < MIN_BYTES) {
            throw new Error(`Tamanho declarado inválido: ${declaredLengthHeader}`);
          }
          if (declaredLength > MAX_BYTES) {
            throw new Error(`Imagem excede o limite (${declaredLength} bytes)`);
          }
        }

        const buffer = await res.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        // Validação de tamanho real
        if (bytes.byteLength < MIN_BYTES) {
          throw new Error(`Arquivo muito pequeno (${bytes.byteLength} bytes)`);
        }
        if (bytes.byteLength > MAX_BYTES) {
          throw new Error(`Arquivo excede o limite (${bytes.byteLength} bytes)`);
        }

        // Validação da assinatura PNG (\x89 P N G \r \n \x1a \n)
        const isPng =
          bytes.length >= 8 &&
          bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
          bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
        if (!isPng) {
          throw new Error("Assinatura PNG inválida no retorno do servidor");
        }

        const blob = new Blob([bytes], { type: "image/png" });
        const url = URL.createObjectURL(blob);

        // Validação final: o navegador consegue decodificar?
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => (img.naturalWidth > 0 && img.naturalHeight > 0 ? resolve() : reject(new Error("PNG com dimensões inválidas")));
          img.onerror = () => reject(new Error("Falha ao decodificar PNG retornado"));
          img.src = url;
        }).catch((decodeErr) => {
          URL.revokeObjectURL(url);
          throw decodeErr;
        });

        const a = document.createElement("a");
        a.href = url;
        a.download = `provador-encaixe-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        toast.success("Imagem normalizada e baixada.");
      } catch (fallbackErr) {
        console.error("fallback normalize-image falhou", fallbackErr);
        const fbMessage = fallbackErr instanceof Error ? fallbackErr.message : "erro desconhecido";
        try {
          if (src.startsWith("data:") || /^https?:/.test(src)) {
            window.open(src, "_blank");
            toast.message(`Não foi possível baixar (${clientMessage} / ${fbMessage}). Toque e segure na imagem para salvar.`);
          } else {
            toast.error(`Imagem inválida: ${clientMessage}`);
          }
        } catch {
          toast.error(`Não foi possível baixar a imagem: ${fbMessage}`);
        }
      }
    } finally {
      setIsDownloadingTryon(false);
    }
  };

  const manualMeasurements = () =>
    manualFields.reduce<Measurements>((acc, field) => {
      const value = parseNumber(manual[field.key] ?? "");
      if (value) acc[field.key] = value;
      return acc;
    }, {});


  const runTryon = async () => {
    if (!frontPreview) return toast.error("Tire ou envie uma foto sua de frente primeiro.");
    if (!garmentPreview && !productUrl.trim()) return toast.error("Envie a foto da roupa ou cole o link do produto.");
    setIsTryingOn(true);
    setTryon(null);
    const brandSize = analysis?.sizeRecommendations?.Brasil ?? analysis?.clothing?.[0]?.size;
    const { data, error } = await supabase.functions.invoke("virtual-tryon", {
      body: {
        userImageDataUrl: frontPreview,
        garmentImageDataUrl: garmentPreview || undefined,
        productUrl: productUrl.trim() || undefined,
        measurements: currentMeasurements,
        gender,
        bodyType: analysis?.bodyType,
        brandSize,
        notes,
      },
    });
    setIsTryingOn(false);
    if (error || data?.error) return toast.error(data?.error ?? "Não foi possível gerar o provador.");
    setTryon(data as TryonResult);
    toast.success("Provador virtual pronto.");
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
            {userId && (
              <Link to="/painel">
                <Button type="button" variant="ghost" size="sm" className="gap-2"><Sparkles className="size-4" /> Painel</Button>
              </Link>
            )}
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
                <>
                <div className="rounded-2xl border border-dashed bg-secondary/40 p-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold uppercase tracking-wider text-foreground">Calibração de escala</span>
                    <span className="text-muted-foreground">— posicione um marcador físico de tamanho conhecido na foto (encostado no corpo ou no chão, sem dobras) para converter pixels em cm com precisão.</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Label htmlFor="marker-type" className="text-xs font-bold">Marcador:</Label>
                    <select
                      id="marker-type"
                      value={markerType}
                      onChange={(e) => setMarkerType(e.target.value as typeof markerType)}
                      className="h-9 rounded-md border bg-background px-2 text-xs font-semibold"
                    >
                      <option value="card">Cartão (8,56 × 5,40 cm)</option>
                      <option value="a4">Folha A4 (29,7 × 21,0 cm)</option>
                      <option value="banknote_brl">Cédula R$ (14,2 × 6,5 cm)</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl border bg-secondary text-center shadow-inner">
                      {frontPreview ? <><img src={frontPreview} alt="Preview da foto frontal para análise de medidas" className="h-full w-full object-cover" /><PosturalGrid variant="front" label="Frente" /><span className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-card/90 px-3 py-1 text-xs font-bold">Preview frente</span></> : <><PosturalGrid variant="front" label="Frente" /><span className="relative z-20 grid justify-items-center gap-3 p-6 text-muted-foreground"><Upload className="size-8 text-primary" /> Foto de frente</span></>}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Label htmlFor="front-camera" className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-bold"><Camera className="size-4" /> Foto</Label>
                      <Label htmlFor="front-upload" className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-bold"><Upload className="size-4" /> Upload</Label>
                    </div>
                    <Button type="button" variant="outline" size="sm" disabled={!frontPreview || calibratingSide === "front"} onClick={() => calibrateScale("front")} className="w-full">
                      {calibratingSide === "front" ? "Detectando marcador…" : scaleCalibration.front ? `✓ ${scaleCalibration.front.px_per_cm} px/cm — recalibrar` : "Calibrar escala"}
                    </Button>
                    <CalibrationHistory entries={calibrationHistory.front} />
                  </div>
                  <div className="space-y-2">
                    <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl border bg-secondary text-center shadow-inner">
                      {sidePreview ? <><img src={sidePreview} alt="Preview da foto lateral para análise de medidas" className="h-full w-full object-cover" /><PosturalGrid variant="side" label="Lateral" /><span className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-card/90 px-3 py-1 text-xs font-bold">Preview lateral</span></> : <><PosturalGrid variant="side" label="Lateral" /><span className="relative z-20 grid justify-items-center gap-3 p-6 text-muted-foreground"><Upload className="size-8 text-primary" /> Foto lateral</span></>}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Label htmlFor="side-camera" className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-bold"><Camera className="size-4" /> Foto</Label>
                      <Label htmlFor="side-upload" className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-bold"><Upload className="size-4" /> Upload</Label>
                    </div>
                    <Button type="button" variant="outline" size="sm" disabled={!sidePreview || calibratingSide === "side"} onClick={() => calibrateScale("side")} className="w-full">
                      {calibratingSide === "side" ? "Detectando marcador…" : scaleCalibration.side ? `✓ ${scaleCalibration.side.px_per_cm} px/cm — recalibrar` : "Calibrar escala"}
                    </Button>
                    <CalibrationHistory entries={calibrationHistory.side} />
                  </div>
                  <Input id="front-camera" type="file" accept="image/*" capture="environment" onChange={(event) => onImageChange(event, "front")} className="sr-only" />
                  <Input id="front-upload" type="file" accept="image/*" onChange={(event) => onImageChange(event, "front")} className="sr-only" />
                  <Input id="side-camera" type="file" accept="image/*" capture="environment" onChange={(event) => onImageChange(event, "side")} className="sr-only" />
                  <Input id="side-upload" type="file" accept="image/*" onChange={(event) => onImageChange(event, "side")} className="sr-only" />
                </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                {manualFields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key}>{field.label}</Label>
                    <Input id={field.key} inputMode="decimal" value={manual[field.key] ?? ""} onChange={(event) => setManual((prev) => ({ ...prev, [field.key]: event.target.value }))} placeholder={field.placeholder} />
                  </div>
                ))}
                <div className="space-y-2">
                  <Label htmlFor="age">Idade</Label>
                  <Input id="age" inputMode="numeric" value={age} onChange={(event) => setAge(event.target.value)} placeholder="32" />
                </div>
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
              <div className="space-y-3 rounded-2xl border bg-card/70 p-4">
                <div><h3 className="font-display text-xl font-semibold">Bioimpedância opcional</h3><p className="text-sm leading-6 text-muted-foreground">Digite dados do exame ou anexe temporariamente para acompanhamento com médico/nutricionista.</p></div>
                <div className="grid grid-cols-2 gap-3">
                  {bioimpedanceFields.map((field) => <div key={field.key} className="space-y-2"><Label htmlFor={`bio-${field.key}`}>{field.label}</Label><Input id={`bio-${field.key}`} inputMode="decimal" value={bioimpedance[field.key] ?? ""} onChange={(event) => setBioimpedance((prev) => ({ ...prev, [field.key]: event.target.value }))} placeholder={field.placeholder} /></div>)}
                </div>
                <Label htmlFor="bio-upload" className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-bold"><Upload className="size-4" /> {bioFileName || "Upload do exame"}</Label>
                <Input id="bio-upload" type="file" accept="image/*,.pdf" onChange={onBioFileChange} className="sr-only" />
              </div>
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
              <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl lg:grid-cols-6"><TabsTrigger value="dashboard">Medidas</TabsTrigger><TabsTrigger value="sizes">Tamanhos</TabsTrigger><TabsTrigger value="tryon">Provador</TabsTrigger><TabsTrigger value="style">Estilo</TabsTrigger><TabsTrigger value="fitness">Fitness</TabsTrigger><TabsTrigger value="history">Histórico</TabsTrigger></TabsList>

              <TabsContent value="dashboard" className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                <div className="relative min-h-[420px] rounded-2xl border bg-panel-glow p-6 shadow-panel"><div className="absolute left-1/2 top-12 size-20 -translate-x-1/2 rounded-full border-2 border-primary/40" /><div className="absolute left-1/2 top-32 h-64 w-32 -translate-x-1/2 rounded-full border-2 border-accent/60" /><span className="absolute left-8 top-32 rounded-full bg-card px-3 py-1 text-sm font-bold">Busto {formatMeasure("bust_cm", currentMeasurements.bust_cm)}</span><span className="absolute right-8 top-52 rounded-full bg-card px-3 py-1 text-sm font-bold">Cintura {formatMeasure("waist_cm", currentMeasurements.waist_cm)}</span><span className="absolute left-8 bottom-24 rounded-full bg-card px-3 py-1 text-sm font-bold">Quadril {formatMeasure("hip_cm", currentMeasurements.hip_cm)}</span></div>
                <div className="space-y-4 rounded-2xl border bg-card/80 p-5 shadow-panel"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-muted p-4"><p className="text-sm text-muted-foreground">IMC</p><p className="font-display text-3xl font-semibold">{fitness.bmi ?? "—"}</p><p className="font-bold">{fitness.bmiClass}</p></div><div className="rounded-2xl bg-muted p-4"><p className="text-sm text-muted-foreground">Tipo corporal</p><p className="font-display text-2xl font-semibold">{analysis.bodyType ?? "Triângulo"}</p></div><div className="rounded-2xl bg-muted p-4"><p className="text-sm text-muted-foreground">% gordura</p><p className="font-display text-xl font-semibold">{fitness.bodyFatEstimate}</p></div></div><div className="overflow-hidden rounded-2xl border"><table className="w-full text-sm"><tbody>{measurementRows.map((row) => <tr key={row.key} className="border-b last:border-0"><td className="p-3 font-bold">{row.label}</td><td className="p-3"><Input inputMode="decimal" value={manual[row.key] ?? String(currentMeasurements[row.key] ?? "")} onChange={(event) => updateAnalysisMeasurement(row.key, event.target.value)} className="h-9 min-w-20" /></td><td className="p-3 text-muted-foreground">{row.status}</td></tr>)}</tbody></table></div><p className="text-sm leading-6 text-muted-foreground">Ajuste qualquer medida estimada pela IA para recalcular IMC, riscos e recomendações de tamanho com maior precisão.</p></div>
              </TabsContent>

              <TabsContent value="sizes" className="grid gap-4 lg:grid-cols-2"><div className="rounded-2xl border bg-card/80 p-5 shadow-panel"><h3 className="mb-4 flex items-center gap-2 font-display text-2xl font-semibold"><Shirt className="size-5 text-primary" /> Tamanhos sugeridos</h3><div className="grid gap-3">{Object.entries(sizes).map(([label, value]) => <div key={label} className="flex items-center justify-between rounded-2xl bg-muted p-4"><span className="font-bold">{label}</span><span className="text-right font-display text-xl font-semibold">{textOf(value)}</span></div>)}</div></div><div className="rounded-2xl border bg-card/80 p-5 shadow-panel"><h3 className="mb-4 font-display text-2xl font-semibold">Ajustes de alfaiataria</h3><div className="space-y-3">{analysis.adjustments.map((item, index) => <p key={`${textOf(item)}-${index}`} className="flex gap-2 rounded-2xl bg-muted p-3"><BadgeCheck className="mt-0.5 size-4 shrink-0 text-success" />{textOf(item)}</p>)}</div></div><div className="rounded-2xl border bg-card/80 p-5 shadow-panel lg:col-span-2"><h3 className="mb-4 font-display text-2xl font-semibold">Tabela por marca</h3><div className="overflow-x-auto rounded-2xl border"><table className="w-full min-w-[760px] text-sm"><thead className="bg-muted text-left"><tr><th className="p-3">Marca</th><th className="p-3">Medida indicada</th><th className="p-3">Blusas/Camisas</th><th className="p-3">Calças/Saias</th><th className="p-3">Observação</th></tr></thead><tbody>{brandFitGuide.map((row) => <tr key={row.brand} className="border-t"><td className="p-3 font-bold">{row.brand}</td><td className="p-3"><div className="flex flex-wrap gap-2"><Badge variant="secondary">Topo {row.suggestedTop}</Badge><Badge variant="outline">Baixo {row.suggestedBottom}</Badge></div></td><td className="p-3">{row.top}</td><td className="p-3">{row.bottom}</td><td className="p-3 text-muted-foreground">{row.note}</td></tr>)}</tbody></table></div><p className="mt-3 text-sm leading-6 text-muted-foreground">A indicação usa busto para blusas e a maior compatibilidade entre cintura/quadril para partes de baixo; se ficar entre dois tamanhos, escolha pelo tecido e caimento desejado.</p></div><div className="rounded-2xl border bg-card/80 p-5 shadow-panel lg:col-span-2"><h3 className="mb-4 font-display text-2xl font-semibold">Risco de compra por região</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{purchaseRisks.map((item) => <article key={item.region} className="rounded-2xl bg-muted p-4"><div className="mb-3 flex items-center justify-between gap-2"><span className="font-bold">{item.region}</span><Badge variant={item.risk === "Alto" ? "destructive" : item.risk === "Médio" ? "secondary" : "outline"}>{item.risk}</Badge></div><Progress value={item.score} className="h-2" /><p className="mt-3 text-sm leading-6 text-muted-foreground">{item.detail}</p></article>)}</div></div></TabsContent>

              <TabsContent value="tryon" className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-4 rounded-2xl border bg-card/80 p-5 shadow-panel">
                  <div className="flex items-center gap-2"><Wand2 className="size-5 text-primary" /><h3 className="font-display text-2xl font-semibold">Provador virtual</h3></div>
                  <p className="text-sm leading-6 text-muted-foreground">Combine sua foto com a peça (link ou upload) para visualizar o caimento ultra-realista, recomendações de tamanho, combinações e colorimetria.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-muted-foreground">Sua foto</p>
                      <div className="aspect-[3/4] overflow-hidden rounded-2xl border bg-secondary">
                        {frontPreview ? <img src={frontPreview} alt="Sua foto frontal" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center p-4 text-center text-xs text-muted-foreground">Volte e envie sua foto frontal</div>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-muted-foreground">Roupa de interesse</p>
                      <div className="aspect-[3/4] overflow-hidden rounded-2xl border bg-secondary">
                        {garmentPreview ? <img src={garmentPreview} alt="Peça de interesse" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center p-4 text-center text-xs text-muted-foreground">Use o link ou faça upload</div>}
                      </div>
                      <Label htmlFor="garment-upload" className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-bold"><Upload className="size-4" /> Upload da peça</Label>
                      <Input id="garment-upload" type="file" accept="image/*" onChange={onGarmentChange} className="sr-only" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tryon-url" className="flex items-center gap-2"><Link2 className="size-4 text-primary" /> Link do produto</Label>
                    <Input id="tryon-url" type="url" value={productUrl} onChange={(event) => setProductUrl(event.target.value)} placeholder="https://loja.com/produto" maxLength={500} />
                  </div>
                  <Button type="button" variant="hero" size="lg" onClick={runTryon} disabled={isTryingOn} className="w-full">{isTryingOn ? "Gerando provador ultra-realista..." : "Gerar provador virtual"}<Wand2 className="size-4" /></Button>
                  <p className="text-xs leading-5 text-muted-foreground">Imagem gerada por IA, apenas para visualização do caimento. Pode haver pequenas variações de cor/textura em relação ao produto real.</p>
                </div>
                <div className="space-y-4">
                  <div className="rounded-2xl border bg-panel-glow p-3 shadow-panel">
                    <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl border bg-secondary">
                      {isTryingOn && <div className="body-scan-loader scan-grid absolute inset-0" />}
                      {tryon?.tryonImage ? <img src={tryon.tryonImage} alt="Provador virtual gerado por IA" className="h-full w-full object-cover" /> : !isTryingOn && <span className="grid justify-items-center gap-3 p-6 text-center text-sm text-muted-foreground"><Sparkles className="size-8 text-primary" /> Seu provador virtual aparecerá aqui</span>}
                    </div>
                    {tryon?.tryonImage && <button type="button" onClick={() => downloadTryonImage(tryon.tryonImage!)} disabled={isDownloadingTryon} aria-busy={isDownloadingTryon} className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60">{isDownloadingTryon ? <><Loader2 className="size-4 animate-spin" /> Baixando…</> : <><Download className="size-4" /> Baixar imagem</>}</button>}
                  </div>
                  {tryon?.advice && (
                    <div className="space-y-3 rounded-2xl border bg-card/80 p-5 shadow-panel">
                      <div>
                        <p className="text-sm font-bold text-primary">Tamanho ideal</p>
                        <p className="font-display text-lg font-semibold">{tryon.advice.size_advice ?? "—"}</p>
                      </div>
                      {tryon.advice.fit_notes?.length ? (
                        <div className="space-y-2">
                          <p className="text-sm font-bold">Pontos de atenção</p>
                          {tryon.advice.fit_notes.map((note, i) => <p key={i} className="flex gap-2 rounded-2xl bg-muted p-3 text-sm"><BadgeCheck className="mt-0.5 size-4 shrink-0 text-success" />{note}</p>)}
                        </div>
                      ) : null}
                      {tryon.advice.combinations?.length ? (
                        <div className="space-y-2">
                          <p className="flex items-center gap-2 text-sm font-bold"><Shirt className="size-4 text-primary" /> Combinações sugeridas</p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {tryon.advice.combinations.map((combo, i) => (
                              <article key={i} className="rounded-2xl bg-muted p-3 text-sm">
                                <p className="font-bold">{combo.title}</p>
                                <p className="mt-1 text-muted-foreground">{combo.pieces?.join(" + ")}</p>
                                <Badge variant="outline" className="mt-2">{combo.occasion}</Badge>
                              </article>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {tryon.advice.color_palette ? (() => {
                        const cp = tryon.advice!.color_palette!;
                        const toChip = (c: ColorChip | string): ColorChip => typeof c === "string" ? { name: c, hex: "#cccccc" } : c;
                        const best = (cp.best_colors ?? []).map(toChip);
                        const avoid = (cp.avoid_colors ?? []).map(toChip);
                        const neutrals = (cp.neutrals ?? []).map(toChip);
                        const Swatch = ({ chip, danger }: { chip: ColorChip; danger?: boolean }) => (
                          <div className="flex items-center gap-2 rounded-full border bg-card px-2 py-1 text-xs font-bold">
                            <span className={`size-4 rounded-full border ${danger ? "ring-2 ring-destructive/40" : ""}`} style={{ backgroundColor: chip.hex }} />
                            {chip.name}
                          </div>
                        );
                        return (
                          <div className="space-y-3 rounded-2xl bg-muted p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="flex items-center gap-2 text-sm font-bold"><Palette className="size-4 text-primary" /> Colorimetria automática</p>
                              <Badge variant="outline">{cp.season ?? cp.undertone ?? "—"}</Badge>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {cp.skin_tone_hex && (
                                <div className="flex items-center gap-3 rounded-2xl bg-card/80 p-3">
                                  <span className="size-10 rounded-full border-2 border-border" style={{ backgroundColor: cp.skin_tone_hex }} />
                                  <div><p className="text-xs text-muted-foreground">Subtom detectado</p><p className="text-sm font-bold">{cp.undertone ?? "—"} · {cp.skin_tone_hex}</p></div>
                                </div>
                              )}
                              {cp.garment_color_hex && (
                                <div className="flex items-center gap-3 rounded-2xl bg-card/80 p-3">
                                  <span className="size-10 rounded-full border-2 border-border" style={{ backgroundColor: cp.garment_color_hex }} />
                                  <div><p className="text-xs text-muted-foreground">Cor da peça</p><p className="text-sm font-bold">{cp.garment_color_name ?? cp.garment_color_hex}</p></div>
                                </div>
                              )}
                            </div>
                            {cp.harmony_explanation && (
                              <div className="rounded-2xl bg-card/70 p-3 text-sm leading-6">
                                <p className="text-xs font-bold uppercase text-muted-foreground">Harmonia com a peça · {cp.harmony_with_garment ?? "—"}</p>
                                <p>{cp.harmony_explanation}</p>
                              </div>
                            )}
                            {cp.rationale && <p className="text-sm leading-6 text-muted-foreground">{cp.rationale}</p>}
                            {best.length > 0 && (
                              <div>
                                <p className="text-xs font-bold">Cores que valorizam</p>
                                <div className="mt-1 flex flex-wrap gap-2">{best.map((c, i) => <Swatch key={`b-${i}-${c.hex}`} chip={c} />)}</div>
                              </div>
                            )}
                            {neutrals.length > 0 && (
                              <div>
                                <p className="text-xs font-bold">Neutros base</p>
                                <div className="mt-1 flex flex-wrap gap-2">{neutrals.map((c, i) => <Swatch key={`n-${i}-${c.hex}`} chip={c} />)}</div>
                              </div>
                            )}
                            {avoid.length > 0 && (
                              <div>
                                <p className="text-xs font-bold">Evite</p>
                                <div className="mt-1 flex flex-wrap gap-2">{avoid.map((c, i) => <Swatch key={`a-${i}-${c.hex}`} chip={c} danger />)}</div>
                              </div>
                            )}
                            {cp.metals?.length ? (
                              <div className="flex flex-wrap items-center gap-2"><p className="text-xs font-bold">Metais:</p>{cp.metals.map((m) => <Badge key={m} variant="secondary">{m}</Badge>)}</div>
                            ) : null}
                            {cp.combine_guide?.length ? (
                              <div className="space-y-2">
                                <p className="text-xs font-bold uppercase text-muted-foreground">Guia rápido para combinar com esta peça</p>
                                <div className="grid gap-2 sm:grid-cols-3">
                                  {cp.combine_guide.map((g, i) => (
                                    <div key={`g-${i}`} className="rounded-2xl bg-card/80 p-3 text-sm">
                                      <div className="flex items-center gap-2"><span className="size-6 rounded-full border" style={{ backgroundColor: g.hex ?? "#cccccc" }} /><p className="font-bold capitalize">{g.role}</p></div>
                                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{g.suggestion}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })() : null}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="style" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{styles.map((item) => <article key={item.title} className="rounded-2xl border bg-card/80 p-5 shadow-panel"><div className="mb-4 text-4xl">{item.emoji ?? "✨"}</div><span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">{item.tag}</span><h3 className="mt-4 font-display text-xl font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{item.tip}</p>{item.avoid && <p className="mt-3 text-sm font-bold">Evite: {item.avoid}</p>}</article>)}</TabsContent>

              <TabsContent value="fitness" className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border bg-card/80 p-5 shadow-panel">
                  <HeartPulse className="mb-4 size-8 text-primary" />
                  <p className="text-sm text-muted-foreground">IMC e TMB</p>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted"><div className="h-full w-2/3 rounded-full bg-primary" /></div>
                  <p className="mt-4 font-display text-3xl font-semibold">{fitness.bmi ?? "—"}</p>
                  <p className="font-bold">{fitness.bmiClass}</p>
                  <p className="mt-2 text-sm text-muted-foreground">TMB (Mifflin-St Jeor): {fitness.bmr ? `${fitness.bmr} kcal/dia` : "—"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{fitness.waistRisk}</p>
                </div>
                <div className="rounded-2xl border bg-card/80 p-5 shadow-panel">
                  <Activity className="mb-4 size-8 text-accent" />
                  <h3 className="font-display text-2xl font-semibold">% Gordura corporal</h3>
                  <p className="mt-3 font-display text-4xl font-semibold">{fitness.bodyFatPct ? `${fitness.bodyFatPct}%` : "—"}</p>
                  {fitness.bodyFatLow && fitness.bodyFatHigh && (
                    <p className="text-sm text-muted-foreground">Faixa provável: {fitness.bodyFatLow}–{fitness.bodyFatHigh}%</p>
                  )}
                  {fitness.bodyFatMethod && (
                    <p className="mt-2 text-sm"><span className="font-bold">Método:</span> {fitness.bodyFatMethod}</p>
                  )}
                  {fitness.bodyFatBreakdown && fitness.bodyFatBreakdown.length > 0 && (
                    <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                      {fitness.bodyFatBreakdown.map((b) => (
                        <li key={b.method} className="flex items-start gap-2">
                          <span className="mt-1 size-1.5 rounded-full bg-accent" />
                          <span><span className="font-bold text-foreground">{b.method}: {b.value}%</span> — {b.reference}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">Massa muscular estimada: {fitness.muscleMassEstimate ?? "—"} · {fitness.abdominalFatEstimate ?? ""}</p>
                </div>
                <div className="rounded-2xl border bg-card/80 p-5 shadow-panel">
                  <FileText className="mb-4 size-8 text-primary" />
                  <h3 className="font-display text-2xl font-semibold">Como chegamos aqui</h3>
                  <p className="mt-3 leading-7 text-muted-foreground text-sm">{fitness.bodyFatReference ?? fitness.tissueDistribution ?? fitness.summary}</p>
                  <div className="mt-3 rounded-2xl bg-muted p-3 text-xs leading-5 text-muted-foreground">
                    <p className="font-bold text-foreground">Referências usadas</p>
                    <ul className="mt-1 space-y-1">
                      <li>• <span className="font-bold">CUN-BAE</span> — Gómez-Ambrosi et al., Diabetes Care 2012 (validado vs. DEXA, R²≈0,86, EE≈3-4 p.p.).</li>
                      <li>• <span className="font-bold">Deurenberg</span> — Br J Nutr 1991, "BMI as a measure of body fatness" (EE≈4 p.p.).</li>
                      <li>• <span className="font-bold">U.S. Navy</span> — Hodgdon & Beckett, Naval Health Research Center 1984 (cintura, pescoço, quadril; EE≈3 p.p.).</li>
                      <li>• <span className="font-bold">Bioimpedância</span> — quando informada, prevalece sobre fórmulas (EE≈2-3 p.p., depende de hidratação).</li>
                      <li>• <span className="font-bold">DEXA</span> — padrão-ouro recomendado para diagnóstico clínico.</li>
                    </ul>
                  </div>
                  <p className="mt-3 rounded-2xl bg-muted p-3 text-xs">Estimativa para apoio médico/nutricional; não substitui consulta, exame físico ou laudo.</p>
                </div>
              </TabsContent>

              <TabsContent value="history" className="grid gap-4 lg:grid-cols-[1fr_0.8fr]"><div className="rounded-2xl border bg-card/80 p-5 shadow-panel"><h3 className="mb-4 flex items-center gap-2 font-display text-2xl font-semibold"><History className="size-5 text-primary" /> Evolução corporal</h3><div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={history}><XAxis dataKey="date" /><YAxis /><Tooltip /><Line type="monotone" dataKey="waist" stroke="hsl(var(--primary))" strokeWidth={3} /><Line type="monotone" dataKey="hip" stroke="hsl(var(--accent))" strokeWidth={3} /></LineChart></ResponsiveContainer></div></div><div className="space-y-3 rounded-2xl border bg-card/80 p-5 shadow-panel"><h3 className="font-display text-2xl font-semibold">Perfil e monetização</h3>{["Free: 1 análise/mês", "Premium R$19,90/mês: ilimitado + PDF + marcas", "B2B API key: página placeholder"].map((item) => <p key={item} className="flex gap-2 rounded-2xl bg-muted p-3"><KeyRound className="mt-0.5 size-4 shrink-0 text-primary" />{item}</p>)}<p className="flex gap-2 rounded-2xl bg-muted p-3"><Lock className="mt-0.5 size-4 shrink-0 text-primary" />Histórico salvo para usuários autenticados.</p></div></TabsContent>
            </Tabs>
          </div>
        )}
      </section>
    </main>
  );
};

export default Index;
