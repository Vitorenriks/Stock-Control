# Stock Control

Organizador de estoque offline-first para pequenos e médios estabelecimentos. Cadastre produtos, acompanhe o consumo e gere pedidos de compra em PDF sem depender de conexão com a internet.

## Offline-First

O Stock Control é um PWA (Progressive Web App): roda no navegador, mas se comporta como um aplicativo instalado, com armazenamento interno via `LocalStorage`. Todos os dados — produtos, quantidades, categorias e histórico de consumo — ficam salvos no próprio dispositivo, permitindo uso completo sem internet. A sincronização entre dispositivos é feita de forma local-first, exportando os dados em `.json` para envio manual (ex: WhatsApp) e importando o backup no outro dispositivo.

O sistema é multi-idioma e multi-moeda, configurável diretamente nas Configurações do App.

> **Em produção:** o Stock Control está atualmente em uso real em um estabelecimento em Basileia, Suíça, como gerenciador de estoque do negócio, facilitando o controle diário e a geração de pedidos de compra.

## Funcionalidades Principais

- **Gestão de Estoque** — cadastro de produtos por unidade, preço, quantidade e categoria/segmento, com organização por tipo de produto e cálculo automático do valor total em estoque.
- **Painel de Situação** — cada produto exibe sua cobertura em dias e uma etiqueta de situação (Crítico, Atenção, OK ou Sem meta), com ícone e texto além da cor. Busca por nome, filtros por categoria e por situação, e ordenação por cobertura, nome ou valor.
- **Cálculo Inteligente de Reposição** — estima a quantidade a comprar a partir do consumo médio semanal, projetando a necessidade para 7 dias e arredondando conforme a unidade do produto.
- **Ajuste Manual do Pedido** — a quantidade digitada pelo usuário substitui a sugestão do sistema e é a que sai no PDF, inclusive para itens que não estão abaixo da meta. Itens sugeridos podem ser retirados do pedido, e um botão restaura todas as sugestões de uma vez.
- **Pré-visualização do Pedido** — a aba Comprar mostra exatamente a lista que sairá no PDF, editável ali mesmo, com subtotal por categoria e total estimado antes de gerar o arquivo.
- **Pedidos de Compra em PDF** — solicitação de compra com produto, quantidade, unidade, preço unitário e custo estimado, agrupada por categoria, com subtotais, total geral e marcação dos itens ajustados à mão.
- **Tema Claro e Escuro** — acompanha a preferência do sistema ou pode ser fixado nas Configurações.
- **Multiplataforma e Offline** — instalável como app em Windows, Android e iOS via PWA, funcionando integralmente sem conexão com a internet.
- **Central de Ajuda Integrada** — guia operacional e manual do sistema acessível diretamente no app, traduzido para 4 idiomas (Português, Inglês, Alemão e Italiano), garantindo suporte completo para equipes internacionais.

## Screenshots

> **Atenção:** as imagens abaixo são da interface anterior e precisam ser regeradas.

<p>
  <b>Abertura do App</b><br>
  <img src="assets/Abertura-APP.png" width="300" alt="Abertura do App">
</p>

<p>
  <b>Dashboard / Estoque</b><br>
  <img src="assets/Dashboard-Estoque.png" width="300" alt="Dashboard de Estoque">
</p>

<p>
  <b>Solicitação de Compra</b><br>
  <img src="assets/Solicitacao-Compra.png" width="300" alt="Solicitação de Compra">
</p>

<p>
  <b>Configurações e Backup</b><br>
  <img src="assets/Backup-Configuracoes.png" width="300" alt="Configurações e Backup">
</p>

## Guia de Instalação (PWA)

O Stock Control não precisa ser baixado de nenhuma loja de aplicativos. A instalação é feita diretamente pelo navegador.

**Acesse:** [https://vitorenriks.github.io/Stock-Control/]

### Chrome / Edge (Desktop)
1. Acesse o link do projeto.
2. Clique no ícone de instalação na barra de endereço (ou no menu **⋮ > Instalar app**).
3. Confirme a instalação. O app abrirá em janela própria, como um programa nativo.

### Android
1. Acesse o link do projeto pelo Chrome.
2. Toque no menu **⋮** e selecione **Adicionar à tela inicial** (ou aceite o banner de instalação automático).
3. Confirme. O ícone do Stock Control aparecerá junto aos demais apps.

### iOS (Safari)
1. Acesse o link do projeto pelo Safari.
2. Toque no ícone de **Compartilhar**.
3. Selecione **Adicionar à Tela de Início**.
4. Confirme o nome e toque em **Adicionar**.

## Arquitetura e Desenvolvimento
O **Stock Control** foi concebido com uma arquitetura *Offline-First*, focada em performance e independência de bibliotecas externas.

*   **Tecnologia:** Implementado puramente em **Vanilla JavaScript**, garantindo leveza, carregamento instantâneo e total controle sobre a performance no navegador. Nenhuma dependência é baixada em runtime: Tailwind, Font Awesome e as bibliotecas de PDF são servidas de `libs/`, versionadas no repositório.
*   **Documentação técnica:** [`docs/manutencao.md`](docs/manutencao.md) (como rodar, estrutura e gotchas), [`docs/arquitetura.md`](docs/arquitetura.md), [`docs/regras-negocio.md`](docs/regras-negocio.md) e [`docs/decisoes/`](docs/decisoes/).
*   **Design de Lógica:** A arquitetura do sistema e as regras de negócio foram desenhadas para garantir a integridade dos dados locais (via `LocalStorage`) sem dependência de back-end.
*   **AI-Assisted Engineering:** Este projeto foi desenvolvido através de um fluxo de trabalho de *AI-assisted pair programming*. A IA foi utilizada como ferramenta de suporte para o desenho da arquitetura, refatoração de código para padrões modernos, implementação de internacionalização (i18n) e testes de fluxos operacionais, permitindo uma entrega rápida e robusta de um software que já está em uso em ambiente de produção real.

## Tecnologias

- HTML
- CSS
- JavaScript
- Service Workers
- Internacionalização (i18n) — suporte nativo para múltiplos idiomas com interface dinâmica

## Contribuição / Issues

Encontrou um bug ou tem sugestão de melhoria? Abra uma issue na seção **Issues** do repositório no GitHub, descrevendo o problema encontrado ou a funcionalidade sugerida.

[https://vitorenriks.github.io/Stock-Control/]
