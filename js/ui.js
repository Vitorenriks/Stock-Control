(function () {
    function renderizarCardProduto(props) {
        const {
            id,
            nome,
            precoFormatado,
            inputId,
            buyLabel,
            quantidadeComprar,
            currentStockLabel,
            estoqueAtual,
            unidade,
            duracaoTexto,
            duracaoClasse,
            editLabel,
            deleteLabel
        } = props;

        return `
            <div class="card-produto bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
                <div class="flex justify-between items-start gap-4">
                    <div class="min-w-0">
                        <h4 class="font-bold text-gray-800 truncate">${nome}</h4>
                        <p class="text-sm text-gray-500 mt-1">${precoFormatado}</p>
                    </div>
                    <div class="flex gap-2 flex-shrink-0">
                        <button onclick="editarProduto(${id})" class="px-3 py-1 bg-blue-100 text-blue-700 rounded font-bold text-xs">${editLabel}</button>
                        <button onclick="excluirProduto(${id})" class="px-3 py-1 bg-red-100 text-red-700 rounded font-bold text-xs">${deleteLabel}</button>
                    </div>
                </div>
                <div class="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col gap-4">
                    <div class="flex justify-between items-center gap-4">
                        <label for="${inputId}" class="text-[11px] font-bold tracking-wide text-gray-500 uppercase flex-shrink-0">${buyLabel}:</label>
                        <input id="${inputId}" type="number" min="0" data-id="${id}" value="${quantidadeComprar}" class="input-qtd-comprar font-bold text-lg w-full max-w-[5rem] border border-gray-200 rounded-lg px-3 py-2 text-right bg-white" />
                    </div>
                    <div class="flex justify-between items-center gap-4 border-t border-gray-200 pt-4">
                        <span class="text-sm text-gray-500 min-w-0 break-words">${currentStockLabel}: <strong class="font-bold text-lg text-gray-800">${estoqueAtual} ${unidade}</strong></span>
                        <div class="flex gap-3 flex-shrink-0">
                            <button onclick="alterarQtd(${id}, -1)" class="w-10 h-10 border border-gray-300 bg-white text-gray-700 rounded-full font-bold text-lg flex items-center justify-center shadow-sm">-</button>
                            <button onclick="alterarQtd(${id}, 1)" class="w-10 h-10 border border-gray-300 bg-white text-gray-700 rounded-full font-bold text-lg flex items-center justify-center shadow-sm">+</button>
                        </div>
                    </div>
                </div>
                <p class="text-sm ${duracaoClasse}">${duracaoTexto}</p>
            </div>
        `;
    }

    function renderizarSecaoCategoria(categoria, cardsHtml) {
        return `
            <section class="mb-4">
                <h4 class="font-semibold text-gray-700 mb-2">${categoria}</h4>
                <div class="grupo-categoria flex gap-3 overflow-x-auto pb-2">${cardsHtml}</div>
            </section>
        `;
    }

    function renderizarPdfCategoria(categoria) {
        return `
            <tr>
                <td colspan="3" class="p-2 border bg-gray-100 font-bold">${categoria}</td>
            </tr>
        `;
    }

    function renderizarPdfItem(nome, diferenca, unidade) {
        return `
            <tr>
                <td class="p-2 border">${nome}</td>
                <td class="p-2 border text-blue-600 font-bold">${diferenca}</td>
                <td class="p-2 border">${unidade}</td>
            </tr>
        `;
    }

    function renderizarPdfSemItens(mensagem) {
        return `
            <tr>
                <td colspan="3" class="p-2 border text-center text-gray-500">${mensagem}</td>
            </tr>
        `;
    }

    window.InventoryUI = {
        renderizarCardProduto,
        renderizarSecaoCategoria,
        renderizarPdfCategoria,
        renderizarPdfItem,
        renderizarPdfSemItens
    };
})();