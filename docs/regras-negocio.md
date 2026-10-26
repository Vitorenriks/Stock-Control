# Regras de negócio — Stock Control

Fonte da verdade: `js/app.js`. Este documento descreve o que o código faz, não o que se gostaria que ele fizesse.

---

## RN-01 — Meta de cobertura

```text
OBJETIVO
Garantir que o estoque cubra o consumo dos próximos 7 dias.

CONDIÇÃO
Produto com consumo médio semanal informado (> 0).

CÁLCULO
consumo diário   = consumo semanal / 7
dias de cobertura = estoque atual / consumo diário

RESULTADO
Produto com cobertura < 7 dias é candidato a reposição.

EXCEÇÃO
Consumo semanal igual a 0 ou ausente → cobertura indefinida.
O produto nunca é sugerido automaticamente (o sistema não tem base para estimar).
```

Constante: `DIAS_COBERTURA_META = 7`.

---

## RN-02 — Quantidade sugerida

```text
OBJETIVO
Repor exatamente o que falta para fechar uma semana de consumo.

CONDIÇÃO
Produto abaixo da meta (RN-01).

CÁLCULO
quantidade sugerida = arredondar(consumo semanal - estoque atual, unidade)

RESULTADO
Ex.: meta 3 caixas/semana, estoque 2 → sugere 1 caixa.

EXCEÇÃO
Produto na meta ou acima → quantidade sugerida = 0.
```

### Arredondamento por unidade

| Unidade | Regra | Exemplo |
|---|---|---|
| `pct`, `unidade`, `caixa`, `gr` | arredonda para cima, inteiro | 250,5 gr → 251 gr |
| `kg` | arredonda para cima, 3 decimais | 1,5001 kg → 1,501 kg |
| outras | arredonda para cima, 2 decimais | — |

O arredondamento é sempre **para cima**: é melhor sobrar que faltar.

---

## RN-03 — Ajuste manual substitui a sugestão

```text
OBJETIVO
Permitir adequar o pedido a semanas de maior ou menor movimento
(feriados, eventos), como promete a Central de Ajuda.

CONDIÇÃO
Usuário informa quantidade > 0 no campo "Comprar" do produto.

AÇÃO
A quantidade informada SUBSTITUI a sugestão do sistema e é a que sai no PDF.
Vale inclusive para produto que NÃO está abaixo da meta — ou seja, o usuário
pode incluir no pedido qualquer item do estoque.

RESULTADO
Item marcado como "Manual" na interface e com asterisco no PDF,
com legenda explicando a marca.

EXCEÇÃO
Quantidade 0 ou campo vazio = "não informada" → volta a valer a sugestão (RN-02).
Para pedir zero de um item sugerido, use RN-04.

QUEM PODE EXECUTAR
Qualquer usuário do dispositivo. Não há perfis de acesso neste sistema.
```

**O valor 0 não significa "não comprar".** O modelo de dados sempre gravou `quantidadeComprar: 0` como padrão, então 0 só pode significar "não informado" — tratá-lo como override explícito suprimiria todas as sugestões automáticas em bases e backups existentes. Daí a necessidade da RN-04.

---

## RN-04 — Exclusão explícita do pedido

```text
OBJETIVO
Permitir retirar do pedido um item que o sistema sugeriu.

CONDIÇÃO
Usuário aciona "Retirar do pedido" na pré-visualização.

AÇÃO
Grava excluidoDoPedido = true no item.

RESULTADO
O item continua visível na pré-visualização, esmaecido e com o aviso
"Não entra no pedido", mas não sai no PDF nem conta nos totais.
Fica visível de propósito: a pré-visualização mostra tudo que foi
considerado, não só o que passou.

EXCEÇÃO
Informar uma quantidade manual > 0 reinclui o item automaticamente.

REVERSÃO
"Voltar para o pedido" no mesmo item, ou "Restaurar sugestões"
(zera quantidades manuais e exclusões de todos os itens).
```

---

## RN-05 — Composição final do pedido

```text
Um item entra no PDF quando:

    NÃO excluído do pedido           (RN-04)
    E quantidade final > 0

    onde quantidade final =
        quantidade manual, se informada (> 0)   (RN-03)
        caso contrário, quantidade sugerida      (RN-02)

Custo estimado do item = preço unitário × quantidade final.
Subtotal por categoria e total geral saem no PDF.
```

A pré-visualização na aba **Comprar** mostra um item quando ele está abaixo da meta **ou** tem quantidade manual — isto é, inclui também o que foi excluído, para que a decisão fique visível.

---

## RN-06 — Situação do produto

Usada na etiqueta de cor, no filtro e na ordenação padrão.

| Situação | Condição | Cor |
|---|---|---|
| Crítico | cobertura < 3 dias | vermelho |
| Atenção | 3 ≤ cobertura < 7 dias | âmbar |
| OK | cobertura ≥ 7 dias | verde |
| Sem meta | consumo semanal não informado | cinza |

Constante: `DIAS_COBERTURA_CRITICA = 3`.

A situação nunca é comunicada **só** por cor: há sempre ícone e texto no mesmo selo.

---

## RN-07 — Valor total em estoque

```text
valor total = Σ (estoque atual × preço unitário) de todos os produtos

Não é afetado por filtros de tela — é indicador do estoque inteiro.
```

---

## RN-08 — Entrada não confiável

```text
OBJETIVO
O backup .json circula por WhatsApp entre dispositivos. É entrada externa.

AÇÃO
normalizarProduto() coage todo campo na entrada:
  id            → Number finito (senão gera novo)
  nome          → String, máx. 120 caracteres
  estoque/preço/consumo/quantidade → número ≥ 0 (negativo e NaN viram 0)
  categoria     → String aparada, máx. 80 caracteres
  unidade       → uma de pct|gr|unidade|kg|caixa (senão 'unidade')
  moeda         → uma das 4 suportadas (senão BRL)
  idioma        → um dos 4 suportados (senão detecção do navegador)

escapar() em js/ui.js protege na renderização.

RESULTADO
Backup corrompido ou malicioso não executa código nem gera estado inválido.
```

---

## Fora de escopo deste sistema

Não existe e não é regra pendente: autenticação, perfis de acesso, histórico/auditoria de alterações, múltiplos usuários simultâneos, sincronização automática entre dispositivos, controle de lote ou validade, fornecedores.

A sincronização é **manual e local-first** por desenho: exportar `.json` → enviar → importar. Importar **substitui** o estado local inteiro; não há merge.
