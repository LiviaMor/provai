// ============================================================================
// Proporções Corporais Antropométricas — Escala Vertical Invertida
// Fonte: Tabelas de modelagem industrial brasileira (proporções realistas)
// Referência do chão (0%) até o topo da cabeça (100%)
//
// Estas proporções são usadas para:
// 1. Validar landmarks detectados pelo Gemini (estão na posição esperada?)
// 2. Estimar posição de landmarks não detectados
// 3. Calcular medidas quando apenas a altura é conhecida
// 4. Cross-check de acurácia (landmark detectado vs proporção esperada)
// ============================================================================

/**
 * Proporções femininas — escala vertical (% da altura total, do chão para cima)
 * Baseado no modelo REALISTA (proporções reais, não estilizadas)
 * Altura de referência: 158cm
 */
export const FEMALE_PROPORTIONS = {
  // Pontos de referência verticais (% da altura, do chão para cima)
  head_top: 1.0,           // 100% — topo da cabeça
  thorax_top: 0.875,       // 87.5% — base do pescoço / topo do tórax
  nipple_line: 0.72,       // 72% — linha dos mamilos (busto)
  waist: 0.57,             // 57% — cintura natural (ponto mais estreito)
  hip: 0.45,               // 45% — quadril (ponto mais largo)
  knee: 0.25,              // 25% — centro da rótula
  feet: 0.0,               // 0% — chão

  // Medidas em cm para altura de referência 158cm
  reference_height_cm: 158,
  reference_thorax_cm: 138.3,
  reference_nipple_cm: 113.8,
  reference_waist_cm: 90.1,
  reference_hip_cm: 71.1,
  reference_knee_cm: 39.5,

  // Proporções de largura (relativas entre si)
  shoulder_to_hip_ratio: 1.0,  // ombros ≈ largura do quadril em mulheres
  waist_to_hip_ratio: 0.75,   // cintura ≈ 75% da largura do quadril
  bust_to_hip_ratio: 0.95,    // busto ≈ 95% da largura do quadril
} as const;

/**
 * Proporções masculinas — escala vertical (% da altura total, do chão para cima)
 * Baseado no modelo REALISTA
 * Altura de referência: 158cm (escala, ajustar proporcionalmente)
 */
export const MALE_PROPORTIONS = {
  // Pontos de referência verticais (% da altura, do chão para cima)
  head_top: 1.0,           // 100% — topo da cabeça
  thorax_top: 0.90,        // 90% — base do pescoço / topo do tórax
  nipple_line: 0.78,       // 78% — linha dos mamilos (peitoral)
  waist: 0.60,             // 60% — cintura natural
  hip: 0.48,               // 48% — quadril (ponto mais largo)
  knee: 0.26,              // 26% — centro da rótula
  feet: 0.0,               // 0% — chão

  // Medidas em cm para altura de referência 158cm
  reference_height_cm: 158,
  reference_thorax_cm: 142.2,
  reference_nipple_cm: 123.2,
  reference_waist_cm: 94.8,
  reference_hip_cm: 75.8,
  reference_knee_cm: 41.1,

  // Proporções de largura (relativas entre si)
  shoulder_to_hip_ratio: 1.35, // ombros ≈ 1.3-1.5x a largura do quadril
  waist_to_hip_ratio: 0.90,   // cintura levemente mais estreita que quadril
  bust_to_hip_ratio: 1.10,    // tórax mais largo que quadril
} as const;

export type ProportionSet = typeof FEMALE_PROPORTIONS | typeof MALE_PROPORTIONS;

/**
 * Retorna as proporções corretas baseado no gênero.
 */
export function getProportions(gender: "female" | "male"): ProportionSet {
  return gender === "male" ? MALE_PROPORTIONS : FEMALE_PROPORTIONS;
}

/**
 * Dado a altura total em pixels (head_top a feet), calcula a posição Y esperada
 * de cada landmark baseado nas proporções antropométricas.
 * Retorna coordenadas Y em pixels (do topo da imagem para baixo).
 */
export function expectedLandmarkPositions(
  headTopY: number,
  feetY: number,
  gender: "female" | "male"
): Record<string, number> {
  const props = getProportions(gender);
  const totalHeight = feetY - headTopY; // pixels do topo ao chão

  // Converter % (do chão para cima) em Y pixels (do topo para baixo)
  const fromBottom = (pct: number) => headTopY + totalHeight * (1 - pct);

  return {
    head_top: headTopY,
    thorax_top: fromBottom(props.thorax_top),
    bust_line: fromBottom(props.nipple_line),
    waist: fromBottom(props.waist),
    hip: fromBottom(props.hip),
    knee: fromBottom(props.knee),
    feet: feetY,
  };
}

/**
 * Valida se os landmarks detectados pelo Gemini estão dentro da tolerância
 * esperada pelas proporções antropométricas.
 * Retorna um score de 0-100 e lista de landmarks fora de posição.
 */
export function validateLandmarkPositions(
  landmarks: {
    head_top: [number, number];
    bust_left?: [number, number];
    bust_right?: [number, number];
    waist_left?: [number, number];
    waist_right?: [number, number];
    hip_left?: [number, number];
    hip_right?: [number, number];
    knee_left?: [number, number];
    knee_right?: [number, number];
    ankle_left?: [number, number];
    ankle_right?: [number, number];
  },
  gender: "female" | "male",
  tolerancePct: number = 0.05 // 5% de tolerância
): { score: number; issues: string[] } {
  const headY = landmarks.head_top[1];
  const feetY = Math.max(
    landmarks.ankle_left?.[1] ?? 0,
    landmarks.ankle_right?.[1] ?? 0
  );

  if (feetY <= headY) return { score: 0, issues: ["Não foi possível determinar altura total"] };

  const expected = expectedLandmarkPositions(headY, feetY, gender);
  const totalHeight = feetY - headY;
  const tolerance = totalHeight * tolerancePct;
  const issues: string[] = [];
  let correct = 0;
  let total = 0;

  const check = (name: string, actualY: number | undefined, expectedY: number) => {
    if (actualY === undefined) return;
    total++;
    const diff = Math.abs(actualY - expectedY);
    if (diff <= tolerance) {
      correct++;
    } else {
      const diffPct = Math.round((diff / totalHeight) * 100);
      issues.push(`${name}: desvio de ${diffPct}% (esperado ~${Math.round(expectedY)}px, detectado ${Math.round(actualY)}px)`);
    }
  };

  const bustY = landmarks.bust_left && landmarks.bust_right
    ? (landmarks.bust_left[1] + landmarks.bust_right[1]) / 2
    : undefined;
  const waistY = landmarks.waist_left && landmarks.waist_right
    ? (landmarks.waist_left[1] + landmarks.waist_right[1]) / 2
    : undefined;
  const hipY = landmarks.hip_left && landmarks.hip_right
    ? (landmarks.hip_left[1] + landmarks.hip_right[1]) / 2
    : undefined;
  const kneeY = landmarks.knee_left && landmarks.knee_right
    ? (landmarks.knee_left[1] + landmarks.knee_right[1]) / 2
    : undefined;

  check("Busto", bustY, expected.bust_line);
  check("Cintura", waistY, expected.waist);
  check("Quadril", hipY, expected.hip);
  check("Joelho", kneeY, expected.knee);

  const score = total > 0 ? Math.round((correct / total) * 100) : 50;
  return { score, issues };
}

/**
 * Estima a posição de um landmark não detectado usando proporções.
 * Útil quando o Gemini não consegue detectar um ponto específico.
 */
export function estimateMissingLandmark(
  headTopY: number,
  feetY: number,
  landmark: "bust" | "waist" | "hip" | "knee",
  gender: "female" | "male",
  imageWidth: number
): [number, number] {
  const expected = expectedLandmarkPositions(headTopY, feetY, gender);
  const centerX = imageWidth / 2;

  switch (landmark) {
    case "bust": return [centerX, expected.bust_line];
    case "waist": return [centerX, expected.waist];
    case "hip": return [centerX, expected.hip];
    case "knee": return [centerX, expected.knee];
  }
}

/**
 * Calcula medidas estimadas apenas pela altura (sem foto).
 * Usa as proporções antropométricas para estimar circunferências médias.
 * Precisão: ±8-12% (muito menos preciso que foto, mas útil como fallback).
 */
export function estimateMeasurementsFromHeight(
  heightCm: number,
  gender: "female" | "male",
  weightKg?: number
): {
  bust_cm: number;
  waist_cm: number;
  hip_cm: number;
  inseam_cm: number;
  shoulder_width_cm: number;
  neck_cm: number;
  confidence: "baixa";
  method: "proportional";
} {
  // Proporções médias populacionais brasileiras
  // Fonte: IBGE + estudos antropométricos
  if (gender === "female") {
    const bmi = weightKg ? weightKg / ((heightCm / 100) ** 2) : 22;
    const bmiAdjust = (bmi - 22) * 0.8; // ajuste por IMC

    return {
      bust_cm: Math.round((heightCm * 0.52 + bmiAdjust * 1.2) * 10) / 10,
      waist_cm: Math.round((heightCm * 0.42 + bmiAdjust * 1.5) * 10) / 10,
      hip_cm: Math.round((heightCm * 0.56 + bmiAdjust * 1.3) * 10) / 10,
      inseam_cm: Math.round(heightCm * 0.455 * 10) / 10,
      shoulder_width_cm: Math.round(heightCm * 0.24 * 10) / 10,
      neck_cm: Math.round(heightCm * 0.21 * 10) / 10,
      confidence: "baixa",
      method: "proportional",
    };
  } else {
    const bmi = weightKg ? weightKg / ((heightCm / 100) ** 2) : 24;
    const bmiAdjust = (bmi - 24) * 0.9;

    return {
      bust_cm: Math.round((heightCm * 0.56 + bmiAdjust * 1.1) * 10) / 10,
      waist_cm: Math.round((heightCm * 0.46 + bmiAdjust * 1.6) * 10) / 10,
      hip_cm: Math.round((heightCm * 0.52 + bmiAdjust * 1.2) * 10) / 10,
      inseam_cm: Math.round(heightCm * 0.45 * 10) / 10,
      shoulder_width_cm: Math.round(heightCm * 0.27 * 10) / 10,
      neck_cm: Math.round(heightCm * 0.23 * 10) / 10,
      confidence: "baixa",
      method: "proportional",
    };
  }
}
