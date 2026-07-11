if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js', { scope: './' }).catch((erro) => {
            console.error('Falha ao registrar Service Worker:', erro);
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
    renderizarPdfCategoria,
    renderizarPdfItem,
    renderizarPdfSemItens
} = window.InventoryUI;

const DIAS_COBERTURA_META = 7;

function carregarConfiguracoesSalvas() {
    try {
        const persistedAppData = JSON.parse(localStorage.getItem('app_data'));
        if (persistedAppData && persistedAppData.version === '2.2') {
            return persistedAppData;
        }
    } catch (erro) {
    }

    const produtosAntigos = JSON.parse(localStorage.getItem('lista_produtos')) || [];
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
let produtos = appData.itens || [];
let configuracoes = {
    language: mapearIdiomaStorageParaLocale(appData.configuracoes?.idioma) || detectarIdiomaInicial(),
    currency: appData.configuracoes?.moeda || 'BRL'
};
carregarIdentidade();
aplicarConfiguracoesInterface();
renderizarEstoque();

document.addEventListener('input', (event) => {
    if (!event.target.classList.contains('input-qtd-comprar')) return;

    const produtoId = parseInt(event.target.dataset.id);
    const quantidadeComprar = parseInt(event.target.value) || 0;

    produtos = produtos.map((produto) => produto.id === produtoId ? { ...produto, quantidadeComprar } : produto);
    salvarEstadoLocal();
});

function getTraducoesAtuais() {
    return traducoes[configuracoes.language] || traducoes['pt-BR'];
}

function t(chave, substituicoes = {}) {
    let texto = getTraducoesAtuais()[chave] || traducoes['pt-BR'][chave] || chave;
    Object.entries(substituicoes).forEach(([campo, valor]) => {
        texto = texto.replace(new RegExp(`\{${campo}\}`, 'g'), valor);
    });
    return texto;
}

function getMoedaAtual() {
    return moedas[configuracoes.currency] || moedas.BRL;
}

function formatarMoeda(valor) {
    const moeda = getMoedaAtual();
    return new Intl.NumberFormat(moeda.locale, { style: 'currency', currency: moeda.code }).format(valor);
}

function salvarEstadoLocal() {
    appData.itens = produtos;
    localStorage.setItem('app_data', JSON.stringify(appData));
    localStorage.setItem('lista_produtos', JSON.stringify(produtos));
}

function aplicarTraducoes() {
    document.querySelectorAll('.i18n-placeholder').forEach((elemento) => {
        const chave = elemento.dataset.i18nPlaceholder;
        const fallback = elemento.dataset.placeholderDefault || elemento.getAttribute('placeholder') || chave || '';

        if (!chave) {
            return;
        }

        const traducao = t(chave);
        elemento.setAttribute('placeholder', traducao === chave ? fallback : traducao);
    });
}

function traduzirListaDeUnidades() {
    const selectUnidade = document.getElementById('prod-unidade');
    selectUnidade.innerHTML = `
        <option value="pct">${t('unit_pack')}</option>
        <option value="gr">${t('unit_grams')}</option>
        <option value="unidade">${t('unit_unit')}</option>
        <option value="kg">${t('unit_kg')}</option>
        <option value="caixa">${t('unit_box')}</option>
    `;
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

function agruparItensPorCategoria(itens) {
    return itens.reduce((gruposPorCategoria, item) => {
        const categoria = (item.categoria || t('uncategorized')).trim();
        if (!gruposPorCategoria[categoria]) {
            gruposPorCategoria[categoria] = [];
        }
        gruposPorCategoria[categoria].push(item);
        return gruposPorCategoria;
    }, {});
}

function obterProdutoDoFormulario() {
    return {
        nome: document.getElementById('prod-nome').value,
        estoqueAtual: parseFloat(document.getElementById('prod-qtd').value),
        precoUnitario: parseFloat(document.getElementById('prod-preco').value),
        consumoSemanal: Number(document.getElementById('consumo-semanal').value || 0),
        categoria: document.getElementById('prod-categoria').value.trim(),
        unit: document.getElementById('prod-unidade').value,
        quantidadeComprar: 0
    };
}

function traduzirSeletoresConfiguracao() {
    const selectIdioma = document.getElementById('config-idioma');
    const selectMoeda = document.getElementById('config-moeda');
    selectIdioma.innerHTML = `
        <option value="pt-BR">${t('language_pt')}</option>
        <option value="en-US">${t('language_en')}</option>
        <option value="de-DE">${t('language_de')}</option>
        <option value="it-IT">${t('language_it')}</option>
    `;
    selectMoeda.innerHTML = `
        <option value="BRL">${t('currency_brl')}</option>
        <option value="CHF">${t('currency_chf')}</option>
        <option value="EUR">${t('currency_eur')}</option>
        <option value="USD">${t('currency_usd')}</option>
    `;
}

function aplicarTextosFormularioProduto() {
    document.getElementById('titulo-adicionar-produto').innerText = t('add_product');
    document.getElementById('label-prod-nome').innerText = t('product_name');
    document.getElementById('label-prod-unidade').innerText = t('unit');
    document.getElementById('label-prod-preco').innerText = `${t('price')} (${getMoedaAtual().code})`;
    document.getElementById('label-prod-qtd').innerText = t('initial_qty');
    document.getElementById('label-prod-categoria').innerText = t('category');

    const labelConsumo = document.getElementById('label-consumo');
    if (labelConsumo) {
        labelConsumo.innerText = t('consumption');
    }

    document.getElementById('btn-salvar-produto').innerText = t('save_product');
    document.getElementById('btn-cancelar-edicao').innerText = t('cancel');
}

function aplicarTextosSolicitacaoCompra() {
    document.getElementById('titulo-solicitacao-compra').innerText = t('purchase_request');
    document.getElementById('label-req-funcionario').innerText = t('employee_name');
    document.getElementById('label-req-gestor').innerText = t('manager_name_optional');
    document.getElementById('btn-gerar-pdf').innerHTML = `<i class="fas fa-file-pdf"></i> ${t('generate_pdf')}`;
    document.getElementById('texto-estoque-baixo').innerText = t('low_stock_note');
}

function aplicarTextosConfiguracoes() {
    document.getElementById('titulo-configuracoes').innerText = t('settings');
    document.getElementById('titulo-identidade').innerText = t('identity');
    document.getElementById('label-config-nome').innerText = t('business_name');
    document.getElementById('btn-salvar-nome').innerText = t('save_name');
    document.getElementById('titulo-idioma-moeda').innerText = t('language_currency');
    document.getElementById('label-idioma').innerText = t('language');
    document.getElementById('label-moeda').innerText = t('currency');
    document.getElementById('titulo-sincronizacao').innerHTML = `<i class="fas fa-sync-alt"></i> ${t('sync_title')}`;
    document.getElementById('texto-sincronizacao').innerText = t('sync_text');
    document.getElementById('btn-exportar').innerText = t('export_json');
    document.getElementById('texto-importar').innerText = t('import');
}

function aplicarTextosNavegacaoEPdf() {
    document.getElementById('nav-estoque-texto').innerText = t('nav_stock');
    document.getElementById('nav-comprar-texto').innerText = t('nav_buy');
    document.getElementById('nav-configs-texto').innerText = t('nav_settings');
    document.getElementById('pdf-titulo').innerText = t('pdf_title');
    document.getElementById('pdf-label-data').innerText = `${t('date')}:`;
    document.getElementById('pdf-label-funcionario').innerText = `${t('requester')}:`;
    document.getElementById('pdf-label-gestor').innerText = `${t('approver')}:`;
    document.getElementById('pdf-th-produto').innerText = t('product');
    document.getElementById('pdf-th-estoque').innerText = t('purchase_qty');
    document.getElementById('pdf-th-unidade').innerText = t('unit');
}

function aplicarConfiguracoesInterface() {
    document.documentElement.lang = configuracoes.language;
    document.title = t('page_title');
    document.getElementById('status-local').innerText = t('local_mode');
    document.getElementById('titulo-valor-total').innerText = t('total_stock_value');
    document.getElementById('titulo-meu-estoque').innerText = t('my_stock');
    document.getElementById('btn-novo-produto').innerText = t('new_product');

    aplicarTextosFormularioProduto();
    aplicarTextosSolicitacaoCompra();
    aplicarTextosConfiguracoes();
    aplicarTextosNavegacaoEPdf();
    traduzirListaDeUnidades();
    traduzirSeletoresConfiguracao();
    aplicarTraducoes();
    document.getElementById('config-idioma').value = traducoes[configuracoes.language] ? configuracoes.language : 'pt-BR';
    document.getElementById('config-moeda').value = moedas[configuracoes.currency] ? configuracoes.currency : 'BRL';
    carregarIdentidade();
    renderizarEstoque();
}

function salvarPreferencias() {
    const idioma = document.getElementById('config-idioma').value;
    configuracoes = {
        language: idioma,
        currency: document.getElementById('config-moeda').value
    };
    appData.configuracoes.idioma = mapearLocaleParaIdiomaStorage(idioma);
    appData.configuracoes.moeda = configuracoes.currency;
    localStorage.setItem('app_data', JSON.stringify(appData));
    aplicarConfiguracoesInterface();
}

function mudarAba(abaId) {
    document.querySelectorAll('.tab-content').forEach((tabContent) => tabContent.classList.remove('active'));
    document.getElementById(abaId).classList.add('active');

    document.querySelectorAll('nav button').forEach((botaoNavegacao) => {
        botaoNavegacao.classList.remove('text-blue-600');
        botaoNavegacao.classList.add('text-gray-500');
    });
    document.getElementById('btn-' + abaId).classList.remove('text-gray-500');
    document.getElementById('btn-' + abaId).classList.add('text-blue-600');
}

function carregarIdentidade() {
    const nome = appData.configuracoes.empresa || localStorage.getItem('nome_estabelecimento') || t('default_business_name');
    document.getElementById('header-name').innerText = nome;
    document.getElementById('config-nome').value = nome;
}

function salvarIdentidade() {
    const nome = document.getElementById('config-nome').value;
    appData.configuracoes.empresa = nome;
    localStorage.setItem('app_data', JSON.stringify(appData));
    localStorage.setItem('nome_estabelecimento', nome);
    carregarIdentidade();
    alert(t('name_saved'));
}

document.getElementById('form-produto').addEventListener('submit', function(event) {
    event.preventDefault();
    const produtoEditandoId = document.getElementById('produto-editando-id').value;
    const novoProduto = obterProdutoDoFormulario();

    if (produtoEditandoId) {
        const index = produtos.findIndex(p => p.id === Number(produtoEditandoId));
        if (index !== -1) {
            produtos[index] = { ...produtos[index], ...novoProduto };
        }
    } else {
        produtos.push({ id: Date.now(), ...novoProduto });
    }
    salvarERenderizar();
    this.reset();
    cancelarEdicaoProduto();
});

function preencherFormularioProduto(produto) {
    document.getElementById('produto-editando-id').value = produto.id;
    document.getElementById('prod-nome').value = produto.nome;
    document.getElementById('prod-preco').value = produto.precoUnitario;
    document.getElementById('prod-qtd').value = produto.estoqueAtual;
    document.getElementById('consumo-semanal').value = produto.consumoSemanal ?? 0;
    document.getElementById('prod-categoria').value = produto.categoria || '';
    document.getElementById('prod-unidade').value = produto.unit || '';
    document.getElementById('titulo-adicionar-produto').innerText = `${t('add_product')} - ${t('edit')}`;
    document.getElementById('btn-salvar-produto').innerText = t('save_changes');
    document.getElementById('btn-cancelar-edicao').classList.remove('hidden');
    document.getElementById('form-produto').classList.add('editing-mode');
}

function cancelarEdicaoProduto() {
    document.getElementById('produto-editando-id').value = '';
    document.getElementById('titulo-adicionar-produto').innerText = t('add_product');
    document.getElementById('btn-salvar-produto').innerText = t('save_product');
    document.getElementById('btn-cancelar-edicao').classList.add('hidden');
    document.getElementById('form-produto').classList.remove('editing-mode');
}

function editarProduto(id) {
    const produto = produtos.find(p => p.id === id);
    if (!produto) return;
    preencherFormularioProduto(produto);
    document.getElementById('prod-nome').focus();
}

function excluirProduto(id) {
    const produto = produtos.find(p => p.id === id);
    const confirmar = confirm(`${t('delete')} ${produto ? produto.nome : ''}?`);
    if (!confirmar) return;
    produtos = produtos.filter(p => p.id !== id);
    if (document.getElementById('produto-editando-id').value === String(id)) {
        cancelarEdicaoProduto();
        document.getElementById('form-produto').reset();
    }
    salvarERenderizar();
}

function alterarQtd(id, delta) {
    const index = produtos.findIndex(p => p.id === id);
    if (index !== -1) {
        produtos[index].estoqueAtual += delta;
        if (produtos[index].estoqueAtual < 0) produtos[index].estoqueAtual = 0;
        salvarERenderizar();
    }
}

function salvarERenderizar() {
    salvarEstadoLocal();
    renderizarEstoque();
}

function capturarScrollDosCarrosseis() {
    const posicoes = new Map();
    document.querySelectorAll('#lista-produtos .grupo-categoria[data-categoria]').forEach((container) => {
        posicoes.set(container.dataset.categoria, container.scrollLeft || 0);
    });
    return posicoes;
}

function restaurarScrollDosCarrosseis(posicoes) {
    document.querySelectorAll('#lista-produtos .grupo-categoria[data-categoria]').forEach((container) => {
        const scrollSalvo = posicoes.get(container.dataset.categoria);
        if (typeof scrollSalvo === 'number') {
            container.scrollLeft = scrollSalvo;
        }
    });
}

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

function calcularNecessidadeDeReposicao(produto) {
    const unidade = produto.unit || produto.unidade || '';
    const estoqueAtual = Math.max(0, Number(produto.estoqueAtual) || 0);
    const consumoSemanal = Number(produto.consumoSemanal) || 0;
    const diasDeCobertura = calcularDiasDeCobertura(estoqueAtual, consumoSemanal);

    if (consumoSemanal <= 0 || diasDeCobertura === null || diasDeCobertura >= DIAS_COBERTURA_META) {
        return {
            precisaComprar: false,
            diferenca: 0,
            custoEstimado: 0,
            diasDeCobertura
        };
    }

    const diferenca = normalizarQuantidadeCompra(consumoSemanal - estoqueAtual, unidade);
    return {
        precisaComprar: diferenca > 0,
        diferenca,
        custoEstimado: (Number(produto.precoUnitario) || 0) * diferenca,
        diasDeCobertura
    };
}

function renderizarEstoque() {
    const lista = document.getElementById('lista-produtos');
    const posicoesScroll = capturarScrollDosCarrosseis();
    lista.innerHTML = '';
    let valorTotal = 0;

    const grupos = agruparItensPorCategoria(produtos);

    Object.entries(grupos).forEach(([categoria, itens]) => {
        const cards = itens.map(prod => {
            const id = prod.id;
            const nome = prod.nome || '';
            const precoUnitario = Number(prod.precoUnitario) || 0;
            const estoqueAtual = Number(prod.estoqueAtual) || 0;
            const unidade = formatarUnidadeExibicao(prod.unit || prod.unidade || '');
            const quantidadeComprar = prod.quantidadeComprar || '';
            const consumoSemanal = Number(prod.consumoSemanal) || 0;
            const diasRestantes = calcularDiasDeCobertura(estoqueAtual, consumoSemanal);
            const duracaoTexto = consumoSemanal <= 0
                ? t('no_estimate')
                : t('stock_for_days', { dias: Math.floor(diasRestantes) });
            const duracaoClasse = (consumoSemanal > 0 && diasRestantes < DIAS_COBERTURA_META) ? 'text-red-600 font-bold' : 'text-gray-600';

            valorTotal += estoqueAtual * precoUnitario;

            const inputId = `input-comprar-${id}`;

            return renderizarCardProduto({
                id,
                nome,
                precoFormatado: formatarMoeda(precoUnitario),
                inputId,
                buyLabel: t('buy_label'),
                quantidadeComprar,
                currentStockLabel: t('current_stock'),
                estoqueAtual,
                unidade,
                duracaoTexto,
                duracaoClasse,
                editLabel: t('edit'),
                deleteLabel: t('delete')
            });
        }).join('');

        lista.innerHTML += renderizarSecaoCategoria(categoria, cards);
    });

    document.getElementById('valor-total-estoque').innerText = formatarMoeda(valorTotal);
    restaurarScrollDosCarrosseis(posicoesScroll);
}

function voltarParaCadastro() {
    const formulario = document.getElementById('form-produto');
    const inputNome = document.getElementById('prod-nome');
    if (formulario) {
        formulario.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (inputNome) {
        // O pequeno atraso evita perda de foco durante o scroll suave em navegadores mobile.
        setTimeout(() => inputNome.focus(), 300);
    }
}

function montarListaTemporariaCompras() {
    return produtos.reduce((listaTemporaria, produto) => {
        const reposicao = calcularNecessidadeDeReposicao(produto);

        if (!reposicao.precisaComprar) {
            return listaTemporaria;
        }

        listaTemporaria.push({
            ...produto,
            diferenca: reposicao.diferenca,
            custoEstimado: reposicao.custoEstimado,
            diasDeCobertura: reposicao.diasDeCobertura
        });

        return listaTemporaria;
    }, []);
}

function gerarPDF() {
    const funcionario = document.getElementById('req-funcionario').value;
    if(!funcionario) return alert(t('required_employee'));

    const listaTemporariaCompras = montarListaTemporariaCompras();
    const corpoTabela = document.getElementById('pdf-tabela-corpo');
    corpoTabela.innerHTML = '';

    document.getElementById('pdf-nome-estab').innerText = appData.configuracoes.empresa || t('default_business_name');
    document.getElementById('pdf-data').innerText = new Date().toLocaleDateString(configuracoes.language);
    document.getElementById('pdf-funcionario').innerText = funcionario;
    document.getElementById('pdf-gestor').innerText = document.getElementById('req-gestor').value || t('not_provided');

    const grupos = agruparItensPorCategoria(listaTemporariaCompras);

    Object.entries(grupos).forEach(([categoria, itens]) => {
        corpoTabela.innerHTML += renderizarPdfCategoria(categoria);
        itens.forEach(item => {
            corpoTabela.innerHTML += renderizarPdfItem(
                item.nome,
                item.diferenca,
                formatarUnidadeExibicao(item.unit || item.unidade || '')
            );
        });
    });

    if (!listaTemporariaCompras.length) {
        corpoTabela.innerHTML = renderizarPdfSemItens(t('no_critical_items'));
    }

    const elementoParaImpressao = document.getElementById('area-impressao');
    elementoParaImpressao.style.display = 'block';

    const opt = {
        margin: 10,
        filename: `Pedido_Compra_${new Date().toISOString().slice(0,10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(elementoParaImpressao).save().then(() => {
        elementoParaImpressao.style.display = 'none';
    });
}

function exportarEstoque() {
    const jsonString = JSON.stringify(appData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const linkDownload = document.createElement('a');
    linkDownload.href = url;
    linkDownload.download = `backup_estoque_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(linkDownload);
    linkDownload.click();
    document.body.removeChild(linkDownload);
    URL.revokeObjectURL(url);
}

function importarEstoque(evento) {
    const arquivo = evento.target.files[0];
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = function(loadEvent) {
        try {
            const dadosCarregados = JSON.parse(loadEvent.target.result);

            if (dadosCarregados.version === '2.2') {
                if (!dadosCarregados.itens || !Array.isArray(dadosCarregados.itens)) {
                    alert(t('invalid_file'));
                    return;
                }

                const itensValidos = dadosCarregados.itens.every(item =>
                    item.id !== undefined &&
                    typeof item.nome === 'string' &&
                    typeof item.estoqueAtual === 'number' &&
                    typeof item.precoUnitario === 'number' &&
                    typeof item.quantidadeComprar === 'number'
                );
                if (!itensValidos) {
                    alert(t('invalid_file'));
                    return;
                }
                appData = dadosCarregados;
                produtos = appData.itens;
                configuracoes = {
                    language: mapearIdiomaStorageParaLocale(appData.configuracoes?.idioma) || detectarIdiomaInicial(),
                    currency: appData.configuracoes.moeda
                };
                localStorage.setItem('app_data', JSON.stringify(appData));
                localStorage.setItem('nome_estabelecimento', appData.configuracoes.empresa || '');
                localStorage.setItem('lista_produtos', JSON.stringify(produtos));
                salvarERenderizar();
                carregarIdentidade();
                aplicarConfiguracoesInterface();
                alert(t('synced_ok'));
            } else if (dadosCarregados.produtos && Array.isArray(dadosCarregados.produtos)) {
                localStorage.setItem('nome_estabelecimento', dadosCarregados.estabelecimento || '');
                produtos = dadosCarregados.produtos;
                if (dadosCarregados.configuracoes) {
                    configuracoes = {
                        language: dadosCarregados.configuracoes.language || 'pt-BR',
                        currency: dadosCarregados.configuracoes.currency || 'BRL'
                    };
                }
                appData = carregarConfiguracoesSalvas();
                salvarERenderizar();
                carregarIdentidade();
                aplicarConfiguracoesInterface();
                alert(t('synced_ok'));
            } else {
                alert(t('invalid_file'));
            }
        } catch (erro) {
            alert(t('read_error'));
        }
    };
    leitor.readAsText(arquivo);
}

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;

    let botaoInstalacao = document.getElementById('btn-install');
    if (!botaoInstalacao) {
        botaoInstalacao = document.createElement('button');
        botaoInstalacao.id = 'btn-install';
        botaoInstalacao.type = 'button';
        botaoInstalacao.className = 'fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-3 rounded-full shadow-lg';
        botaoInstalacao.innerHTML = '<i class="fas fa-download"></i> Instalar App';
        document.body.appendChild(botaoInstalacao);
    }

    botaoInstalacao.style.display = 'flex';
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
    console.log('App instalado com sucesso.');
});
