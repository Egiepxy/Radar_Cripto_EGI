# Robô Detector AMD EGI V1.0 LAB

Monitoramento educativo de **BTC, XRP, SOL, ETH, LINK e PEPE** na Binance Spot (pares USDT), sem chaves de exchange e sem execução de ordens.

## Como funciona
- GitHub Actions executa por agendamento tentativo de **15 em 15 minutos** (minutos 07, 22, 37, 52, UTC) e também pelo botão **Run workflow**.
- Coleta **15m, 1h, 2h, 4h, 1d**, apenas candles encerrados. O diário da Binance é UTC.
- Detecta: A? compressão de faixa; M? varredura superior/inferior e retorno; D? rompimento com volume >= 1,3x média dos 20 candles anteriores. **Não é AMD comprovada; é uma heurística.**
- Calcula RSI14, EMA200 diária, semáforo BTC e ranking de força: variação percentual no último candle fechado do ativo **menos** BTC no mesmo período; score ponderado de múltiplos períodos.
- Registra eventos e audita após **2h, 4h, 24h**, usando o primeiro candle de 15m encerrado após cada horizonte, quando há dados. Trata acerto de **direção**, não lucro/stop/risco-retorno.
- Envia alertas de novos eventos M?/D?, mudanças de força 2h (FORTE/FRACO) e troca do semáforo BTC, para o tópico **DetectorAmd_11** via ntfy. Não envia notificações para eventos antigos na primeira execução.
- Deduplica eventos usando ativo/período/tipo/horário do fechamento, mantém fila de notificação em caso de falha, e conserva até 250 eventos de histórico.
- Publica snapshot aproximadamente **a cada hora**, ou antes se houver evento ou auditoria. O painel web lê o JSON gerado pelo GitHub; o usuário não precisa manter a aba aberta.

## Links
- Painel: https://egiepxy.github.io/Radar_Cripto_EGI/detector-amd/
- GitHub Actions: https://github.com/Egiepxy/Radar_Cripto_EGI/actions/workflows/detector-amd-egi.yml
- ntfy: https://ntfy.sh/DetectorAmd_11

## Dados persistidos
- data/detector-amd-latest.json: último snapshot, ranking e últimas 30 hipóteses
- data/detector-amd-history.json: eventos e auditoria (máximo 250)
- data/detector-amd-state.json: semáforo, classes, fila ntfy e prevenção de duplicidade

Todos são públicos neste repositório. **Não guardar senhas, posições, saldos ou chaves nesses arquivos**. Tópicos ntfy públicos podem ser lidos/publicados por terceiros; não enviar dados confidenciais.

## Limitações
GitHub Actions não garante disparo exato no minuto, e agendas podem atrasar ou falhar. Em repositórios públicos, rotinas agendadas podem ser desativadas após longo período de inatividade. API Binance pode estar indisponível/restrita na região do executor. Se o BTC estiver incompleto, a execução falha em vez de fabricar ranking. A execução é apenas monitoramento; não é robô trader nem sistema financeiro validado. Sem VWAP anual, sem backtest de desempenho; não assumir precisão.

## Teste
1. Abra Actions > **Robo Detector AMD EGI** > **Run workflow**. Espere a execução terminar.
2. Confira data/detector-amd-latest.json e o painel. Na primeira execução, nenhuma notificação de sinal antigo será enviada.
3. Inscreva o Android no ntfy **DetectorAmd_11**. Alertas de eventos novos deverão aparecer quando as condições acontecerem.
4. Para desativar mensagens: altere \`NTFY_ENABLED\` para \`"false"\` no workflow. Para pausar toda a automação: desative o workflow no GitHub.

**Regra EGI:** O indicador sugere; o candle fechado confirma.
