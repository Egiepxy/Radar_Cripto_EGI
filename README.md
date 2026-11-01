# Radar Cripto EGI — Central V1.4.1 (01/11/2026)

**O mercado fala. Nós investigamos.**

Projeto público independente dos aplicativos operacionais EGI. Portal de vídeos, notícias verificadas e auditoria dos laboratórios EGI, sem execução de ordens.

- Central oficial: https://egiepxy.github.io/Radar_Cripto_EGI/
- Kit de produção do episódio 01: https://egiepxy.github.io/Radar_Cripto_EGI/producao-episodio-01.html
- Manual Mestre HTML: https://egiepxy.github.io/Radar_Cripto_EGI/manual-mestre.html
- Canal oficial WhatsApp: https://whatsapp.com/channel/0029VbDM7Z51SWsxzjtKLb18
- Feed RSS: https://egiepxy.github.io/Radar_Cripto_EGI/feed.xml
- Roteiro do episódio 01: https://egiepxy.github.io/Radar_Cripto_EGI/roteiro-episodio-01.html

## Arquivos preservados

- `producao-episodio-01.html`: kit V1.4 com roteiro, teleprompter, chamada curta, descrição para YouTube/WhatsApp e checklist, sem vídeo gerado ou publicado.
- `index.html`: portal público responsivo, laboratório, notícias, novidades, avisos, compartilhamento.
- `manual-mestre.html`: **apostila oficial V1.4.1**, com história, tutorial de publicação, segurança, rotina editorial, backup, recuperação e caderno de evolução.
- `painel-editorial.html`: agora somente resgate de JSON de rascunhos antigos armazenados no próprio navegador. O editor funcional e o backup da Central V1.4 estão preservados na pasta `Radar_Cripto_EGI_Privado/` do repositório **privado** `Egiepxy/Meus_Projetos` e são usados via download do HTML, offline.
- `feed.xml`: RSS de novidades. Atualizar MANUALMENTE a cada publicação real.
- `config.js`: links verdadeiros do canal YouTube, Telegram público, fornecedor de formulário e notícias verificadas. Não colocar segredos.
- `privacidade.html`: política e estágio de coleta de dados.
- `roteiro-episodio-01.html`: roteiro, não confundir com vídeo já publicado.
- `assets/logo.svg` / `assets/episodio01.svg`: marca e capa.

## GitHub Pages

Settings → Pages → Build and deployment → Deploy from a branch → `main` → `/(root)` → Save.

Verificar após cada mudança o endereço `https://egiepxy.github.io/Radar_Cripto_EGI/`. Se houver 404, conferir o nome do repositório, branch, pasta, index.html e publicação.

## Acompanhamento por WhatsApp e Telegram (V1.3.1)

- **Canal do WhatsApp (ativo):** link oficial informado e registrado em `config.js → whatsappChannelUrl`: https://whatsapp.com/channel/0029VbDM7Z51SWsxzjtKLb18. Há um botão verde destacado na página inicial e outro na seção Avisos. As notificações de canais podem vir silenciadas.
- **Telegram público (prioritário):** criar canal separado dos alertas privados EGI; colocar `telegramUrl` real em `config.js`.
- **YouTube:** adicionar `youtubeUrl` apenas quando o canal oficial existir.
- **RSS:** `feed.xml` continua funcionando em leitores de notícias; deve ser atualizado manualmente.
- **E-mail:** não é prioridade e o formulário foi removido da Central V1.3; nenhuma coleta ativa.
- As publicações são manuais. O GitHub Pages não envia mensagens por conta própria.

## FP — Frase Padrão oficial EGI

A mensagem completa está na seção “FP” da Central e no capítulo 13 do Manual Mestre. Texto-base:

> Tudo o que apresento aqui faz parte dos meus estudos, experiências e decisões pessoais. Não é recomendação de compra ou venda.
>
> Opero com meu próprio dinheiro, assumo meus riscos e também aprendo com meus erros.
>
> O conselho que dou a mim mesmo todos os dias é: estude antes de investir, calcule o risco, proteja seu capital e nunca deixe a emoção decidir por você.
>
> Compartilho essa experiência porque acredito que podemos aprender juntos, tanto com os acertos quanto com os erros.
>
> **Se essa mensagem fizer sentido para você, siga essa ideia: primeiro proteja seu dinheiro, depois pense no lucro.**
>
> Radar Cripto EGI — O mercado fala. Nós investigamos.

Versão curta nos roteiros de vídeos e no rodapé. Colocar a FP manualmente ao publicar no WhatsApp; não existe envio automático. A FP não substitui transparência, resultados verificáveis ou obrigações legais aplicáveis.

## Regra editorial e laboratório

Só publicar notícias com fonte, data e URL real. Testes com candles fechados devem separar hipótese, retorno retrospectivo, avaliação prospectiva, erro, custo e execução efetiva.

O relatório inicial sobre seis ativos é uma fotografia de 30/10/2026 às 18:44:59 BRT (RelEGI V1.8 (2), +3 candles 15m). +6/+12 permaneciam pendentes no relatório de origem. Não constitui sinal de execução.

## Área editorial privada e migração

- **Código operacional:** repositório privado `Egiepxy/Meus_Projetos`, pasta `Radar_Cripto_EGI_Privado/`. Somente quem possui permissão ao repositório consegue acessar os arquivos na versão atual.
- **Resgate de dados antigos:** abrir `https://egiepxy.github.io/Radar_Cripto_EGI/painel-editorial.html` no MESMO navegador/aparelho/perfil em que se utilizava o editor público, selecionar **Exportar meus rascunhos JSON** e guardar o arquivo.
- **Uso privado:** baixar `painel-editorial.html` do GitHub privado, abrir localmente e usar **Restaurar JSON anteriormente exportado**. O armazenamento do arquivo local não compartilha automaticamente os dados do site público.
- **Backup original:** a pasta privada inclui também `backup-index-publico-v1.4.html` e um `README.md` interno.
- A página pública de resgate lê apenas o `localStorage` do próprio navegador e não envia rascunhos ao GitHub. O editor anterior pode continuar no histórico de commits público; nunca colocar segredos em arquivos públicos.

## Backup recomendado

1. GitHub → Code → Download ZIP: salva a versão do código.
2. Guardar o Manual Mestre em HTML (botão **Salvar HTML** na Central).
3. Se usar o Caderno de Evolução no manual, exportar as notas JSON/TXT e, separadamente, os registros JSON/TXT do Painel Editorial. **Anotações locais não são sincronizadas com o GitHub**.
4. Arquivar, fora do repositório público, relatórios EGI de origem e backups privados; nunca publicar chaves ou listas de assinantes.

## Histórico

- **V1.1 — 01/11/2026:** identidade, vídeos/roteiro, notícias preparadas, laboratório de seis ativos, cadastro inativo e privacidade.
- **V1.2 — 01/11/2026:** RSS público, área Novidades, links de compartilhamento, Manual Mestre HTML, instruções de backup e caderno de evolução offline.
- **V1.3 — 01/11/2026:** Painel Editorial offline (rascunhos e backups), WhatsApp e Telegram prioritários, sem formulário de e-mail. Links ainda não configurados nessa versão.
- **V1.3.1 — 01/11/2026:** Canal oficial do WhatsApp vinculado, botão de destaque na página inicial e Manual Mestre atualizado. Sem notificações automáticas nem coleta de números.
- **V1.3.2 — 01/11/2026:** FP institucionalizada, com página pública, rodapé, roteiro de vídeo e saída editorial. Manual Mestre e histórico atualizados.
- **V1.4 — 01/11/2026:** kit do episódio piloto (teleprompter e textos), links na Central, documentação atualizada; vídeo ainda não publicado.
- **V1.4.1 — 01/11/2026:** editor funcional isolado no repositório privado, snapshot do index V1.4 preservado e página pública anterior transformada apenas em exportador local de JSON. Links retirados da Central; Manual atualizado.

## Primeiro vídeo

O roteiro está em pré-produção. Os estudos históricos de 30/10/2026 não são cotações de hoje. A descrição pronta não significa upload, publicação ou envio automático. Somente após o vídeo estar no YouTube se deve inserir o link real na Central, atualizar RSS e avisar o canal do WhatsApp.

Para atualizações futuras: mudar o índice principal, README, manual e RSS quando houver nova publicação. Registrar decisões e falhas antes de substituir versões.

**Conteúdo educacional. Sem ordens e sem promessa de lucro.**
