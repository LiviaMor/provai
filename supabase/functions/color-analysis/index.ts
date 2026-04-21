import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Payload = { images?: string[] };
type Chip = { name: string; hex: string; why?: string };

const HEX_RE = /^#?[0-9a-fA-F]{6}$/;
const normHex = (h: unknown, fallback = "#8C6239"): string => {
  if (typeof h !== "string") return fallback;
  const t = h.trim();
  if (HEX_RE.test(t)) return t.startsWith("#") ? t.toUpperCase() : `#${t.toUpperCase()}`;
  return fallback;
};
const isStr = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

// Paletas curadas por estação (fallback técnico coerente)
const SEASON_DEFAULTS: Record<string, {
  best: Chip[]; neutrals: Chip[]; avoid: Chip[];
  hairBest: Chip[]; hairAvoid: Chip[];
  blush: Chip[]; lipstick: Chip[]; eyeshadow: Chip[];
  metals: string[]; metalsAvoid: string[];
  highlighter: string; base: string; prints: string;
}> = {
  "Primavera Clara": {
    best: [
      { name: "Pêssego Claro", hex: "#FFCBA4" }, { name: "Coral Suave", hex: "#FF8C75" },
      { name: "Verde Maçã", hex: "#9ACD32" }, { name: "Turquesa Clara", hex: "#5FD9D1" },
      { name: "Amarelo Manteiga", hex: "#F5E1A4" }, { name: "Rosa Salmão", hex: "#FF9A8B" },
      { name: "Azul Periwinkle", hex: "#A6B8E0" }, { name: "Lavanda Quente", hex: "#C9A0DC" },
      { name: "Verde Claro", hex: "#98D8A0" }, { name: "Camel Claro", hex: "#D4A876" },
      { name: "Marfim", hex: "#F1E9D2" }, { name: "Coral Vivo", hex: "#FF7F50" },
    ],
    neutrals: [
      { name: "Marfim", hex: "#F1E9D2" }, { name: "Camel Claro", hex: "#D4A876" },
      { name: "Bege Quente", hex: "#E3C9A8" }, { name: "Marrom Dourado", hex: "#A0744A" },
      { name: "Cinza Quente Claro", hex: "#BFB3A0" }, { name: "Azul Marinho Suave", hex: "#3D5478" },
    ],
    avoid: [
      { name: "Preto Óptico", hex: "#000000", why: "endurece os traços" },
      { name: "Branco Puro", hex: "#FFFFFF", why: "cria contraste artificial" },
      { name: "Bordô Profundo", hex: "#5A1F22", why: "pesa o rosto" },
      { name: "Cinza Frio", hex: "#A0A8B0", why: "apaga o brilho" },
      { name: "Marrom Frio", hex: "#4A3A3A", why: "envelhece a pele" },
    ],
    hairBest: [
      { name: "Loiro Dourado", hex: "#C9A24A" }, { name: "Mel", hex: "#B5783A" },
      { name: "Caramelo Claro", hex: "#A87545" }, { name: "Loiro Médio Quente", hex: "#D4B070" },
      { name: "Castanho Claro Dourado", hex: "#8B5E3C" },
    ],
    hairAvoid: [
      { name: "Preto Azulado", hex: "#0E1320" }, { name: "Loiro Platinado", hex: "#EDE6D6" },
      { name: "Castanho Frio", hex: "#3E3530" }, { name: "Cinza Acinzentado", hex: "#7A7670" },
    ],
    blush: [{ name: "Pêssego", hex: "#F2A07B" }, { name: "Coral Claro", hex: "#FF9A8B" }, { name: "Rosa Salmão", hex: "#F08080" }],
    lipstick: [{ name: "Coral", hex: "#FF7F50" }, { name: "Pêssego Vivo", hex: "#FFA07A" }, { name: "Rosa Quente", hex: "#E97777" }, { name: "Nude Dourado", hex: "#C28860" }],
    eyeshadow: [{ name: "Bronze Claro", hex: "#B98860" }, { name: "Pêssego Acobreado", hex: "#D4915E" }, { name: "Marrom Mel", hex: "#8B5E3C" }],
    metals: ["Ouro Claro", "Rosé Gold", "Bronze Claro"],
    metalsAvoid: ["Prata Fria", "Níquel"],
    highlighter: "Champagne dourado claro com brilho suave",
    base: "Subtom quente claro, evitar bases neutras frias",
    prints: "Florais delicados, poá pequeno, estampas leves em tons quentes claros",
  },
  "Primavera Quente": {
    best: [
      { name: "Coral", hex: "#FF7F50" }, { name: "Laranja Queimado", hex: "#D2691E" },
      { name: "Amarelo Mostarda Claro", hex: "#E8B547" }, { name: "Verde Lima", hex: "#A4C639" },
      { name: "Turquesa", hex: "#40C4B7" }, { name: "Vermelho Tomate", hex: "#E94B35" },
      { name: "Camel", hex: "#A0744A" }, { name: "Rosa Coral", hex: "#F88379" },
      { name: "Verde Oliva Claro", hex: "#8A8B30" }, { name: "Azul Aqua", hex: "#5DADE2" },
      { name: "Bronze", hex: "#A06B3A" }, { name: "Damasco", hex: "#E8A87C" },
    ],
    neutrals: [
      { name: "Camel", hex: "#A0744A" }, { name: "Bege Dourado", hex: "#C9A57A" },
      { name: "Marrom Quente", hex: "#7A4A2A" }, { name: "Marfim Quente", hex: "#EFE3C8" },
      { name: "Marinho Quente", hex: "#2E3D5A" }, { name: "Verde Musgo Claro", hex: "#6B7A3A" },
    ],
    avoid: [
      { name: "Preto Óptico", hex: "#000000", why: "muito severo" },
      { name: "Cinza Gelo", hex: "#E1E5EA", why: "apaga o subtom quente" },
      { name: "Rosa Frio", hex: "#E8A1B4", why: "conflita com o calor da pele" },
      { name: "Azul Gelo", hex: "#D6E6F2", why: "frio demais" },
      { name: "Branco Puro", hex: "#FFFFFF", why: "muito artificial" },
    ],
    hairBest: [
      { name: "Loiro Dourado Médio", hex: "#B5894A" }, { name: "Caramelo", hex: "#A87545" },
      { name: "Mel Acobreado", hex: "#9C6B3A" }, { name: "Castanho Médio Quente", hex: "#7A4A2A" },
      { name: "Ruivo Suave", hex: "#A65A3A" },
    ],
    hairAvoid: [
      { name: "Preto Azulado", hex: "#0E1320" }, { name: "Loiro Platinado", hex: "#EDE6D6" },
      { name: "Castanho Acinzentado", hex: "#5A5048" }, { name: "Cinza Gelo", hex: "#B8B5B0" },
    ],
    blush: [{ name: "Coral", hex: "#FF7F50" }, { name: "Pêssego Quente", hex: "#F2A07B" }, { name: "Damasco", hex: "#E8A87C" }],
    lipstick: [{ name: "Coral Vivo", hex: "#FF6F61" }, { name: "Terracota Claro", hex: "#C97E5C" }, { name: "Nude Quente", hex: "#B9745C" }, { name: "Vermelho Tomate", hex: "#E94B35" }],
    eyeshadow: [{ name: "Bronze", hex: "#8C6239" }, { name: "Cobre", hex: "#B36A3A" }, { name: "Marrom Dourado", hex: "#7A4A2A" }],
    metals: ["Ouro", "Bronze", "Cobre", "Rosé Gold"],
    metalsAvoid: ["Prata Fria", "Platina"],
    highlighter: "Champagne dourado intenso ou bronze leve",
    base: "Subtom quente dourado",
    prints: "Estampas étnicas, animal print quente, florais coloridos",
  },
  "Primavera Brilhante": {
    best: [
      { name: "Pink Vibrante", hex: "#FF1493" }, { name: "Turquesa Brilhante", hex: "#00CED1" },
      { name: "Amarelo Vivo", hex: "#FFD700" }, { name: "Verde Esmeralda Claro", hex: "#2EBF7E" },
      { name: "Coral Vivo", hex: "#FF6F61" }, { name: "Roxo Real", hex: "#7851A9" },
      { name: "Azul Royal", hex: "#1F3FAE" }, { name: "Vermelho Cereja", hex: "#D2042D" },
      { name: "Verde Lima", hex: "#A4C639" }, { name: "Magenta", hex: "#C71585" },
      { name: "Laranja Tangerina", hex: "#F28500" }, { name: "Azul Ciano", hex: "#00BFFF" },
    ],
    neutrals: [
      { name: "Marfim Brilhante", hex: "#F1E9D2" }, { name: "Camel Médio", hex: "#A0744A" },
      { name: "Marinho Forte", hex: "#1B2A4E" }, { name: "Bege Dourado", hex: "#C9A57A" },
      { name: "Cinza Quente Médio", hex: "#9B8E7A" }, { name: "Marrom Café", hex: "#523226" },
    ],
    avoid: [
      { name: "Tons Pastéis Apagados", hex: "#D7C9C0", why: "perdem brilho" },
      { name: "Marrom Empoeirado", hex: "#7A6B5A", why: "muito mate" },
      { name: "Cinza Apagado", hex: "#9C9C9C", why: "rouba a vivacidade" },
      { name: "Verde Oliva Apagado", hex: "#5C5A3A", why: "envelhece" },
      { name: "Mostarda Suja", hex: "#8B7A2C", why: "perde luminosidade" },
    ],
    hairBest: [
      { name: "Loiro Dourado Brilhante", hex: "#C9A24A" }, { name: "Castanho Dourado", hex: "#7A4A2A" },
      { name: "Mel Vibrante", hex: "#B5783A" }, { name: "Castanho Chocolate", hex: "#3B2415" },
      { name: "Caramelo Vivo", hex: "#A87545" },
    ],
    hairAvoid: [
      { name: "Cinza Esmaecido", hex: "#A8A8A8" }, { name: "Loiro Acinzentado", hex: "#B8AC9A" },
      { name: "Castanho Empoeirado", hex: "#6B5A4A" }, { name: "Preto Azulado", hex: "#0E1320" },
    ],
    blush: [{ name: "Coral Vivo", hex: "#FF6F61" }, { name: "Pink Brilhante", hex: "#FF69B4" }, { name: "Pêssego Quente", hex: "#F2A07B" }],
    lipstick: [{ name: "Vermelho Cereja", hex: "#D2042D" }, { name: "Coral Vivo", hex: "#FF6F61" }, { name: "Pink Vivo", hex: "#FF1493" }, { name: "Magenta", hex: "#C71585" }],
    eyeshadow: [{ name: "Dourado", hex: "#D4A24A" }, { name: "Bronze Vivo", hex: "#A06B3A" }, { name: "Marrom Quente", hex: "#7A4A2A" }],
    metals: ["Ouro Brilhante", "Cobre", "Rosé Gold"],
    metalsAvoid: ["Prata Mate", "Estanho"],
    highlighter: "Champagne dourado intenso e brilhante",
    base: "Subtom quente claro a médio com luminosidade",
    prints: "Estampas vibrantes, geométricas coloridas, florais saturados",
  },
  "Verão Claro": {
    best: [
      { name: "Rosa Suave", hex: "#F4C2C2" }, { name: "Lavanda Clara", hex: "#D7CDE6" },
      { name: "Azul Periwinkle", hex: "#B8C5E0" }, { name: "Verde Menta", hex: "#A8D8C0" },
      { name: "Azul Pó", hex: "#A8B8C8" }, { name: "Rosa Antigo", hex: "#D4A5A5" },
      { name: "Cinza Pérola", hex: "#C9C5C0" }, { name: "Lilás", hex: "#C8A8D8" },
      { name: "Azul Bebê", hex: "#A8C0D8" }, { name: "Bordô Suave", hex: "#8B5A6B" },
      { name: "Marinho Suave", hex: "#3D5478" }, { name: "Rosa Pó", hex: "#E8B5C0" },
    ],
    neutrals: [
      { name: "Cinza Pérola", hex: "#C9C5C0" }, { name: "Bege Frio", hex: "#C9BFB0" },
      { name: "Marinho Suave", hex: "#3D5478" }, { name: "Cinza Médio", hex: "#9B98A0" },
      { name: "Branco Off", hex: "#F5F0EB" }, { name: "Taupe Frio", hex: "#8B8077" },
    ],
    avoid: [
      { name: "Preto Óptico", hex: "#000000", why: "endurece traços delicados" },
      { name: "Laranja Vivo", hex: "#FF6600", why: "muito saturado" },
      { name: "Amarelo Mostarda", hex: "#C68A1E", why: "amarela a pele" },
      { name: "Marrom Quente", hex: "#7A4A2A", why: "pesa o rosto" },
      { name: "Vermelho Tomate", hex: "#E94B35", why: "cria contraste excessivo" },
    ],
    hairBest: [
      { name: "Loiro Cinza", hex: "#A89C8A" }, { name: "Loiro Pérola", hex: "#D4C9B0" },
      { name: "Castanho Claro Frio", hex: "#7A6E5C" }, { name: "Loiro Médio Frio", hex: "#B8A88A" },
      { name: "Castanho Médio Acinzentado", hex: "#6B5E50" },
    ],
    hairAvoid: [
      { name: "Loiro Dourado Quente", hex: "#C9A24A" }, { name: "Ruivo", hex: "#A65A3A" },
      { name: "Caramelo", hex: "#A87545" }, { name: "Preto Azulado", hex: "#0E1320" },
    ],
    blush: [{ name: "Rosa Suave", hex: "#F4C2C2" }, { name: "Rosa Frio", hex: "#E8A1B4" }, { name: "Pêssego Frio", hex: "#F0B5A8" }],
    lipstick: [{ name: "Rosa Pó", hex: "#D4A5A5" }, { name: "Rosa Frio", hex: "#C97A8B" }, { name: "Bordô Suave", hex: "#8B5A6B" }, { name: "Nude Rosado", hex: "#C9A5A0" }],
    eyeshadow: [{ name: "Taupe Frio", hex: "#8B8077" }, { name: "Cinza Lilás", hex: "#A89AB0" }, { name: "Marrom Frio Claro", hex: "#7A6E5C" }],
    metals: ["Prata", "Platina", "Ouro Branco"],
    metalsAvoid: ["Ouro Amarelo Intenso", "Cobre"],
    highlighter: "Rosado frio ou prata leitosa",
    base: "Subtom rosado frio claro",
    prints: "Florais delicados, aquarela, listras finas em tons frios suaves",
  },
  "Verão Suave": {
    best: [
      { name: "Rosa Empoeirado", hex: "#C9A5A0" }, { name: "Lilás Suave", hex: "#B8A8C0" },
      { name: "Verde Sálvia", hex: "#9CAF9C" }, { name: "Azul Pó", hex: "#A8B8C8" },
      { name: "Bordô Suave", hex: "#8B5A6B" }, { name: "Cacau", hex: "#7A5C50" },
      { name: "Azul Cinza", hex: "#7A8A9A" }, { name: "Rosa Mauve", hex: "#A88090" },
      { name: "Verde Acinzentado", hex: "#7A8A78" }, { name: "Marinho Suave", hex: "#3D5478" },
      { name: "Taupe", hex: "#8B8077" }, { name: "Borgonha Suave", hex: "#6E3A40" },
    ],
    neutrals: [
      { name: "Taupe", hex: "#8B8077" }, { name: "Cacau", hex: "#7A5C50" },
      { name: "Cinza Pérola", hex: "#C9C5C0" }, { name: "Marinho Suave", hex: "#3D5478" },
      { name: "Bege Cinza", hex: "#A89F90" }, { name: "Marrom Frio", hex: "#5C4A3E" },
    ],
    avoid: [
      { name: "Cores Saturadas", hex: "#FF0000", why: "competem com a suavidade natural" },
      { name: "Preto Óptico", hex: "#000000", why: "endurece os traços" },
      { name: "Branco Puro", hex: "#FFFFFF", why: "cria contraste artificial" },
      { name: "Laranja Vivo", hex: "#FF6600", why: "muito quente" },
      { name: "Rosa Pink", hex: "#FF1493", why: "saturado demais" },
    ],
    hairBest: [
      { name: "Castanho Cinza", hex: "#6B5E50" }, { name: "Loiro Acinzentado", hex: "#A89C8A" },
      { name: "Castanho Médio Frio", hex: "#5A4E42" }, { name: "Loiro Escuro Frio", hex: "#8B7A60" },
      { name: "Castanho Mocha", hex: "#5C4A3E" },
    ],
    hairAvoid: [
      { name: "Preto Intenso", hex: "#0E1320" }, { name: "Loiro Platinado", hex: "#EDE6D6" },
      { name: "Ruivo Vivo", hex: "#A65A3A" }, { name: "Loiro Dourado Forte", hex: "#C9A24A" },
    ],
    blush: [{ name: "Rosa Empoeirado", hex: "#C9A5A0" }, { name: "Mauve", hex: "#A88090" }, { name: "Pêssego Suave", hex: "#E8B8A8" }],
    lipstick: [{ name: "Mauve", hex: "#A88090" }, { name: "Rosa Empoeirado", hex: "#C9A5A0" }, { name: "Bordô Suave", hex: "#8B5A6B" }, { name: "Nude Frio", hex: "#B89A95" }],
    eyeshadow: [{ name: "Taupe", hex: "#8B8077" }, { name: "Cacau", hex: "#7A5C50" }, { name: "Cinza Mauve", hex: "#9C8A95" }],
    metals: ["Prata Antiga", "Ouro Branco", "Rosé Mate"],
    metalsAvoid: ["Ouro Amarelo Brilhante", "Cobre Vivo"],
    highlighter: "Rosado suave acetinado",
    base: "Subtom rosado neutro suave",
    prints: "Aquarela, florais empoeirados, padrões orgânicos discretos",
  },
  "Verão Frio": {
    best: [
      { name: "Rosa Frio", hex: "#E8A1B4" }, { name: "Azul Royal Frio", hex: "#2C4A8C" },
      { name: "Verde Esmeralda Frio", hex: "#1F8A6E" }, { name: "Bordô Frio", hex: "#7A2C40" },
      { name: "Lilás", hex: "#C8A8D8" }, { name: "Azul Marinho", hex: "#1B2A4E" },
      { name: "Magenta Suave", hex: "#B83A6E" }, { name: "Cinza Pérola", hex: "#C9C5C0" },
      { name: "Roxo Berinjela", hex: "#5A3A5A" }, { name: "Azul Pó", hex: "#A8B8C8" },
      { name: "Rosa Pink Frio", hex: "#D85A8C" }, { name: "Verde Pinheiro", hex: "#2E5A4E" },
    ],
    neutrals: [
      { name: "Cinza Pérola", hex: "#C9C5C0" }, { name: "Marinho", hex: "#1B2A4E" },
      { name: "Cinza Médio", hex: "#7A7A82" }, { name: "Branco Off", hex: "#F5F0EB" },
      { name: "Cinza Carvão", hex: "#3A3A42" }, { name: "Taupe Frio", hex: "#8B8077" },
    ],
    avoid: [
      { name: "Laranja", hex: "#FF7F50", why: "esquenta demais" },
      { name: "Amarelo Mostarda", hex: "#C68A1E", why: "conflita com o subtom frio" },
      { name: "Marrom Quente", hex: "#7A4A2A", why: "amarela a pele" },
      { name: "Verde Oliva", hex: "#6B7A3A", why: "envelhece" },
      { name: "Coral", hex: "#FF7F50", why: "muito quente" },
    ],
    hairBest: [
      { name: "Castanho Frio Médio", hex: "#5A4E42" }, { name: "Loiro Cinza", hex: "#A89C8A" },
      { name: "Castanho Escuro Frio", hex: "#3E3530" }, { name: "Loiro Platinado Sutil", hex: "#C9BFB0" },
      { name: "Cinza Natural", hex: "#7A7A82" },
    ],
    hairAvoid: [
      { name: "Ruivo", hex: "#A65A3A" }, { name: "Loiro Dourado", hex: "#C9A24A" },
      { name: "Caramelo", hex: "#A87545" }, { name: "Castanho Avermelhado", hex: "#6B3A2A" },
    ],
    blush: [{ name: "Rosa Frio", hex: "#E8A1B4" }, { name: "Rosa Pink Suave", hex: "#D85A8C" }, { name: "Mauve", hex: "#A88090" }],
    lipstick: [{ name: "Rosa Frio", hex: "#C97A8B" }, { name: "Bordô Frio", hex: "#7A2C40" }, { name: "Magenta", hex: "#B83A6E" }, { name: "Nude Rosado", hex: "#C9A5A0" }],
    eyeshadow: [{ name: "Cinza Carvão", hex: "#3A3A42" }, { name: "Lilás", hex: "#C8A8D8" }, { name: "Taupe Frio", hex: "#8B8077" }],
    metals: ["Prata", "Platina", "Ouro Branco"],
    metalsAvoid: ["Ouro Amarelo", "Cobre", "Bronze"],
    highlighter: "Rosado frio ou prata leitosa",
    base: "Subtom rosado frio",
    prints: "Geométricos clássicos, listras marinheiras, florais frios",
  },
  "Outono Suave": {
    best: [
      { name: "Verde Sálvia", hex: "#9CAF9C" }, { name: "Camel", hex: "#A0744A" },
      { name: "Marrom Café", hex: "#7A5C50" }, { name: "Mostarda Suave", hex: "#B8923A" },
      { name: "Verde Oliva", hex: "#6B7A3A" }, { name: "Rosa Empoeirado", hex: "#C9A5A0" },
      { name: "Azul Petróleo Suave", hex: "#3D6E6E" }, { name: "Bege Dourado", hex: "#C9A57A" },
      { name: "Marrom Avermelhado", hex: "#8B5A4A" }, { name: "Verde Musgo", hex: "#556B2F" },
      { name: "Terracota Suave", hex: "#B5705A" }, { name: "Marfim Quente", hex: "#EFE3C8" },
    ],
    neutrals: [
      { name: "Camel", hex: "#A0744A" }, { name: "Marrom Café", hex: "#7A5C50" },
      { name: "Bege Dourado", hex: "#C9A57A" }, { name: "Taupe Quente", hex: "#8E7A66" },
      { name: "Marfim Quente", hex: "#EFE3C8" }, { name: "Marinho Quente", hex: "#2E3D5A" },
    ],
    avoid: [
      { name: "Preto Óptico", hex: "#000000", why: "muito severo" },
      { name: "Branco Puro", hex: "#FFFFFF", why: "cria contraste artificial" },
      { name: "Cores Vibrantes", hex: "#FF1493", why: "competem com a suavidade" },
      { name: "Rosa Frio", hex: "#E8A1B4", why: "conflita com o calor" },
      { name: "Azul Royal", hex: "#1F3FAE", why: "muito saturado" },
    ],
    hairBest: [
      { name: "Castanho Médio Quente", hex: "#7A4A2A" }, { name: "Loiro Mel", hex: "#B5894A" },
      { name: "Caramelo", hex: "#A87545" }, { name: "Castanho Acobreado Suave", hex: "#8B5E3C" },
      { name: "Mocha Quente", hex: "#6B4A35" },
    ],
    hairAvoid: [
      { name: "Preto Azulado", hex: "#0E1320" }, { name: "Loiro Platinado", hex: "#EDE6D6" },
      { name: "Cinza Frio", hex: "#A0A0A8" }, { name: "Vermelho Cereja", hex: "#A02C3D" },
    ],
    blush: [{ name: "Pêssego Empoeirado", hex: "#D4937A" }, { name: "Terracota Suave", hex: "#B5705A" }, { name: "Rosa Empoeirado", hex: "#C9A5A0" }],
    lipstick: [{ name: "Nude Quente", hex: "#B9745C" }, { name: "Marrom Rosado", hex: "#A06B5A" }, { name: "Telha Suave", hex: "#B5532A" }, { name: "Bordô Quente", hex: "#6E3A2C" }],
    eyeshadow: [{ name: "Bronze Suave", hex: "#9C7A5A" }, { name: "Marrom Café", hex: "#7A5C50" }, { name: "Verde Musgo", hex: "#6B7A3A" }],
    metals: ["Ouro Antigo", "Bronze", "Cobre Suave"],
    metalsAvoid: ["Prata Brilhante", "Platina"],
    highlighter: "Champagne dourado suave",
    base: "Subtom quente neutro suave",
    prints: "Florais empoeirados, paisley, animal print suave",
  },
  "Outono Quente": {
    best: [
      { name: "Terracota", hex: "#B5532A" }, { name: "Mostarda", hex: "#C68A1E" },
      { name: "Verde Oliva", hex: "#6B7A3A" }, { name: "Cobre", hex: "#B36A3A" },
      { name: "Laranja Queimado", hex: "#D2691E" }, { name: "Marrom Chocolate", hex: "#3B2415" },
      { name: "Bordô", hex: "#5A1F22" }, { name: "Verde Musgo", hex: "#556B2F" },
      { name: "Caramelo", hex: "#A87545" }, { name: "Tijolo", hex: "#9C3D24" },
      { name: "Verde Pinheiro Quente", hex: "#2E5A3D" }, { name: "Mel Dourado", hex: "#B5783A" },
    ],
    neutrals: [
      { name: "Camel", hex: "#A0744A" }, { name: "Marrom Chocolate", hex: "#3B2415" },
      { name: "Bege Dourado", hex: "#C9A57A" }, { name: "Marfim Quente", hex: "#EFE3C8" },
      { name: "Verde Oliva Escuro", hex: "#4A4E2A" }, { name: "Marinho Quente", hex: "#2E3D5A" },
    ],
    avoid: [
      { name: "Preto Óptico", hex: "#000000", why: "frio demais" },
      { name: "Branco Puro", hex: "#FFFFFF", why: "cria contraste artificial" },
      { name: "Rosa Frio", hex: "#E8A1B4", why: "conflita com o subtom quente" },
      { name: "Azul Gelo", hex: "#D6E6F2", why: "frio demais" },
      { name: "Cinza Frio", hex: "#A0A8B0", why: "apaga o brilho" },
    ],
    hairBest: [
      { name: "Ruivo", hex: "#A65A3A" }, { name: "Castanho Acobreado", hex: "#8B4A2A" },
      { name: "Caramelo", hex: "#A87545" }, { name: "Mel Acobreado", hex: "#9C6B3A" },
      { name: "Castanho Avermelhado", hex: "#6B3A2A" },
    ],
    hairAvoid: [
      { name: "Preto Azulado", hex: "#0E1320" }, { name: "Loiro Platinado", hex: "#EDE6D6" },
      { name: "Loiro Cinza", hex: "#A89C8A" }, { name: "Castanho Frio", hex: "#3E3530" },
    ],
    blush: [{ name: "Terracota", hex: "#C97E5C" }, { name: "Pêssego Quente", hex: "#F2A07B" }, { name: "Tijolo Suave", hex: "#B5705A" }],
    lipstick: [{ name: "Telha", hex: "#9C3D24" }, { name: "Bordô Quente", hex: "#6E2A2C" }, { name: "Marrom Caramelo", hex: "#7A4A2A" }, { name: "Cobre", hex: "#B36A3A" }],
    eyeshadow: [{ name: "Bronze", hex: "#8C6239" }, { name: "Cobre", hex: "#B36A3A" }, { name: "Verde Musgo", hex: "#556B2F" }],
    metals: ["Ouro", "Bronze", "Cobre"],
    metalsAvoid: ["Prata Fria", "Platina"],
    highlighter: "Champagne dourado intenso ou bronze",
    base: "Subtom quente dourado",
    prints: "Étnicas, paisley, animal print quente, florais densos",
  },
  "Outono Profundo": {
    best: [
      { name: "Verde Musgo", hex: "#556B2F" }, { name: "Verde Oliva", hex: "#6B7A3A" },
      { name: "Verde Petróleo", hex: "#1F4E47" }, { name: "Azul Profundo", hex: "#1F3A5F" },
      { name: "Azul Marinho", hex: "#15243F" }, { name: "Terracota", hex: "#B5532A" },
      { name: "Telha", hex: "#9C3D24" }, { name: "Mostarda Queimada", hex: "#C68A1E" },
      { name: "Chocolate", hex: "#3B2415" }, { name: "Café", hex: "#523226" },
      { name: "Cobre", hex: "#B36A3A" }, { name: "Bordô", hex: "#5A1F22" },
    ],
    neutrals: [
      { name: "Marrom Chocolate", hex: "#3B2415" }, { name: "Café Escuro", hex: "#4A2E22" },
      { name: "Camel", hex: "#A0744A" }, { name: "Bege Quente", hex: "#C9A57A" },
      { name: "Taupe Quente", hex: "#8E7A66" }, { name: "Oliva Escuro", hex: "#4A4E2A" },
    ],
    avoid: [
      { name: "Branco Óptico", hex: "#FFFFFF", why: "cria contraste artificial" },
      { name: "Cinza Gelo", hex: "#E1E5EA", why: "apaga o subtom" },
      { name: "Rosa Bebê", hex: "#F4C2C2", why: "conflita com a profundidade" },
      { name: "Lavanda Clara", hex: "#D7CDE6", why: "muito frio" },
      { name: "Preto Óptico", hex: "#000000", why: "endurece o calor" },
    ],
    hairBest: [
      { name: "Castanho Chocolate", hex: "#3B2415" }, { name: "Castanho Escuro Dourado", hex: "#5A3A1E" },
      { name: "Castanho Médio Quente", hex: "#7A4A2A" }, { name: "Loiro Escuro Dourado", hex: "#9C7A3A" },
      { name: "Morena Iluminada Caramelo", hex: "#A0744A" },
    ],
    hairAvoid: [
      { name: "Loiro Platinado", hex: "#EDE6D6" }, { name: "Loiro Acinzentado", hex: "#B8AC9A" },
      { name: "Castanho Acinzentado Frio", hex: "#5A5048" }, { name: "Preto Azulado", hex: "#0E1320" },
    ],
    blush: [{ name: "Pêssego", hex: "#F2A07B" }, { name: "Terracota", hex: "#C97E5C" }, { name: "Rosa Queimado", hex: "#B8665B" }],
    lipstick: [{ name: "Nude Quente", hex: "#B9745C" }, { name: "Telha", hex: "#9C3D24" }, { name: "Bordô Quente", hex: "#6E2A2C" }, { name: "Marrom Caramelo", hex: "#7A4A2A" }],
    eyeshadow: [{ name: "Bronze", hex: "#8C6239" }, { name: "Cobre", hex: "#B36A3A" }, { name: "Marrom Profundo", hex: "#3B2415" }],
    metals: ["Ouro", "Bronze", "Cobre", "Rosé Antigo"],
    metalsAvoid: ["Prata Fria", "Níquel Gelo"],
    highlighter: "Champagne dourado ou bronze suave",
    base: "Subtom quente neutro · ouro com leve oliva",
    prints: "Estampas orgânicas, florais escuros e animal print quente",
  },
  "Inverno Frio": {
    best: [
      { name: "Vermelho Cereja", hex: "#D2042D" }, { name: "Rosa Pink Frio", hex: "#D85A8C" },
      { name: "Azul Royal", hex: "#1F3FAE" }, { name: "Verde Esmeralda", hex: "#0E7A4E" },
      { name: "Roxo Real", hex: "#5A2C82" }, { name: "Bordô Frio", hex: "#7A2C40" },
      { name: "Magenta", hex: "#C71585" }, { name: "Azul Marinho Frio", hex: "#0F1B3D" },
      { name: "Branco Puro", hex: "#FFFFFF" }, { name: "Preto Óptico", hex: "#0A0A0A" },
      { name: "Verde Pinheiro", hex: "#2E5A4E" }, { name: "Azul Gelo", hex: "#A8C8E0" },
    ],
    neutrals: [
      { name: "Preto", hex: "#0A0A0A" }, { name: "Branco Puro", hex: "#FFFFFF" },
      { name: "Cinza Carvão", hex: "#3A3A42" }, { name: "Marinho Frio", hex: "#0F1B3D" },
      { name: "Cinza Pérola", hex: "#C9C5C0" }, { name: "Cinza Médio Frio", hex: "#7A7A82" },
    ],
    avoid: [
      { name: "Laranja Queimado", hex: "#D2691E", why: "esquenta demais" },
      { name: "Mostarda", hex: "#C68A1E", why: "amarela a pele" },
      { name: "Verde Oliva", hex: "#6B7A3A", why: "envelhece" },
      { name: "Marrom Quente", hex: "#7A4A2A", why: "apaga o brilho" },
      { name: "Bege Dourado", hex: "#C9A57A", why: "conflita com o subtom frio" },
    ],
    hairBest: [
      { name: "Preto Intenso", hex: "#0A0A0A" }, { name: "Castanho Escuro Frio", hex: "#2A2520" },
      { name: "Castanho Frio", hex: "#3E3530" }, { name: "Cinza Natural", hex: "#7A7A82" },
      { name: "Loiro Platinado", hex: "#EDE6D6" },
    ],
    hairAvoid: [
      { name: "Ruivo", hex: "#A65A3A" }, { name: "Loiro Dourado", hex: "#C9A24A" },
      { name: "Caramelo", hex: "#A87545" }, { name: "Mel", hex: "#B5894A" },
    ],
    blush: [{ name: "Rosa Frio", hex: "#E8A1B4" }, { name: "Pink Frio", hex: "#D85A8C" }, { name: "Vermelho Cereja Suave", hex: "#C04A5A" }],
    lipstick: [{ name: "Vermelho Cereja", hex: "#D2042D" }, { name: "Bordô Frio", hex: "#7A2C40" }, { name: "Pink Frio", hex: "#D85A8C" }, { name: "Magenta", hex: "#C71585" }],
    eyeshadow: [{ name: "Cinza Carvão", hex: "#3A3A42" }, { name: "Roxo", hex: "#5A2C82" }, { name: "Preto Esfumado", hex: "#1A1A22" }],
    metals: ["Prata", "Platina", "Ouro Branco"],
    metalsAvoid: ["Ouro Amarelo", "Cobre", "Bronze"],
    highlighter: "Prata leitosa ou rosado frio brilhante",
    base: "Subtom frio com leve rosado",
    prints: "Geométricos clássicos, monocromáticos, florais frios contrastantes",
  },
  "Inverno Brilhante": {
    best: [
      { name: "Vermelho Vivo", hex: "#E63946" }, { name: "Pink Vibrante", hex: "#FF1493" },
      { name: "Azul Royal Brilhante", hex: "#1F3FAE" }, { name: "Verde Esmeralda Vivo", hex: "#00A86B" },
      { name: "Roxo Real", hex: "#5A2C82" }, { name: "Turquesa Brilhante", hex: "#00CED1" },
      { name: "Magenta", hex: "#C71585" }, { name: "Branco Puro", hex: "#FFFFFF" },
      { name: "Preto Óptico", hex: "#0A0A0A" }, { name: "Amarelo Limão", hex: "#FFF44F" },
      { name: "Azul Elétrico", hex: "#0066FF" }, { name: "Coral Frio", hex: "#FF5A6E" },
    ],
    neutrals: [
      { name: "Preto", hex: "#0A0A0A" }, { name: "Branco Puro", hex: "#FFFFFF" },
      { name: "Cinza Carvão", hex: "#3A3A42" }, { name: "Marinho Brilhante", hex: "#1B2A6E" },
      { name: "Cinza Pérola Brilhante", hex: "#D4D0CB" }, { name: "Cinza Médio", hex: "#7A7A82" },
    ],
    avoid: [
      { name: "Tons Empoeirados", hex: "#A89F90", why: "perdem brilho" },
      { name: "Marrom Quente", hex: "#7A4A2A", why: "apaga a vivacidade" },
      { name: "Mostarda", hex: "#C68A1E", why: "muito quente" },
      { name: "Verde Oliva", hex: "#6B7A3A", why: "envelhece" },
      { name: "Pastéis Apagados", hex: "#D7C9C0", why: "perdem contraste" },
    ],
    hairBest: [
      { name: "Preto Intenso", hex: "#0A0A0A" }, { name: "Castanho Escuro Brilhante", hex: "#2A2520" },
      { name: "Castanho Chocolate", hex: "#3B2415" }, { name: "Loiro Platinado Brilhante", hex: "#EDE6D6" },
      { name: "Castanho Médio Brilhante", hex: "#5A4530" },
    ],
    hairAvoid: [
      { name: "Loiro Apagado", hex: "#B8AC9A" }, { name: "Castanho Empoeirado", hex: "#6B5A4A" },
      { name: "Ruivo Suave", hex: "#A65A3A" }, { name: "Loiro Dourado Quente", hex: "#C9A24A" },
    ],
    blush: [{ name: "Pink Vivo", hex: "#FF1493" }, { name: "Vermelho Cereja", hex: "#D2042D" }, { name: "Coral Frio", hex: "#FF5A6E" }],
    lipstick: [{ name: "Vermelho Vivo", hex: "#E63946" }, { name: "Pink Vibrante", hex: "#FF1493" }, { name: "Magenta", hex: "#C71585" }, { name: "Bordô Frio", hex: "#7A2C40" }],
    eyeshadow: [{ name: "Preto Esfumado", hex: "#1A1A22" }, { name: "Roxo Brilhante", hex: "#5A2C82" }, { name: "Cinza Brilhante", hex: "#7A7A82" }],
    metals: ["Prata Brilhante", "Platina", "Ouro Branco"],
    metalsAvoid: ["Ouro Antigo", "Cobre Mate"],
    highlighter: "Prata brilhante ou champagne frio intenso",
    base: "Subtom frio brilhante",
    prints: "Geométricos vibrantes, alto contraste, florais saturados frios",
  },
  "Inverno Profundo": {
    best: [
      { name: "Vermelho Profundo", hex: "#8B0000" }, { name: "Bordô Profundo", hex: "#5A1F22" },
      { name: "Azul Marinho Profundo", hex: "#0F1B3D" }, { name: "Verde Esmeralda Profundo", hex: "#064E3B" },
      { name: "Roxo Berinjela", hex: "#3D1F4A" }, { name: "Pink Profundo", hex: "#A82C5A" },
      { name: "Preto Óptico", hex: "#0A0A0A" }, { name: "Branco Puro", hex: "#FFFFFF" },
      { name: "Verde Pinheiro Profundo", hex: "#1A3A2E" }, { name: "Magenta Profundo", hex: "#8B1F5A" },
      { name: "Azul Royal Profundo", hex: "#0F2A6E" }, { name: "Cinza Carvão", hex: "#2A2A30" },
    ],
    neutrals: [
      { name: "Preto", hex: "#0A0A0A" }, { name: "Cinza Carvão", hex: "#2A2A30" },
      { name: "Marinho Profundo", hex: "#0F1B3D" }, { name: "Branco Puro", hex: "#FFFFFF" },
      { name: "Cinza Médio Frio", hex: "#5A5A62" }, { name: "Café Profundo", hex: "#2A1A14" },
    ],
    avoid: [
      { name: "Pastéis", hex: "#F4C2C2", why: "perdem força" },
      { name: "Tons Quentes Suaves", hex: "#E8C9A8", why: "conflitam com a profundidade" },
      { name: "Bege Dourado", hex: "#C9A57A", why: "apaga o contraste" },
      { name: "Mostarda Suave", hex: "#B8923A", why: "muito quente" },
      { name: "Coral", hex: "#FF7F50", why: "muito quente" },
    ],
    hairBest: [
      { name: "Preto Intenso", hex: "#0A0A0A" }, { name: "Castanho Escuro", hex: "#2A1A14" },
      { name: "Castanho Chocolate Profundo", hex: "#1F140C" }, { name: "Castanho Frio Profundo", hex: "#2A2520" },
      { name: "Castanho Avermelhado Profundo", hex: "#3E1F1A" },
    ],
    hairAvoid: [
      { name: "Loiro Platinado", hex: "#EDE6D6" }, { name: "Loiro Dourado", hex: "#C9A24A" },
      { name: "Ruivo Claro", hex: "#C97755" }, { name: "Caramelo Claro", hex: "#A87545" },
    ],
    blush: [{ name: "Pink Profundo", hex: "#A82C5A" }, { name: "Vermelho Cereja Profundo", hex: "#A02C3D" }, { name: "Bordô Suave", hex: "#7A2C40" }],
    lipstick: [{ name: "Vermelho Profundo", hex: "#8B0000" }, { name: "Bordô Profundo", hex: "#5A1F22" }, { name: "Pink Profundo", hex: "#A82C5A" }, { name: "Magenta Profundo", hex: "#8B1F5A" }],
    eyeshadow: [{ name: "Preto Esfumado", hex: "#1A1A22" }, { name: "Roxo Profundo", hex: "#3D1F4A" }, { name: "Cinza Carvão", hex: "#2A2A30" }],
    metals: ["Prata", "Ouro Branco", "Platina"],
    metalsAvoid: ["Ouro Amarelo Suave", "Cobre Empoeirado"],
    highlighter: "Prata fria ou champagne frio intenso",
    base: "Subtom frio profundo",
    prints: "Alto contraste, geométricos clássicos, florais densos e profundos",
  },
};

const KNOWN_SEASONS = Object.keys(SEASON_DEFAULTS);

const matchSeason = (raw: string): string => {
  if (!isStr(raw)) return "Outono Profundo";
  const norm = raw.toLowerCase();
  for (const s of KNOWN_SEASONS) if (norm.includes(s.toLowerCase())) return s;
  // tentativas amplas
  if (norm.includes("inverno") && norm.includes("profundo")) return "Inverno Profundo";
  if (norm.includes("inverno") && norm.includes("brilhante")) return "Inverno Brilhante";
  if (norm.includes("inverno")) return "Inverno Frio";
  if (norm.includes("outono") && norm.includes("profundo")) return "Outono Profundo";
  if (norm.includes("outono") && norm.includes("suave")) return "Outono Suave";
  if (norm.includes("outono")) return "Outono Quente";
  if (norm.includes("verão") || norm.includes("verao")) {
    if (norm.includes("suave")) return "Verão Suave";
    if (norm.includes("frio")) return "Verão Frio";
    return "Verão Claro";
  }
  if (norm.includes("primavera")) {
    if (norm.includes("brilhante")) return "Primavera Brilhante";
    if (norm.includes("quente")) return "Primavera Quente";
    return "Primavera Clara";
  }
  return "Outono Profundo";
};

const sanitizeChips = (raw: unknown, fallback: Chip[], min: number, max: number): Chip[] => {
  const arr: Chip[] = [];
  const seen = new Set<string>();
  const push = (c: Chip) => {
    const hex = normHex(c.hex).toUpperCase();
    if (seen.has(hex)) return;
    seen.add(hex);
    arr.push({ name: isStr(c.name) ? c.name.trim() : "Cor", hex, ...(c.why ? { why: c.why } : {}) });
  };
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (arr.length >= max) break;
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        push({ name: String(o.name ?? "Cor"), hex: String(o.hex ?? ""), why: isStr(o.why) ? String(o.why) : undefined });
      } else if (isStr(item)) {
        push({ name: item, hex: "" });
      }
    }
  }
  // completar com fallback
  for (const c of fallback) {
    if (arr.length >= min) break;
    push(c);
  }
  return arr.slice(0, max);
};

const sanitizeStrings = (raw: unknown, fallback: string[], min: number, max: number): string[] => {
  const arr: string[] = [];
  if (Array.isArray(raw)) for (const v of raw) if (isStr(v) && arr.length < max) arr.push(v.trim());
  for (const f of fallback) if (arr.length < min) arr.push(f);
  return Array.from(new Set(arr)).slice(0, max);
};

const normalizeAnalysis = (raw: Record<string, unknown>): Record<string, unknown> => {
  const seasonRaw = String(raw.season ?? "");
  const season = matchSeason(seasonRaw);
  const defaults = SEASON_DEFAULTS[season];

  const characteristics = (raw.characteristics && typeof raw.characteristics === "object" ? raw.characteristics : {}) as Record<string, { value?: string; note?: string }>;
  const ensureChar = (key: string, value: string, note = "") => {
    if (!characteristics[key] || !isStr(characteristics[key].value)) characteristics[key] = { value, note };
  };
  ensureChar("depth", "Média");
  ensureChar("contrast", "Médio");
  ensureChar("undertone", "Neutro");
  ensureChar("temperature", "Neutra");
  ensureChar("intensity", "Média");
  ensureChar("luminosity", "Média");
  ensureChar("harmony", "Equilibrada");

  const faceComparison = (raw.face_comparison && typeof raw.face_comparison === "object" ? raw.face_comparison : {}) as Record<string, unknown>;
  const valorizam = sanitizeChips(faceComparison.valorizam, defaults.best.slice(0, 5).map((c) => ({ ...c, why: "Harmoniza com seu subtom e ilumina o rosto." })), 5, 5);
  const apagam = sanitizeChips(faceComparison.apagam, defaults.avoid.slice(0, 4), 4, 4);

  const makeup = (raw.makeup && typeof raw.makeup === "object" ? raw.makeup : {}) as Record<string, unknown>;

  return {
    season,
    season_modifier: isStr(raw.season_modifier) ? String(raw.season_modifier) : "",
    season_subtitle: isStr(raw.season_subtitle) ? String(raw.season_subtitle) : `Cartela ${season} — cores em harmonia com sua identidade cromática.`,
    season_description: isStr(raw.season_description) ? String(raw.season_description) : `Sua coloração se alinha à estação ${season}: cores nessa paleta dialogam com seu subtom e contraste naturais, realçando luminosidade e definição do rosto.`,
    characteristics,
    skin_tone_hex: normHex(raw.skin_tone_hex, "#C9A07B"),
    eye_color_hex: normHex(raw.eye_color_hex, "#5A3A22"),
    hair_color_hex: normHex(raw.hair_color_hex, "#7A4A2A"),
    best_palette: sanitizeChips(raw.best_palette, defaults.best, 12, 12),
    face_comparison: { valorizam, apagam },
    neutrals: sanitizeChips(raw.neutrals, defaults.neutrals, 6, 6),
    avoid: sanitizeChips(raw.avoid, defaults.avoid, 5, 5),
    hair: {
      best: sanitizeChips((raw.hair as Record<string, unknown>)?.best, defaults.hairBest, 5, 5),
      avoid: sanitizeChips((raw.hair as Record<string, unknown>)?.avoid, defaults.hairAvoid, 4, 4),
    },
    makeup: {
      base: isStr(makeup.base) ? String(makeup.base) : defaults.base,
      blush: sanitizeChips(makeup.blush, defaults.blush, 3, 3),
      lipstick: sanitizeChips(makeup.lipstick, defaults.lipstick, 4, 4),
      highlighter: isStr(makeup.highlighter) ? String(makeup.highlighter) : defaults.highlighter,
      eyeshadow: sanitizeChips(makeup.eyeshadow, defaults.eyeshadow, 3, 3),
    },
    metals: sanitizeStrings(raw.metals, defaults.metals, 3, 4),
    metals_avoid: sanitizeStrings(raw.metals_avoid, defaults.metalsAvoid, 1, 3),
    prints: isStr(raw.prints) ? String(raw.prints) : defaults.prints,
    golden_tips: sanitizeStrings(raw.golden_tips, [
      `Use acessórios em ${defaults.metals[0]?.toLowerCase() ?? "ouro"} e similares.`,
      `Prefira maquiagens dentro da paleta ${season}.`,
      defaults.prints,
      "Cores certas iluminam, suavizam imperfeições e destacam sua presença.",
    ], 4, 4),
    final_quote: isStr(raw.final_quote) ? String(raw.final_quote) : "Cores certas iluminam seu rosto, suavizam imperfeições e destacam sua presença natural.",
    confidence: isStr(raw.confidence) ? String(raw.confidence) : "media",
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { images } = (await req.json()) as Payload;
    const valid = (images ?? []).filter((s) => typeof s === "string" && s.startsWith("data:image/")).slice(0, 5);
    if (valid.length === 0) {
      return new Response(JSON.stringify({ error: "Envie ao menos 1 foto do rosto." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ error: "IA indisponível no momento." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const systemPrompt = `Você é uma consultora de imagem brasileira de altíssimo padrão, especialista em colorimetria pessoal pelos métodos das 12 estações (Sci\\ART, Color Me Beautiful) e harmonia cromática profissional. Analise visualmente as fotos enviadas observando pele (bochechas, pescoço, têmporas, veias), olhos (íris, limbo, brilho), cabelo (raiz, fios, brilho) e contraste natural. Responda APENAS JSON válido em pt-BR. Todos os hex DEVEM estar no formato #RRGGBB válido. Nunca devolva campos vazios — se tiver baixa certeza, use a melhor aproximação coerente com a estação detectada.`;

    const seasonsList = KNOWN_SEASONS.join(", ");
    const userPrompt = `Analise tecnicamente a coloração pessoal real da pessoa nas fotos. Seja precisa, personalizada e nada genérica. Identifique exatamente UMA das 12 estações (use exatamente um destes rótulos): ${seasonsList}. Indique neutralidade no campo "season_modifier" (ex: "Neutro" para uma análise como Outono Profundo Neutro), ou string vazia.

REGRAS DE PREENCHIMENTO OBRIGATÓRIAS — todas as listas devem vir COMPLETAS com nomes em pt-BR e hex coerentes com a estação detectada:
- best_palette: EXATAMENTE 12 cores ideais (nome + hex) representando a cartela completa
- face_comparison.valorizam: 5 cores (com why curto sobre o efeito no rosto)
- face_comparison.apagam: 4 cores (com why curto sobre por que apaga)
- neutrals: 6 neutros ideais
- avoid: 5 cores a evitar (com why)
- hair.best: 5 colorações de cabelo ideais (com why opcional)
- hair.avoid: 4 colorações a evitar
- makeup.blush: 3 opções; makeup.lipstick: 4 opções (dia/noite); makeup.eyeshadow: 3 opções
- metals: 3-4 metais ideais (apenas nomes em pt-BR)
- metals_avoid: 1-3 metais a evitar
- golden_tips: 4 dicas elegantes e específicas

Retorne JSON exatamente neste formato:
{
  "season": "<um dos rótulos exatos acima>",
  "season_modifier": "Neutro" | "",
  "season_subtitle": "frase curta poética sobre a cartela",
  "season_description": "parágrafo de 2-3 frases citando observações reais (subtom, contraste, profundidade) e por que a estação harmoniza",
  "characteristics": {
    "depth": {"value": "Alta|Média|Baixa", "note": "frase curta"},
    "contrast": {"value": "Alto|Médio-Alto|Médio|Médio-Baixo|Baixo", "note": "frase curta"},
    "undertone": {"value": "Quente|Frio|Neutro|Quente Neutro|Frio Neutro|Oliva", "note": "ex: dourado/oliva"},
    "temperature": {"value": "Quente|Fria|Neutra", "note": ""},
    "intensity": {"value": "Profunda|Suave|Brilhante|Média", "note": ""},
    "luminosity": {"value": "Alta|Média|Baixa", "note": ""},
    "harmony": {"value": "frase curta sobre a harmonia geral", "note": "explicação curta"}
  },
  "skin_tone_hex": "#hex",
  "eye_color_hex": "#hex",
  "hair_color_hex": "#hex",
  "best_palette": [{"name":"...","hex":"#RRGGBB"}, ...12 itens],
  "face_comparison": {
    "valorizam": [{"name":"...","hex":"#RRGGBB","why":"..."} ...5 itens],
    "apagam": [{"name":"...","hex":"#RRGGBB","why":"..."} ...4 itens]
  },
  "neutrals": [{"name":"...","hex":"#RRGGBB"} ...6 itens],
  "avoid": [{"name":"...","hex":"#RRGGBB","why":"..."} ...5 itens],
  "hair": {
    "best": [{"name":"...","hex":"#RRGGBB","why":"..."} ...5 itens],
    "avoid": [{"name":"...","hex":"#RRGGBB","why":"..."} ...4 itens]
  },
  "makeup": {
    "base": "instrução técnica sobre subtom da base",
    "blush": [{"name":"...","hex":"#RRGGBB"} ...3 itens],
    "lipstick": [{"name":"...","hex":"#RRGGBB"} ...4 itens],
    "highlighter": "descrição (ex: champagne dourado / rosado / bronze) + por quê",
    "eyeshadow": [{"name":"...","hex":"#RRGGBB"} ...3 itens]
  },
  "metals": ["Ouro","Bronze","Cobre"],
  "metals_avoid": ["Prata fria"],
  "prints": "estampas que combinam",
  "golden_tips": ["dica 1","dica 2","dica 3","dica 4"],
  "final_quote": "frase poética e luxuosa de fechamento",
  "confidence": "alta|media|baixa"
}`;

    const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [{ type: "text", text: userPrompt }];
    for (const img of valid) content.push({ type: "image_url", image_url: { url: img } });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (response.status === 429) return new Response(JSON.stringify({ error: "Limite de IA atingido. Aguarde alguns minutos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!response.ok) {
      const err = await response.text();
      console.error("color-analysis gateway", response.status, err);
      return new Response(JSON.stringify({ error: "Falha ao gerar análise." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;
    let parsed: Record<string, unknown> = {};
    try {
      parsed = typeof raw === "string" ? JSON.parse(raw.replace(/^```json\s*|\s*```$/g, "")) : (raw ?? {});
    } catch (e) {
      console.error("parse error", e, raw);
      // ainda assim normaliza com defaults usando o melhor palpite
      parsed = {};
    }

    const analysis = normalizeAnalysis(parsed);
    return new Response(JSON.stringify({ analysis }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("color-analysis error", error);
    return new Response(JSON.stringify({ error: "Erro inesperado." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
