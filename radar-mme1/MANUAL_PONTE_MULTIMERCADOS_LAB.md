# RadarMME1 EGI PONTE Multimercados LAB V1.0

## Objetivo e isolamento
A versão experimental reusa o motor **engine-original.js** do RadarMME1 (MME9/21, IQE, RelOk, pivô 2+2, risco, candle fechado), sem alterar o Spot original **robot.js**, seus dados, suas notificações ou o SetupDT. Nao executa ordens nem envia ntfy.

## Fontes da validação de 08/11/2026 (16:41 BRT)
- BTC: Binance Spot BTCUSDT.
- MU: MEXC Futures MUSTOCK_USDT.
- SNDK: MEXC Futures SNDKSTOCK_USDT.
- SPCX: MEXC Futures SPCXSTOCK_USDT.
- OIL: MEXC Futures UKOIL_USDT.
- XAU: MEXC Futures XAU_USDT.
- NVDA e TSLA: fonte pendente, sem fabricar leitura.
**Importante:** esses contratos nao devem ser apresentados como os mesmos contratos da Binance Futures. UKOIL_USDT nao equivale a BZUSDT.

## Timeframes e criterio de sinal
- 15m = gatilho; 1h e 4h = contexto; 2h = agregado de exatamente dois candles de 1h consecutivos, fechados e alinhados em UTC. 1h/2h/4h nao bloqueiam automaticamente o 15m contrário.
- So um candle fechado de 15m pode gerar candidato tecnico, quando: LONG/SHORT + RelOk APROVADO >=97 + bid/ask valida + risco tecnico valido + dado ATUAL.
- Os scores sao heurísticos e nao correspondem a porcentagens empiricas de acerto.
- PREPARAR e estado de observacao, nao de entrada.
- Na primeira coleta os eventos nao geram alerta, evitando publicacao retrospectiva. Dedupliação depende do estado salvo entre execuções.

## Teste automatizado aprovado
Execução: https://github.com/Egiepxy/Radar_Cripto_EGI/actions/runs/42516273355

- Testes sem rede: PASSOU.
- Coleta: 6/8 ativos analisados com candles fechados atuais.
- Sem fonte validada: Nvidia e Tesla.
- Candidatos RelOk>=97: 0.
- Alertas simulados nesta rodada: 0.
- Estado: PARCIAL por haver fontes pendentes.
- Snapshot e log: artifact `radar-mme1-ponte-lab` no workflow (retencao de 14 dias).

## Como testar e auditar
1. Abrir o workflow [RadarMME1 PONTE Multimercados LAB](https://github.com/Egiepxy/Radar_Cripto_EGI/actions/workflows/radar-mme1-ponte-lab.yml).
2. Selecionar branch `fix/radarmme1-futures-coleta-independente-20261108` e executar manualmente.
3. Abrir a execução, baixar o artifact, analisar `data/radar-mme1-ponte-lab-latest.json`.
4. Conferir separadamente os timestamps de candles, fonte de cada linha, score, possíveis erros e lista de sinais simulados.

## O que falta antes da operação automática/ntfy
- Localizar e validar fontes para Nvidia e Tesla.
- Auditoria de alguns ciclos completos de sinais por ativo/fonte, incluindo 1R/2R/STOP sem look-ahead.
- Persistir `state.json` e o histórico entre rodadas; o workflow de teste usa runner temporário, sem estado entre as execuções.
- Validar deduplicação, atraso, spreads, indisponibilidade de mercado e alertas de erro antes de publicar mensagens.
- Configurar rotina automática e ntfy somente em versão aprovada; workflows agendados do GitHub rodam pela branch padrão, entao este LAB nao e um servico automatico permanente.

**Regra EGI:** preservar o que funciona, testar em LAB. O indicador sugere; o candle fechado confirma.
