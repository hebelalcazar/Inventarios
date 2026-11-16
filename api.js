(function () {
    const scriptUrl = 'https://script.google.com/macros/s/AKfycbxGdrvl2vQxHb-Z6FaNnQ7ad8j4CxkUrKnfPiCyWaRzlERsctPAB4o9j-2embW1Xiwj/exec';

    async function request(url, options) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const requestOptions = Object.assign({}, options || {}, { signal: controller.signal });
        let response;
        try {
            response = await fetch(url, requestOptions);
        } catch (error) {
            if (error.name === 'AbortError') throw new Error('La solicitud excedio el tiempo de espera.');
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (_) {
            throw new Error(response.ok ? 'El servidor devolvio una respuesta no valida.' : `Error de red (${response.status}).`);
        }
        if (!response.ok) throw new Error(data.message || `Error de red (${response.status}).`);
        if (data.status === 'unauthorized') {
            InventoryAuth.clearSession();
        }
        return data;
    }

    window.InventoryApi = {
        get: function (action, params) {
            const query = new URLSearchParams(Object.assign({ action: action }, params || {}));
            const token = InventoryAuth.getToken();
            if (token) query.set('token', token);
            return request(`${scriptUrl}?${query.toString()}`);
        },
        post: function (payload) {
            const body = Object.assign({}, payload);
            const token = InventoryAuth.getToken();
            if (token) body.token = token;
            return request(scriptUrl, {
                method: 'POST',
                body: JSON.stringify(body),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
        }
    };
})();
