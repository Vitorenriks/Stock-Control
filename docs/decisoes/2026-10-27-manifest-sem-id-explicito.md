# O PWA nao declara "id" no manifest

**Data:** 2026-10-27
**Status:** implementado

---

## CONTEXTO

O commit `88a1f4c` ("moderniza a interface") acrescentou `"id": "stock-control"` ao `manifest.json`, junto com `description`, `lang`, `scope`, `orientation` e `categories`. A inclusao foi cosmetica: nenhum requisito pedia uma identidade propria.

O campo `id` do Web App Manifest nao e um rotulo. Ele e **a identidade do aplicativo instalado**, resolvida como URL relativa a *origem* — nao ao escopo. Com a chave presente, a identidade passou de:

```text
https://vitorenriks.github.io/Stock-Control/index.html   (derivada de start_url)
```

para:

```text
https://vitorenriks.github.io/stock-control              (derivada de "id")
```

Sao dois aplicativos distintos para o navegador. O Stock Control esta instalado e em uso real em um estabelecimento em Basileia: aquela instalacao carrega a identidade antiga e deixou de corresponder a qualquer identidade servida pelo site. Atualizacoes de nome e icone declaradas no manifest nao chegam mais a ela, e o estado de "ja instalado" do navegador passou a divergir do que a pagina anuncia.

## ALTERNATIVAS CONSIDERADAS

**A. Manter `"id": "stock-control"`.**
Descartada: abandona a instalacao de producao sem ganho algum. O valor curto tambem resolve para fora do `scope` do projeto, o que o torna fragil se o site passar a hospedar outra coisa na raiz da origem.

**B. Fixar `"id": "/Stock-Control/index.html"`.**
Reproduz exatamente a identidade anterior e a deixa explicita no arquivo. Descartada: amarra o manifest ao caminho do GitHub Pages. Publicar em dominio proprio, na raiz, exigiria editar o manifest sob pena de orfanar as instalacoes de novo — a chave passaria a ser um ponto de manutencao silencioso.

**C. Remover a chave.**
Sem `id`, a especificacao manda derivar a identidade de `start_url`. Como `start_url` e `./index.html` (relativo), a identidade acompanha automaticamente onde quer que o app seja publicado, e hoje resolve para o mesmo valor que vigorava antes de `88a1f4c`.

## DECISAO

Alternativa C. `manifest.json` nao declara `id`.

## JUSTIFICATIVA

E a unica opcao que restaura a identidade da instalacao em producao **e** continua correta se a publicacao mudar de endereco. O `id` so se justifica quando `start_url` precisa variar sem que o app mude de identidade — o que nao acontece aqui: `start_url` e fixo desde a versao 2.2.

## IMPACTOS

- A instalacao existente volta a corresponder a identidade anunciada pelo site.
- Quem instalou o app entre o deploy de `88a1f4c` (2026-10-26) e este ficara com uma instalacao orfa, sob a identidade `stock-control`. E preciso desinstalar e instalar de novo. A janela foi de pouco mais de um dia.
- **Nao reintroduzir a chave sem um ADR.** Mexer em `id` quebra o vinculo com tudo que ja esta instalado — o custo nao aparece em teste local, so em quem ja usa o app.
