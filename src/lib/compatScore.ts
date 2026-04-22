// Cálculo de score de compatibilidade (0-100) entre uma loja/produto favorito
// e a estação dominante do usuário, considerando múltiplos fatores:
// 1) Estação informada (família, ex.: "Outono" em "Outono Profundo")
// 2) Modificador exato (ex.: "Profundo")
// 3) Tags conhecidas (cores quentes/frias, contraste, intensidade)
// 4) Cores citadas no nome/notas vs. paleta da estação

export type ScoreInput = {
  itemSeasons: string[]; // estações marcadas no item (loja: array; produto: 1)
  itemTags?: string[];
  itemText?: string; // nome + notas concatenados
  dominantSeason: string | null;
  paletteHints?: string[]; // nomes de cores da paleta da estação dominante (ex.: "terracota")
};

export type ScoreResult = {
  score: number; // 0-100
  level: "alta" | "média" | "baixa" | "neutra";
  reasons: { label: string; positive: boolean; weight: number }[];
};

// Palavras associadas a cada família sazonal — heurística leve em pt-BR
const SEASON_FAMILIES: Record<string, { related: string[]; tags: string[] }> = {
  outono: {
    related: ["quente", "terroso", "terracota", "mostarda", "ferrugem", "caramelo", "oliva", "marrom", "cobre", "âmbar", "ambar"],
    tags: ["quente", "terra", "rústico", "alfaiataria"],
  },
  primavera: {
    related: ["quente", "vibrante", "claro", "coral", "pêssego", "pessego", "amarelo", "turquesa"],
    tags: ["quente", "vibrante", "leve"],
  },
  verão: {
    related: ["frio", "suave", "lavanda", "rosê", "rose", "azul", "menta", "pastel"],
    tags: ["frio", "suave", "leve"],
  },
  verao: {
    related: ["frio", "suave", "lavanda", "rosê", "rose", "azul", "menta", "pastel"],
    tags: ["frio", "suave", "leve"],
  },
  inverno: {
    related: ["frio", "contrastado", "vibrante", "preto", "branco", "fúcsia", "fucsia", "esmeralda", "safira"],
    tags: ["frio", "contraste", "marcante"],
  },
};

const tokens = (s: string) => s.toLowerCase().split(/[\s\-,/]+/).filter(Boolean);

export function calcCompatScore({
  itemSeasons, itemTags = [], itemText = "", dominantSeason, paletteHints = [],
}: ScoreInput): ScoreResult {
  if (!dominantSeason) {
    return { score: 50, level: "neutra", reasons: [{ label: "Sem estação dominante registrada", positive: false, weight: 0 }] };
  }

  const reasons: ScoreResult["reasons"] = [];
  let score = 0;
  const max = 100;

  const dTokens = tokens(dominantSeason); // ex.: ["outono","profundo"]
  const family = dTokens[0] ?? "";
  const modifier = dTokens.slice(1).join(" ");
  const familyConfig = SEASON_FAMILIES[family];

  const itemSeasonsLower = itemSeasons.filter(Boolean).map((s) => s.toLowerCase());
  const itemTagsLower = itemTags.filter(Boolean).map((t) => t.toLowerCase());
  const text = itemText.toLowerCase();

  // 1) Match de estação
  const exactMatch = itemSeasonsLower.some((s) => s === dominantSeason.toLowerCase());
  const familyMatch = itemSeasonsLower.some((s) => family && s.includes(family));
  const modifierMatch = modifier && itemSeasonsLower.some((s) => s.includes(modifier));

  if (exactMatch) {
    score += 60;
    reasons.push({ label: `Estação exata: ${dominantSeason}`, positive: true, weight: 60 });
  } else if (familyMatch && modifierMatch) {
    score += 50;
    reasons.push({ label: `Família + modificador (${family} + ${modifier})`, positive: true, weight: 50 });
  } else if (familyMatch) {
    score += 35;
    reasons.push({ label: `Mesma família sazonal (${family})`, positive: true, weight: 35 });
  } else if (itemSeasonsLower.length === 0) {
    reasons.push({ label: "Sem estação marcada no item", positive: false, weight: 0 });
  } else {
    score -= 15;
    reasons.push({ label: `Estação diferente (${itemSeasonsLower.join(", ")})`, positive: false, weight: -15 });
  }

  // 2) Tags da família sazonal
  if (familyConfig) {
    const matchedTags = familyConfig.tags.filter((t) => itemTagsLower.some((it) => it.includes(t)));
    if (matchedTags.length) {
      const w = Math.min(20, matchedTags.length * 8);
      score += w;
      reasons.push({ label: `Tags afins: ${matchedTags.join(", ")}`, positive: true, weight: w });
    }
  }

  // 3) Cores relacionadas no texto (nome/notas) — sinaliza paleta correta
  if (familyConfig) {
    const matchedColors = familyConfig.related.filter((c) => text.includes(c));
    if (matchedColors.length) {
      const w = Math.min(15, matchedColors.length * 5);
      score += w;
      reasons.push({ label: `Cores típicas: ${matchedColors.slice(0, 3).join(", ")}`, positive: true, weight: w });
    }
  }

  // 4) Paleta personalizada do usuário (nomes vindos da última análise)
  if (paletteHints.length) {
    const matchedPalette = paletteHints
      .map((c) => c.toLowerCase())
      .filter((c) => c.length > 2 && text.includes(c));
    if (matchedPalette.length) {
      const w = Math.min(20, matchedPalette.length * 7);
      score += w;
      reasons.push({ label: `Cores da sua paleta: ${matchedPalette.slice(0, 3).join(", ")}`, positive: true, weight: w });
    }
  }

  // Normalização
  score = Math.max(0, Math.min(max, score));
  const level: ScoreResult["level"] =
    score >= 75 ? "alta" : score >= 50 ? "média" : score >= 25 ? "baixa" : "neutra";

  return { score: Math.round(score), level, reasons };
}

export function scoreColorClass(level: ScoreResult["level"]): string {
  switch (level) {
    case "alta": return "bg-accent text-accent-foreground border-accent";
    case "média": return "bg-primary/15 text-primary border-primary/30";
    case "baixa": return "bg-muted text-muted-foreground border-border";
    default: return "bg-muted/60 text-muted-foreground border-border";
  }
}
