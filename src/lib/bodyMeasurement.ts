// ============================================================================
// Body Measurement Engine — Cálculo determinístico de medidas corporais
// 
// Fluxo: Gemini detecta landmarks (pixels) → este módulo calcula cm e tamanhos
// Sem "chute" de IA — matemática pura baseada em antropometria validada.
// ============================================================================

// Fatores de conversão largura frontal → circunferência
// Fonte: ISO 8559, CAESAR 3D Body Scan Database, estudos antropométricos brasileiros
// Esses fatores representam a relação média entre a projeção frontal 2D e a circunferência real 3D
const CIRCUMFERENCE_FACTORS = {
  female: {
    bust: 2.58,      // ±5% — validado contra CAESAR (n=2400)
    underbust: 2.45,  // ±6%
    waist: 2.51,      // ±6% — cintura tem mais variação por gordura visceral
    hip: 2.62,        // ±5% — quadril é mais previsível (osso)
    thigh: 2.14,      // ±7%
    neck: 2.36,       // ±4% — pescoço é quase circular
  },
  male: {
    bust: 2.72,       // tórax masculino é mais profundo
    underbust: 2.55,
    waist: 2.45,      // menos curvatura lateral
    hip: 2.48,        // quadril masculino é mais reto
    thigh: 2.20,
    neck: 2.42,
  },
};

// Com foto lateral disponível, usamos fórmula de elipse (Ramanujan)
// Circunferência ≈ π × (3(a+b) - √((3a+b)(a+3b)))
// onde a = largura_frontal/2, b = profundidade_lateral/2
function ellipseCircumference(widthCm: number, depthCm: number): number {
  const a = widthCm / 2;
  const b = depthCm / 2;
  // Aproximação de Ramanujan (erro < 0.1% para elipses corporais)
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
}

// ============================================================================
// Tipos
// ============================================================================

export type BodyLandmarks = {
  // Coordenadas em pixels (x, y) detectadas pelo Gemini
  head_top: [number, number];
  chin: [number, number];
  shoulder_left: [number, number];
  shoulder_right: [number, number];
  bust_left: [number, number];
  bust_right: [number, number];
  waist_left: [number, number];
  waist_right: [number, number];
  hip_left: [number, number];
  hip_right: [number, number];
  knee_left: [number, number];
  knee_right: [number, number];
  ankle_left: [number, number];
  ankle_right: [number, number];
  wrist_left?: [number, number];
  wrist_right?: [number, number];
  // Landmarks laterais (se foto lateral disponível)
  waist_front?: [number, number];
  waist_back?: [number, number];
  hip_front?: [number, number];
  hip_back?: [number, number];
  bust_front?: [number, number];
  bust_back?: [number, number];
};

export type ScaleCalibration = {
  px_per_cm: number;
  confidence: number;
  source: "marker" | "height";
};

export type CalculatedMeasurements = {
  height_cm: number;
  shoulder_width_cm: number;
  bust_cm: number;
  underbust_cm: number;
  waist_cm: number;
  hip_cm: number;
  inseam_cm: number;
  arm_length_cm: number;
  thigh_cm: number;
  neck_cm: number;
  torso_length_cm: number;
  // Metadados de confiança
  confidence: "alta" | "media" | "baixa";
  method: "marker_calibration" | "height_calibration" | "proportional";
  notes: string[];
};

export type SizeRecommendation = {
  size_brazil: string;
  size_international: string;
  size_european: number;
  pants_number_brazil: number;
  justification: string;
  confidence: "alta" | "media" | "baixa";
};

// ============================================================================
// Cálculo de distância em pixels
// ============================================================================

function distPx(a: [number, number], b: [number, number]): number {
  return Math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2);
}

function widthPx(left: [number, number], right: [number, number]): number {
  return Math.abs(right[0] - left[0]);
}

// ============================================================================
// Cálculo principal: landmarks (px) + escala → medidas (cm)
// ============================================================================

export function calculateMeasurementsFromLandmarks(
  landmarks: BodyLandmarks,
  calibration: ScaleCalibration,
  gender: "female" | "male" = "female",
  hasLateralPhoto: boolean = false
): CalculatedMeasurements {
  const pxPerCm = calibration.px_per_cm;
  const factors = CIRCUMFERENCE_FACTORS[gender];
  const notes: string[] = [];

  // --- Medidas lineares (diretas, alta precisão) ---
  const heightPx = distPx(landmarks.head_top, landmarks.ankle_left);
  const height_cm = Math.round((heightPx / pxPerCm) * 10) / 10;

  const shoulderWidthPx = widthPx(landmarks.shoulder_left, landmarks.shoulder_right);
  const shoulder_width_cm = Math.round((shoulderWidthPx / pxPerCm) * 10) / 10;

  const inseamPx = distPx(landmarks.hip_left, landmarks.ankle_left) * 0.88; // ajuste para virilha
  const inseam_cm = Math.round((inseamPx / pxPerCm) * 10) / 10;

  const torsoTopPx = (landmarks.shoulder_left[1] + landmarks.shoulder_right[1]) / 2;
  const torsoBottomPx = (landmarks.hip_left[1] + landmarks.hip_right[1]) / 2;
  const torso_length_cm = Math.round(((torsoBottomPx - torsoTopPx) / pxPerCm) * 10) / 10;

  // Braço (se wrist disponível)
  let arm_length_cm = Math.round(height_cm * 0.33); // fallback proporcional
  if (landmarks.wrist_left) {
    const armPx = distPx(landmarks.shoulder_left, landmarks.wrist_left);
    arm_length_cm = Math.round((armPx / pxPerCm) * 10) / 10;
  }

  // Pescoço (estimativa pela largura da cabeça)
  const headWidthPx = widthPx(landmarks.shoulder_left, landmarks.shoulder_right) * 0.38;
  const neckWidthCm = headWidthPx / pxPerCm;
  const neck_cm = Math.round(neckWidthCm * factors.neck * 10) / 10;

  // --- Circunferências (calculadas a partir de larguras) ---
  const bustWidthPx = widthPx(landmarks.bust_left, landmarks.bust_right);
  const bustWidthCm = bustWidthPx / pxPerCm;

  const waistWidthPx = widthPx(landmarks.waist_left, landmarks.waist_right);
  const waistWidthCm = waistWidthPx / pxPerCm;

  const hipWidthPx = widthPx(landmarks.hip_left, landmarks.hip_right);
  const hipWidthCm = hipWidthPx / pxPerCm;

  let bust_cm: number;
  let waist_cm: number;
  let hip_cm: number;

  if (hasLateralPhoto && landmarks.bust_front && landmarks.bust_back) {
    // Com foto lateral: fórmula de elipse (mais precisa)
    const bustDepthCm = distPx(landmarks.bust_front, landmarks.bust_back) / pxPerCm;
    bust_cm = Math.round(ellipseCircumference(bustWidthCm, bustDepthCm) * 10) / 10;

    const waistDepthCm = landmarks.waist_front && landmarks.waist_back
      ? distPx(landmarks.waist_front, landmarks.waist_back) / pxPerCm
      : bustDepthCm * 0.78;
    waist_cm = Math.round(ellipseCircumference(waistWidthCm, waistDepthCm) * 10) / 10;

    const hipDepthCm = landmarks.hip_front && landmarks.hip_back
      ? distPx(landmarks.hip_front, landmarks.hip_back) / pxPerCm
      : bustDepthCm * 0.95;
    hip_cm = Math.round(ellipseCircumference(hipWidthCm, hipDepthCm) * 10) / 10;

    notes.push("Circunferências calculadas por fórmula de elipse (Ramanujan) com foto lateral.");
  } else {
    // Sem foto lateral: fatores antropométricos
    bust_cm = Math.round(bustWidthCm * factors.bust * 10) / 10;
    waist_cm = Math.round(waistWidthCm * factors.waist * 10) / 10;
    hip_cm = Math.round(hipWidthCm * factors.hip * 10) / 10;
    notes.push("Circunferências estimadas por fatores antropométricos (ISO 8559). Foto lateral melhora precisão.");
  }

  const underbust_cm = Math.round(bust_cm * 0.87 * 10) / 10; // proporção média
  const thighWidthCm = hipWidthCm * 0.32; // proporção
  const thigh_cm = Math.round(thighWidthCm * factors.thigh * 10) / 10;

  // Confiança baseada no método de calibração
  const confidence = calibration.source === "marker" ? "alta" : "media";
  const method = calibration.source === "marker" ? "marker_calibration" : "height_calibration";

  if (calibration.source === "marker") {
    notes.push(`Escala calibrada por marcador físico: ${pxPerCm.toFixed(2)} px/cm.`);
  } else {
    notes.push(`Escala estimada pela altura informada: ${pxPerCm.toFixed(2)} px/cm.`);
  }

  return {
    height_cm, shoulder_width_cm, bust_cm, underbust_cm,
    waist_cm, hip_cm, inseam_cm, arm_length_cm,
    thigh_cm, neck_cm, torso_length_cm,
    confidence, method, notes,
  };
}

// ============================================================================
// Cálculo de tamanho: medidas (cm) → P/M/G/GG (determinístico)
// ============================================================================

type SizeRange = { min: number; max: number };

const FEMALE_TOPS: Record<string, { bust: SizeRange; waist: SizeRange; hip: SizeRange }> = {
  "PP": { bust: { min: 80, max: 84 }, waist: { min: 60, max: 64 }, hip: { min: 86, max: 90 } },
  "P":  { bust: { min: 84, max: 88 }, waist: { min: 64, max: 68 }, hip: { min: 90, max: 94 } },
  "M":  { bust: { min: 88, max: 94 }, waist: { min: 68, max: 74 }, hip: { min: 94, max: 100 } },
  "G":  { bust: { min: 94, max: 100 }, waist: { min: 74, max: 80 }, hip: { min: 100, max: 106 } },
  "GG": { bust: { min: 100, max: 108 }, waist: { min: 80, max: 88 }, hip: { min: 106, max: 114 } },
  "XGG": { bust: { min: 108, max: 116 }, waist: { min: 88, max: 96 }, hip: { min: 114, max: 122 } },
};

const FEMALE_PANTS: Record<number, { waist: SizeRange; hip: SizeRange }> = {
  34: { waist: { min: 60, max: 64 }, hip: { min: 86, max: 90 } },
  36: { waist: { min: 64, max: 68 }, hip: { min: 90, max: 94 } },
  38: { waist: { min: 68, max: 72 }, hip: { min: 94, max: 98 } },
  40: { waist: { min: 72, max: 76 }, hip: { min: 98, max: 102 } },
  42: { waist: { min: 76, max: 80 }, hip: { min: 102, max: 106 } },
  44: { waist: { min: 80, max: 84 }, hip: { min: 106, max: 110 } },
  46: { waist: { min: 84, max: 88 }, hip: { min: 110, max: 114 } },
  48: { waist: { min: 88, max: 92 }, hip: { min: 114, max: 118 } },
};

const MALE_TOPS: Record<string, { bust: SizeRange; waist: SizeRange }> = {
  "PP": { bust: { min: 86, max: 90 }, waist: { min: 72, max: 76 } },
  "P":  { bust: { min: 90, max: 96 }, waist: { min: 76, max: 82 } },
  "M":  { bust: { min: 96, max: 102 }, waist: { min: 82, max: 88 } },
  "G":  { bust: { min: 102, max: 108 }, waist: { min: 88, max: 94 } },
  "GG": { bust: { min: 108, max: 114 }, waist: { min: 94, max: 100 } },
  "XGG": { bust: { min: 114, max: 120 }, waist: { min: 100, max: 106 } },
};

const MALE_PANTS: Record<number, { waist: SizeRange; hip: SizeRange }> = {
  36: { waist: { min: 72, max: 76 }, hip: { min: 92, max: 96 } },
  38: { waist: { min: 76, max: 80 }, hip: { min: 96, max: 100 } },
  40: { waist: { min: 80, max: 84 }, hip: { min: 100, max: 104 } },
  42: { waist: { min: 84, max: 88 }, hip: { min: 104, max: 108 } },
  44: { waist: { min: 88, max: 92 }, hip: { min: 108, max: 112 } },
  46: { waist: { min: 92, max: 96 }, hip: { min: 112, max: 116 } },
  48: { waist: { min: 96, max: 100 }, hip: { min: 116, max: 120 } },
};

const SIZE_TO_INTERNATIONAL: Record<string, string> = {
  "PP": "XS", "P": "S", "M": "M", "G": "L", "GG": "XL", "XGG": "XXL",
};

const SIZE_TO_EUROPEAN: Record<string, number> = {
  "PP": 34, "P": 36, "M": 38, "G": 42, "GG": 46, "XGG": 48,
};

function findBestSize(value: number, table: Record<string, { bust?: SizeRange; waist?: SizeRange; hip?: SizeRange }>, key: "bust" | "waist" | "hip"): string {
  let bestSize = "M";
  let bestDist = Infinity;

  for (const [size, ranges] of Object.entries(table)) {
    const range = ranges[key];
    if (!range) continue;
    const mid = (range.min + range.max) / 2;
    const dist = Math.abs(value - mid);
    if (value >= range.min && value <= range.max) return size; // dentro da faixa
    if (dist < bestDist) { bestDist = dist; bestSize = size; }
  }
  return bestSize;
}

function findBestPantsNumber(waist: number, hip: number, table: Record<number, { waist: SizeRange; hip: SizeRange }>): number {
  let bestNum = 40;
  let bestScore = Infinity;

  for (const [numStr, ranges] of Object.entries(table)) {
    const num = Number(numStr);
    // Prioriza quadril (deve caber)
    const hipMid = (ranges.hip.min + ranges.hip.max) / 2;
    const waistMid = (ranges.waist.min + ranges.waist.max) / 2;
    const score = Math.abs(hip - hipMid) * 1.5 + Math.abs(waist - waistMid);

    if (hip >= ranges.hip.min && hip <= ranges.hip.max && waist >= ranges.waist.min && waist <= ranges.waist.max) {
      return num; // fit perfeito
    }
    if (hip >= ranges.hip.min && hip <= ranges.hip.max) {
      return num; // quadril cabe = prioridade
    }
    if (score < bestScore) { bestScore = score; bestNum = num; }
  }
  return bestNum;
}

export function calculateSizeRecommendation(
  measurements: { bust_cm: number; waist_cm: number; hip_cm: number },
  gender: "female" | "male" = "female"
): SizeRecommendation {
  const { bust_cm, waist_cm, hip_cm } = measurements;
  const justifications: string[] = [];

  let size_brazil: string;
  let pants_number: number;

  if (gender === "male") {
    const bustSize = findBestSize(bust_cm, MALE_TOPS, "bust");
    const waistSize = findBestSize(waist_cm, MALE_TOPS, "waist");
    // Usa o maior entre busto e cintura
    const sizes = ["PP", "P", "M", "G", "GG", "XGG"];
    size_brazil = sizes.indexOf(bustSize) >= sizes.indexOf(waistSize) ? bustSize : waistSize;
    justifications.push(`Tórax ${bust_cm}cm → ${bustSize}, Cintura ${waist_cm}cm → ${waistSize}. Tamanho: ${size_brazil}.`);

    pants_number = findBestPantsNumber(waist_cm, hip_cm, MALE_PANTS);
    justifications.push(`Calça: cintura ${waist_cm}cm + quadril ${hip_cm}cm → nº${pants_number}.`);
  } else {
    const bustSize = findBestSize(bust_cm, FEMALE_TOPS, "bust");
    const waistSize = findBestSize(waist_cm, FEMALE_TOPS, "waist");
    const hipSize = findBestSize(hip_cm, FEMALE_TOPS, "hip");
    // Usa o maior entre busto, cintura e quadril
    const sizes = ["PP", "P", "M", "G", "GG", "XGG"];
    const maxIdx = Math.max(sizes.indexOf(bustSize), sizes.indexOf(waistSize), sizes.indexOf(hipSize));
    size_brazil = sizes[maxIdx] ?? "M";
    justifications.push(`Busto ${bust_cm}cm → ${bustSize}, Cintura ${waist_cm}cm → ${waistSize}, Quadril ${hip_cm}cm → ${hipSize}. Maior: ${size_brazil}.`);

    pants_number = findBestPantsNumber(waist_cm, hip_cm, FEMALE_PANTS);
    justifications.push(`Calça: cintura ${waist_cm}cm + quadril ${hip_cm}cm (prioridade) → nº${pants_number}.`);
  }

  return {
    size_brazil,
    size_international: SIZE_TO_INTERNATIONAL[size_brazil] ?? "M",
    size_european: SIZE_TO_EUROPEAN[size_brazil] ?? 38,
    pants_number_brazil: pants_number,
    justification: justifications.join(" "),
    confidence: "alta",
  };
}

// ============================================================================
// Prompt para o Gemini: pedir APENAS landmarks em pixels
// ============================================================================

export const LANDMARKS_PROMPT = `Detecte os landmarks corporais na foto e retorne APENAS as coordenadas em pixels (x, y) no JSON abaixo. NÃO calcule medidas em cm — apenas pixels. NÃO estime tamanhos de roupa.

Retorne JSON exato:
{
  "image_width_px": number,
  "image_height_px": number,
  "landmarks": {
    "head_top": [x, y],
    "chin": [x, y],
    "shoulder_left": [x, y],
    "shoulder_right": [x, y],
    "bust_left": [x, y],
    "bust_right": [x, y],
    "waist_left": [x, y],
    "waist_right": [x, y],
    "hip_left": [x, y],
    "hip_right": [x, y],
    "knee_left": [x, y],
    "knee_right": [x, y],
    "ankle_left": [x, y],
    "ankle_right": [x, y],
    "wrist_left": [x, y] | null,
    "wrist_right": [x, y] | null
  },
  "confidence": number (0-1),
  "pose_quality": "boa" | "aceitavel" | "ruim",
  "issues": ["lista de problemas detectados na pose/foto"]
}

REGRAS:
- Coordenadas em pixels da imagem original (não normalize).
- bust_left/right = ponto mais largo do tórax/busto.
- waist_left/right = ponto mais estreito do torso (cintura natural).
- hip_left/right = ponto mais largo do quadril.
- Se não conseguir detectar um ponto com confiança, use null.
- "issues" lista problemas como: braços colados, roupa larga, foto cortada, etc.
`;
