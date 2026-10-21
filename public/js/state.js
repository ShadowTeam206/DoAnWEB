// Shared client state: login profile, API keys, theme, language and playground choices
// come from the server, which keeps them in MySQL. Nothing is persisted in the browser here.
//
// Must be loaded BEFORE the other page scripts.

(function () {
    const DEFAULT_SETTINGS = {
        theme: "dark",
        language: "vi",
        playground_model: "",
        playground_web_search: "true",
    };

    const state = {
        authenticated: false,
        provider: "",
        user: null,      // row from the users table
        profile: null,   // login response of the card service (no tokens)
        keyCount: 0,     // active keys stored in SQL
        keys: [],        // [{ url, token, model, mode, effort, channel, single_tool_use, enabled }]
        keysLoaded: false,
        settings: { ...DEFAULT_SETTINGS },
    };

    async function requestJson(url, options = {}) {
        const response = await fetch(url, {
            credentials: "same-origin",
            cache: "no-store",
            ...options,
        });
        let data = null;
        try { data = await response.json(); } catch { /* empty body */ }
        return { ok: response.ok, status: response.status, data };
    }

    function applyBootstrap(data) {
        if (!data) return;
        state.authenticated = Boolean(data.authenticated);
        state.provider = data.provider || "";
        state.user = data.user || null;
        state.profile = data.profile || null;
        state.keyCount = Number(data.keyCount || 0);
        state.settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
        if (!state.authenticated) {
            state.keys = [];
            state.keysLoaded = false;
            state.keyCount = 0;
        }
        if (Array.isArray(data.keys)) {
            state.keys = data.keys;
            state.keysLoaded = true;
        }
    }

    // Load (or reload) login state + preferences. Optionally the key list too.
    async function refresh({ keys = false } = {}) {
        try {
            const { data } = await requestJson(`/api/bootstrap${keys ? "?keys=1" : ""}`);
            applyBootstrap(data);
        } catch {
            /* offline / server down: keep defaults, user counts as logged out */
        }
        return state;
    }

    // Keys are only needed by the dashboard; other pages never receive tokens.
    async function ensureKeys() {
        await AppState.ready;
        if (!state.authenticated) return [];
        if (!state.keysLoaded) {
            const { ok, data } = await requestJson("/api/api-keys/config");
            if (ok && Array.isArray(data?.keys)) {
                state.keys = data.keys;
                state.keysLoaded = true;
            }
        }
        return state.keys;
    }

    function setKeys(list) {
        state.keys = Array.isArray(list) ? list : [];
        state.keysLoaded = true;
        state.keyCount = state.keys.filter((k) => k.enabled !== false).length;
    }

    function getEnabledKeys() {
        return state.keys.filter((k) => k && k.token && k.enabled !== false);
    }

    function getPrimaryEntry() {
        return getEnabledKeys()[0] || null;
    }

    function getSetting(key) {
        return state.settings[key] ?? DEFAULT_SETTINGS[key] ?? "";
    }

    // Updates memory immediately and saves to SQL in the background
    function setSetting(key, value) {
        const text = value === null || value === undefined ? "" : String(value);
        if (text === "") delete state.settings[key]; else state.settings[key] = text;
        return requestJson("/api/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, value: text }),
        }).catch(() => null);
    }

    function getPayload() {
        if (!state.authenticated) return null;
        return { login: state.profile || undefined, user: state.user || undefined };
    }

    function getStoredProfile() {
        const payload = getPayload();
        if (!payload) return null;
        return (
            payload?.login?.data?.user ||
            payload?.login?.user ||
            payload?.login?.data ||
            payload?.user ||
            payload
        );
    }

    const AppState = {
        data: state,
        refresh,
        ensureKeys,
        setKeys,
        getEnabledKeys,
        getPrimaryEntry,
        getSetting,
        setSetting,
        getPayload,
        getStoredProfile,
        isLoggedIn: () => state.authenticated,
        getKeys: () => state.keys,
        getKeyCount: () => (state.keysLoaded ? getEnabledKeys().length : state.keyCount),
        ready: null,
    };

    window.AppState = AppState;
    AppState.ready = refresh({ keys: window.location.pathname === "/dashboard" });
})();
