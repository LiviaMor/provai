# Modelo de Negócio e CAC — provAI

## 1. Modelo de Negócio: SaaS B2B por Seat

### Proposta de Valor
> "Com uma foto do cliente + link da roupa, o provAI entrega: imagem vestindo a peça + tamanho exato (P/M/G) com justificativa matemática + consultoria de estilo. Em 30 segundos."

### Segmentos de Cliente

| Segmento | Tamanho estimado (BR) | Ticket médio | Dor principal |
|----------|----------------------|-------------|---------------|
| **Consultoras de imagem** | ~15.000 ativas | R$197/mês | Gasta 45min por cliente com fita métrica |
| **Personal stylists** | ~8.000 ativos | R$197/mês | Não tem ferramenta digital para sizing |
| **Lojas de moda online** | ~50.000 e-commerces | R$197-597/mês | 30-40% de devolução por tamanho errado |
| **Escolas de moda** | ~200 instituições | R$597-1.970/mês | Precisa de ferramenta didática para alunos |
| **Ateliês e costureiras** | ~100.000 | R$97/mês | Erram medidas, retrabalho caro |

### Receita

| Plano | Preço | Análises/mês | Target |
|-------|-------|-------------|--------|
| Free | R$0 | 3 análises | Experimentar |
| Growth | R$197/seat/mês | 40/seat | Consultoras, stylists |
| Scale | R$147/seat/mês | 60/seat | Lojas (10+ seats) |
| Enterprise | R$97/seat/mês | Ilimitado | Redes (50+ seats) |
| Anual | 2 meses grátis | — | Todos |

---

## 2. Cálculo do CAC (Custo de Aquisição de Cliente)

### 2.1 Canais de Aquisição

#### Canal 1: Instagram/TikTok Orgânico (custo zero)
| Métrica | Valor |
|---------|-------|
| Investimento | R$0 (tempo) |
| Posts/semana | 3-5 |
| Alcance médio/post | 500-2.000 |
| Taxa de conversão (visita → trial) | 2-5% |
| Taxa de conversão (trial → pago) | 15-25% |
| **Clientes/mês estimados** | **3-8** |
| **CAC** | **R$0** (só tempo) |

**Conteúdo que funciona:**
- "Tirei uma foto e o app disse que sou M na Zara e G na Renner — veja por quê"
- "Minha cliente economizou R$300 em devoluções com essa ferramenta"
- Antes/depois de recomendação de tamanho
- Reels mostrando o fluxo em 30 segundos

#### Canal 2: Google Ads (consultora de imagem)
| Métrica | Valor |
|---------|-------|
| CPC médio (BR, nicho moda) | R$1,50-3,00 |
| CTR estimado | 3-5% |
| Taxa de conversão (landing → trial) | 8-15% |
| Taxa de conversão (trial → pago) | 20% |
| **Cliques para 1 cliente** | ~33-83 cliques |
| **CAC** | **R$50-250** |

**Keywords target:**
- "consultoria de imagem online"
- "provador virtual"
- "como saber meu tamanho de roupa"
- "análise de coloração pessoal"
- "ferramenta para consultora de imagem"

#### Canal 3: Parcerias com Escolas de Moda
| Métrica | Valor |
|---------|-------|
| Investimento | R$0-500 (apresentação/demo) |
| Escolas abordadas/mês | 5 |
| Taxa de conversão | 20-40% |
| Alunos por escola | 50-200 |
| **Clientes/mês** | **1-2 escolas (50-400 alunos)** |
| **CAC** | **R$50-100 por escola** |

#### Canal 4: Indicação (consultora indica consultora)
| Métrica | Valor |
|---------|-------|
| Investimento | R$0 (ou 1 mês grátis para quem indica) |
| Taxa de indicação | 15-30% dos clientes ativos |
| **CAC** | **R$0-197** (1 mês grátis) |

#### Canal 5: Cold Outreach (lojas de moda)
| Métrica | Valor |
|---------|-------|
| Emails/DMs por mês | 100 |
| Taxa de resposta | 5-10% |
| Taxa de conversão (demo → trial) | 30% |
| Taxa de conversão (trial → pago) | 25% |
| **Clientes/mês** | **1-2 lojas** |
| **CAC** | **R$200-500** (tempo + ferramentas) |

### 2.2 CAC Médio Ponderado

| Canal | % do mix | CAC | CAC ponderado |
|-------|---------|-----|---------------|
| Orgânico (Instagram/TikTok) | 40% | R$0 | R$0 |
| Google Ads | 20% | R$150 | R$30 |
| Parcerias escolas | 15% | R$75 | R$11,25 |
| Indicação | 15% | R$100 | R$15 |
| Cold outreach | 10% | R$350 | R$35 |
| **CAC médio** | **100%** | | **R$91,25** |

---

## 3. Unit Economics

### 3.1 Por Cliente Growth (R$197/mês)

| Métrica | Valor |
|---------|-------|
| **Receita mensal** | R$197,00 |
| Custo IA (Gemini free + FASHN ~10 try-ons) | -R$3,90 |
| Infraestrutura rateada | -R$5,50 |
| Impostos Simples Nacional (15,5%) | -R$30,54 |
| Contabilidade rateada | -R$5,00 |
| **Margem bruta** | **R$152,06 (77%)** |
| **Margem líquida (após pró-labore)** | **R$100-120** |

### 3.2 LTV (Lifetime Value)

| Métrica | Valor | Cálculo |
|---------|-------|---------|
| Ticket médio | R$197/mês | — |
| Churn mensal estimado | 5% | Benchmark SaaS B2B |
| Vida média do cliente | 20 meses | 1 / churn |
| **LTV** | **R$3.940** | ticket × vida |
| **LTV/CAC** | **43x** | R$3.940 / R$91,25 |

### 3.3 Payback Period

| Métrica | Valor |
|---------|-------|
| CAC médio | R$91,25 |
| Margem bruta/mês | R$152,06 |
| **Payback** | **0,6 meses (18 dias)** |

---

## 4. Projeção de Receita (12 meses)

### Cenário Conservador (crescimento 15%/mês)

| Mês | Clientes | Receita mensal | Custo total | Lucro |
|-----|----------|---------------|-------------|-------|
| 1 | 3 | R$591 | R$2.328 | -R$1.737 |
| 2 | 5 | R$985 | R$2.400 | -R$1.415 |
| 3 | 8 | R$1.576 | R$2.500 | -R$924 |
| 4 | 12 | R$2.364 | R$2.700 | **-R$336** |
| 5 | 15 | R$2.955 | R$2.900 | **+R$55** ← break-even |
| 6 | 18 | R$3.546 | R$3.100 | +R$446 |
| 7 | 22 | R$4.334 | R$3.400 | +R$934 |
| 8 | 26 | R$5.122 | R$3.700 | +R$1.422 |
| 9 | 30 | R$5.910 | R$4.000 | +R$1.910 |
| 10 | 35 | R$6.895 | R$4.400 | +R$2.495 |
| 11 | 40 | R$7.880 | R$4.800 | +R$3.080 |
| 12 | 46 | R$9.062 | R$5.300 | +R$3.762 |
| **Total ano** | | **R$51.220** | **R$41.528** | **+R$9.692** |

### Cenário Otimista (crescimento 25%/mês + 1 escola no mês 4)

| Mês | Clientes | Receita mensal | Lucro |
|-----|----------|---------------|-------|
| 1 | 5 | R$985 | -R$1.343 |
| 3 | 12 | R$2.364 | -R$336 |
| 4 | 65 (+escola 50 alunos) | R$12.805 | +R$7.000 |
| 6 | 80 | R$15.760 | +R$9.000 |
| 12 | 150 | R$29.550 | +R$18.000 |

---

## 5. Métricas-Chave para Acompanhar

| Métrica | Meta mês 1 | Meta mês 6 | Meta mês 12 |
|---------|-----------|-----------|------------|
| **MRR** (receita recorrente) | R$591 | R$3.546 | R$9.062 |
| **Clientes pagantes** | 3 | 18 | 46 |
| **Churn** | <10% | <5% | <5% |
| **CAC** | <R$200 | <R$100 | <R$80 |
| **LTV/CAC** | >10x | >30x | >40x |
| **NPS** | >50 | >60 | >70 |
| **Análises/dia** | 5 | 30 | 80 |

---

## 6. Estratégia de Go-to-Market (primeiros 90 dias)

### Semana 1-2: Validação
- [ ] Abordar 10 consultoras de imagem no Instagram
- [ ] Oferecer 30 dias grátis (piloto)
- [ ] Coletar feedback detalhado
- [ ] Gravar 3 vídeos de demo (30s cada)

### Semana 3-4: Primeiros pagantes
- [ ] Converter 3-5 pilotos em pagantes
- [ ] Implementar Stripe/Pix para cobrança
- [ ] Criar programa de indicação (1 mês grátis)
- [ ] Publicar 2 cases de sucesso

### Mês 2: Escalar orgânico
- [ ] 3-5 posts/semana no Instagram/TikTok
- [ ] Iniciar Google Ads (R$500/mês budget)
- [ ] Abordar 3 escolas de moda
- [ ] Meta: 10 clientes pagantes

### Mês 3: Consolidar
- [ ] 15+ clientes pagantes
- [ ] Churn < 10%
- [ ] NPS > 50
- [ ] Iniciar plano anual com desconto
- [ ] Primeira escola como cliente

---

## 7. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|-------------|---------|-----------|
| Gemini muda pricing/free tier | Média | Alto | Ter fallback para Gemini Flash pago (US$0.003/req) |
| FASHN AI aumenta preço | Baixa | Médio | Migrar para Kolors self-hosted quando volume justificar |
| Concorrente grande entra no BR | Média | Alto | Diferencial: sizing + colorimetria integrados (ninguém faz) |
| Churn alto (>10%) | Média | Alto | Onboarding guiado, suporte ativo, feature requests |
| Acurácia insuficiente | Baixa | Alto | Property tests provam corretude; medidas manuais como fallback |

---

## 8. Resumo para Pitch

> **provAI** é um SaaS B2B que usa visão computacional + matemática determinística para recomendar o tamanho exato de roupa (P/M/G) com justificativa, vestir virtualmente o cliente na peça, e analisar colorimetria pessoal — tudo em 30 segundos a partir de uma foto.
>
> **Mercado**: 73.000+ profissionais de moda no Brasil (consultoras, stylists, lojas)
> **Pricing**: R$197/seat/mês
> **CAC**: R$91 | **LTV**: R$3.940 | **LTV/CAC**: 43x
> **Break-even**: mês 5 com 15 clientes
> **Diferencial**: único que combina provador virtual + sizing determinístico + colorimetria
> **Tecnologia**: Gemini (landmarks) + math local (ABNT) + FASHN AI (difusão) — 8 property tests provam corretude
