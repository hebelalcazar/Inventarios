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

    window.InventoryReports = { exportTableToCsv };
})();
