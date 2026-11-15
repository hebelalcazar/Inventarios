(function () {
    function isPositiveInteger(value) {
        return Number.isInteger(Number(value)) && Number(value) > 0;
    }

    function isNonNegativeNumber(value) {
        return value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;
    }

    function isValidEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
    }

    function validateTransaction(data) {
        if (!data.producto_id) return 'Seleccione un producto antes de continuar.';
        if (!isPositiveInteger(data.cantidad)) return 'La cantidad debe ser un entero mayor que cero.';
        if (!isNonNegativeNumber(data.precio)) return 'El precio debe ser un numero valido mayor o igual a cero.';
        if (['efectivo', 'transferencia'].indexOf(String(data.metodo_pago || '').toLowerCase()) === -1) return 'Seleccione un metodo de pago valido.';
        if (['S', 'M', 'L', 'XL', 'XXL', 'N/A'].indexOf(String(data.talla || '').toUpperCase()) === -1) return 'Seleccione una talla valida.';
        return '';
    }

    function validateProduct(data) {
        if (!String(data.nombre || '').trim() || !String(data.codigo || '').trim() || !String(data.categoria || '').trim()) return 'Nombre, codigo y categoria son obligatorios.';
        if (!isNonNegativeNumber(data.precio_compra) || !isNonNegativeNumber(data.precio_venta)) return 'Los precios deben ser validos y no negativos.';
        if (!Number.isInteger(Number(data.stock)) || Number(data.stock) < 0) return 'El stock debe ser un entero mayor o igual a cero.';
        if (['S', 'M', 'L', 'XL', 'XXL', 'N/A'].indexOf(String(data.talla || '').toUpperCase()) === -1) return 'Seleccione una talla valida.';
        return '';
    }

    window.InventoryValidation = { isPositiveInteger, isNonNegativeNumber, isValidEmail, validateTransaction, validateProduct };
})();
