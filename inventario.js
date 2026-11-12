(function () {
    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>'"]/g, function (character) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character];
        });
    }

    function renderTable(tableBodyId, products, page, pageSize) {
        const tableBody = document.getElementById(tableBodyId);
        const totalPages = Math.max(1, Math.ceil(products.length / pageSize));
        const safePage = Math.min(Math.max(page, 1), totalPages);
        const start = (safePage - 1) * pageSize;
        const pageProducts = products.slice(start, start + pageSize);

        tableBody.innerHTML = pageProducts.map(function (product) {
            const stock = Number(product.stock) || 0;
            const stockStyle = stock < 5 ? 'style="color: var(--danger-color); font-weight: bold;"' : '';
            return `<tr>
                <td>${escapeHtml(product.id)}</td>
                <td>${escapeHtml(product.nombre)}</td>
                <td>${escapeHtml(product['cÃ³digo'] || product.codigo)}</td>
                <td>${escapeHtml(product['categorÃ­a'] || product.categoria)}</td>
                <td>${escapeHtml(product.talla || 'N/A')}</td>
                <td ${stockStyle}>${stock}</td>
                <td>$${(Number(product.precio_venta) || 0).toFixed(2)}</td>
            </tr>`;
        }).join('') || '<tr><td colspan="7">No hay productos que coincidan con el filtro.</td></tr>';

        return { page: safePage, totalPages: totalPages };
    }

    function filter(products, query, talla) {
        const normalizedQuery = String(query || '').toLowerCase().trim();
        return products.filter(function (product) {
            const code = product['cÃ³digo'] || product.codigo || '';
            const searchable = `${product.nombre || ''} ${code} ${product.id || ''}`.toLowerCase();
            return searchable.includes(normalizedQuery) && (!talla || String(product.talla || 'N/A') === talla);
        });
    }

    window.InventoryModule = { renderTable: renderTable, filter: filter };
})();
