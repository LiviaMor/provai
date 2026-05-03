# Análise de Custos e Sustentabilidade — Ultraprovador/Encaixe

## Resumo Executivo

A aplicação Encaixe é um SaaS B2B de análise corporal, colorimetria e provador virtual que depende fortemente de chamadas a modelos de IA (Gemini) por imagem. O custo variável por usuário ativo é dominado pelo consumo de tokens de IA, e a precificação atual (R$49,90–R$99,90/mês por faixa de time) **pode ser sustentável**, mas exige controle rigoroso de uso por seat e otimizações para escalar.

---

## 1. Mapeamento de APIs Externas e Custos Unitários

### 1.1 Google Gemini (via Lovable AI Gateway)

| Modelo | Uso na App | Input (por 1M tokens) | Output (por 1M tokens) |
|--------|-----------|----------------------|----------------------|
| Gemini 2.5 Pro | analyze-body, color-analysis, detect-scale-marker | US$1,25 | US$10,00 |
| Gemini 3 Pro Image Preview | virtual-tryon (geração de imagem) | US$2,00 | US$12,00 |
| Gemini 3 Flash Preview | virtual-tryon (consultoria de estilo) | US$0,50 | US$3,00 |

**Nota:** O gateway Lovable pode ter markup adicional sobre esses preços. Se estiver usando créditos Lovable, o custo real pode ser 1,5–2x o preço direto do Google.

### 1.2 Firecrawl (Scraping de Produtos)

| Plano | Preço | Créditos/mês | Custo real por extração AI |
|-------|-------|-------------|---------------------------|
| Free | US$0 | 500 créditos | — |
| Hobby | US$16/mês | 3.000 créditos | ~5 créditos por extração JSON = 600 extrações |
| Standard | US$83/mês | 25.000 créditos | ~5.000 extrações |
| Growth | US$333/mês | 175.000 créditos | ~35.000 extrações |

**Na app:** Usado em `analyze-body` e `virtual-tryon` quando o usuário fornece URL de produto. Custo efetivo: ~US$0,027/extração no plano Standard.

### 1.3 Supabase (Infraestrutura)

| Componente | Plano Free | Plano Pro (US$25/mês) |
|-----------|-----------|----------------------|
| Database | 500MB | 8GB incluído |
| Edge Functions | 500K invocações/mês | 2M incluídas, depois US$2/1M |
| Auth | 50K MAU | 100K MAU |
| Storage | 1GB | 100GB |
| Bandwidth | 2GB | 250GB |

---

## 2. Custo por Ação do Usuário (Estimativa)

### 2.1 Análise Corporal (analyze-body)

| Componente | Tokens estimados | Custo (USD) |
|-----------|-----------------|-------------|
| Input: system prompt + fotos (2 imagens ~1500 tokens cada) + contexto | ~4.000–6.000 tokens | US$0,005–0,008 |
| Output: JSON completo de medidas | ~2.000–4.000 tokens | US$0,020–0,040 |
| Firecrawl (se URL de produto) | 5 créditos | US$0,027 |
| **Total por análise corporal** | | **US$0,05–0,08** |

### 2.2 Análise de Coloração (color-analysis)

| Componente | Tokens estimados | Custo (USD) |
|-----------|-----------------|-------------|
| Input: foto + prompt detalhado | ~3.000–5.000 tokens | US$0,004–0,006 |
| Output: paleta completa (12 estações) | ~3.000–5.000 tokens | US$0,030–0,050 |
| **Total por análise de cor** | | **US$0,04–0,06** |

### 2.3 Provador Virtual (virtual-tryon) — MAIS CARO

| Componente | Tokens estimados | Custo (USD) |
|-----------|-----------------|-------------|
| Geração de imagem (Gemini 3 Pro Image) | ~3.000 input + imagem gerada | US$0,05–0,10 |
| Consultoria de estilo (Gemini 3 Flash) | ~2.000 input + 2.000 output | US$0,007 |
| Firecrawl (extração de produto) | 5 créditos | US$0,027 |
| **Total por try-on** | | **US$0,08–0,14** |

### 2.4 Detecção de Marcador de Escala

| Componente | Tokens estimados | Custo (USD) |
|-----------|-----------------|-------------|
| Input: foto + prompt | ~2.000 tokens | US$0,003 |
| Output: JSON calibração | ~500 tokens | US$0,005 |
| **Total** | | **~US$0,008** |

---

## 3. Cenários de Uso e Custo Mensal por Seat

### Perfil de uso "Consultora de Imagem" (B2B típico)

| Ação | Frequência/mês | Custo unitário | Custo mensal |
|------|---------------|---------------|-------------|
| Análise corporal | 8 clientes | US$0,07 | US$0,56 |
| Análise de coloração | 8 clientes | US$0,05 | US$0,40 |
| Provador virtual | 15 looks | US$0,11 | US$1,65 |
| Detecção de escala | 8 calibrações | US$0,008 | US$0,06 |
| **Total IA por seat/mês** | | | **US$2,67** |

### Perfil "Loja de Moda" (uso intenso)

| Ação | Frequência/mês | Custo unitário | Custo mensal |
|------|---------------|---------------|-------------|
| Análise corporal | 30 clientes | US$0,07 | US$2,10 |
| Análise de coloração | 20 clientes | US$0,05 | US$1,00 |
| Provador virtual | 50 looks | US$0,11 | US$5,50 |
| Detecção de escala | 30 calibrações | US$0,008 | US$0,24 |
| **Total IA por seat/mês** | | | **US$8,84** |

---

## 4. Análise de Margem por Plano

**Câmbio considerado: US$1 = R$5,20**

### Plano Starter (1–5 usuários, R$49,90/mês)

| Item | Custo (R$) |
|------|-----------|
| Receita | R$49,90 |
| Supabase Pro | R$130,00 (rateado entre todos os clientes) |
| Firecrawl Hobby | R$83,20 (rateado) |
| IA (5 seats × uso moderado) | R$69,42 (5 × US$2,67 × 5,2) |
| **Custo variável IA por cliente** | **R$69,42** |

⚠️ **PROBLEMA:** Com 5 usuários ativos no perfil moderado, o custo de IA (R$69,42) já **supera a receita** (R$49,90).

### Plano Growth (6–20 usuários, R$69,90/mês)

Com 10 seats ativos:
- Custo IA: 10 × US$2,67 × 5,2 = **R$138,84**
- Receita: R$69,90

⚠️ **INSUSTENTÁVEL no modelo atual.**

---

## 5. Diagnóstico: Por que o modelo atual NÃO é sustentável

### Problemas Críticos:

1. **Precificação por faixa de time, não por uso** — O preço é fixo por tier, mas o custo escala linearmente com cada análise feita.

2. **Sem controle de quotas** — Não existe tracking de quantas análises cada usuário faz. Sem limites, um único usuário pode gerar centenas de reais em custos de IA.

3. **Provador virtual é caro demais para ser ilimitado** — Geração de imagem com Gemini 3 Pro custa 2–3x mais que análise de texto.

4. **Firecrawl com extração JSON consome 5 créditos/página** — O plano Hobby (3.000 créditos) suporta apenas 600 extrações/mês para TODOS os clientes.

5. **Sem cache de resultados** — Cada análise é uma chamada nova à IA, mesmo que o mesmo usuário refaça com dados similares.

---

## 6. Recomendações para Viabilidade B2B

### 6.1 Modelo de Precificação Corrigido

| Plano | Preço sugerido | Análises incluídas/seat/mês | Excedente |
|-------|---------------|---------------------------|-----------|
| Starter (1–5 seats) | R$149,90/mês | 20 análises/seat | R$3,50/análise extra |
| Growth (6–20 seats) | R$99,90/seat/mês | 30 análises/seat | R$2,90/análise extra |
| Scale (21–50 seats) | R$79,90/seat/mês | 40 análises/seat | R$2,50/análise extra |
| Enterprise (100+) | Sob consulta | Ilimitado com SLA | — |

### 6.2 Otimizações Técnicas para Reduzir Custo

| Otimização | Economia estimada | Complexidade |
|-----------|------------------|-------------|
| **Cache de análises** (mesmo corpo + mesma foto = resultado cacheado 7 dias) | 30–50% | Baixa |
| **Usar Gemini Flash** para análises simples (escala, cor básica) | 60–70% nessas chamadas | Baixa |
| **Limitar resolução de imagem** antes de enviar à IA (max 1024px) | 20–30% em tokens de input | Baixa |
| **Quota por seat** com contador no banco | Previne abuso | Média |
| **Fallback local** para análise corporal (já existe!) quando IA indisponível | 100% nessas chamadas | Já implementado |
| **Batch de Gemini** (modo batch com 50% desconto) | 50% | Média |
| **Migrar de Lovable Gateway para API direta do Google** | 30–50% (sem markup) | Média |
| **Substituir Firecrawl por scraping próprio** para sites conhecidos | 100% do custo Firecrawl | Alta |

### 6.3 Controles de Negócio Necessários

1. **Implementar contador de análises por usuário/mês** na tabela `profiles`
2. **Dashboard de consumo** para o admin B2B ver quanto seu time está usando
3. **Rate limiting** por seat (ex: max 5 análises/dia)
4. **Alertas de custo** quando um cliente ultrapassa threshold
5. **Tiering de features** — provador virtual apenas em planos Growth+

---

## 7. Projeção de Break-Even

### Com precificação corrigida (R$99,90/seat/mês, Growth):

| Métrica | Valor |
|---------|-------|
| Receita por seat | R$99,90 |
| Custo IA médio/seat (com otimizações) | R$35–45 |
| Custo infra rateado/seat | R$5–10 |
| **Margem bruta/seat** | **R$45–60 (45–60%)** |
| Break-even operacional | ~15 seats pagantes |
| Meta 6 meses | 50 seats = R$4.995/mês receita, ~R$2.500 margem |

### Sem otimizações (modelo atual):

| Métrica | Valor |
|---------|-------|
| Receita por seat (média) | R$14/seat (R$69,90 ÷ 5 seats médios) |
| Custo IA/seat | R$14–46 |
| **Margem bruta** | **Negativa a zero** |

---

## 8. Conclusão e Próximos Passos

### Status atual: ❌ Modelo insustentável para venda B2B real

O produto tem valor claro (análise corporal + colorimetria + provador virtual é diferenciado), mas a precificação atual subsidia o uso de IA sem controle. Para um cliente B2B real:

### Ações imediatas (antes de vender):

1. **Implementar quota de análises** — campo `analyses_used_this_month` no perfil
2. **Repricing** — cobrar por seat/mês (não por faixa) com mínimo de R$79,90/seat
3. **Migrar chamadas simples para Gemini Flash** (5x mais barato)
4. **Cache de 7 dias** para análises idênticas
5. **Dashboard de consumo** para o cliente B2B

### Para o primeiro cliente B2B:

- Oferecer **piloto de 30 dias** com 10 seats a R$499/mês (R$49,90/seat)
- Limitar a 30 análises/seat/mês no piloto
- Monitorar custo real vs. receita
- Ajustar pricing baseado em dados reais de uso

---

*Análise gerada em Maio/2026. Preços de APIs podem variar. Fontes: [Google AI Pricing](https://ai.google.dev), [Firecrawl Pricing](https://firecrawl.dev/pricing), [Supabase Pricing](https://supabase.com/pricing).*

---

## 9. Implementações Realizadas ✅

### 9.1 Sistema de Quotas (Database + Backend + Frontend)

- **Migration SQL** (`20260503000000_add_usage_quota.sql`):
  - Tabela `usage_tracking` com breakdown por feature/mês
  - Campos `monthly_credit_limit`, `credits_used_this_month`, `usage_reset_at` no `profiles`
  - Tabela `analysis_cache` para cache de resultados de IA
  - Funções RPC: `increment_usage()` e `get_usage_status()`
  - Reset automático mensal

- **Middleware de Quota** (`_shared/quota.ts`):
  - `checkAndIncrementQuota()` — verifica e incrementa antes de cada chamada de IA
  - `quotaExceededResponse()` — resposta HTTP 429 padronizada
  - Fail-open: se o sistema de quota falhar, permite (não bloqueia o usuário)

- **Cache de Resultados** (`_shared/cache.ts`):
  - Cache de 7 dias baseado em hash dos inputs
  - Evita chamadas repetidas à IA para mesmos dados
  - Economia estimada: 30–50% em tokens

### 9.2 Otimizações de Modelo (Backend)

- **detect-scale-marker**: Migrado de `gemini-2.5-pro` → `gemini-2.5-flash` (5x mais barato)
- **virtual-tryon advice**: Já estava em `gemini-3-flash-preview` ✓
- **Custo do provador virtual**: 2 créditos (vs 1 para outras features)

### 9.3 Controle de Uso por Feature (Backend)

Cada edge function agora:
1. Verifica quota antes de chamar IA
2. Retorna 429 com info de upgrade se excedeu
3. Registra uso detalhado por feature

| Function | Créditos | Modelo |
|----------|---------|--------|
| analyze-body | 1 | Gemini 2.5 Pro |
| color-analysis | 1 | Gemini 2.5 Pro |
| virtual-tryon | 2 | **FASHN AI v1.6** (imagem) + Gemini Flash (sizing advice) |
| detect-scale-marker | 1 | Gemini 2.5 Flash ⚡ |

### 9.4 Frontend — Dashboard de Uso

- Componente `UsageQuota` no Dashboard mostrando:
  - Barra de progresso de créditos usados/total
  - Breakdown por feature (corpo, cor, try-on, escala)
  - Alerta visual quando >80% ou >95% usado
  - Data de renovação

### 9.5 Repricing B2B (Planos.tsx)

| Plano | Antes | Depois | Análises incluídas |
|-------|-------|--------|-------------------|
| Starter | R$49,90/faixa | R$149,90/seat/mês | 30/seat/mês |
| Growth | R$69,90/faixa | R$99,90/seat/mês | 40/seat/mês |
| Scale | R$99,90/faixa | R$79,90/seat/mês | 60/seat/mês |
| Enterprise | Sob consulta | Sob consulta | Ilimitado |

### 9.6 Projeção de Margem com Otimizações

| Plano Growth (10 seats) | Antes | Depois |
|--------------------------|-------|--------|
| Receita mensal | R$69,90 | R$999,00 |
| Custo IA (com cache + Flash) | R$138,84 | ~R$70–90 |
| Margem bruta | **Negativa** | **~R$900 (90%)** |


---

## 10. Migração do Provador Virtual para FASHN AI ✅

### Motivação
O provador virtual anterior usava Gemini 3 Pro Image (LLM generalista) para gerar imagens de try-on. Problemas:
- Qualidade inconsistente (não é treinado para preservar identidade + transferir roupa)
- Custo alto (~US$0,08–0,14 por geração)
- Sem garantia de fidelidade na textura/padrão da roupa

### Nova Arquitetura

```
Usuário: foto + roupa (upload ou URL)
         │
         ├──→ [FASHN AI v1.6] ──→ Imagem realista (5-8s, US$0,075)
         │    - Modelo de difusão especializado em try-on
         │    - Preserva identidade facial, tom de pele, pose
         │    - Transfere textura/padrão da roupa com fidelidade
         │    - Suporta: tops, bottoms, one-pieces
         │
         └──→ [Gemini Flash] ──→ Consultoria de sizing (US$0,007)
              - Analisa foto da pessoa + foto da roupa
              - Cruza medidas corporais com tabela da marca
              - Recomenda tamanho ideal com justificativa
              - Sugere combinações de look e harmonia de cor
```

### Comparação de Custos

| Componente | Antes (Gemini 3 Pro) | Depois (FASHN + Flash) |
|-----------|---------------------|----------------------|
| Geração de imagem | US$0,08–0,14 | US$0,075 |
| Consultoria de estilo | US$0,007 | US$0,007 |
| Firecrawl (produto) | US$0,027 | US$0,027 |
| **Total por try-on** | **US$0,11–0,17** | **US$0,109** |
| Qualidade da imagem | ⭐⭐ Inconsistente | ⭐⭐⭐⭐⭐ State-of-art |
| Latência | 15–30s | 5–12s |

### Configuração Necessária

1. Criar conta em https://fashn.ai/products/api
2. Obter API key no Developer Dashboard
3. Configurar no Supabase:
   ```bash
   supabase secrets set FASHN_API_KEY=fa-xxxxxxxxxxxxxxxx
   ```

### Limitações do FASHN (transparência):
- Não simula "tamanho P vs M vs G" visualmente
- Não ajusta caimento por medidas (é puramente visual)
- A inteligência de sizing fica com o Gemini Flash (texto)
- Licença comercial ✅ — pode usar em SaaS B2B

### Fluxo de Resposta ao Cliente:
```json
{
  "tryonImage": "data:image/jpeg;base64,...",  // FASHN: imagem realista
  "advice": {
    "size_advice": "Recomendamos M. Sua cintura (78cm) está dentro da faixa M da marca (76-82cm).",
    "fit_notes": ["Manga pode ficar 2cm curta (braço 64cm vs manga 60cm)", "Ombro OK"],
    "confidence": "alta",
    "combinations": [{"title": "Look casual", "pieces": ["Calça reta bege", "Tênis branco"]}],
    "color_harmony": {"harmony_with_skin": "alta", "explanation": "Tom terroso combina com subtom quente"}
  },
  "provider": "fashn-v1.6"
}
```
