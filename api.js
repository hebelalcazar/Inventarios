(function () {
    const scriptUrl = 'https://script.google.com/macros/s/AKfycbxGdrvl2vQxHb-Z6FaNnQ7ad8j4CxkUrKnfPiCyWaRzlERsctPAB4o9j-2embW1Xiwj/exec';

    async function request(url, options) {
        const response = await fetch(url, options);
        const data = await response.json();
        if (data.status === 'unauthorized') {
            localStorage.removeItem('inventario_auth_token');
            localStorage.removeItem('inventario_user');
        }
        return data;
    }

    window.InventoryApi = {
        get: function (action, params) {
            const query = new URLSearchParams(Object.assign({ action: action }, params || {}));
            const token = localStorage.getItem('inventario_auth_token');
            if (token) query.set('token', token);
            return request(`${scriptUrl}?${query.toString()}`);
        },
        post: function (payload) {
            const body = Object.assign({}, payload);
            const token = localStorage.getItem('inventario_auth_token');
            if (token) body.token = token;
            return request(scriptUrl, {
                method: 'POST',
                body: JSON.stringify(body),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
        }
    };
})();
