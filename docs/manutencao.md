# Stock Control — Guia de Manutenção

Leia antes de alterar qualquer coisa neste projeto.

**O que este sistema é:** PWA offline-first de controle de estoque para pequenos estabelecimentos, com geração de pedido de compra em PDF. Está em uso real em um estabelecimento em Basileia, Suíça.

**Repositório:** https://github.com/Vitorenriks/Stock-Control
**Publicação:** https://vitorenriks.github.io/Stock-Control/

---

## Stack

Vanilla JavaScript, sem build, sem backend, sem gerenciador de pacotes.

| Camada | O que é |
|---|---|
| Interface | HTML + Tailwind CSS via play CDN **servido localmente** (`libs/tailwindcss.js`) |
| Ícones | Font Awesome local (`libs/fontawesome.min.css` + `libs/webfonts/`) |
| PDF | `libs/html2pdf.bundle.min.js` + `libs/jspdf.umd.min.js` |
| Persistência | `localStorage` do navegador |
| Offline | Service Worker (`sw.js`), cache-first com precache |

**Nenhuma dependência é baixada da internet em runtime.** Tudo em `libs/` é versionado no repositório — é isso que faz o app funcionar offline de verdade. `.gitattributes` marca `libs/**` como binário para não poluir diffs.

---

## Como rodar

Precisa de servidor HTTP: `file://` não registra Service Worker.

```bash
py -m http.server 8777 --bind 127.0.0.1
# abrir http://127.0.0.1:8777/
```

Não há `npm install`, lint, typecheck nem suíte de testes no repositório.

---

## Arquivos

```text
index.html        toda a marcação: 3 abas, 3 modais, área de impressão do PDF
js/i18n.js        window.InventoryI18n — dicionários (4 idiomas), moedas, detecção de locale
js/ui.js          window.InventoryUI   — templates HTML puros + escapar()
js/app.js         estado, regra de reposição, renderização, persistência, PDF
sw.js             cache offline (PRECACHE_URLS)
manifest.json     metadados do PWA
docs/             documentação técnica: arquitetura, regras de negócio, decisões
```

Ordem de carregamento obrigatória: `i18n.js` → `ui.js` → `app.js`. `app.js` desestrutura `window.InventoryI18n` e `window.InventoryUI` no topo e quebra se a ordem mudar.

---

## Gotchas que custam tempo

1. **Alterou arquivo? Bump em `CACHE_VERSION` (`sw.js`).** Sem isso o Service Worker continua servindo a versão antiga e a mudança "não aparece". Arquivo novo também precisa entrar em `PRECACHE_URLS`.

2. **Chave de i18n nova vai nos 4 idiomas.** `pt-BR`, `it-IT`, `en-US`, `de-DE` devem ter exatamente o mesmo conjunto de chaves. Não há texto fixo em português na interface — tudo passa por `t()`.

3. **`js/ui.js` é a fronteira de escape.** Todo valor interpolado em template HTML passa por `escapar()`. Backups `.json` circulam por WhatsApp: são entrada não confiável. `normalizarProduto()` em `app.js` coage tipos na entrada; `escapar()` protege na saída. Não introduza `innerHTML` com valor de produto fora desses dois pontos.

4. **`id` de produto vai para dentro de `onclick="..."`.** Por isso `normalizarProduto()` força `Number`. Nunca aceite id vindo de arquivo sem coagir.

5. **Dark mode é `class` no `<html>`**, aplicado por script inline no `<head>` antes da primeira pintura. Toda cor nova precisa do par `dark:`.

6. **Não re-renderize dentro do evento `input`.** Isso mata o foco do campo de quantidade. O padrão em uso: `input` → só atualiza números (`atualizarTotais()`); `change` → re-render completo com `renderizarPreservandoFoco()`.

---

## Estrutura dos dados em `localStorage`

```text
app_data              { version: '2.2', configuracoes: {empresa, idioma, moeda}, itens: [] }
lista_produtos        espelho legado do array de itens — mantido só para backups antigos
nome_estabelecimento  espelho legado
configuracoes_app     formato pré-2.2, lido apenas na migração
tema_app              'sistema' | 'claro' | 'escuro'  (fora do app_data de propósito)
```

`tema_app` fica fora de `app_data` para que o backup `.json` continue compatível com versões anteriores.

---

## Regra central

A composição do pedido de compra está em `calcularNecessidadeDeReposicao()` (`js/app.js`) e documentada em `docs/regras-negocio.md`. **Antes de mexer nela, leia o ADR `docs/decisoes/2026-10-26-lista-de-compra-respeita-ajuste-manual.md`** — o comportamento atual corrige um defeito em que a quantidade digitada pelo usuário era persistida e descartada na geração do PDF.
