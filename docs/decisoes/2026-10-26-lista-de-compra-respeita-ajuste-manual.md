# A lista de compra respeita o ajuste manual de quantidade

**Data:** 2026-10-26
**Status:** implementado

---

## CONTEXTO

O app oferecia um campo "Comprar" em cada card de produto. O valor digitado era gravado em `quantidadeComprar` e persistido no `localStorage` a cada tecla (`app.js`, listener de `input`). A Central de Ajuda prometia explicitamente, nos quatro idiomas:

> "Você pode manipular manualmente as quantidades a serem compradas para se adequar a semanas de maior movimento."

Mas `gerarPDF()` montava a lista a partir de `montarListaTemporariaCompras()`, que usava **apenas** `reposicao.diferenca` — a quantidade calculada automaticamente. O campo `quantidadeComprar` não era lido em nenhum ponto do fluxo do PDF.

Consequências no uso real:

1. A quantidade digitada era salva e silenciosamente descartada. O usuário via o número na tela e recebia outro no PDF.
2. `calcularNecessidadeDeReposicao()` retornava `precisaComprar: false` para todo item com cobertura ≥ 7 dias. Era impossível incluir no pedido um item que estivesse bem de estoque, mesmo digitando quantidade.
3. `custoEstimado` e `diasDeCobertura` eram calculados por item e nunca apareciam em lugar nenhum.
4. Não havia como ver a lista antes de gerar o PDF. A aba Comprar só dizia que os itens com estoque baixo entrariam automaticamente.

## ALTERNATIVAS CONSIDERADAS

**A. Remover o campo "Comprar" e o texto da Ajuda.**
Alinha código e documentação pelo menor esforço. Descartada: elimina um controle que a operação precisa — semana de feriado exige pedir diferente do que a média semanal sugere, e esse é exatamente o caso que a Ajuda descreve.

**B. Somar a quantidade manual à sugestão automática.**
Descartada: "manipular as quantidades a serem compradas" descreve substituição, não acréscimo. E somar torna o número final impossível de prever sem fazer a conta de cabeça.

**C. Tratar `quantidadeComprar` como override, inclusive o valor 0.**
Semanticamente a mais limpa: 0 significaria "não comprar". Descartada por regressão. O modelo sempre gravou `quantidadeComprar: 0` como padrão em todo item, e o validador de importação exige `typeof quantidadeComprar === 'number'`. Tratar 0 como override explícito suprimiria **todas** as sugestões automáticas em qualquer base ou backup existente — o app pararia de sugerir compras para quem já o usa.

**D. Override quando > 0, com campo separado para exclusão explícita.** ◄ escolhida

## DECISÃO

A quantidade digitada pelo usuário, quando maior que zero, substitui a sugestão do sistema e é a que sai no PDF — inclusive para item que não está abaixo da meta de 7 dias.

Para dizer "não comprar este item que o sistema sugeriu", foi criado um campo booleano separado, `excluidoDoPedido`, acionado por um botão na pré-visualização. Ausente = `false`, portanto bases e backups antigos funcionam sem migração.

A regra completa está em `docs/regras-negocio.md` (RN-02 a RN-05) e concentrada em `calcularNecessidadeDeReposicao()`.

Junto disso:

- A aba **Comprar** passou a mostrar a pré-visualização exata do pedido, editável no mesmo lugar, com subtotal por categoria e total estimado.
- O PDF passou a trazer preço unitário, custo estimado, subtotal por categoria e total geral — `custoEstimado` já era calculado e descartado.
- Item com quantidade ajustada à mão é marcado como "Manual" na tela e com asterisco no PDF, com legenda.

## JUSTIFICATIVA

O cálculo automático continua idêntico — nenhuma alteração na matemática de `DIAS_COBERTURA_META`, na fórmula `consumo semanal - estoque atual` ou no arredondamento por unidade. A mudança é de **precedência**: o que já existia e era ignorado passou a ser respeitado.

É a menor alteração que fecha a distância entre o que o código oferece e o que ele entrega, sem quebrar dado existente.

## IMPACTOS

**Comportamento**
- Quem nunca digitou no campo "Comprar" não vê diferença: `quantidadeComprar: 0` em todos os itens → vale a sugestão automática, exatamente como antes.
- Quem tinha valores digitados na base vai vê-los agora entrando no pedido. É a correção, mas convém avisar a operação: o primeiro PDF após a atualização pode trazer itens que antes não apareciam. **"Restaurar sugestões"** zera todos os ajustes manuais e exclusões de uma vez.

**Compatibilidade**
- Formato do backup `.json` inalterado (`version: '2.2'`). Backup novo importa em versão antiga; backup antigo importa na nova. O campo `excluidoDoPedido` é ignorado por versões antigas.
- A preferência de tema foi para uma chave própria (`tema_app`) justamente para não alterar o formato do backup.

**Risco residual**
- `quantidadeComprar: 0` continua ambíguo entre "não informado" e "zero". Resolvido na prática por `excluidoDoPedido`, não no modelo de dados. Uma versão futura que queira desambiguar de verdade precisa migrar o campo para `null` como padrão — e aí sim lidar com dado existente.

## VALIDAÇÃO

28 testes da regra pura (sugestão automática, override manual, exclusão, arredondamento por unidade, classificação de situação, saneamento de entrada) e 67 testes de integração em DOM real (boot, cadastro, composição do pedido, conteúdo do PDF, filtros, escape de HTML, troca de idioma, tema, confirmação de exclusão, backup) — todos passando, zero erro de runtime capturado.

Os testes não estão no repositório: foram executados fora dele, sem adicionar dependência ao projeto.

```text
DÉBITO
Suíte de testes não versionada.

MOTIVO
O projeto não tem gerenciador de pacotes nem runner, por desenho
(nenhuma dependência em runtime). Versionar os testes exige decidir
antes se o repositório passa a ter package.json e devDependencies.

IMPACTO
A regra central fica sem rede de proteção contra regressão. Médio:
é a regra de maior valor do sistema e já falhou uma vez em silêncio.

PRIORIDADE
Média.

PLANO
Adicionar `tests/` com runner nativo do Node (`node:test`, zero
dependência) cobrindo `calcularNecessidadeDeReposicao`,
`normalizarQuantidadeCompra` e `normalizarProduto`. Exige extrair
essas funções puras de `app.js` para um módulo próprio.
```
