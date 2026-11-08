# RadarMME1 EGI V1.1 MULTIMERCADOS LAB

**Painel unificado:** https://egiepxy.github.io/Radar_Cripto_EGI/radar-mme1/index-multi.html

## Visão geral

O robô Spot original continua separado e intacto. O módulo Futures acrescenta sete contratos de Binance USD-M e BTCUSDT Futures como referência. O painel unificado lê os dois snapshots sem misturar o significado dos preços.

| Símbolo Binance Futures | Referência |
|---|---|
| MUUSDT | Micron |
| SNDKUSDT | Sandisk |
| SPCXUSDT | SpaceX |
| NVDAUSDT | Nvidia |
| TSLAUSDT | Tesla |
| BZUSDT | Brent |
| XAUUSDT | Ouro |
| BTCUSDT | BTC Futures (referência adicional) |

Todos os sete ativos tradicionais são contratos perpétuos, sem posse das ações ou commodities.

## Regras técnicas

- Motor do RadarMME1 Light V9.1.1, reutilizado sem alterações: MME9/21, inclinação, pullback/rejeição, Score, IQE, RelOk, ATR14, pivô confirmado 2+2, stop técnico.
- **15m:** gatilho. **1h/2h/4h:** contexto, sem bloquear automaticamente o sinal oposto no 15m.
- **PREPARAR:** apenas observação. **LONG/SHORT candidato:** estado confirmado, RelOk APROVADO >=97/100, candle fechado atual, bid/ask e filtro de risco válidos.
- **Correlação:** coeficiente de Pearson dos retornos logarítmicos alinhados de 1h contra BTCUSDT Futures, mínimo de 20 retornos coincidentes. Não é probabilidade, causalidade ou previsão. O Nasdaq não é coletado.
- **Cesta de cinco ações:** conta os estados LONG/SHORT de MU, SNDK, SPCX, NVDA e TSLA em 1h, não equivale a um índice acionário.
- **STOPs consecutivos NÃO bloqueiam sinais.** O laboratório serve para avaliar erros, acertos, condições e resultados de todos os sinais.
- **Auditoria:** estudos virtuais de stop, 1R e 2R após os sinais. Quando stop e alvo aparecem no mesmo candle, classifica INDETERMINADA. Sem ordens ou simulação real de taxas, slippage, funding ou execução.

## Como rodar e testar

1. Abra https://github.com/Egiepxy/Radar_Cripto_EGI/actions/workflows/radar-mme1-futures-egi.yml
2. Clique em **Run workflow** ou aguarde a execução automática, agendada a cada 15 minutos (sujeita a atraso do GitHub Actions).
3. Os testes sem rede são executados antes da coleta: node radar-mme1/test_robot.js e node radar-mme1/test_futures.js.
4. Consulte o snapshot publicado em data/radar-mme1-futures-latest.json e o painel unificado.
5. Assine https://ntfy.sh/RadarMME1_11. O robô marca os novos avisos como MULTI e não republica sinais antigos na primeira coleta.

O novo robô usa endpoints públicos da Binance Futures e não usa chaves, autenticação nem APIs de execução de ordens.

## Diagnóstico e segurança

- HTTP 451 ou qualquer bloqueio da API: marca a fonte como indisponível. **Não inventa preços e não confunde última coleta com dados ao vivo.**
- Símbolo sem negociação ativa: fica sem sinal. Coleta incompleta: status PARCIAL.
- Histórico e dados são públicos no repositório; o tópico ntfy também é público. Nunca adicionar informações pessoais.
- O mercado de ações americano tem horários próprios. Contratos Binance TradFi Perps funcionam 24/7, mas liquidez, preço e spread podem variar nos períodos sem negociação da ação subjacente.
- O resultado RelOk 97/100 é pontuação heurística de filtro técnico, não 97% de taxa de acerto.
- O benchmark é o **BTC Futures**, não Nasdaq ou S&P 500; a associação com mercados americanos é hipótese de pesquisa para validar com amostra histórica.

## Arquivos

- radar-mme1/futures-robot.js — coletor Node.js somente leitura.
- radar-mme1/test_futures.js — testes offline.
- radar-mme1/index-multi.html — painel conjunto.
- .github/workflows/radar-mme1-futures-egi.yml — execução agendada.
- data/radar-mme1-futures-latest.json — snapshot.
- data/radar-mme1-futures-history.json — histórico virtual.
- data/radar-mme1-futures-state.json — deduplicação e fila do ntfy.

**Regra EGI:** O indicador sugere; o candle fechado confirma. O radar não executa operações reais.
