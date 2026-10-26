(function () {
    function escapar(valor) {
        return String(valor === null || valor === undefined ? '' : valor)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    const ESTILOS_STATUS = {
        critico: {
            barra: 'bg-rose-500',
            chip: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30',
            icone: 'fa-triangle-exclamation'
        },
        atencao: {
            barra: 'bg-amber-500',
            chip: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30',
            icone: 'fa-clock'
        },
        ok: {
            barra: 'bg-emerald-500',
            chip: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
            icone: 'fa-check'
        },
        indefinido: {
            barra: 'bg-slate-300 dark:bg-slate-600',
            chip: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/30',
            icone: 'fa-minus'
        }
    };

    function obterEstiloStatus(status) {
        return ESTILOS_STATUS[status] || ESTILOS_STATUS.indefinido;
    }

    const CLASSE_BOTAO_ICONE = 'flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100';
    const CLASSE_BOTAO_STEP = 'flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700';
    const CLASSE_INPUT_QTD = 'input-qtd-comprar w-20 rounded-lg border border-slate-300 bg-white px-3 py-2 text-right text-base font-bold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';

    function renderizarCardProduto(props) {
        const {
            id,
            nome,
            categoria,
            precoFormatado,
            inputId,
            buyLabel,
            quantidadeComprar,
            quantidadeSugerida,
            quantidadeSugeridaFormatada,
            ajusteManual,
            currentStockLabel,
            estoqueAtual,
            unidade,
            statusChave,
            statusTexto,
            coberturaTexto,
            coberturaPercentual,
            consumoTexto,
            suggestedLabel,
            manualLabel,
            useSuggestedLabel,
            editLabel,
            deleteLabel,
            decreaseLabel,
            increaseLabel
        } = props;

        const estilo = obterEstiloStatus(statusChave);
        const nomeSeguro = escapar(nome);
        const unidadeSegura = escapar(unidade);

        const badgeOrigem = ajusteManual
            ? `<span class="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/30"><i class="fa-solid fa-pen-to-square"></i>${escapar(manualLabel)}</span>`
            : '';

        const botaoUsarSugerido = (!ajusteManual && Number(quantidadeSugerida) > 0)
            ? `<button type="button" onclick="usarQuantidadeSugerida(${id})" class="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20">${escapar(useSuggestedLabel)}</button>`
            : '';

        const barraCobertura = statusChave === 'indefinido'
            ? ''
            : `<div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                   <div class="h-full rounded-full ${estilo.barra} transition-all" style="width: ${coberturaPercentual}%"></div>
               </div>`;

        return `
            <article class="card-produto relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 pl-5 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
                <span class="absolute inset-y-0 left-0 w-1.5 ${estilo.barra}" aria-hidden="true"></span>

                <header class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                        <h4 class="truncate font-semibold text-slate-900 dark:text-slate-100" title="${nomeSeguro}">${nomeSeguro}</h4>
                        <p class="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">${escapar(precoFormatado)} / ${unidadeSegura}</p>
                    </div>
                    <div class="flex shrink-0 items-center">
                        <button type="button" onclick="editarProduto(${id})" class="${CLASSE_BOTAO_ICONE}" title="${escapar(editLabel)}" aria-label="${escapar(editLabel)} ${nomeSeguro}">
                            <i class="fa-solid fa-pen" aria-hidden="true"></i>
                        </button>
                        <button type="button" onclick="excluirProduto(${id})" class="${CLASSE_BOTAO_ICONE} hover:!bg-rose-50 hover:!text-rose-600 dark:hover:!bg-rose-500/10 dark:hover:!text-rose-300" title="${escapar(deleteLabel)}" aria-label="${escapar(deleteLabel)} ${nomeSeguro}">
                            <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
                        </button>
                    </div>
                </header>

                <div>
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${estilo.chip}">
                            <i class="fa-solid ${estilo.icone}" aria-hidden="true"></i>${escapar(statusTexto)}
                        </span>
                        <span class="text-xs font-medium text-slate-500 dark:text-slate-400">${escapar(coberturaTexto)}</span>
                    </div>
                    ${barraCobertura}
                    <p class="mt-1.5 text-xs text-slate-500 dark:text-slate-400">${escapar(consumoTexto)}</p>
                </div>

                <div class="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900/50">
                    <div class="min-w-0">
                        <p class="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">${escapar(currentStockLabel)}</p>
                        <p class="mt-0.5 flex items-baseline gap-1">
                            <strong class="text-2xl font-black leading-none text-slate-900 dark:text-slate-100" data-estoque-de="${id}">${escapar(estoqueAtual)}</strong>
                            <span class="truncate text-sm text-slate-600 dark:text-slate-300">${unidadeSegura}</span>
                        </p>
                    </div>
                    <div class="flex shrink-0 gap-2">
                        <button type="button" onclick="alterarQtd(${id}, -1)" class="${CLASSE_BOTAO_STEP}" aria-label="${escapar(decreaseLabel)} ${nomeSeguro}">&minus;</button>
                        <button type="button" onclick="alterarQtd(${id}, 1)" class="${CLASSE_BOTAO_STEP}" aria-label="${escapar(increaseLabel)} ${nomeSeguro}">+</button>
                    </div>
                </div>

                <div class="border-t border-slate-100 pt-3 dark:border-slate-700">
                    <div class="flex items-center justify-between gap-2">
                        <label for="${inputId}" class="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">${escapar(buyLabel)}</label>
                        ${badgeOrigem}
                    </div>
                    <div class="mt-2 flex items-center gap-2">
                        <input id="${inputId}" type="number" min="0" step="any" inputmode="decimal" data-id="${id}" value="${escapar(quantidadeComprar)}" class="${CLASSE_INPUT_QTD}" aria-label="${escapar(buyLabel)} ${nomeSeguro}">
                        <span class="min-w-0 flex-1 truncate text-sm text-slate-600 dark:text-slate-300">${unidadeSegura}</span>
                        ${botaoUsarSugerido}
                    </div>
                    <p class="mt-1.5 text-xs text-slate-500 dark:text-slate-400">${escapar(suggestedLabel)}: <strong class="font-semibold text-slate-700 dark:text-slate-200">${escapar(quantidadeSugeridaFormatada)}</strong></p>
                </div>
            </article>
        `;
    }

    function renderizarSecaoCategoria(categoria, cardsHtml, totalItens) {
        const categoriaSegura = escapar(categoria);

        return `
            <section class="mb-7">
                <div class="mb-3 flex items-center gap-2">
                    <h4 class="font-bold text-slate-800 dark:text-slate-100">${categoriaSegura}</h4>
                    <span class="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">${escapar(totalItens)}</span>
                </div>
                <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">${cardsHtml}</div>
            </section>
        `;
    }

    function renderizarEstadoVazio(props) {
        const { icone, titulo, texto, acaoHtml } = props;

        return `
            <div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-600 dark:bg-slate-800/50">
                <div class="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl text-slate-400 dark:bg-slate-700 dark:text-slate-400">
                    <i class="fa-solid ${escapar(icone)}" aria-hidden="true"></i>
                </div>
                <h4 class="mt-4 font-bold text-slate-800 dark:text-slate-100">${escapar(titulo)}</h4>
                <p class="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">${escapar(texto)}</p>
                ${acaoHtml || ''}
            </div>
        `;
    }

    function renderizarItemPedido(props) {
        const {
            id,
            nome,
            categoria,
            inputId,
            unidade,
            quantidadeComprar,
            quantidadeSugeridaFormatada,
            precoUnitarioFormatado,
            custoFormatado,
            ajusteManual,
            incluido,
            suggestedLabel,
            unitPriceLabel,
            estimatedCostLabel,
            qtyLabel,
            manualLabel,
            excludedNote,
            removeLabel,
            addBackLabel
        } = props;

        const nomeSeguro = escapar(nome);
        const classeExcluido = incluido ? '' : 'opacity-60';

        const badgeManual = ajusteManual
            ? `<span class="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/30"><i class="fa-solid fa-pen-to-square"></i>${escapar(manualLabel)}</span>`
            : '';

        const rotuloAcao = incluido ? removeLabel : addBackLabel;
        const botaoExclusao = `
            <button type="button" onclick="alternarExclusaoPedido(${id})" class="${CLASSE_BOTAO_ICONE}" title="${escapar(rotuloAcao)}" aria-label="${escapar(rotuloAcao)} ${nomeSeguro}">
                <i class="fa-solid ${incluido ? 'fa-ban' : 'fa-rotate-left'}" aria-hidden="true"></i>
            </button>
        `;

        const avisoExcluido = incluido
            ? ''
            : `<p class="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400"><i class="fa-solid fa-ban mr-1" aria-hidden="true"></i>${escapar(excludedNote)}</p>`;

        return `
            <li class="rounded-xl border border-slate-200 bg-white p-3 transition dark:border-slate-700 dark:bg-slate-800 ${classeExcluido}" data-item-pedido="${id}">
                <div class="flex flex-wrap items-center gap-x-4 gap-y-3">
                    <div class="min-w-[9rem] flex-1">
                        <div class="flex flex-wrap items-center gap-2">
                            <p class="truncate font-semibold text-slate-900 dark:text-slate-100" title="${nomeSeguro}">${nomeSeguro}</p>
                            ${badgeManual}
                        </div>
                        <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            ${escapar(categoria)} &middot; ${escapar(suggestedLabel)}: ${escapar(quantidadeSugeridaFormatada)} &middot; ${escapar(unitPriceLabel)}: ${escapar(precoUnitarioFormatado)}
                        </p>
                    </div>
                    <div class="flex items-center gap-2">
                        <label for="${inputId}" class="sr-only">${escapar(qtyLabel)} ${nomeSeguro}</label>
                        <input id="${inputId}" type="number" min="0" step="any" inputmode="decimal" data-id="${id}" value="${escapar(quantidadeComprar)}" class="${CLASSE_INPUT_QTD}">
                        <span class="w-16 truncate text-sm text-slate-600 dark:text-slate-300">${escapar(unidade)}</span>
                    </div>
                    <div class="w-28 text-right">
                        <p class="font-bold text-slate-900 dark:text-slate-100" data-custo-de="${id}">${escapar(custoFormatado)}</p>
                        <p class="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">${escapar(estimatedCostLabel)}</p>
                    </div>
                    <div class="shrink-0">${botaoExclusao}</div>
                </div>
                ${avisoExcluido}
            </li>
        `;
    }

    function renderizarGrupoPedido(categoria, itensHtml, subtotalLabel, subtotalFormatado) {
        return `
            <section class="mb-5">
                <div class="mb-2 flex items-center justify-between gap-2">
                    <h4 class="font-bold text-slate-800 dark:text-slate-100">${escapar(categoria)}</h4>
                    <p class="text-sm text-slate-500 dark:text-slate-400">${escapar(subtotalLabel)}: <strong class="font-bold text-slate-800 dark:text-slate-100">${escapar(subtotalFormatado)}</strong></p>
                </div>
                <ul class="space-y-2">${itensHtml}</ul>
            </section>
        `;
    }

    function renderizarPdfCategoria(categoria) {
        return `
            <tr>
                <td colspan="5" class="p-2 border bg-gray-100 font-bold">${escapar(categoria)}</td>
            </tr>
        `;
    }

    function renderizarPdfItem(props) {
        const { nome, quantidade, unidade, precoUnitario, custoEstimado, ajusteManual } = props;
        const marcaManual = ajusteManual ? ' *' : '';

        return `
            <tr>
                <td class="p-2 border">${escapar(nome)}${marcaManual}</td>
                <td class="p-2 border text-right text-blue-600 font-bold">${escapar(quantidade)}</td>
                <td class="p-2 border">${escapar(unidade)}</td>
                <td class="p-2 border text-right">${escapar(precoUnitario)}</td>
                <td class="p-2 border text-right">${escapar(custoEstimado)}</td>
            </tr>
        `;
    }

    function renderizarPdfSubtotal(label, valorFormatado) {
        return `
            <tr>
                <td colspan="4" class="p-2 border text-right font-bold">${escapar(label)}</td>
                <td class="p-2 border text-right font-bold">${escapar(valorFormatado)}</td>
            </tr>
        `;
    }

    function renderizarPdfTotal(label, valorFormatado) {
        return `
            <tr>
                <td colspan="4" class="p-2 border bg-gray-100 text-right font-bold">${escapar(label)}</td>
                <td class="p-2 border bg-gray-100 text-right font-bold">${escapar(valorFormatado)}</td>
            </tr>
        `;
    }

    function renderizarPdfSemItens(mensagem) {
        return `
            <tr>
                <td colspan="5" class="p-2 border text-center text-gray-500">${escapar(mensagem)}</td>
            </tr>
        `;
    }

    function renderizarOpcoes(opcoes, valorSelecionado) {
        return opcoes.map(({ valor, texto }) => {
            const selecionado = String(valor) === String(valorSelecionado) ? ' selected' : '';
            return `<option value="${escapar(valor)}"${selecionado}>${escapar(texto)}</option>`;
        }).join('');
    }

    window.InventoryUI = {
        escapar,
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
    };
})();
