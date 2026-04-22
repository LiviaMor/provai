// Utilitário de cálculo de tamanho recomendado para a wishlist.
// Inferimos a "categoria" (top, bottom, dress, outerwear) pelo nome/notas do produto
// e cruzamos com as medidas mais recentes do usuário para sugerir tamanho de letra,
// numérico, ajuste de barra, punho e folga em circunferências-chave.

export type UserMeasurements = {
  height_cm?: number;
  estimated_weight_kg?: number;
  bust_cm?: number;
  underbust_cm?: number;
  waist_cm?: number;
  hip_cm?: number;
  inseam_cm?: number;
  outseam_cm?: number;
  arm_length_cm?: number;
  shoulder_width_cm?: number;
  neck_cm?: number;
  thigh_cm?: number;
  torso_length_cm?: number;
};

export type GarmentCategory = "top" | "bottom" | "dress" | "outerwear" | "unknown";

const KEYWORDS: Record<Exclude<GarmentCategory, "unknown">, string[]> = {
  top: ["blusa", "camisa", "camiseta", "t-shirt", "tshirt", "regata", "top", "body", "polo", "tricot", "cropped", "suéter", "sueter", "moletom", "cardigan"],
  bottom: ["calça", "calca", "jeans", "short", "bermuda", "saia", "legging", "alfaiataria", "pantalona"],
  dress: ["vestido", "macacão", "macacao", "jumpsuit", "macaquinho"],
  outerwear: ["blazer", "casaco", "jaqueta", "trench", "sobretudo", "parka", "colete"],
};

export function detectCategory(text: string): GarmentCategory {
  const t = text.toLowerCase();
  for (const [cat, words] of Object.entries(KEYWORDS) as [Exclude<GarmentCategory, "unknown">, string[]][]) {
    if (words.some((w) => t.includes(w))) return cat;
  }
  return "unknown";
}

// Tabelas BR femininas aproximadas (cm). Cada faixa é [min, max].
const TOP_TABLE: { letter: string; numeric: string; bust: [number, number]; waist: [number, number] }[] = [
  { letter: "PP", numeric: "36", bust: [78, 84], waist: [60, 66] },
  { letter: "P",  numeric: "38", bust: [84, 88], waist: [66, 70] },
  { letter: "M",  numeric: "40", bust: [88, 92], waist: [70, 74] },
  { letter: "M",  numeric: "42", bust: [92, 96], waist: [74, 78] },
  { letter: "G",  numeric: "44", bust: [96, 100], waist: [78, 82] },
  { letter: "G",  numeric: "46", bust: [100, 104], waist: [82, 86] },
  { letter: "GG", numeric: "48", bust: [104, 110], waist: [86, 92] },
  { letter: "XGG", numeric: "50", bust: [110, 116], waist: [92, 98] },
];

const BOTTOM_TABLE: { letter: string; numeric: string; waist: [number, number]; hip: [number, number] }[] = [
  { letter: "PP", numeric: "36", waist: [60, 66], hip: [86, 90] },
  { letter: "P",  numeric: "38", waist: [66, 70], hip: [90, 94] },
  { letter: "M",  numeric: "40", waist: [70, 74], hip: [94, 98] },
  { letter: "M",  numeric: "42", waist: [74, 78], hip: [98, 102] },
  { letter: "G",  numeric: "44", waist: [78, 82], hip: [102, 106] },
  { letter: "G",  numeric: "46", waist: [82, 86], hip: [106, 110] },
  { letter: "GG", numeric: "48", waist: [86, 92], hip: [110, 116] },
  { letter: "XGG", numeric: "50", waist: [92, 98], hip: [116, 122] },
];

function pickByRange<T extends { bust?: [number, number]; waist?: [number, number]; hip?: [number, number] }>(
  table: T[],
  values: { bust?: number; waist?: number; hip?: number },
): T | null {
  // Estratégia: escolhe a maior linha cuja faixa **inclui** a maior medida-chave;
  // se nenhuma linha cobrir, pega a mais próxima (acima).
  const keys = (Object.keys(values) as ("bust" | "waist" | "hip")[]).filter((k) => Number.isFinite(values[k]));
  if (!keys.length) return null;

  // Prioriza a maior medida do usuário (evita aperto)
  let chosen: T | null = null;
  for (const row of table) {
    const fits = keys.every((k) => {
      const v = values[k]!;
      const range = (row as Record<string, [number, number] | undefined>)[k];
      if (!range) return true;
      return v >= range[0] && v <= range[1];
    });
    if (fits) { chosen = row; break; }
  }
  if (chosen) return chosen;

  // Fallback: encontra primeira linha cujo limite superior cubra a maior medida
  for (const row of table) {
    const ok = keys.every((k) => {
      const v = values[k]!;
      const range = (row as Record<string, [number, number] | undefined>)[k];
      return !range || v <= range[1];
    });
    if (ok) return row;
  }
  return table[table.length - 1] ?? null;
}

export type SizeSuggestion = {
  category: GarmentCategory;
  letter?: string;
  numeric?: string;
  hemAdjustCm?: number; // ajuste na barra (positivo = encurtar)
  cuffAdjustCm?: number; // ajuste no punho/manga
  fitNotes: string[]; // observações de circunferência (ex.: "Quadril +3cm de folga")
  confidence: "alta" | "média" | "baixa";
};

// Preferência de altura da barra (calça/vestido). Valores em cm a "encurtar"
// em relação ao comprimento padrão da peça (positivo = mais curto que o padrão).
export type HemPreference = "ankle" | "seven_eighths" | "cropped" | "floor" | "midi" | "knee";

export const HEM_PREFERENCE_LABELS: Record<HemPreference, string> = {
  floor: "Até o chão",
  ankle: "Tornozelo",
  seven_eighths: "7/8",
  cropped: "Cropped / curta",
  midi: "Midi (vestidos)",
  knee: "Joelho (vestidos)",
};

// Quanto encurtar (cm) a partir do comprimento padrão para cada preferência.
const HEM_OFFSET_BOTTOM: Record<HemPreference, number> = {
  floor: -2,        // 2 cm além do tornozelo
  ankle: 0,         // referência
  seven_eighths: 6, // ~6 cm acima do tornozelo
  cropped: 12,
  midi: 0,
  knee: 0,
};

const HEM_OFFSET_DRESS: Record<HemPreference, number> = {
  floor: -10,
  ankle: -2,
  seven_eighths: 5,
  cropped: 30,
  midi: 15,         // joelho-canela
  knee: 30,
};

// Opções aplicáveis por categoria de peça. Calças não usam "midi"/"knee"
// (típicos de vestidos) e vestidos não usam "seven_eighths"/"cropped"/"ankle"
// (referências de barra de calça).
export const HEM_OPTIONS_BY_CATEGORY: Record<"bottom" | "dress", HemPreference[]> = {
  bottom: ["floor", "ankle", "seven_eighths", "cropped"],
  dress: ["floor", "midi", "knee", "cropped"],
};

// Resolve a preferência efetiva para uma categoria; cai num default sensato
// quando a escolha do usuário não se aplica àquela peça.
export function resolveHemPreference(
  category: GarmentCategory,
  pref: HemPreference,
): HemPreference {
  if (category === "bottom") {
    return HEM_OPTIONS_BY_CATEGORY.bottom.includes(pref) ? pref : "ankle";
  }
  if (category === "dress") {
    return HEM_OPTIONS_BY_CATEGORY.dress.includes(pref) ? pref : "midi";
  }
  return pref;
}

const HEIGHT_REF_BOTTOM = 168; // referência de altura para inseam padrão
const HEIGHT_REF_TOP = 168; // ref para comprimento de manga

export function suggestSize(
  productText: string,
  m: UserMeasurements,
  hemPref: HemPreference = "ankle",
): SizeSuggestion | null {
  const category = detectCategory(productText);
  if (category === "unknown") return null;
  const effectivePref = resolveHemPreference(category, hemPref);
  const fitNotes: string[] = [];

  if (category === "top" || category === "outerwear") {
    const row = pickByRange(TOP_TABLE, { bust: m.bust_cm, waist: m.waist_cm });
    if (!row) return null;
    if (m.bust_cm) {
      const center = (row.bust[0] + row.bust[1]) / 2;
      const diff = m.bust_cm - center;
      fitNotes.push(`Busto: ${diff >= 0 ? "+" : ""}${diff.toFixed(1)}cm vs. centro do tamanho`);
    }
    if (m.waist_cm && row.waist) {
      const center = (row.waist[0] + row.waist[1]) / 2;
      fitNotes.push(`Cintura: ${m.waist_cm > center ? "+" : ""}${(m.waist_cm - center).toFixed(1)}cm`);
    }
    let cuffAdjust: number | undefined;
    if (m.arm_length_cm) {
      const expected = 58 + (((m.height_cm ?? HEIGHT_REF_TOP) - HEIGHT_REF_TOP) * 0.12);
      cuffAdjust = +(expected - m.arm_length_cm).toFixed(1);
      if (Math.abs(cuffAdjust) >= 1) {
        fitNotes.push(cuffAdjust > 0 ? `Manga: encurtar ${cuffAdjust}cm no punho` : `Manga: alongar ${Math.abs(cuffAdjust)}cm`);
      }
    }
    return {
      category,
      letter: row.letter,
      numeric: row.numeric,
      cuffAdjustCm: cuffAdjust,
      fitNotes,
      confidence: m.bust_cm && m.waist_cm ? "alta" : m.bust_cm ? "média" : "baixa",
    };
  }

  if (category === "bottom") {
    const row = pickByRange(BOTTOM_TABLE, { waist: m.waist_cm, hip: m.hip_cm });
    if (!row) return null;
    if (m.waist_cm) {
      const center = (row.waist[0] + row.waist[1]) / 2;
      fitNotes.push(`Cintura: ${m.waist_cm > center ? "+" : ""}${(m.waist_cm - center).toFixed(1)}cm vs. centro`);
    }
    if (m.hip_cm) {
      const center = (row.hip[0] + row.hip[1]) / 2;
      fitNotes.push(`Quadril: ${m.hip_cm > center ? "+" : ""}${(m.hip_cm - center).toFixed(1)}cm`);
    }
    if (m.thigh_cm) fitNotes.push(`Coxa: ${m.thigh_cm}cm — confira modelagem`);
    let hemAdjust: number | undefined;
    if (m.inseam_cm) {
      const expected = 76 + (((m.height_cm ?? HEIGHT_REF_BOTTOM) - HEIGHT_REF_BOTTOM) * 0.45);
      const baseAdjust = expected - m.inseam_cm;
      hemAdjust = +(baseAdjust + HEM_OFFSET_BOTTOM[effectivePref]).toFixed(1);
      const prefLabel = HEM_PREFERENCE_LABELS[effectivePref].toLowerCase();
      if (Math.abs(hemAdjust) >= 1) {
        fitNotes.push(hemAdjust > 0 ? `Barra (${prefLabel}): encurtar ${hemAdjust}cm` : `Barra (${prefLabel}): alongar ${Math.abs(hemAdjust)}cm`);
      } else {
        fitNotes.push(`Barra (${prefLabel}): no ponto`);
      }
    }
    return {
      category,
      letter: row.letter,
      numeric: row.numeric,
      hemAdjustCm: hemAdjust,
      fitNotes,
      confidence: m.waist_cm && m.hip_cm ? "alta" : "média",
    };
  }

  if (category === "dress") {
    const row = pickByRange(TOP_TABLE, { bust: m.bust_cm, waist: m.waist_cm });
    if (!row) return null;
    // No vestido, considere também o quadril
    if (m.hip_cm && m.bust_cm && m.hip_cm - m.bust_cm > 8) {
      fitNotes.push(`Quadril ${(m.hip_cm - m.bust_cm).toFixed(0)}cm maior que o busto — considere subir 1 tamanho na saia`);
    }
    if (m.bust_cm) {
      const center = (row.bust[0] + row.bust[1]) / 2;
      fitNotes.push(`Busto: ${m.bust_cm > center ? "+" : ""}${(m.bust_cm - center).toFixed(1)}cm`);
    }
    let hemAdjust: number | undefined;
    if (m.height_cm) {
      const baseAdjust = (m.height_cm - HEIGHT_REF_BOTTOM) * 0.5; // positivo = peça curta vs. usuária alta
      // Para vestidos, offset positivo significa "encurtar" — invertemos sinal para manter convenção
      hemAdjust = +(-baseAdjust + HEM_OFFSET_DRESS[hemPref]).toFixed(1);
      const prefLabel = HEM_PREFERENCE_LABELS[hemPref].toLowerCase();
      if (Math.abs(hemAdjust) >= 1) {
        fitNotes.push(hemAdjust > 0 ? `Barra (${prefLabel}): encurtar ${hemAdjust}cm` : `Barra (${prefLabel}): alongar ${Math.abs(hemAdjust)}cm`);
      } else {
        fitNotes.push(`Barra (${prefLabel}): no ponto`);
      }
    }
    return {
      category,
      letter: row.letter,
      numeric: row.numeric,
      hemAdjustCm: hemAdjust,
      fitNotes,
      confidence: m.bust_cm && m.hip_cm ? "alta" : "média",
    };
  }

  return null;
}

export function categoryLabel(c: GarmentCategory): string {
  switch (c) {
    case "top": return "Parte de cima";
    case "bottom": return "Parte de baixo";
    case "dress": return "Vestido / macacão";
    case "outerwear": return "Sobreposição";
    default: return "Peça";
  }
}
