import { ColorAnalysis } from "@/types/colorAnalysis";

export const examplePhoto =
  "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=900&q=80";

export const exampleAnalysis: ColorAnalysis = {
  season: "Outono Profundo",
  season_modifier: "Neutro",
  season_subtitle: "Profundidade dourada com calor de terras quentes.",
  season_description:
    "Seu subtom oscila entre dourado e oliva, com profundidade alta e contraste médio-alto. Cores quentes, profundas e levemente suavizadas trazem harmonia e iluminam seu rosto sem sobrecarregar.",
  characteristics: {
    depth: { value: "Alta" },
    contrast: { value: "Médio-Alto" },
    undertone: { value: "Quente Neutro", note: "dourado/oliva" },
    temperature: { value: "Quente" },
    intensity: { value: "Profunda" },
    luminosity: { value: "Média" },
    harmony: { value: "Cores quentes e profundas", note: "equilíbrio e elegância" },
  },
  skin_tone_hex: "#C9A07B",
  eye_color_hex: "#5A3A22",
  hair_color_hex: "#7A4A2A",
  best_palette: [
    { name: "Verde Musgo", hex: "#556B2F" },
    { name: "Verde Oliva", hex: "#6B7A3A" },
    { name: "Verde Petróleo", hex: "#1F4E47" },
    { name: "Azul Profundo", hex: "#1F3A5F" },
    { name: "Azul Marinho", hex: "#15243F" },
    { name: "Terracota", hex: "#B5532A" },
    { name: "Telha", hex: "#9C3D24" },
    { name: "Mostarda Queimada", hex: "#C68A1E" },
    { name: "Chocolate", hex: "#3B2415" },
    { name: "Café", hex: "#523226" },
    { name: "Cobre", hex: "#B36A3A" },
    { name: "Bordô", hex: "#5A1F22" },
  ],
  face_comparison: {
    valorizam: [
      { name: "Verde Musgo", hex: "#556B2F", why: "Harmoniza com o subtom e ilumina o rosto." },
      { name: "Azul Petróleo", hex: "#1F4E47", why: "Profundidade que valoriza o brilho natural." },
      { name: "Terracota", hex: "#B5532A", why: "Aquece o rosto e destaca o subtom dourado." },
      { name: "Mostarda", hex: "#C68A1E", why: "Traz luz e profundidade simultaneamente." },
      { name: "Marinho", hex: "#15243F", why: "Elegância segura sem pesar." },
    ],
    apagam: [
      { name: "Rosa Bebê", hex: "#F4C2C2", why: "Apaga o brilho e deixa a pele acinzentada." },
      { name: "Azul Gelo", hex: "#D6E6F2", why: "Frio demais, endurece o rosto." },
      { name: "Cinza Claro", hex: "#D9D9D9", why: "Suaviza em excesso, retira definição." },
      { name: "Branco Óptico", hex: "#FFFFFF", why: "Cria contraste artificial e marca olheiras." },
    ],
  },
  neutrals: [
    { name: "Marrom Chocolate", hex: "#3B2415" },
    { name: "Café Escuro", hex: "#4A2E22" },
    { name: "Camel", hex: "#A0744A" },
    { name: "Bege Quente", hex: "#C9A57A" },
    { name: "Taupe Quente", hex: "#8E7A66" },
    { name: "Oliva Escuro", hex: "#4A4E2A" },
  ],
  avoid: [
    { name: "Branco Óptico", hex: "#FFFFFF", why: "" },
    { name: "Cinza Gelo", hex: "#E1E5EA", why: "" },
    { name: "Rosa Bebê", hex: "#F4C2C2", why: "" },
    { name: "Lavanda Clara", hex: "#D7CDE6", why: "" },
    { name: "Preto Óptico", hex: "#000000", why: "" },
  ],
  hair: {
    best: [
      { name: "Castanho Chocolate", hex: "#3B2415" },
      { name: "Castanho Escuro Dourado", hex: "#5A3A1E" },
      { name: "Castanho Médio Quente", hex: "#7A4A2A" },
      { name: "Loiro Escuro Dourado", hex: "#9C7A3A" },
      { name: "Morena Iluminada Caramelo", hex: "#A0744A" },
    ],
    avoid: [
      { name: "Loiro Platinado", hex: "#EDE6D6" },
      { name: "Loiro Acinzentado", hex: "#B8AC9A" },
      { name: "Castanho Acinzentado Frio", hex: "#5A5048" },
      { name: "Preto Azulado", hex: "#0E1320" },
    ],
  },
  makeup: {
    base: "Subtom quente neutro · ouro com leve oliva.",
    blush: [
      { name: "Pêssego", hex: "#F2A07B" },
      { name: "Terracota", hex: "#C97E5C" },
      { name: "Rosa Queimado", hex: "#B8665B" },
    ],
    lipstick: [
      { name: "Nude Quente", hex: "#B9745C" },
      { name: "Telha", hex: "#9C3D24" },
      { name: "Bordô Quente", hex: "#6E2A2C" },
      { name: "Marrom Caramelo", hex: "#7A4A2A" },
    ],
    highlighter: "Champagne dourado ou bronze suave",
    eyeshadow: [
      { name: "Bronze", hex: "#8C6239" },
      { name: "Cobre", hex: "#B36A3A" },
      { name: "Marrom Profundo", hex: "#3B2415" },
    ],
  },
  metals: ["Ouro", "Bronze", "Cobre", "Rosé Antigo"],
  metals_avoid: ["Prata Fria", "Níquel Gelo"],
  prints: "Estampas orgânicas, florais escuros e animal print quente.",
  golden_tips: [
    "Use acessórios dourados, bronze e terrosos.",
    "Prefira maquiagens em tons terrosos, cobre e pêssego.",
    "Estampas orgânicas e florais escuros são excelentes.",
    "Cores intensas e quentes são suas maiores aliadas.",
  ],
  final_quote: "Cores certas iluminam seu rosto, suavizam imperfeições e destacam sua presença natural.",
  confidence: "alta",
};
