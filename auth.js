(function () {
    const TOKEN_KEY = 'inventario_auth_token';
    const USER_KEY = 'inventario_user';

    function getToken() {
        return localStorage.getItem(TOKEN_KEY) || '';
    }

    function getUser() {
        try {
            return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
        } catch (_) {
            clearSession();
            return null;
        }
    }

    function saveSession(token, user) {
        localStorage.setItem(TOKEN_KEY, token || '');
        localStorage.setItem(USER_KEY, JSON.stringify(user || null));
    }

    function clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    }

    async function login(scriptUrl, email, password) {
        const response = await fetch(scriptUrl, {
            method: 'POST',
            body: JSON.stringify({ action: 'login', email: email, password: password }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        return response.json();
    }

    window.InventoryAuth = { getToken, getUser, saveSession, clearSession, login };
})();
