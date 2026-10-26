let pendingWorker = null;
let refreshing = false;

function exibirBannerAtualizacao() {
    const updateBanner = document.getElementById('update-banner');
    if (updateBanner) {
        updateBanner.classList.remove('hidden');
    }
}

function configurarFluxoAtualizacaoServiceWorker(registration) {
    const updateButton = document.getElementById('btn-update-app');
    const previousController = navigator.serviceWorker.controller;

    if (updateButton) {
        updateButton.addEventListener('click', () => {
            if (pendingWorker) {
                pendingWorker.postMessage({ type: 'SKIP_WAITING' });
            }
        });
    }

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing || !previousController) {
            return;
        }

        refreshing = true;
        window.location.reload();
    });

    const prepararAtualizacao = (worker) => {
        pendingWorker = worker;
        exibirBannerAtualizacao();
    };

    if (registration.waiting) {
        prepararAtualizacao(registration.waiting);
    }

    registration.addEventListener('updatefound', () => {
        const novoWorker = registration.installing;
        if (!novoWorker) {
            return;
        }

        novoWorker.addEventListener('statechange', () => {
            if (novoWorker.state === 'installed' && navigator.serviceWorker.controller) {
                prepararAtualizacao(novoWorker);
            }
        });
    });

    setInterval(() => {
        registration.update().catch((erro) => {
            console.warn('Falha ao verificar atualizacao do Service Worker:', erro);
        });
    }, 60 * 60 * 1000);
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js', { scope: './' }).catch((erro) => {
            console.error('Falha ao registrar Service Worker:', erro);
        });

        navigator.serviceWorker.ready.then((registration) => {
            configurarFluxoAtualizacaoServiceWorker(registration);
        }).catch((erro) => {
            console.error('Falha ao configurar fluxo de atualizacao do Service Worker:', erro);
        });
    });
}

const {
    traducoes,
    moedas,
    mapearIdiomaStorageParaLocale,
    mapearLocaleParaIdiomaStorage,
    detectarIdiomaInicial
} = window.InventoryI18n;

const {
    renderizarCardProduto,
    renderizarSecaoCategoria,
    renderizarEstadoVazio,
    renderizarItemPedido,
    renderizarGrupoPedido,
    renderizarPdfCategoria,
    renderizarPdfItem,
    renderizarPdfSubtotal,
    renderizarPdfTotal,
    renderizarPdfSemItens,
    renderizarOpcoes
} = window.InventoryUI;

// Meta de reposicao: o pedido cobre o consumo dos proximos DIAS_COBERTURA_META dias.
const DIAS_COBERTURA_META = 7;
// Abaixo disso o item e tratado como ruptura iminente.
const DIAS_COBERTURA_CRITICA = 3;
const UNIDADES_VALIDAS = ['pct', 'gr', 'unidade', 'kg', 'caixa'];
const CHAVE_TEMA = 'tema_app';

let temporizadorToast = null;

function mostrarNotificacao(mensagem, tipo = 'sucesso') {
    const toast = document.getElementById('toast-notificacao');
    const toastMensagem = document.getElementById('toast-mensagem');
    toastMensagem.textContent = mensagem;

    toast.classList.remove('bg-emerald-600', 'bg-rose-600');
    toast.classList.add(tipo === 'erro' ? 'bg-rose-600' : 'bg-emerald-600');

    if (temporizadorToast) {
        clearTimeout(temporizadorToast);
    }

    toast.classList.remove('hidden');
    requestAnimationFrame(() => {
        toast.classList.remove('opacity-0');
        toast.classList.add('opacity-100');
    });

    temporizadorToast = setTimeout(() => {
        toast.classList.remove('opacity-100');
        toast.classList.add('opacity-0');
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 3000);
}

function normalizarUnidade(unidade) {
    const unidadeNormalizada = String(unidade || '').toLowerCase();
    return UNIDADES_VALIDAS.includes(unidadeNormalizada) ? unidadeNormalizada : 'unidade';
}

function numeroNaoNegativo(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero) && numero > 0 ? numero : 0;
}

/**
 * Normaliza um item vindo do LocalStorage ou de um backup importado.
 * Backups circulam por WhatsApp (conteudo nao confiavel): tudo que entra
 * e coagido para o tipo esperado antes de chegar na tela.
 */
function normalizarProduto(item) {
    const id = Number(item && item.id);

    return {
        id: Number.isFinite(id) ? id : Date.now() + Math.floor(Math.random() * 1000),
        nome: String((item && item.nome) || '').slice(0, 120),
        estoqueAtual: numeroNaoNegativo(item && item.estoqueAtual),
        precoUnitario: numeroNaoNegativo(item && item.precoUnitario),
        consumoSemanal: numeroNaoNegativo(item && item.consumoSemanal),
        categoria: String((item && item.categoria) || '').trim().slice(0, 80),
        unit: normalizarUnidade(item && (item.unit || item.unidade)),
        quantidadeComprar: numeroNaoNegativo(item && item.quantidadeComprar),
        excluidoDoPedido: Boolean(item && item.excluidoDoPedido)
    };
}

function normalizarListaDeProdutos(itens) {
    return (Array.isArray(itens) ? itens : []).map(normalizarProduto);
}

function carregarConfiguracoesSalvas() {
    try {
        const persistedAppData = JSON.parse(localStorage.getItem('app_data'));
        if (persistedAppData && persistedAppData.version === '2.2') {
            return persistedAppData;
        }
    } catch (erro) {
        console.warn('app_data ilegivel; aplicando migracao a partir das chaves antigas.', erro);
    }

    let produtosAntigos = [];
    try {
        produtosAntigos = JSON.parse(localStorage.getItem('lista_produtos')) || [];
    } catch (erro) {
        produtosAntigos = [];
    }

    const configAntiga = {
        language: 'pt-BR',
        currency: 'BRL'
    };
    try {
        const configApp = JSON.parse(localStorage.getItem('configuracoes_app'));
        if (configApp) {
            configAntiga.language = configApp.language || 'pt-BR';
            configAntiga.currency = configApp.currency || 'BRL';
        }
    } catch (erro) {
        console.warn('configuracoes_app ilegivel; mantendo padrao pt-BR/BRL.', erro);
    }

    const idiomaMigrado = mapearIdiomaStorageParaLocale(configAntiga.language) || detectarIdiomaInicial();
    const novaEstrutura = {
        version: '2.2',
        configuracoes: {
            empresa: localStorage.getItem('nome_estabelecimento') || '',
            idioma: mapearLocaleParaIdiomaStorage(idiomaMigrado),
            moeda: configAntiga.currency || 'BRL'
        },
        itens: produtosAntigos
    };

    localStorage.setItem('app_data', JSON.stringify(novaEstrutura));
    return novaEstrutura;
}

let appData = carregarConfiguracoesSalvas();
let produtos = normalizarListaDeProdutos(appData.itens);
appData.itens = produtos;
let configuracoes = {
    language: mapearIdiomaStorageParaLocale(appData.configuracoes?.idioma) || detectarIdiomaInicial(),
    currency: appData.configuracoes?.moeda || 'BRL'
};

let filtros = {
    busca: '',
    categoria: '',
    status: '',
    ordem: 'cobertura'
};

let abaAtiva = 'tab-estoque';
let resolverConfirmacao = null;

/* ------------------------------------------------------------------ *
 * Traducao
 * ------------------------------------------------------------------ */

function getTraducoesAtuais() {
    return traducoes[configuracoes.language] || traducoes['pt-BR'];
}

function t(chave, substituicoes = {}) {
    let texto = getTraducoesAtuais()[chave] || traducoes['pt-BR'][chave] || chave;
    Object.entries(substituicoes).forEach(([campo, valor]) => {
        texto = texto.replace(new RegExp(`\\{${campo}\\}`, 'g'), valor);
    });
    return texto;
}

function getMoedaAtual() {
    return moedas[configuracoes.currency] || moedas.BRL;
}

function formatarMoeda(valor) {
    const moeda = getMoedaAtual();
    return new Intl.NumberFormat(moeda.locale, { style: 'currency', currency: moeda.code }).format(Number(valor) || 0);
}

function formatarNumero(valor, maximoDecimais = 3) {
    return new Intl.NumberFormat(configuracoes.language, { maximumFractionDigits: maximoDecimais }).format(Number(valor) || 0);
}

function formatarUnidadeExibicao(unidade) {
    const mapaUnidades = {
        pct: t('unit_pack'),
        gr: t('unit_grams'),
        unidade: t('unit_unit'),
        kg: t('unit_kg'),
        caixa: t('unit_box')
    };

    return mapaUnidades[unidade] || unidade || '';
}

/* ------------------------------------------------------------------ *
 * Persistencia
 * ------------------------------------------------------------------ */

function salvarEstadoLocal() {
    appData.itens = produtos;
    localStorage.setItem('app_data', JSON.stringify(appData));
    // Espelho da chave antiga, mantido para backups gerados por versoes anteriores.
    localStorage.setItem('lista_produtos', JSON.stringify(produtos));
}

function salvarERenderizar() {
    salvarEstadoLocal();
    renderizarTudo();
}

/* ------------------------------------------------------------------ *
 * Tema
 * ------------------------------------------------------------------ */

function obterTemaSalvo() {
    try {
        return localStorage.getItem(CHAVE_TEMA) || 'sistema';
    } catch (erro) {
        return 'sistema';
    }
}

function temaEscuroAtivo() {
    return document.documentElement.classList.contains('dark');
}

function aplicarTema(preferencia) {
    const sistemaEscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const escuro = preferencia === 'escuro' || (preferencia === 'sistema' && sistemaEscuro);
    document.documentElement.classList.toggle('dark', escuro);

    const metaTema = document.querySelector('meta[name="theme-color"]');
    if (metaTema) {
        metaTema.setAttribute('content', escuro ? '#0f172a' : '#1e3a8a');
    }

    const iconeTema = document.getElementById('icone-tema');
    if (iconeTema) {
        iconeTema.className = `fa-solid ${escuro ? 'fa-sun' : 'fa-moon'} text-lg`;
    }
}

function salvarTema(preferencia) {
    const valor = ['sistema', 'claro', 'escuro'].includes(preferencia) ? preferencia : 'sistema';
    try {
        localStorage.setItem(CHAVE_TEMA, valor);
    } catch (erro) {
        console.warn('Nao foi possivel salvar a preferencia de tema.', erro);
    }
    aplicarTema(valor);
    const seletorTema = document.getElementById('config-tema');
    if (seletorTema) {
        seletorTema.value = valor;
    }
}

function alternarTema() {
    salvarTema(temaEscuroAtivo() ? 'claro' : 'escuro');
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (obterTemaSalvo() === 'sistema') {
        aplicarTema('sistema');
    }
});

/* ------------------------------------------------------------------ *
 * Regra de reposicao e composicao do pedido
 * ------------------------------------------------------------------ */

function calcularConsumoDiario(consumoSemanal) {
    const consumoNormalizado = Number(consumoSemanal) || 0;
    return consumoNormalizado > 0 ? consumoNormalizado / 7 : 0;
}

function calcularDiasDeCobertura(estoqueAtual, consumoSemanal) {
    const estoqueNormalizado = Number(estoqueAtual) || 0;
    const consumoDiario = calcularConsumoDiario(consumoSemanal);
    if (consumoDiario <= 0) return null;
    return estoqueNormalizado / consumoDiario;
}

function arredondarParaCima(valor, casasDecimais) {
    const fator = 10 ** casasDecimais;
    return Math.ceil(valor * fator) / fator;
}

function normalizarQuantidadeCompra(quantidade, unidade) {
    const quantidadeNormalizada = Math.max(0, Number(quantidade) || 0);
    const unidadeNormalizada = (unidade || '').toLowerCase();

    if (['pct', 'unidade', 'caixa', 'gr'].includes(unidadeNormalizada)) {
        return Math.ceil(quantidadeNormalizada);
    }

    if (unidadeNormalizada === 'kg') {
        return arredondarParaCima(quantidadeNormalizada, 3);
    }

    return arredondarParaCima(quantidadeNormalizada, 2);
}

/**
 * Regra unica que define o que vai para o pedido de compra.
 *
 * 1. Sugestao automatica: se a cobertura do item fica abaixo de
 *    DIAS_COBERTURA_META dias, sugere repor o que falta para uma semana
 *    (consumo semanal - estoque atual), arredondado conforme a unidade.
 * 2. Ajuste manual: a quantidade digitada pelo usuario SUBSTITUI a
 *    sugestao e e o valor que sai no PDF, inclusive em item que nao
 *    estava abaixo da meta.
 * 3. Exclusao explicita: item marcado como excluido nao entra no pedido,
 *    independente da sugestao.
 */
function calcularNecessidadeDeReposicao(produto) {
    const unidade = produto.unit || produto.unidade || '';
    const estoqueAtual = Math.max(0, Number(produto.estoqueAtual) || 0);
    const consumoSemanal = Number(produto.consumoSemanal) || 0;
    const precoUnitario = Math.max(0, Number(produto.precoUnitario) || 0);
    const diasDeCobertura = calcularDiasDeCobertura(estoqueAtual, consumoSemanal);

    const abaixoDaMeta = consumoSemanal > 0
        && diasDeCobertura !== null
        && diasDeCobertura < DIAS_COBERTURA_META;

    const quantidadeSugerida = abaixoDaMeta
        ? normalizarQuantidadeCompra(consumoSemanal - estoqueAtual, unidade)
        : 0;

    const quantidadeManual = numeroNaoNegativo(produto.quantidadeComprar);
    const ajusteManual = quantidadeManual > 0;
    const quantidadeFinal = ajusteManual
        ? normalizarQuantidadeCompra(quantidadeManual, unidade)
        : quantidadeSugerida;

    const excluido = Boolean(produto.excluidoDoPedido);

    return {
        abaixoDaMeta,
        ajusteManual,
        excluido,
        quantidadeSugerida,
        quantidadeFinal,
        // Nome mantido por compatibilidade com o restante do fluxo do PDF.
        diferenca: quantidadeFinal,
        precoUnitario,
        custoEstimado: precoUnitario * quantidadeFinal,
        diasDeCobertura,
        precisaComprar: !excluido && quantidadeFinal > 0
    };
}

function classificarStatus(produto) {
    const consumoSemanal = Number(produto.consumoSemanal) || 0;
    if (consumoSemanal <= 0) return 'indefinido';

    const dias = calcularDiasDeCobertura(Math.max(0, Number(produto.estoqueAtual) || 0), consumoSemanal);
    if (dias === null) return 'indefinido';
    if (dias < DIAS_COBERTURA_CRITICA) return 'critico';
    if (dias < DIAS_COBERTURA_META) return 'atencao';
    return 'ok';
}

function textoStatus(status) {
    const mapa = {
        critico: t('status_critical'),
        atencao: t('status_warning'),
        ok: t('status_ok'),
        indefinido: t('status_unknown')
    };
    return mapa[status] || mapa.indefinido;
}

/** Itens que aparecem na pre-visualizacao: sugeridos pelo sistema ou pedidos a mao. */
function montarCandidatosDoPedido() {
    return produtos
        .map((produto) => ({ produto, reposicao: calcularNecessidadeDeReposicao(produto) }))
        .filter(({ reposicao }) => reposicao.abaixoDaMeta || reposicao.ajusteManual);
}

/** Itens que efetivamente saem no PDF. */
function montarListaTemporariaCompras() {
    return montarCandidatosDoPedido()
        .filter(({ reposicao }) => reposicao.precisaComprar)
        .map(({ produto, reposicao }) => ({
            ...produto,
            diferenca: reposicao.quantidadeFinal,
            quantidadeSugerida: reposicao.quantidadeSugerida,
            ajusteManual: reposicao.ajusteManual,
            precoUnitario: reposicao.precoUnitario,
            custoEstimado: reposicao.custoEstimado,
            diasDeCobertura: reposicao.diasDeCobertura
        }));
}

function agruparItensPorCategoria(itens, obterCategoria = (item) => item.categoria) {
    return itens.reduce((gruposPorCategoria, item) => {
        const categoria = String(obterCategoria(item) || '').trim() || t('uncategorized');
        if (!gruposPorCategoria[categoria]) {
            gruposPorCategoria[categoria] = [];
        }
        gruposPorCategoria[categoria].push(item);
        return gruposPorCategoria;
    }, {});
}

function ordenarCategorias(grupos) {
    return Object.keys(grupos).sort((a, b) => a.localeCompare(b, configuracoes.language));
}

/* ------------------------------------------------------------------ *
 * Filtros
 * ------------------------------------------------------------------ */

function lerFiltrosDaTela() {
    filtros = {
        busca: (document.getElementById('filtro-busca').value || '').trim().toLowerCase(),
        categoria: document.getElementById('filtro-categoria').value || '',
        status: document.getElementById('filtro-status').value || '',
        ordem: document.getElementById('filtro-ordem').value || 'cobertura'
    };
}

function limparFiltros() {
    document.getElementById('filtro-busca').value = '';
    document.getElementById('filtro-categoria').value = '';
    document.getElementById('filtro-status').value = '';
    document.getElementById('filtro-ordem').value = 'cobertura';
    lerFiltrosDaTela();
    renderizarEstoque();
}

function filtrosAtivos() {
    return Boolean(filtros.busca || filtros.categoria || filtros.status);
}

function aplicarFiltros(itens) {
    return itens.filter((produto) => {
        if (filtros.busca) {
            const alvo = `${produto.nome} ${produto.categoria}`.toLowerCase();
            if (!alvo.includes(filtros.busca)) return false;
        }
        if (filtros.categoria) {
            const categoria = String(produto.categoria || '').trim() || t('uncategorized');
            if (categoria !== filtros.categoria) return false;
        }
        if (filtros.status && classificarStatus(produto) !== filtros.status) {
            return false;
        }
        return true;
    });
}

function ordenarProdutos(itens) {
    const copia = [...itens];

    if (filtros.ordem === 'nome') {
        return copia.sort((a, b) => String(a.nome).localeCompare(String(b.nome), configuracoes.language));
    }

    if (filtros.ordem === 'valor') {
        return copia.sort((a, b) => (b.estoqueAtual * b.precoUnitario) - (a.estoqueAtual * a.precoUnitario));
    }

    // Cobertura: itens sem meta vao para o fim da lista.
    return copia.sort((a, b) => {
        const diasA = calcularDiasDeCobertura(a.estoqueAtual, a.consumoSemanal);
        const diasB = calcularDiasDeCobertura(b.estoqueAtual, b.consumoSemanal);
        if (diasA === null && diasB === null) return String(a.nome).localeCompare(String(b.nome), configuracoes.language);
        if (diasA === null) return 1;
        if (diasB === null) return -1;
        return diasA - diasB;
    });
}

// Evita recriar os <option> a cada render, o que atrapalharia o uso do seletor.
let assinaturaSeletoresFiltro = '';

function preencherSeletoresDeFiltro() {
    const seletorCategoria = document.getElementById('filtro-categoria');
    const seletorStatus = document.getElementById('filtro-status');
    const seletorOrdem = document.getElementById('filtro-ordem');

    const categorias = [...new Set(produtos.map((produto) => String(produto.categoria || '').trim() || t('uncategorized')))]
        .sort((a, b) => a.localeCompare(b, configuracoes.language));

    const assinatura = `${configuracoes.language}|${categorias.join('')}`;
    if (assinatura === assinaturaSeletoresFiltro) {
        return;
    }
    assinaturaSeletoresFiltro = assinatura;

    seletorCategoria.innerHTML = renderizarOpcoes(
        [{ valor: '', texto: t('filter_all') }, ...categorias.map((categoria) => ({ valor: categoria, texto: categoria }))],
        filtros.categoria
    );
    if (seletorCategoria.value !== filtros.categoria) {
        filtros.categoria = '';
        seletorCategoria.value = '';
    }

    seletorStatus.innerHTML = renderizarOpcoes([
        { valor: '', texto: t('filter_all_status') },
        { valor: 'critico', texto: t('status_critical') },
        { valor: 'atencao', texto: t('status_warning') },
        { valor: 'ok', texto: t('status_ok') },
        { valor: 'indefinido', texto: t('status_unknown') }
    ], filtros.status);

    seletorOrdem.innerHTML = renderizarOpcoes([
        { valor: 'cobertura', texto: t('sort_coverage') },
        { valor: 'nome', texto: t('sort_name') },
        { valor: 'valor', texto: t('sort_value') }
    ], filtros.ordem);
}

/* ------------------------------------------------------------------ *
 * Renderizacao do estoque
 * ------------------------------------------------------------------ */

function calcularIndicadores() {
    const valorTotal = produtos.reduce((total, produto) => total + (produto.estoqueAtual * produto.precoUnitario), 0);
    const pedido = montarListaTemporariaCompras();
    const custoEstimado = pedido.reduce((total, item) => total + item.custoEstimado, 0);

    return {
        valorTotal,
        totalProdutos: produtos.length,
        totalAComprar: pedido.length,
        custoEstimado
    };
}

function atualizarIndicadores() {
    const { valorTotal, totalProdutos, totalAComprar, custoEstimado } = calcularIndicadores();

    document.getElementById('valor-total-estoque').textContent = formatarMoeda(valorTotal);
    document.getElementById('stat-itens').textContent = formatarNumero(totalProdutos, 0);
    document.getElementById('stat-a-comprar').textContent = formatarNumero(totalAComprar, 0);
    document.getElementById('stat-custo-estimado').textContent = formatarMoeda(custoEstimado);

    const badge = document.getElementById('badge-nav-compra');
    badge.textContent = formatarNumero(totalAComprar, 0);
    badge.classList.toggle('hidden', totalAComprar === 0);
}

function renderizarEstoque() {
    const lista = document.getElementById('lista-produtos');
    preencherSeletoresDeFiltro();

    if (!produtos.length) {
        lista.innerHTML = renderizarEstadoVazio({
            icone: 'fa-box-open',
            titulo: t('empty_stock_title'),
            texto: t('empty_stock_text'),
            acaoHtml: `<button type="button" onclick="abrirModalProduto()" class="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"><i class="fa-solid fa-plus"></i>${window.InventoryUI.escapar(t('new_product'))}</button>`
        });
        atualizarIndicadores();
        return;
    }

    const visiveis = ordenarProdutos(aplicarFiltros(produtos));

    if (!visiveis.length) {
        lista.innerHTML = renderizarEstadoVazio({
            icone: 'fa-magnifying-glass',
            titulo: t('empty_filter_title'),
            texto: t('empty_filter_text'),
            acaoHtml: `<button type="button" onclick="limparFiltros()" class="mt-5 rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">${window.InventoryUI.escapar(t('clear_filters'))}</button>`
        });
        atualizarIndicadores();
        return;
    }

    const grupos = agruparItensPorCategoria(visiveis);

    lista.innerHTML = ordenarCategorias(grupos).map((categoria) => {
        const cards = grupos[categoria].map((produto) => {
            const reposicao = calcularNecessidadeDeReposicao(produto);
            const status = classificarStatus(produto);
            const unidade = formatarUnidadeExibicao(produto.unit);
            const dias = reposicao.diasDeCobertura;

            const coberturaTexto = dias === null
                ? t('no_estimate')
                : t('stock_for_days', { dias: formatarNumero(Math.floor(dias), 0) });

            const coberturaPercentual = dias === null
                ? 0
                : Math.max(4, Math.min(100, Math.round((dias / DIAS_COBERTURA_META) * 100)));

            const consumoTexto = produto.consumoSemanal > 0
                ? `${t('consumption_short')}: ${formatarNumero(produto.consumoSemanal)} ${unidade}`
                : t('no_estimate');

            return renderizarCardProduto({
                id: produto.id,
                nome: produto.nome,
                categoria,
                precoFormatado: formatarMoeda(produto.precoUnitario),
                inputId: `input-comprar-${produto.id}`,
                buyLabel: t('buy_label'),
                quantidadeComprar: produto.quantidadeComprar > 0 ? produto.quantidadeComprar : '',
                quantidadeSugerida: reposicao.quantidadeSugerida,
                quantidadeSugeridaFormatada: `${formatarNumero(reposicao.quantidadeSugerida)} ${unidade}`,
                ajusteManual: reposicao.ajusteManual,
                currentStockLabel: t('current_stock'),
                estoqueAtual: formatarNumero(produto.estoqueAtual),
                unidade,
                statusChave: status,
                statusTexto: textoStatus(status),
                coberturaTexto,
                coberturaPercentual,
                consumoTexto,
                suggestedLabel: t('suggested_label'),
                manualLabel: t('manual_label'),
                useSuggestedLabel: t('use_suggested'),
                editLabel: t('edit'),
                deleteLabel: t('delete'),
                decreaseLabel: t('decrease_stock'),
                increaseLabel: t('increase_stock')
            });
        }).join('');

        return renderizarSecaoCategoria(categoria, cards, formatarNumero(grupos[categoria].length, 0));
    }).join('');

    atualizarIndicadores();
}

/* ------------------------------------------------------------------ *
 * Renderizacao da pre-visualizacao do pedido
 * ------------------------------------------------------------------ */

function renderizarPedido() {
    const container = document.getElementById('lista-pedido');
    const candidatos = montarCandidatosDoPedido();
    const incluidos = candidatos.filter(({ reposicao }) => reposicao.precisaComprar);
    const totalPedido = incluidos.reduce((total, { reposicao }) => total + reposicao.custoEstimado, 0);

    document.getElementById('resumo-pedido-total').textContent = formatarMoeda(totalPedido);
    document.getElementById('resumo-pedido-itens').textContent = t('items_in_order', { n: formatarNumero(incluidos.length, 0) });

    if (!candidatos.length) {
        container.innerHTML = renderizarEstadoVazio({
            icone: 'fa-circle-check',
            titulo: t('empty_buy_title'),
            texto: t('empty_buy_text', { dias: DIAS_COBERTURA_META })
        });
        return;
    }

    const grupos = agruparItensPorCategoria(candidatos, ({ produto }) => produto.categoria);

    container.innerHTML = ordenarCategorias(grupos).map((categoria) => {
        const subtotal = grupos[categoria]
            .filter(({ reposicao }) => reposicao.precisaComprar)
            .reduce((total, { reposicao }) => total + reposicao.custoEstimado, 0);

        const itensHtml = grupos[categoria].map(({ produto, reposicao }) => {
            const unidade = formatarUnidadeExibicao(produto.unit);

            return renderizarItemPedido({
                id: produto.id,
                nome: produto.nome,
                categoria,
                inputId: `input-pedido-${produto.id}`,
                unidade,
                quantidadeComprar: produto.quantidadeComprar > 0 ? produto.quantidadeComprar : '',
                quantidadeSugeridaFormatada: `${formatarNumero(reposicao.quantidadeSugerida)} ${unidade}`,
                precoUnitarioFormatado: formatarMoeda(reposicao.precoUnitario),
                custoFormatado: formatarMoeda(reposicao.precisaComprar ? reposicao.custoEstimado : 0),
                ajusteManual: reposicao.ajusteManual,
                incluido: reposicao.precisaComprar,
                suggestedLabel: t('suggested_label'),
                unitPriceLabel: t('unit_price'),
                estimatedCostLabel: t('estimated_cost'),
                qtyLabel: t('qty_to_buy'),
                manualLabel: t('manual_label'),
                excludedNote: t('not_in_order'),
                removeLabel: t('remove_from_order'),
                addBackLabel: t('add_back_to_order')
            });
        }).join('');

        return renderizarGrupoPedido(categoria, itensHtml, t('subtotal'), formatarMoeda(subtotal));
    }).join('');
}

/** Atualiza apenas os numeros derivados, sem recriar inputs em foco. */
function atualizarTotais() {
    atualizarIndicadores();

    const candidatos = montarCandidatosDoPedido();
    const incluidos = candidatos.filter(({ reposicao }) => reposicao.precisaComprar);
    const totalPedido = incluidos.reduce((total, { reposicao }) => total + reposicao.custoEstimado, 0);

    const totalTexto = document.getElementById('resumo-pedido-total');
    if (totalTexto) {
        totalTexto.textContent = formatarMoeda(totalPedido);
        document.getElementById('resumo-pedido-itens').textContent = t('items_in_order', { n: formatarNumero(incluidos.length, 0) });
    }

    candidatos.forEach(({ produto, reposicao }) => {
        const celulaCusto = document.querySelector(`[data-custo-de="${produto.id}"]`);
        if (celulaCusto) {
            celulaCusto.textContent = formatarMoeda(reposicao.precisaComprar ? reposicao.custoEstimado : 0);
        }
    });

    produtos.forEach((produto) => {
        const celulaEstoque = document.querySelector(`[data-estoque-de="${produto.id}"]`);
        if (celulaEstoque) {
            celulaEstoque.textContent = formatarNumero(produto.estoqueAtual);
        }
    });
}

function renderizarTudo() {
    renderizarEstoque();
    renderizarPedido();
}

/** Re-renderiza preservando o campo que o usuario acabou de focar. */
function renderizarPreservandoFoco() {
    const idFoco = document.activeElement && document.activeElement.id;
    renderizarTudo();
    if (idFoco) {
        const elemento = document.getElementById(idFoco);
        if (elemento && typeof elemento.focus === 'function') {
            elemento.focus();
        }
    }
}

/* ------------------------------------------------------------------ *
 * Interacao com a quantidade a comprar
 * ------------------------------------------------------------------ */

document.addEventListener('input', (event) => {
    if (!event.target.classList.contains('input-qtd-comprar')) return;

    const produtoId = Number(event.target.dataset.id);
    const quantidadeComprar = numeroNaoNegativo(event.target.value);

    produtos = produtos.map((produto) => produto.id === produtoId
        ? { ...produto, quantidadeComprar }
        : produto);

    // Digitar uma quantidade reinclui o item que havia sido retirado do pedido.
    if (quantidadeComprar > 0) {
        produtos = produtos.map((produto) => produto.id === produtoId
            ? { ...produto, excluidoDoPedido: false }
            : produto);
    }

    salvarEstadoLocal();
    atualizarTotais();
});

document.addEventListener('change', (event) => {
    if (!event.target.classList.contains('input-qtd-comprar')) return;

    const produtoId = Number(event.target.dataset.id);
    const produto = produtos.find((item) => item.id === produtoId);
    if (!produto) return;

    const quantidadeNormalizada = produto.quantidadeComprar > 0
        ? normalizarQuantidadeCompra(produto.quantidadeComprar, produto.unit)
        : 0;

    produtos = produtos.map((item) => item.id === produtoId
        ? { ...item, quantidadeComprar: quantidadeNormalizada }
        : item);

    salvarEstadoLocal();
    requestAnimationFrame(renderizarPreservandoFoco);
});

function usarQuantidadeSugerida(id) {
    const produto = produtos.find((item) => item.id === id);
    if (!produto) return;

    const { quantidadeSugerida } = calcularNecessidadeDeReposicao(produto);
    produtos = produtos.map((item) => item.id === id
        ? { ...item, quantidadeComprar: quantidadeSugerida, excluidoDoPedido: false }
        : item);
    salvarERenderizar();
}

function alternarExclusaoPedido(id) {
    produtos = produtos.map((produto) => produto.id === id
        ? { ...produto, excluidoDoPedido: !produto.excluidoDoPedido }
        : produto);
    salvarERenderizar();
}

function restaurarSugestoes() {
    produtos = produtos.map((produto) => ({ ...produto, quantidadeComprar: 0, excluidoDoPedido: false }));
    salvarERenderizar();
    mostrarNotificacao(t('manual_reset_ok'), 'sucesso');
}

/* ------------------------------------------------------------------ *
 * Textos da interface
 * ------------------------------------------------------------------ */

function aplicarTextosPorChave() {
    document.querySelectorAll('[data-i18n]').forEach((elemento) => {
        const chave = elemento.dataset.i18n;
        if (!chave) return;
        elemento.textContent = t(chave);
    });
}

function aplicarTraducoes() {
    document.querySelectorAll('.i18n-placeholder').forEach((elemento) => {
        const chave = elemento.dataset.i18nPlaceholder;
        const fallback = elemento.dataset.placeholderDefault || elemento.getAttribute('placeholder') || chave || '';

        if (!chave) return;

        const traducao = t(chave);
        elemento.setAttribute('placeholder', traducao === chave ? fallback : traducao);
    });
}

function traduzirListaDeUnidades() {
    const selectUnidade = document.getElementById('prod-unidade');
    const valorAtual = selectUnidade.value;
    selectUnidade.innerHTML = renderizarOpcoes([
        { valor: 'pct', texto: t('unit_pack') },
        { valor: 'gr', texto: t('unit_grams') },
        { valor: 'unidade', texto: t('unit_unit') },
        { valor: 'kg', texto: t('unit_kg') },
        { valor: 'caixa', texto: t('unit_box') }
    ], valorAtual || 'pct');
}

function traduzirSeletoresConfiguracao() {
    document.getElementById('config-idioma').innerHTML = renderizarOpcoes([
        { valor: 'pt-BR', texto: t('language_pt') },
        { valor: 'en-US', texto: t('language_en') },
        { valor: 'de-DE', texto: t('language_de') },
        { valor: 'it-IT', texto: t('language_it') }
    ], configuracoes.language);

    document.getElementById('config-moeda').innerHTML = renderizarOpcoes([
        { valor: 'BRL', texto: t('currency_brl') },
        { valor: 'CHF', texto: t('currency_chf') },
        { valor: 'EUR', texto: t('currency_eur') },
        { valor: 'USD', texto: t('currency_usd') }
    ], configuracoes.currency);

    document.getElementById('config-tema').innerHTML = renderizarOpcoes([
        { valor: 'sistema', texto: t('theme_system') },
        { valor: 'claro', texto: t('theme_light') },
        { valor: 'escuro', texto: t('theme_dark') }
    ], obterTemaSalvo());
}

function aplicarTextosFormularioProduto() {
    document.getElementById('label-prod-nome').textContent = t('product_name');
    document.getElementById('label-prod-unidade').textContent = t('unit');
    document.getElementById('label-prod-preco').textContent = `${t('price')} (${getMoedaAtual().code})`;
    document.getElementById('label-prod-qtd').textContent = t('initial_qty');
    document.getElementById('label-prod-categoria').textContent = t('category');
    document.getElementById('label-consumo').textContent = t('consumption');
    document.getElementById('texto-dica-consumo').textContent = t('coverage_goal', { dias: DIAS_COBERTURA_META });
    document.getElementById('btn-cancelar-edicao').textContent = t('cancel');
    document.getElementById('btn-fechar-modal-produto').setAttribute('aria-label', t('close'));
}

function aplicarTextosEstoque() {
    document.getElementById('titulo-valor-total').textContent = t('stat_total_value');
    document.getElementById('titulo-stat-itens').textContent = t('stat_items');
    document.getElementById('titulo-stat-comprar').textContent = t('stat_to_buy');
    document.getElementById('titulo-stat-custo').textContent = t('stat_estimated_cost');
    document.getElementById('titulo-meu-estoque').textContent = t('my_stock');
    document.getElementById('texto-novo-produto').textContent = t('new_product');
    document.getElementById('texto-novo-produto-topo').textContent = t('new_product');
    document.getElementById('label-busca').textContent = t('search_label');
    document.getElementById('label-filtro-categoria').textContent = t('filter_category');
    document.getElementById('label-filtro-status').textContent = t('filter_status');
    document.getElementById('label-ordem').textContent = t('sort_label');
    document.getElementById('btn-limpar-filtros').textContent = t('clear_filters');
}

function aplicarTextosSolicitacaoCompra() {
    document.getElementById('titulo-solicitacao-compra').textContent = t('purchase_request');
    document.getElementById('texto-estoque-baixo').textContent = t('low_stock_note', { dias: DIAS_COBERTURA_META });
    document.getElementById('titulo-requisitante').textContent = t('requester_data');
    document.getElementById('label-req-funcionario').textContent = t('employee_name');
    document.getElementById('label-req-gestor').textContent = t('manager_name_optional');
    document.getElementById('titulo-previsao').textContent = t('purchase_preview_title');
    document.getElementById('texto-previsao').textContent = t('purchase_preview_text');
    document.getElementById('btn-restaurar-sugestoes').innerHTML = `<i class="fa-solid fa-rotate-left mr-1" aria-hidden="true"></i>${window.InventoryUI.escapar(t('restore_suggestions'))}`;
    document.getElementById('label-total-pedido').textContent = t('order_total');
    document.getElementById('texto-gerar-pdf').textContent = t('generate_pdf');
}

function aplicarTextosConfiguracoes() {
    document.getElementById('titulo-configuracoes').textContent = t('settings');
    document.getElementById('titulo-identidade').textContent = t('identity');
    document.getElementById('label-config-nome').textContent = t('business_name');
    document.getElementById('btn-salvar-nome').textContent = t('save_name');
    document.getElementById('titulo-idioma-moeda').textContent = t('language_currency');
    document.getElementById('label-idioma').textContent = t('language');
    document.getElementById('label-moeda').textContent = t('currency');
    document.getElementById('titulo-aparencia').textContent = t('appearance');
    document.getElementById('label-tema').textContent = t('theme_label');
    document.getElementById('titulo-sincronizacao').innerHTML = `<i class="fas fa-sync-alt" aria-hidden="true"></i> ${window.InventoryUI.escapar(t('sync_title'))}`;
    document.getElementById('texto-sincronizacao').textContent = t('sync_text');
    document.getElementById('btn-exportar').textContent = t('export_json');
    document.getElementById('texto-importar').textContent = t('import');
}

function aplicarTextosNavegacaoEPdf() {
    document.getElementById('nav-estoque-texto').textContent = t('nav_stock');
    document.getElementById('nav-comprar-texto').textContent = t('nav_buy');
    document.getElementById('nav-configs-texto').textContent = t('nav_settings');
    document.getElementById('btn-ajuda').setAttribute('aria-label', t('help'));
    document.getElementById('btn-ajuda').setAttribute('title', t('help'));
    document.getElementById('btn-tema').setAttribute('aria-label', t('theme_label'));
    document.getElementById('btn-tema').setAttribute('title', t('theme_label'));

    document.getElementById('pdf-titulo').textContent = t('pdf_title');
    document.getElementById('pdf-label-data').textContent = `${t('date')}:`;
    document.getElementById('pdf-label-funcionario').textContent = `${t('requester')}:`;
    document.getElementById('pdf-label-gestor').textContent = `${t('approver')}:`;
    document.getElementById('pdf-th-produto').textContent = t('product');
    document.getElementById('pdf-th-qtd').textContent = t('qty_to_buy');
    document.getElementById('pdf-th-unidade').textContent = t('unit');
    document.getElementById('pdf-th-preco').textContent = t('unit_price');
    document.getElementById('pdf-th-custo').textContent = t('estimated_cost');

    document.getElementById('update-banner-titulo').textContent = t('update_title');
    document.getElementById('update-banner-texto').textContent = t('update_text');
    document.getElementById('btn-update-app').textContent = t('update_action');
    document.getElementById('link-pular').textContent = t('skip_to_content');

    document.getElementById('btn-confirmar').textContent = t('confirm');
    document.getElementById('btn-cancelar-confirmacao').textContent = t('cancel');
}

function aplicarConfiguracoesInterface() {
    document.documentElement.lang = configuracoes.language;
    document.title = t('page_title');
    document.getElementById('status-local').textContent = t('local_mode');

    aplicarTextosEstoque();
    aplicarTextosFormularioProduto();
    aplicarTextosSolicitacaoCompra();
    aplicarTextosConfiguracoes();
    aplicarTextosNavegacaoEPdf();
    traduzirListaDeUnidades();
    traduzirSeletoresConfiguracao();
    aplicarTraducoes();
    aplicarTextosPorChave();

    carregarIdentidade();
    renderizarTudo();
}

/* ------------------------------------------------------------------ *
 * Preferencias e identidade
 * ------------------------------------------------------------------ */

function salvarPreferencias() {
    const idioma = document.getElementById('config-idioma').value;
    configuracoes = {
        language: traducoes[idioma] ? idioma : 'pt-BR',
        currency: moedas[document.getElementById('config-moeda').value] ? document.getElementById('config-moeda').value : 'BRL'
    };
    appData.configuracoes.idioma = mapearLocaleParaIdiomaStorage(configuracoes.language);
    appData.configuracoes.moeda = configuracoes.currency;
    localStorage.setItem('app_data', JSON.stringify(appData));
    aplicarConfiguracoesInterface();
}

function carregarIdentidade() {
    const nome = appData.configuracoes.empresa || localStorage.getItem('nome_estabelecimento') || t('default_business_name');
    document.getElementById('header-name').textContent = nome;
    document.getElementById('config-nome').value = nome;
}

function salvarIdentidade() {
    const nome = document.getElementById('config-nome').value.trim();
    appData.configuracoes.empresa = nome;
    localStorage.setItem('app_data', JSON.stringify(appData));
    localStorage.setItem('nome_estabelecimento', nome);
    carregarIdentidade();
    mostrarNotificacao(t('name_saved'), 'sucesso');
}

/* ------------------------------------------------------------------ *
 * Navegacao entre abas
 * ------------------------------------------------------------------ */

function mudarAba(abaId) {
    abaAtiva = abaId;
    document.querySelectorAll('.tab-content').forEach((tabContent) => tabContent.classList.remove('active'));
    document.getElementById(abaId).classList.add('active');

    document.querySelectorAll('nav button').forEach((botaoNavegacao) => {
        botaoNavegacao.classList.remove('text-blue-600', 'dark:text-blue-400');
        botaoNavegacao.classList.add('text-slate-500', 'dark:text-slate-400');
        botaoNavegacao.removeAttribute('aria-current');
    });

    const botaoAtivo = document.getElementById(`btn-${abaId}`);
    botaoAtivo.classList.remove('text-slate-500', 'dark:text-slate-400');
    botaoAtivo.classList.add('text-blue-600', 'dark:text-blue-400');
    botaoAtivo.setAttribute('aria-current', 'page');

    // O botao flutuante de cadastro so faz sentido na aba de estoque.
    document.getElementById('btn-novo-produto').hidden = abaId !== 'tab-estoque';

    if (abaId === 'tab-compra') {
        renderizarPedido();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ------------------------------------------------------------------ *
 * Modal de produto
 * ------------------------------------------------------------------ */

function travarRolagemDoFundo(travar) {
    document.body.classList.toggle('overflow-hidden', travar);
}

function abrirModalProduto(produto = null) {
    const modal = document.getElementById('modal-produto');
    const formulario = document.getElementById('form-produto');

    if (produto) {
        document.getElementById('titulo-modal-produto').textContent = t('edit_product_title');
        document.getElementById('btn-salvar-produto').textContent = t('save_changes');
        document.getElementById('produto-editando-id').value = produto.id;
        document.getElementById('prod-nome').value = produto.nome;
        document.getElementById('prod-preco').value = produto.precoUnitario;
        document.getElementById('prod-qtd').value = produto.estoqueAtual;
        document.getElementById('consumo-semanal').value = produto.consumoSemanal || '';
        document.getElementById('prod-categoria').value = produto.categoria || '';
        document.getElementById('prod-unidade').value = produto.unit || 'pct';
        formulario.classList.add('form-editando');
    } else {
        formulario.reset();
        document.getElementById('titulo-modal-produto').textContent = t('new_product_title');
        document.getElementById('btn-salvar-produto').textContent = t('save_product');
        document.getElementById('produto-editando-id').value = '';
        document.getElementById('prod-unidade').value = 'pct';
        formulario.classList.remove('form-editando');
    }

    modal.classList.remove('hidden');
    travarRolagemDoFundo(true);
    setTimeout(() => document.getElementById('prod-nome').focus(), 50);
}

function fecharModalProduto() {
    document.getElementById('modal-produto').classList.add('hidden');
    document.getElementById('form-produto').classList.remove('form-editando');
    travarRolagemDoFundo(false);
}

function obterProdutoDoFormulario() {
    return {
        nome: document.getElementById('prod-nome').value.trim(),
        estoqueAtual: Number(document.getElementById('prod-qtd').value),
        precoUnitario: Number(document.getElementById('prod-preco').value),
        consumoSemanal: Number(document.getElementById('consumo-semanal').value || 0),
        categoria: document.getElementById('prod-categoria').value.trim(),
        unit: normalizarUnidade(document.getElementById('prod-unidade').value)
    };
}

function validarProduto(dados) {
    if (!dados.nome) {
        return t('required_name');
    }

    const numericos = [dados.estoqueAtual, dados.precoUnitario, dados.consumoSemanal];
    const invalido = numericos.some((valor) => !Number.isFinite(valor) || valor < 0);

    return invalido ? t('invalid_values') : '';
}

document.getElementById('form-produto').addEventListener('submit', function (event) {
    event.preventDefault();

    const dados = obterProdutoDoFormulario();
    const erro = validarProduto(dados);
    if (erro) {
        mostrarNotificacao(erro, 'erro');
        return;
    }

    const produtoEditandoId = document.getElementById('produto-editando-id').value;

    if (produtoEditandoId) {
        const id = Number(produtoEditandoId);
        produtos = produtos.map((produto) => produto.id === id
            ? normalizarProduto({ ...produto, ...dados })
            : produto);
    } else {
        produtos = [...produtos, normalizarProduto({ id: Date.now(), ...dados, quantidadeComprar: 0 })];
    }

    salvarERenderizar();
    fecharModalProduto();
    mostrarNotificacao(t('product_saved'), 'sucesso');
});

function editarProduto(id) {
    const produto = produtos.find((item) => item.id === id);
    if (!produto) return;
    abrirModalProduto(produto);
}

function alterarQtd(id, delta) {
    produtos = produtos.map((produto) => produto.id === id
        ? { ...produto, estoqueAtual: Math.max(0, (Number(produto.estoqueAtual) || 0) + delta) }
        : produto);
    salvarERenderizar();
}

/* ------------------------------------------------------------------ *
 * Modal de confirmacao
 * ------------------------------------------------------------------ */

function pedirConfirmacao({ titulo, texto }) {
    const modal = document.getElementById('modal-confirmacao');
    document.getElementById('titulo-confirmacao').textContent = titulo;
    document.getElementById('texto-confirmacao').textContent = texto;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    travarRolagemDoFundo(true);
    setTimeout(() => document.getElementById('btn-confirmar').focus(), 50);

    return new Promise((resolve) => {
        resolverConfirmacao = resolve;
    });
}

function fecharConfirmacao(resultado) {
    const modal = document.getElementById('modal-confirmacao');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    travarRolagemDoFundo(false);

    if (resolverConfirmacao) {
        resolverConfirmacao(resultado);
        resolverConfirmacao = null;
    }
}

document.getElementById('btn-confirmar').addEventListener('click', () => fecharConfirmacao(true));
document.getElementById('btn-cancelar-confirmacao').addEventListener('click', () => fecharConfirmacao(false));

async function excluirProduto(id) {
    const produto = produtos.find((item) => item.id === id);
    if (!produto) return;

    const confirmado = await pedirConfirmacao({
        titulo: t('confirm_delete_title'),
        texto: t('confirm_delete_text', { nome: produto.nome })
    });
    if (!confirmado) return;

    produtos = produtos.filter((item) => item.id !== id);

    if (document.getElementById('produto-editando-id').value === String(id)) {
        fecharModalProduto();
    }

    salvarERenderizar();
    mostrarNotificacao(t('product_deleted'), 'sucesso');
}

/* ------------------------------------------------------------------ *
 * Central de Ajuda
 * ------------------------------------------------------------------ */

function abrirModalAjuda() {
    const modalAjuda = document.getElementById('modal-ajuda');
    if (!modalAjuda) return;
    modalAjuda.classList.remove('hidden');
    modalAjuda.classList.add('flex');
    travarRolagemDoFundo(true);
}

function fecharModalAjuda() {
    const modalAjuda = document.getElementById('modal-ajuda');
    if (!modalAjuda) return;
    modalAjuda.classList.add('hidden');
    modalAjuda.classList.remove('flex');
    travarRolagemDoFundo(false);
}

document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;

    if (!document.getElementById('modal-confirmacao').classList.contains('hidden')) {
        fecharConfirmacao(false);
        return;
    }
    if (!document.getElementById('modal-produto').classList.contains('hidden')) {
        fecharModalProduto();
        return;
    }
    if (!document.getElementById('modal-ajuda').classList.contains('hidden')) {
        fecharModalAjuda();
    }
});

// Clique no fundo escuro fecha o modal correspondente.
document.getElementById('modal-produto').addEventListener('click', (event) => {
    if (event.target.id === 'modal-produto') fecharModalProduto();
});
document.getElementById('modal-ajuda').addEventListener('click', (event) => {
    if (event.target.id === 'modal-ajuda') fecharModalAjuda();
});
document.getElementById('modal-confirmacao').addEventListener('click', (event) => {
    if (event.target.id === 'modal-confirmacao') fecharConfirmacao(false);
});

/* ------------------------------------------------------------------ *
 * Geracao do PDF
 * ------------------------------------------------------------------ */

function gerarPDF() {
    const funcionario = document.getElementById('req-funcionario').value.trim();
    if (!funcionario) {
        mostrarNotificacao(t('required_employee'), 'erro');
        document.getElementById('req-funcionario').focus();
        return;
    }

    const html2pdfDisponivel =
        (typeof window.html2pdf === 'function' && window.html2pdf) ||
        (typeof html2pdf === 'function' && html2pdf) ||
        null;

    if (!html2pdfDisponivel) {
        console.error('Biblioteca html2pdf indisponivel no momento do clique.');
        mostrarNotificacao(t('pdf_lib_missing'), 'erro');
        return;
    }

    const listaCompras = montarListaTemporariaCompras();
    const corpoTabela = document.getElementById('pdf-tabela-corpo');

    document.getElementById('pdf-nome-estab').textContent = appData.configuracoes.empresa || t('default_business_name');
    document.getElementById('pdf-data').textContent = new Date().toLocaleDateString(configuracoes.language);
    document.getElementById('pdf-funcionario').textContent = funcionario;
    document.getElementById('pdf-gestor').textContent = document.getElementById('req-gestor').value.trim() || t('not_provided');

    if (!listaCompras.length) {
        corpoTabela.innerHTML = renderizarPdfSemItens(t('no_critical_items'));
        document.getElementById('pdf-legenda-manual').textContent = '';
    } else {
        const grupos = agruparItensPorCategoria(listaCompras);
        let totalGeral = 0;
        let html = '';

        ordenarCategorias(grupos).forEach((categoria) => {
            const itens = grupos[categoria];
            const subtotal = itens.reduce((total, item) => total + item.custoEstimado, 0);
            totalGeral += subtotal;

            html += renderizarPdfCategoria(categoria);
            itens.forEach((item) => {
                html += renderizarPdfItem({
                    nome: item.nome,
                    quantidade: formatarNumero(item.diferenca),
                    unidade: formatarUnidadeExibicao(item.unit),
                    precoUnitario: formatarMoeda(item.precoUnitario),
                    custoEstimado: formatarMoeda(item.custoEstimado),
                    ajusteManual: item.ajusteManual
                });
            });
            html += renderizarPdfSubtotal(`${t('subtotal')} — ${categoria}`, formatarMoeda(subtotal));
        });

        html += renderizarPdfTotal(t('order_total'), formatarMoeda(totalGeral));
        corpoTabela.innerHTML = html;

        const temAjusteManual = listaCompras.some((item) => item.ajusteManual);
        document.getElementById('pdf-legenda-manual').textContent = temAjusteManual ? t('pdf_manual_legend') : '';
    }

    const elementoParaImpressao = document.getElementById('area-impressao');
    elementoParaImpressao.style.display = 'block';

    const opcoes = {
        margin: 10,
        filename: `Pedido_Compra_${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdfDisponivel().set(opcoes).from(elementoParaImpressao).save().then(() => {
        elementoParaImpressao.style.display = 'none';
        mostrarNotificacao(t('pdf_generated'), 'sucesso');
    }).catch((erro) => {
        console.error('Falha ao gerar o PDF:', erro);
        elementoParaImpressao.style.display = 'none';
        mostrarNotificacao(t('pdf_lib_missing'), 'erro');
    });
}

/* ------------------------------------------------------------------ *
 * Backup local-first
 * ------------------------------------------------------------------ */

function exportarEstoque() {
    const jsonString = JSON.stringify(appData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const linkDownload = document.createElement('a');
    linkDownload.href = url;
    linkDownload.download = `backup_estoque_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(linkDownload);
    linkDownload.click();
    document.body.removeChild(linkDownload);
    URL.revokeObjectURL(url);
    mostrarNotificacao(t('exported_ok'), 'sucesso');
}

function aplicarBackupImportado(dadosCarregados) {
    appData = {
        version: '2.2',
        configuracoes: {
            empresa: String(dadosCarregados.configuracoes?.empresa || ''),
            idioma: mapearLocaleParaIdiomaStorage(
                mapearIdiomaStorageParaLocale(dadosCarregados.configuracoes?.idioma) || detectarIdiomaInicial()
            ),
            moeda: moedas[dadosCarregados.configuracoes?.moeda] ? dadosCarregados.configuracoes.moeda : 'BRL'
        },
        itens: normalizarListaDeProdutos(dadosCarregados.itens)
    };

    produtos = appData.itens;
    configuracoes = {
        language: mapearIdiomaStorageParaLocale(appData.configuracoes.idioma) || detectarIdiomaInicial(),
        currency: appData.configuracoes.moeda
    };

    localStorage.setItem('app_data', JSON.stringify(appData));
    localStorage.setItem('nome_estabelecimento', appData.configuracoes.empresa);
    salvarEstadoLocal();
    aplicarConfiguracoesInterface();
    mostrarNotificacao(t('synced_ok'), 'sucesso');
}

function importarEstoque(evento) {
    const arquivo = evento.target.files[0];
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = function (loadEvent) {
        try {
            const dadosCarregados = JSON.parse(loadEvent.target.result);

            if (dadosCarregados && dadosCarregados.version === '2.2' && Array.isArray(dadosCarregados.itens)) {
                const itensValidos = dadosCarregados.itens.every((item) =>
                    item
                    && Number.isFinite(Number(item.id))
                    && typeof item.nome === 'string'
                    && Number.isFinite(Number(item.estoqueAtual))
                    && Number.isFinite(Number(item.precoUnitario)));

                if (!itensValidos) {
                    mostrarNotificacao(t('invalid_file'), 'erro');
                    return;
                }

                aplicarBackupImportado(dadosCarregados);
            } else if (dadosCarregados && Array.isArray(dadosCarregados.produtos)) {
                // Formato anterior a versao 2.2.
                aplicarBackupImportado({
                    configuracoes: {
                        empresa: dadosCarregados.estabelecimento || '',
                        idioma: dadosCarregados.configuracoes?.language,
                        moeda: dadosCarregados.configuracoes?.currency
                    },
                    itens: dadosCarregados.produtos
                });
            } else {
                mostrarNotificacao(t('invalid_file'), 'erro');
            }
        } catch (erro) {
            console.error('Falha ao ler o backup importado:', erro);
            mostrarNotificacao(t('read_error'), 'erro');
        } finally {
            evento.target.value = '';
        }
    };
    leitor.readAsText(arquivo);
}

/* ------------------------------------------------------------------ *
 * Instalacao do PWA
 * ------------------------------------------------------------------ */

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;

    let botaoInstalacao = document.getElementById('btn-install');
    if (!botaoInstalacao) {
        botaoInstalacao = document.createElement('button');
        botaoInstalacao.id = 'btn-install';
        botaoInstalacao.type = 'button';
        botaoInstalacao.className = 'fixed bottom-44 right-4 z-30 inline-flex items-center gap-2 rounded-full bg-slate-800 px-4 py-3 font-bold text-white shadow-lg transition hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400';
        botaoInstalacao.innerHTML = `<i class="fas fa-download" aria-hidden="true"></i> ${window.InventoryUI.escapar(t('install_app'))}`;
        document.body.appendChild(botaoInstalacao);
    }

    botaoInstalacao.style.display = 'inline-flex';
});

window.addEventListener('click', (event) => {
    const botaoClicado = event.target.closest('#btn-install');
    if (!botaoClicado) return;

    event.preventDefault();
    botaoClicado.style.display = 'none';

    if (!deferredPrompt) return;

    deferredPrompt.prompt().then(() => deferredPrompt.userChoice).then(() => {
        deferredPrompt = null;
    }).catch(() => {
        deferredPrompt = null;
    });
});

window.addEventListener('appinstalled', () => {
    const botaoInstalacao = document.getElementById('btn-install');
    if (botaoInstalacao) {
        botaoInstalacao.remove();
    }
    deferredPrompt = null;
});

/* ------------------------------------------------------------------ *
 * Inicializacao
 * ------------------------------------------------------------------ */

['filtro-busca', 'filtro-categoria', 'filtro-status', 'filtro-ordem'].forEach((idCampo) => {
    const campo = document.getElementById(idCampo);
    campo.addEventListener('input', () => {
        lerFiltrosDaTela();
        renderizarEstoque();
    });
});

aplicarTema(obterTemaSalvo());
aplicarConfiguracoesInterface();
mudarAba('tab-estoque');
