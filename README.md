# Radar Cripto EGI — Central V1.3 (01/11/2026)

**O mercado fala. Nós investigamos.**

Projeto público independente dos aplicativos operacionais EGI. Portal de vídeos, notícias verificadas e auditoria dos laboratórios EGI, sem execução de ordens.

- Central oficial: https://egiepxy.github.io/Radar_Cripto_EGI/
- Manual Mestre HTML: https://egiepxy.github.io/Radar_Cripto_EGI/manual-mestre.html
- Feed RSS: https://egiepxy.github.io/Radar_Cripto_EGI/feed.xml
- Roteiro do episódio 01: https://egiepxy.github.io/Radar_Cripto_EGI/roteiro-episodio-01.html

## Arquivos preservados

- `index.html`: portal público responsivo, laboratório, notícias, novidades, avisos, compartilhamento.
- `manual-mestre.html`: **apostila oficial V1.2**, com história, tutorial de publicação, segurança, rotina editorial, backup, recuperação e caderno de evolução.
- `painel-editorial.html`: Painel Editorial V1.3 de rascunhos locais com exportação JSON/TXT e compartilhamento manual. NÃO publica automaticamente.
- `feed.xml`: RSS de novidades. Atualizar MANUALMENTE a cada publicação real.
- `config.js`: links verdadeiros do canal YouTube, Telegram público, fornecedor de formulário e notícias verificadas. Não colocar segredos.
- `privacidade.html`: política e estágio de coleta de dados.
- `roteiro-episodio-01.html`: roteiro, não confundir com vídeo já publicado.
- `assets/logo.svg` / `assets/episodio01.svg`: marca e capa.

## GitHub Pages

Settings → Pages → Build and deployment → Deploy from a branch → `main` → `/(root)` → Save.

Verificar após cada mudança o endereço `https://egiepxy.github.io/Radar_Cripto_EGI/`. Se houver 404, conferir o nome do repositório, branch, pasta, index.html e publicação.

## Acompanhamento por WhatsApp e Telegram (V1.3)

- **Canal do WhatsApp (prioritário):** criar e confirmar o link público do canal; colocá-lo em `config.js → whatsappChannelUrl`. As notificações de canais podem vir silenciadas.
- **Telegram público (prioritário):** criar canal separado dos alertas privados EGI; colocar `telegramUrl` real em `config.js`.
- **YouTube:** adicionar `youtubeUrl` apenas quando o canal oficial existir.
- **RSS:** `feed.xml` continua funcionando em leitores de notícias; deve ser atualizado manualmente.
- **E-mail:** não é prioridade e o formulário foi removido da Central V1.3; nenhuma coleta ativa.
- As publicações são manuais. O GitHub Pages não envia mensagens por conta própria.

## Regra editorial e laboratório

Só publicar notícias com fonte, data e URL real. Testes com candles fechados devem separar hipótese, retorno retrospectivo, avaliação prospectiva, erro, custo e execução efetiva.

O relatório inicial sobre seis ativos é uma fotografia de 30/10/2026 às 18:44:59 BRT (RelEGI V1.8 (2), +3 candles 15m). +6/+12 permaneciam pendentes no relatório de origem. Não constitui sinal de execução.

## Backup recomendado

1. GitHub → Code → Download ZIP: salva a versão do código.
2. Guardar o Manual Mestre em HTML (botão **Salvar HTML** na Central).
3. Se usar o Caderno de Evolução no manual, exportar as notas JSON/TXT e, separadamente, os registros JSON/TXT do Painel Editorial. **Anotações locais não são sincronizadas com o GitHub**.
4. Arquivar, fora do repositório público, relatórios EGI de origem e backups privados; nunca publicar chaves ou listas de assinantes.

## Histórico

- **V1.1 — 01/11/2026:** identidade, vídeos/roteiro, notícias preparadas, laboratório de seis ativos, cadastro inativo e privacidade.
- **V1.2 — 01/11/2026:** RSS público, área Novidades, links de compartilhamento, Manual Mestre HTML, instruções de backup e caderno de evolução offline.
- **V1.3 — 01/11/2026:** Painel Editorial offline (rascunhos e backups), WhatsApp e Telegram prioritários, sem formulário de e-mail. Links dos canais ainda não configurados.

Para atualizações futuras: mudar o índice principal, README, manual e RSS quando houver nova publicação. Registrar decisões e falhas antes de substituir versões.

**Conteúdo educacional. Sem ordens e sem promessa de lucro.**
