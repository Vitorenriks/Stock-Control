# Arquitetura — Stock Control

## Princípio

Offline-first sem backend. Todo o estado vive no `localStorage` do dispositivo. Nenhuma requisição de rede em runtime — as bibliotecas são servidas de `libs/`, versionadas no repositório.

A consequência direta: **não existe camada de servidor onde proteger regra de negócio.** O app é inteiramente cliente, operado por quem está no estabelecimento. Não há perfis de acesso e nenhum dado sai do dispositivo sem ação explícita do usuário (exportar). Isso é desenho, não dívida.

---

## Camadas

```text
index.html
  marcação das 3 abas, dos 3 modais e da área de impressão do PDF
  único lugar com estrutura de tela
        │
        ▼
js/i18n.js   window.InventoryI18n
  dicionários (pt-BR, it-IT, en-US, de-DE), moedas, mapeamento de locale
  zero DOM, zero lógica de negócio
        │
        ▼
js/ui.js     window.InventoryUI
  funções puras: props → string HTML
  escapar() — fronteira única de escape de HTML
  zero acesso ao DOM, zero acesso ao estado
        │
        ▼
js/app.js
  estado (produtos, configuracoes, filtros)
  regra de reposição
  renderização (lê estado, chama ui.js, escreve no DOM)
  persistência, PDF, backup
```

Dependência em uma só direção: `app.js` conhece `ui.js` e `i18n.js`; nenhum dos dois conhece `app.js`. A ordem das tags `<script>` no `index.html` é obrigatória.

---

## Fluxo de uma interação

```text
evento no DOM
      │
      ▼
handler em app.js  ──►  muta o array `produtos`
      │
      ▼
salvarEstadoLocal()  ──►  localStorage (app_data + espelho legado)
      │
      ▼
renderizarTudo()
      ├── renderizarEstoque()   → filtra, ordena, agrupa, monta cards
      ├── renderizarPedido()    → monta a pré-visualização do pedido
      └── atualizarIndicadores()→ painel de 4 números + badge da navegação
```

### Por que dois caminhos de atualização

Re-renderizar dentro do evento `input` destrói o foco do campo que o usuário está digitando. O padrão adotado:

| Evento | O que faz |
|---|---|
| `input` | muta estado, persiste, `atualizarTotais()` — escreve **só** `textContent` de números já existentes. Nenhuma mudança de estrutura, foco intacto. |
| `change` (dispara no blur) | muta estado, normaliza a quantidade pela unidade, persiste, `renderizarPreservandoFoco()` — re-render completo devolvendo o foco ao elemento ativo. |

---

## Estado em `localStorage`

```text
app_data (fonte da verdade)
{
  version: '2.2',
  configuracoes: { empresa, idioma, moeda },
  itens: [ { id, nome, estoqueAtual, precoUnitario, consumoSemanal,
             categoria, unit, quantidadeComprar, excluidoDoPedido } ]
}

lista_produtos        espelho do array de itens — legado
nome_estabelecimento  espelho da empresa     — legado
configuracoes_app     formato pré-2.2, lido só na migração de `carregarConfiguracoesSalvas()`
tema_app              'sistema' | 'claro' | 'escuro'
```

Os espelhos legados continuam sendo escritos para que um backup gerado por versão antiga ainda seja reconhecido. `tema_app` fica deliberadamente **fora** de `app_data`: assim o formato do backup `.json` não mudou e continua intercambiável com versões anteriores.

`excluidoDoPedido` é campo novo. Ausente = `false`, então base e backups antigos funcionam sem migração.

---

## Fronteira de confiança

```text
backup .json (WhatsApp, entrada externa)
        │
        ▼
JSON.parse + validação de forma   importarEstoque()
        │
        ▼
normalizarProduto()               coage todo campo para o tipo esperado
        │
        ▼
estado em memória                 garantidamente números, strings e booleanos
        │
        ▼
escapar()  em js/ui.js            escapa na saída para HTML
        │
        ▼
innerHTML
```

Dois pontos de defesa, por razões diferentes:

- `normalizarProduto()` garante **integridade** — nenhum `NaN`, nenhum negativo, nenhuma unidade desconhecida, e `id` sempre numérico (o `id` é interpolado dentro de `onclick="editarProduto(<id>)"`).
- `escapar()` garante que nome e categoria **nunca viram marcação**.

Não adicione `innerHTML` com valor de produto fora de `js/ui.js`.

---

## Tema claro/escuro

Classe `dark` no `<html>`, estratégia `darkMode: 'class'` do Tailwind. Um script inline no `<head>`, antes de qualquer CSS, lê `tema_app` e aplica a classe — é o que evita a piscada de cor no carregamento. `prefers-color-scheme` é observado em runtime e só vale quando a preferência é `sistema`.

`<meta name="theme-color">` é atualizado junto, para a barra do sistema operacional acompanhar.

---

## Offline e atualização

`sw.js` faz precache de `PRECACHE_URLS` na instalação e serve cache-first, com fallback para `index.html` quando a rede falha. `CACHE_VERSION` nomeia o cache; no `activate` todo cache com nome diferente é apagado.

`app.js` monitora `updatefound`, exibe o banner "Nova versão disponível", e no clique manda `SKIP_WAITING` para o worker em espera. O `controllerchange` recarrega a página uma única vez (guarda `refreshing`).

**Arquivo novo precisa entrar em `PRECACHE_URLS` e `CACHE_VERSION` precisa de bump.** Sem o bump a alteração não chega ao usuário.

---

## Geração do PDF

`#area-impressao` é um bloco `display:none` com largura fixa de 800px, cores claras fixas (sem variante `dark:`) para o PDF sair legível independentemente do tema. `gerarPDF()` preenche a tabela, torna o bloco visível, chama `html2pdf` e o esconde de volta no `then`/`catch`.

A tabela tem 5 colunas: produto, quantidade a comprar, unidade, preço unitário e custo estimado — com subtotal por categoria e total geral.

---

## Banco de dados

Não se aplica. Não há banco, servidor nem migração de schema. A evolução de formato do `localStorage` é feita em `carregarConfiguracoesSalvas()`, que detecta `version !== '2.2'` e reconstrói a estrutura a partir das chaves antigas.
