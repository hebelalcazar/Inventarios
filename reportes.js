(function () {
    function exportTableToCsv(tableId, filename) {
        const table = document.getElementById(tableId);
        if (!table || table.classList.contains('hidden')) return false;
        const rows = Array.from(table.querySelectorAll('tr'));
        const csv = rows.map(row => Array.from(row.children).map(cell => {
            const value = cell.textContent.trim().replace(/"/g, '""');
            return `"${value}"`;
        }).join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        return true;
    }

    function exportRowsToCsv(rows, filename) {
        if (!rows || !rows.length) return false;
        const headers = Object.keys(rows[0]);
        const csvRows = [headers].concat(rows.map(row => headers.map(header => row[header])));
        const csv = csvRows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        return true;
    }

    function printSummary() {
        document.body.classList.add('printing-report');
        window.print();
        window.onafterprint = function () { document.body.classList.remove('printing-report'); };
    }

    function printDashboard() {
        document.body.classList.add('printing-dashboard');
        window.print();
        window.onafterprint = function () { document.body.classList.remove('printing-dashboard'); };
    }

    function parseDate(value) {
        if (value instanceof Date && !isNaN(value.getTime())) return new Date(value.getTime());
        const text = String(value || '').trim();
        if (!text) return null;
        const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoDate) return new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]));
        const parsed = new Date(text);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    function dateOnly(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    function getPeriodRange(period, referenceValue) {
        const reference = parseDate(referenceValue) || dateOnly(new Date());
        let start = dateOnly(reference);
        let end = dateOnly(reference);
        if (period === 'semana') {
            const day = start.getDay() || 7;
            start.setDate(start.getDate() - day + 1);
            end = new Date(start);
            end.setDate(start.getDate() + 6);
        } else if (period === 'mes') {
            start = new Date(reference.getFullYear(), reference.getMonth(), 1);
            end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
        } else if (period === 'año') {
            start = new Date(reference.getFullYear(), 0, 1);
            end = new Date(reference.getFullYear(), 11, 31);
        }
        end.setHours(23, 59, 59, 999);
        return { start: start, end: end, reference: reference };
    }

    function isActive(row) {
        return String(row.estado || 'ACTIVA').toUpperCase() !== 'ANULADA';
    }

    function filterTransactions(rows, period, referenceValue) {
        const range = getPeriodRange(period, referenceValue);
        return (rows || []).filter(function (row) {
            if (!isActive(row)) return false;
            const date = parseDate(row.fecha);
            return date && date >= range.start && date <= range.end;
        });
    }

    function transactionAmount(row, type) {
        const quantity = Number(row.cantidad) || 0;
        const price = Number(type === 'venta' ? row.precio_venta : row.precio_compra) || 0;
        return quantity * price;
    }

    function aggregateByPeriod(sales, purchases, period, referenceValue) {
        const range = getPeriodRange(period, referenceValue);
        const buckets = {};
        const bucketDate = function (date) {
            if (period === 'año') return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        };
        const addRows = function (rows, type) {
            (rows || []).forEach(function (row) {
                const date = parseDate(row.fecha);
                if (!date || !isActive(row) || date < range.start || date > range.end) return;
                const key = bucketDate(date);
                if (!buckets[key]) buckets[key] = { fecha: key, total_ventas: 0, total_compras: 0, ganancia: 0 };
                const amount = transactionAmount(row, type);
                if (type === 'venta') buckets[key].total_ventas += amount;
                else buckets[key].total_compras += amount;
                buckets[key].ganancia = buckets[key].total_ventas - buckets[key].total_compras;
            });
        };
        addRows(sales, 'venta');
        addRows(purchases, 'compra');
        return Object.keys(buckets).sort().map(function (key) { return buckets[key]; });
    }

    window.InventoryReports = { exportTableToCsv, exportRowsToCsv, printSummary, printDashboard, parseDate, getPeriodRange, filterTransactions, transactionAmount, aggregateByPeriod };
})();
