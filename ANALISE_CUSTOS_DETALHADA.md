# Detalhamento Técnico de Custos — provAI SaaS B2B

## 1. Custos para Manter o Site no Ar (Infraestrutura)

### 1.1 Custos Fixos Mensais

| Item | Plano | Custo mensal (R$) | Notas |
|------|-------|-------------------|-------|
| **Vercel** (frontend hosting) | Pro | R$104 (US$20) | Deploy automático, CDN global, SSL |
| **Supabase** (backend) | Pro | R$130 (US$25) | DB 8GB, Auth 100K MAU, 2M edge invocations |
| **Domínio** (.com.br ou .app) | — | R$5 (~R$60/ano) | provai.com.br ou provai.app |
| **Email profissional** (Google Workspace) | Starter | R$36 (US$7) | contato@provai.app, suporte@provai.app |
| **Certificado SSL** | — | R$0 | Incluso no Vercel |
| **Monitoramento** (UptimeRobot) | Free | R$0 | Alerta se cair |
| **Total infraestrutura** | | **R$275/mês** | |

### 1.2 Custos Variáveis (por uso)

| Serviço | Custo unitário | Free tier | Notas |
|---------|---------------|-----------|-------|
| **Gemini Flash** (análise corporal + cor) | R$0 | 1M tokens/dia grátis | Suficiente para ~200 análises/dia |
| **Gemini Pro** (análises complexas) | R$0.006/análise | 50 req/dia grátis | Só se precisar de Pro |
| **FASHN AI** (provador virtual) | R$0.39/imagem (US$0.075) | 10 grátis | Depois US$7.50 mínimo |
| **Firecrawl** (extração de produto) | R$0.14/extração | 500 grátis/mês | Opcional |
| **Supabase Storage** (fotos) | R$0.13/GB | 1GB grátis | Só se armazenar fotos |
| **Supabase Bandwidth** | R$0.45/GB excedente | 250GB/mês incluso | Raramente excede |

### 1.3 Cenário Real: 50 clientes ativos (Growth)

| Item | Cálculo | Custo/mês |
|------|---------|-----------|
| Infraestrutura fixa | — | R$275 |
| Gemini Flash (análises) | 50 clientes × 30 análises = 1.500 | R$0 (free tier) |
| FASHN (try-on) | 50 clientes × 10 try-ons = 500 | R$195 |
| Firecrawl | 50 clientes × 5 extrações = 250 | R$0 (free tier) |
| **Total operacional** | | **R$470/mês** |

---

## 2. Custos Empresariais (CNPJ)

### 2.1 Abertura da Empresa

| Item | Custo | Frequência |
|------|-------|-----------|
| Abertura CNPJ (contador) | R$800-1.500 | Única vez |
| Registro na Junta Comercial | R$150-300 | Única vez |
| Certificado Digital (e-CNPJ) | R$150-250 | Anual |
| Alvará/licenças | R$0-200 | Depende do município |
| **Total abertura** | **R$1.300-2.250** | |

### 2.2 Custos Mensais do CNPJ

| Item | Custo mensal (R$) | Notas |
|------|-------------------|-------|
| **Contabilidade** | R$200-500 | Obrigatório para ME/EPP. MEI não precisa |
| **Simples Nacional** (imposto) | 6-15.5% do faturamento | Anexo V para SaaS (fator R) |
| **INSS** (pró-labore) | R$280-600 | 11% sobre pró-labore mínimo |
| **ISS** (municipal) | 2-5% do faturamento | Incluso no Simples |
| **Conta PJ** (banco) | R$0-50 | Nubank PJ = grátis |
| **Seguro** (opcional) | R$50-150 | Responsabilidade civil |

### 2.3 Regime Tributário — Simples Nacional (Anexo V)

SaaS B2B se enquadra no **Anexo V** do Simples Nacional (serviços de TI):

| Faixa de faturamento (12 meses) | Alíquota nominal | Alíquota efetiva |
|----------------------------------|-----------------|------------------|
| Até R$180.000 | 15,50% | 15,50% |
| R$180.001 a R$360.000 | 18,00% | ~16,5% |
| R$360.001 a R$720.000 | 19,50% | ~17,5% |
| R$720.001 a R$1.800.000 | 20,50% | ~18,5% |

**Fator R**: Se a folha de pagamento (pró-labore + salários) for ≥ 28% do faturamento, migra para o **Anexo III** (alíquota inicial 6% em vez de 15,5%). Isso é muito mais vantajoso.

### 2.4 Regime Mínimo: ME Simples Nacional (desde o início)

SaaS/tecnologia **não pode ser MEI** no Brasil. O regime mínimo é **Microempresa (ME) no Simples Nacional**.

| Item | Custo |
|------|-------|
| DAS Simples (Anexo V, 15,5%) | Sobre faturamento |
| Contabilidade obrigatória | R$200-500/mês |
| Pró-labore mínimo (1 salário) | R$1.412 + INSS 11% = R$1.567 |
| Limite faturamento | R$4.800.000/ano |

---

## 3. Custos Totais Reais por Cenário

### Cenário A: Início (ME Simples, 1-10 clientes)

| Item | Custo/mês |
|------|-----------|
| Infraestrutura (Vercel + Supabase) | R$275 |
| IA (Gemini free + FASHN mínimo) | R$40 |
| Contabilidade | R$250 |
| Pró-labore + INSS (1 sócio, mínimo) | R$1.567 |
| Impostos Simples (15,5% de R$1.000) | R$155 |
| Domínio + email | R$41 |
| **Total** | **R$2.328/mês** |
| **Receita necessária para break-even** | 12 clientes × R$197 = R$2.364 ✓ |

### Cenário B: Operação (ME Simples, 20-50 clientes)

| Item | Custo/mês |
|------|-----------|
| Infraestrutura | R$275 |
| IA variável (FASHN + Firecrawl) | R$250-500 |
| Contabilidade | R$350 |
| Impostos Simples (15,5% de R$5.000) | R$775 |
| Pró-labore + INSS | R$1.600 |
| Email + domínio + ferramentas | R$100 |
| **Total** | **R$3.350-3.600/mês** |
| **Receita (30 clientes Growth)** | 30 × R$99,90 = **R$2.997** |
| **⚠️ Não cobre custos com 30 clientes a R$99,90** | |

### Cenário C: Escala (ME Simples, 50-100 clientes)

| Item | Custo/mês |
|------|-----------|
| Infraestrutura | R$400 (Supabase Team) |
| IA variável | R$800-1.200 |
| Contabilidade | R$500 |
| Impostos Simples (15,5% de R$15.000) | R$2.325 |
| Pró-labore + INSS (2 sócios) | R$3.200 |
| Marketing | R$500 |
| Ferramentas (CRM, suporte) | R$200 |
| **Total** | **R$7.925-8.325/mês** |
| **Receita (100 clientes Growth)** | 100 × R$149,90 = **R$14.990** |
| **Lucro líquido** | **~R$6.665/mês** ✓ |

---

## 4. Repricing Necessário

### O problema com R$99,90/seat:

Com 30 clientes a R$99,90, a receita é R$2.997 — mas os custos reais (com CNPJ, impostos, contabilidade) são R$3.350+. **Não fecha.**

### Pricing corrigido para sustentabilidade:

| Plano | Preço anterior | **Preço corrigido** | Justificativa |
|-------|---------------|--------------------|-|
| Starter (1-3 seats) | R$149,90/mês | **R$197/mês** | Cobre custos fixos rateados |
| Growth (1 seat) | R$99,90/seat | **R$197/seat/mês** | Margem para impostos + operação |
| Scale (10+ seats) | R$79,90/seat | **R$147/seat/mês** | Volume compensa desconto |
| Enterprise (50+) | Sob consulta | **R$97/seat/mês** | Contrato anual, volume alto |

### Cálculo de break-even com pricing corrigido:

| Cenário | Clientes | Receita | Custos | Lucro |
|---------|----------|---------|--------|-------|
| MEI (validação) | 3 Growth | R$591 | R$432 | +R$159 ✓ |
| ME (operação) | 20 Growth | R$3.940 | R$3.350 | +R$590 ✓ |
| ME (escala) | 50 Growth | R$9.850 | R$7.925 | +R$1.925 ✓ |
| ME (meta) | 80 Growth | R$15.760 | R$9.500 | +R$6.260 ✓ |

---

## 5. Unit Economics Corrigido

### Por cliente Growth (R$197/mês):

| Item | Valor |
|------|-------|
| Receita | R$197,00 |
| Custo IA (Gemini free + FASHN 10 try-ons) | -R$3,90 |
| Infraestrutura rateada (R$275 ÷ 30 clientes) | -R$9,17 |
| Impostos Simples (15,5%) | -R$30,54 |
| Contabilidade rateada | -R$11,67 |
| **Margem por cliente** | **R$141,72 (72%)** |

### LTV (Lifetime Value):

| Métrica | Valor |
|---------|-------|
| Ticket médio | R$197/mês |
| Churn estimado | 5%/mês (20 meses de vida média) |
| **LTV** | **R$3.940** |
| CAC (indicação) | R$50-100 |
| **LTV/CAC** | **39-79x** |

---

## 6. Comparação com Concorrentes (pricing)

| Produto | Preço | O que entrega |
|---------|-------|---------------|
| FASHN AI (API) | US$19-249/mês | Só try-on (sem sizing, sem colorimetria) |
| AI Wardrobe | US$9,99/mês | Só organização de closet |
| Consultora presencial | R$300-1.500/sessão | Colorimetria + estilo (sem try-on) |
| **provAI Growth** | **R$197/seat/mês** | Try-on + sizing + colorimetria + análise corporal |

O provAI a R$197/mês é **mais barato que 1 sessão de consultora** e entrega resultado em 30 segundos vs 2 horas.

---

## 7. Resumo Executivo

| Métrica | Valor |
|---------|-------|
| Custo mínimo para operar (ME Simples) | **R$2.328/mês** |
| Break-even | **12 clientes Growth** |
| Custo com escala (50 clientes) | R$7.925/mês |
| Pricing recomendado | **R$197/seat/mês** |
| Margem por cliente | 72% |
| Meta 6 meses | 30 clientes = R$5.910 receita |
| Meta 12 meses | 80 clientes = R$15.760 receita |
| Lucro líquido (80 clientes) | ~R$6.260/mês |

### Próximo passo imediato:
1. Abrir **ME Simples Nacional** (Anexo V — serviços de TI)
2. Pricing a **R$197/seat/mês** (ou R$1.970/ano com 2 meses grátis)
3. Usar **Fator R** (pró-labore ≥28% do faturamento) para cair no Anexo III (6% vs 15,5%)
4. Validar com 3-5 clientes no piloto gratuito de 30 dias
5. Meta: 12 clientes pagantes para break-even
