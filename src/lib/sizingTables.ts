// Tabelas de tamanhos brasileiras baseadas em ABNT NBR 13377 e medidas reais de mercado.
// Estas tabelas são injetadas no prompt do Gemini para que a recomendação
// de tamanho seja baseada em dados concretos, não em "chutes" da IA.

// ============================================================================
// TABELA GERAL FEMININA (ABNT NBR 13377 + mercado brasileiro)
// ============================================================================
export const TABELA_FEMININA_TOPS = `
TABELA DE TAMANHOS — TOPS FEMININOS (blusas, camisas, vestidos, blazers)
Referência: ABNT NBR 13377 + médias de mercado brasileiro (Renner, C&A, Zara, Farm)

| Tamanho | Busto (cm) | Cintura (cm) | Quadril (cm) | Ombro (cm) |
|---------|-----------|-------------|-------------|-----------|
| PP/XS   | 80-84     | 60-64       | 86-90       | 36-37     |
| P/S     | 84-88     | 64-68       | 90-94       | 37-38     |
| M/M     | 88-94     | 68-74       | 94-100      | 38-40     |
| G/L     | 94-100    | 74-80       | 100-106     | 40-42     |
| GG/XL   | 100-108   | 80-88       | 106-114     | 42-44     |
| XGG/XXL | 108-116   | 88-96       | 114-122     | 44-46     |

REGRA: Use a MAIOR medida entre busto, cintura e quadril para determinar o tamanho.
Se busto=92 e cintura=74 → busto cai em M (88-94), cintura cai em M (68-74) → Tamanho M.
Se busto=92 e quadril=106 → busto=M, quadril=G → Tamanho G (priorize a maior).
`;

export const TABELA_FEMININA_CALCAS = `
TABELA DE TAMANHOS — CALÇAS/SAIAS FEMININAS (numeração brasileira)
Referência: ABNT + mercado brasileiro

| Número | Cintura (cm) | Quadril (cm) | Entrepernas (cm) |
|--------|-------------|-------------|-----------------|
| 34     | 60-64       | 86-90       | 72-74           |
| 36     | 64-68       | 90-94       | 74-76           |
| 38     | 68-72       | 94-98       | 76-78           |
| 40     | 72-76       | 98-102      | 78-80           |
| 42     | 76-80       | 102-106     | 78-80           |
| 44     | 80-84       | 106-110     | 78-80           |
| 46     | 84-88       | 110-114     | 78-80           |
| 48     | 88-92       | 114-118     | 78-80           |

REGRA: Para calças, a medida PRIORITÁRIA é o QUADRIL (deve caber).
Se cintura=74 (nº40) e quadril=104 (nº42) → Número 42 (priorize quadril).
Entrepernas define se precisa de barra: se entrepernas do cliente < tabela → precisa encurtar.
`;

// ============================================================================
// TABELA GERAL MASCULINA
// ============================================================================
export const TABELA_MASCULINA_TOPS = `
TABELA DE TAMANHOS — TOPS MASCULINOS (camisas, camisetas, blazers)
Referência: ABNT + mercado brasileiro

| Tamanho | Tórax (cm) | Cintura (cm) | Ombro (cm) |
|---------|-----------|-------------|-----------|
| PP/XS   | 86-90     | 72-76       | 42-43     |
| P/S     | 90-96     | 76-82       | 43-45     |
| M/M     | 96-102    | 82-88       | 45-47     |
| G/L     | 102-108   | 88-94       | 47-49     |
| GG/XL   | 108-114   | 94-100      | 49-51     |
| XGG/XXL | 114-120   | 100-106     | 51-53     |
`;

export const TABELA_MASCULINA_CALCAS = `
TABELA DE TAMANHOS — CALÇAS MASCULINAS (numeração brasileira)

| Número | Cintura (cm) | Quadril (cm) | Entrepernas (cm) |
|--------|-------------|-------------|-----------------|
| 36     | 72-76       | 92-96       | 78-80           |
| 38     | 76-80       | 96-100      | 80-82           |
| 40     | 80-84       | 100-104     | 80-82           |
| 42     | 84-88       | 104-108     | 80-82           |
| 44     | 88-92       | 108-112     | 80-82           |
| 46     | 92-96       | 112-116     | 80-82           |
| 48     | 96-100      | 116-120     | 80-82           |
`;

// ============================================================================
// TABELA INTERNACIONAL (conversão)
// ============================================================================
export const TABELA_CONVERSAO = `
CONVERSÃO DE TAMANHOS:
| Brasil  | Internacional | Europeu |
|---------|--------------|---------|
| PP      | XS           | 34      |
| P       | S            | 36      |
| M       | M            | 38-40   |
| G       | L            | 42-44   |
| GG      | XL           | 46      |
| XGG     | XXL          | 48      |
`;

// ============================================================================
// MARCAS ESPECÍFICAS (quando o link do produto é de uma marca conhecida)
// ============================================================================
export const TABELAS_MARCAS = `
VARIAÇÕES POR MARCA (ajustes sobre a tabela ABNT):
- Renner: modelagem regular, segue ABNT. Busto P=88-92, M=94-98, G=100-106.
- C&A: modelagem levemente ampla. Busto P=86-92, M=94-100, G=102-108.
- Zara: modelagem ajustada (runs small). Busto S=84-90, M=90-96, L=96-102. Se entre dois tamanhos, suba 1.
- Shein: varia muito por vendedor. Busto S=86-90, M=90-96, L=96-102. Priorize a tabela do produto.
- Farm: modelagem fluida. Busto P=86-92, M=92-98, G=98-106. Peças soltas toleram mais variação.
- H&M: modelagem europeia. Similar a Zara, levemente ajustada.
`;

/**
 * Retorna o bloco de tabelas de sizing para injetar no prompt do Gemini,
 * baseado no gênero informado.
 */
export function getSizingTablesForPrompt(gender?: string): string {
  const g = (gender ?? "").toLowerCase();
  const isMale = g.startsWith("m") && !g.startsWith("mu");

  const tops = isMale ? TABELA_MASCULINA_TOPS : TABELA_FEMININA_TOPS;
  const bottoms = isMale ? TABELA_MASCULINA_CALCAS : TABELA_FEMININA_CALCAS;

  return `
${tops}
${bottoms}
${TABELA_CONVERSAO}
${TABELAS_MARCAS}

INSTRUÇÕES DE SIZING:
1. Use as medidas do cliente (busto, cintura, quadril) e compare com as tabelas acima.
2. Para tops: use a MAIOR medida entre busto e cintura para determinar o tamanho.
3. Para calças: PRIORIZE o quadril (deve caber). Se cintura e quadril caem em tamanhos diferentes, use o MAIOR.
4. Retorne size_brazil (PP/P/M/G/GG/XGG), size_international (XS/S/M/L/XL/XXL), size_european (34-48), pants_number_brazil (34-48).
5. Se o link do produto for de uma marca conhecida, ajuste conforme as variações por marca.
6. Sempre justifique: "Tamanho M porque busto 92cm está na faixa M (88-94cm) e cintura 74cm na faixa M (68-74cm)."
`;
}
