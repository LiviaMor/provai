export type ColorChip = { name: string; hex: string; why?: string };

export type ColorAnalysis = {
  season: string;
  season_modifier?: string;
  season_subtitle?: string;
  season_description?: string;
  characteristics: Record<string, { value: string; note?: string }>;
  skin_tone_hex?: string;
  eye_color_hex?: string;
  hair_color_hex?: string;
  best_palette: ColorChip[];
  face_comparison: { valorizam: ColorChip[]; apagam: ColorChip[] };
  neutrals: ColorChip[];
  avoid: ColorChip[];
  hair: { best: ColorChip[]; avoid: ColorChip[] };
  makeup: {
    base: string;
    blush: ColorChip[];
    lipstick: ColorChip[];
    highlighter: string;
    eyeshadow: ColorChip[];
  };
  metals: string[];
  metals_avoid?: string[];
  prints?: string;
  golden_tips: string[];
  final_quote?: string;
  confidence?: string;
};

export type ColorSession = {
  images: string[]; // data URLs
  primaryImage: string;
  analysis: ColorAnalysis;
};
