# Análise Competitiva, Acurácia e Unit Economics — provAI MVP

## 1. Análise Competitiva: provAI vs Mercado

### Concorrentes Diretos

| Feature | Zara VTON | FASHN AI | AI Wardrobe | DRESSX | **provAI** |
|---------|-----------|----------|-------------|--------|-----------|
| Virtual try-on (imagem) | ✅ Avatar 3D | ✅ Difusão | ❌ | ✅ | ✅ FASHN |
| Recomendação de tamanho | ❌ | ❌ | ❌ | ❌ | ✅ **Diferencial** |
| Colorimetria pessoal | ❌ | ❌ | ❌ | ❌ | ✅ **Diferencial** |
| Análise corporal com medidas | ❌ | ❌ | ❌ | ❌ | ✅ **Diferencial** |
| Extração de tabela de medidas | ❌ | ❌ | ❌ | ❌ | ✅ Firecrawl |
| Organização de closet | ❌ | ❌ | ✅ | ❌ | ❌ |
| B2B multi-seat | ❌ | ✅ API | ❌ | ✅ Enterprise | ✅ |
| Modelo de negócio | Interno | API/SaaS | B2C sub | B2B enterprise | B2B SaaS |
| Preço | Grátis (app Zara) | US$0.075/img | US$9.99/mês | Enterprise | R$79-149/seat |

### O que a Zara faz (benchmark):
- Selfie + foto corpo inteiro → avatar hiper-realista
- Usuário escolhe peça do catálogo → vê no avatar
- Integrado no app da Zara (não é SaaS externo)
- **Não recomenda tamanho** — só mostra visualmente

### Onde o provAI ganha:
1. **Sizing inteligente** — nenhum concorrente cruza medidas reais com tabela da marca
2. **Colorimetria** — nenhum concorrente oferece análise de cor integrada
3. **B2B para consultoras** — mercado não atendido pelos grandes players
4. **Calibração de escala** — marcador físico para precisão real em cm

---

## 2. Análise de Acurácia do MVP

### 2.1 Análise Corporal (Gemini Vision)

| Métrica | Estimativa | Benchmark clínico | Gap |
|---------|-----------|-------------------|-----|
| Altura (com calibração) | ±1-2cm | Estadiômetro ±0.5cm | Aceitável |
| Altura (sem calibração) | ±3-5cm | — | Precisa melhorar |
| Cintura | ±3-5cm | Fita métrica ±1cm | Aceitável para sizing |
| Quadril | ±3-5cm | Fita métrica ±1cm | Aceitável para sizing |
| Busto | ±4-6cm | Fita métrica ±1cm | Marginal |
| % Gordura (CUN-BAE) | ±4 p.p. | DEXA ±1.5 p.p. | Estimativa, não clínico |
| % Gordura (Navy) | ±3 p.p. | DEXA ±1.5 p.p. | Bom para triagem |

### 2.2 Recomendação de Tamanho

| Cenário | Acurácia esperada | Justificativa |
|---------|------------------|---------------|
| Com medidas manuais + tabela da marca | **90-95%** | Cruza dados reais com dados reais |
| Com foto + calibração + tabela | **80-85%** | Medidas estimadas ±3cm, mas tabela é real |
| Com foto sem calibração | **65-75%** | Depende de altura informada como referência |
| Sem foto, sem medidas | **50-60%** | Apenas heurísticas populacionais |

### 2.3 Colorimetria (Gemini Vision)

| Métrica | Estimativa | Benchmark |
|---------|-----------|-----------|
| Acerto da estação (12) | ~70-80% | Consultora presencial ~85-90% |
| Acerto da família (4) | ~85-90% | Consultora presencial ~95% |
| Subtom (quente/frio/neutro) | ~80-85% | Draping presencial ~90% |

### 2.4 Provador Virtual (FASHN AI)

| Métrica | FASHN v1.6 | Gemini (anterior) |
|---------|-----------|-------------------|
| Preservação de identidade | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Fidelidade da textura | ⭐⭐⭐⭐ | ⭐⭐ |
| Naturalidade do caimento | ⭐⭐⭐⭐ | ⭐⭐ |
| Latência | 5-8s | 15-30s |
| Custo | US$0.075 | US$0.08-0.14 |

### 2.5 Limitações Honestas do MVP

1. **Medidas por foto são estimativas** — erro de ±3-5cm é aceitável para sizing (P/M/G) mas não para alfaiataria
2. **Colorimetria por foto depende da iluminação** — luz artificial pode distorcer subtom
3. **Provador virtual não simula tamanhos** — mostra a roupa, não mostra "como ficaria apertado"
4. **Sem validação clínica** — % gordura é estimativa, não substitui DEXA
5. **Extração de tabela de medidas depende do site** — nem toda loja tem tabela estruturada

### 2.6 O que é suficiente para vender B2B

Para uma consultora de imagem ou loja, o MVP precisa:
- ✅ Acertar o tamanho em 80%+ dos casos → **SIM, com medidas manuais**
- ✅ Gerar imagem de try-on convincente → **SIM, com FASHN**
- ✅ Identificar a estação cromática corretamente → **SIM, 70-80%**
- ✅ Ser mais rápido que fazer manualmente → **SIM, 30s vs 45min**
- ✅ Ter interface profissional → **PRECISA MELHORAR** (ver seção 3)

---

## 3. Melhorias Críticas no Frontend para Competir

### 3.1 Problemas Atuais

| Problema | Impacto | Prioridade |
|----------|---------|-----------|
| Landing page genérica (parece template) | Não converte visitante em trial | 🔴 Alta |
| Fluxo pós-login confuso (muitas rotas) | Usuário se perde | 🔴 Alta |
| Sem onboarding guiado | Usuário não sabe por onde começar | 🔴 Alta |
| Sem resultado visual impactante | Não gera "wow" para compartilhar | 🟡 Média |
| Sem social proof real (números fake) | Não gera confiança | 🟡 Média |
| Mobile-first fraco | 80% do público usa celular | 🔴 Alta |
| Sem loading states elegantes | Parece quebrado durante processamento | 🟡 Média |

### 3.2 Melhorias Prioritárias (o que implementar agora)

**1. Landing page com vídeo/demo real**
- Gravar 15s de tela mostrando o fluxo real (foto → resultado)
- Substituir o scanner animado por um GIF/vídeo real do produto
- Adicionar 1-2 depoimentos reais (mesmo que de beta testers)

**2. Onboarding em 3 passos após login**
- Step 1: "Tire sua foto" (com guia visual)
- Step 2: "Informe suas medidas" (opcional, melhora precisão)
- Step 3: "Cole o link da roupa" (ou escolha do catálogo)
- Resultado: imagem + tamanho + paleta

**3. Resultado compartilhável**
- Card bonito com: foto try-on + tamanho recomendado + paleta de cores
- Botão "Compartilhar" (gera imagem para WhatsApp/Instagram)
- Isso vira marketing orgânico

**4. Mobile-first redesign**
- Botões grandes, touch-friendly
- Camera nativa do celular (não upload de arquivo)
- Swipe entre resultados

**5. Pricing com trial real**
- "3 análises grátis" visível em todo lugar
- Sem pedir cartão para trial
- Upgrade suave quando acabar

---

## 4. Análise CAC e Unit Economics B2B

### 4.1 Custos Fixos Mensais

| Item | Custo | Notas |
|------|-------|-------|
| Supabase Pro | US$25/mês | DB + Auth + Edge Functions |
| Vercel Pro | US$20/mês | Frontend hosting |
| Domínio | ~US$12/ano | .app ou .com.br |
| **Total fixo** | **~US$47/mês** | |

### 4.2 Custos Variáveis por Uso

| Ação | Custo unitário | Modelo |
|------|---------------|--------|
| Análise corporal | US$0.003-0.005 | Gemini Flash (direto) |
| Colorimetria | US$0.003-0.005 | Gemini Flash (direto) |
| Provador virtual | US$0.075 | FASHN AI |
| Extração de produto | US$0.005-0.03 | Firecrawl ou fetch direto |
| Detecção de escala | US$0.001-0.002 | Gemini Flash |

**Nota importante:** Com a API direta do Google (free tier), as análises de corpo e cor custam **ZERO** até 1M tokens/dia no Gemini Flash. Isso muda completamente a economia.

### 4.3 Custo por Seat Ativo (cenário real)

| Perfil de uso | Análises/mês | Try-ons/mês | Custo IA/mês |
|--------------|-------------|-------------|-------------|
| Consultora leve | 10 | 5 | US$0.42 (~R$2.20) |
| Consultora ativa | 25 | 15 | US$1.20 (~R$6.24) |
| Loja intensa | 50 | 30 | US$2.40 (~R$12.48) |

### 4.4 Margem por Plano

| Plano | Receita/seat | Custo variável/seat | Custo fixo rateado | **Margem bruta** |
|-------|-------------|--------------------|--------------------|-----------------|
| Starter (R$149.90, 5 seats) | R$29.98/seat | R$6.24 | R$4.90 | **R$18.84 (63%)** |
| Growth (R$99.90/seat) | R$99.90 | R$6.24 | R$2.45 | **R$91.21 (91%)** |
| Scale (R$79.90/seat) | R$79.90 | R$12.48 | R$1.22 | **R$66.20 (83%)** |

### 4.5 CAC (Custo de Aquisição de Cliente)

| Canal | CAC estimado | LTV (12 meses) | LTV/CAC |
|-------|-------------|----------------|---------|
| Indicação (consultoras) | R$0-50 | R$1.199 (Growth anual) | 24-∞ |
| Instagram/TikTok orgânico | R$100-200 | R$1.199 | 6-12x |
| Google Ads (consultora de imagem) | R$150-300 | R$1.199 | 4-8x |
| Parceria com escolas de moda | R$50-100 | R$1.199 | 12-24x |
| Cold outreach (lojas) | R$200-500 | R$4.794 (Scale 4 seats) | 10-24x |

### 4.6 Break-Even

| Cenário | Seats necessários | Receita mensal | Tempo estimado |
|---------|------------------|---------------|----------------|
| Cobrir custos fixos | 1 seat Growth | R$99.90 | Mês 1 |
| Cobrir fixo + seu tempo (R$5k) | 55 seats | R$5.100 | 3-6 meses |
| Lucrativo (R$10k/mês) | 120 seats | R$10.800 | 6-12 meses |

### 4.7 Cenário de Validação (Primeiro Cliente)

**Oferta piloto:**
- 30 dias grátis, 5 seats, 100 análises incluídas
- Custo real para vocês: ~R$30 (IA) + R$47 (infra) = R$77
- Se converter: R$149.90/mês recorrente
- **Payback do piloto: 16 dias**

---

## 5. Roadmap de Prioridades para MVP Competitivo

### Sprint 1 (esta semana) — Funcionar de verdade
- [ ] Deploy das Edge Functions no Supabase (CLI)
- [ ] Configurar GEMINI_API_KEY (free tier Google)
- [ ] Configurar FASHN_API_KEY (10 créditos grátis)
- [ ] Executar migrations no banco
- [ ] Testar fluxo completo: foto → análise → try-on

### Sprint 2 (próxima semana) — Frontend competitivo
- [ ] Redesign mobile-first da captura guiada
- [ ] Loading states com animação de scanner
- [ ] Resultado em card compartilhável (WhatsApp)
- [ ] Onboarding guiado (3 steps visuais)
- [ ] Remover pricing fake, colocar "3 análises grátis"

### Sprint 3 (semana 3) — Validação com cliente real
- [ ] Gravar vídeo demo de 60s
- [ ] Criar deck de vendas (5 slides)
- [ ] Abordar 10 consultoras de imagem no Instagram
- [ ] Oferecer piloto gratuito de 30 dias
- [ ] Coletar feedback e iterar

### Sprint 4 (semana 4) — Escalar
- [ ] Implementar quotas reais (já codificado)
- [ ] Stripe/Pix para cobrança
- [ ] Dashboard de uso para o cliente B2B
- [ ] Programa de indicação (consultora indica consultora)

---

## 6. Conclusão

### O provAI é viável como negócio?

**SIM**, com as seguintes condições:
1. O custo de IA caiu drasticamente com Gemini Flash free tier
2. O FASHN a US$0.075/try-on é sustentável com pricing de R$99.90/seat
3. A margem bruta é 83-91% nos planos Growth/Scale
4. O diferencial (sizing + colorimetria + try-on integrados) não existe em nenhum concorrente

### O que falta para o primeiro cliente pagar:

1. **Edge Functions deployadas** (bloqueador técnico)
2. **1 demo real funcionando** (foto → resultado completo)
3. **Landing page com resultado real** (não animação)
4. **Abordagem comercial** (Instagram DM para consultoras)

O produto está 80% pronto tecnicamente. O gap é operacional (deploy) e comercial (vender).
