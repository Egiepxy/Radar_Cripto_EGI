# Robô RadarMME1 EGI V1.0 LAB

Monitor de estudo técnico separado do **RadarMME1 Light V9.1.1**, sem executar ordens nem alterar o SetupDT.

**Origem da lógica:** [Egiepxy/SetupDT — public/index6.html](https://github.com/Egiepxy/SetupDT/blob/main/public/index6.html).
**Blob de origem:** de0e92badcbe54f17d052472dbf34837726a9e51. O arquivo \`radar-mme1/engine-original.js\` contém as funções de análise do original (MME9/21, IQE, RelOk, pivô e risco) preservadas, mas o executor de GitHub e a interface web são novos. Isso não reproduz todos os controles da interface original, nem substitui a aprovação GPT/humana.

## Funcionamento

- Universo **Top 50 Binance Spot USDT por volume financeiro 24h**, conforme seleção do RadarMME1 original. O BTC entra quando está nesse Top (normalmente). Exclui stablecoins e tokens alavancados.
- **15m** é o gatilho; **1h e 4h** são contexto, sem bloquear automaticamente uma reversão válida de 15m por estarem em sentido oposto.
- **MME9/21**, inclinação, separação, pullback/rejeição, entrada esticada, pivô confirmado 2+2, ATR14 e stop técnico.
- **PREPARAR** não é entrada. **LONG/SHORT técnico** é elegível apenas se o RadarMME1 classificou LONG/SHORT, RelOk APROVADO com nota mínima **97/100**, candle 15m fechado e atual, stop válido, filtro de risco e bid/ask disponíveis.
- **Notificações ntfy** no tópico \`RadarMME1_11\`: novos candidatos de LONG/SHORT, transições PREPARAR (Score >=70), além dos eventos simulados **1R, 2R e STOP**. Os alertas têm deduplicação por estado e histórico; filas são preservadas após falhas. A primeira coleta registra estado, mas não notifica sinais antigos.
- O robô **não envia ordens**. Estudos de entrada/stop/alvos são hipotéticos e avaliam candles de 15m posteriores. Se stop e alvo são tocados no mesmo candle, registra **INDETERMINADO**, sem contabilizar ganho.
- A coleta usa GitHub Actions em agenda tentativa a cada 15 minutos. O painel lê apenas snapshots concluídos, por isso pode não estar atualizado exatamente no minuto. Se a API não responder, o robô não inventa preços.
- **Mensagens ntfy e arquivos JSON são públicos**, sem saldos, chaves ou dados de carteira. O tópico pode ser visto ou utilizado por terceiros. Não coloque segredos ali.

## Links
- Painel: https://egiepxy.github.io/Radar_Cripto_EGI/radar-mme1/
- Workflow: https://github.com/Egiepxy/Radar_Cripto_EGI/actions/workflows/radar-mme1-egi.yml
- ntfy: https://ntfy.sh/RadarMME1_11

## Arquivos
- \`radar-mme1/robot.js\`: executor Node.js 20
- \`radar-mme1/engine-original.js\`: funções preservadas do RadarMME1 original
- \`radar-mme1/test_robot.js\`: testes offline sem ordens
- \`data/radar-mme1-latest.json\`: último snapshot público
- \`data/radar-mme1-history.json\`: histórico de estudos hipotéticos
- \`data/radar-mme1-state.json\`: deduplicação e fila de ntfy

## Teste e operação

1. Abra o workflow no GitHub Actions e selecione **Run workflow** (ou aguarde o agendamento).
2. Verifique se os testes passaram e se o snapshot apareceu em \`data/radar-mme1-latest.json\`.
3. Assine o tópico **RadarMME1_11** no app ntfy do Android.
4. Abra o painel para acompanhar candidatos. Não é obrigatório manter a página aberta.
5. Para parar notificações, mude \`NTFY_ENABLED\` para \`"false"\` no workflow; para parar coleta, desative workflow.

**Limitações:** RelOk e IQE são pontuações heurísticas, não probabilidades ou backtest. A pontuação 97 é o padrão do robô original, não uma garantia. Sem aprovação humana/GPT automática. Sem taxas finais, latência, slippage nem execução real. A precisão e o desempenho precisam ser auditados após amostra suficiente.

**Regra EGI:** O indicador sugere; o candle fechado confirma.
