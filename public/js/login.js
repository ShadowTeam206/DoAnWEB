const LOGIN_PROXY_ENDPOINT = "/api/users/card-login";
const DEFAULT_AGENT = "test";

// Login state, profile and API keys live on the server (SQL) - see state.js.
// The browser only holds cookies (login session and, if ticked, the trusted-device token).

function hasConfiguredApiKey() {
    return window.AppState.getKeyCount() > 0;
}

function isLoggedIn() {
    return Boolean(window.AppState?.isLoggedIn());
}

function applyNotificationState() {
    const notificationMenu = document.getElementById("notificationMenu");
    if (!notificationMenu) return;

    const notificationCount = notificationMenu.querySelector(".notification-count");
    const missingApiConfig = isLoggedIn() && !hasConfiguredApiKey();

    if (notificationCount) {
        notificationCount.textContent = missingApiConfig ? "01" : "02";
    }

    notificationMenu.innerHTML = missingApiConfig
        ? `
            <div class="notification-header">
                <span data-i18n="notificationHeader">Thông báo</span>
                <span class="notification-count">01</span>
            </div>
            <article class="notification-card">
                <div class="notification-tag">API</div>
                <p>Tài khoản đã đăng nhập nhưng chưa có API key. Vui lòng cấu hình API để dùng dashboard, model và playground.</p>
                <div class="notification-time">Vừa xong · cần cấu hình API</div>
            </article>
        `
        : `
            <div class="notification-header">
                <span data-i18n="notificationHeader">Thông báo</span>
                <span class="notification-count">02</span>
            </div>
            <article class="notification-card">
                <div class="notification-tag">Profile</div>
                <h4>Hồ sơ tài khoản đã sẵn sàng</h4>
                <p>Theo dõi thông tin tài khoản, bảo mật đăng nhập và hoạt động gần đây trong một giao diện hồ sơ thống nhất.</p>
                <div class="notification-time">Vừa xong · curated for your workspace</div>
            </article>
        `;
}

function showLoginPanel() {
    window.location.href = "/login";
}

function navigateToLogin() {
    showLoginPanel();
}

function showDashboard() {
    window.location.href = "/dashboard";
}

function goHome() {
    window.location.href = "/?logged_in=1";
}

function mountLoginPartial() {
    return Promise.resolve();
}

function mountDashboardPartial() {
    return Promise.resolve();
}

function setFieldActiveState(input) {
    const group = input?.closest(".input-group");
    if (!group || !input) return;
    group.classList.toggle("is-active", Boolean(input.value.trim()) || document.activeElement === input);
}

function setStatus(message, type = "") {
    const status = document.getElementById("loginStatusMessage");
    if (!status) return;

    status.textContent = message;
    status.className = "form-status";
    if (type) {
        status.classList.add(type);
    }
}

// Locks the whole login UI while a request runs. "source" = the button that shows the spinner.
function toggleLoginLoading(isLoading, source = "submit") {
    const submitButton = document.querySelector("#loginPageForm button[type='submit']");
    const resumeBtn = document.getElementById("resumeBtn");
    const googleBtn = document.getElementById("googleLoginBtn");
    const input = document.getElementById("apiKeyInput");
    const remember = document.getElementById("rememberApiKey");
    const toggle = document.getElementById("toggleApiKey");
    const card = document.querySelector(".login-card");

    const labels = {
        submit: [submitButton, "Đăng nhập", "Đang đăng nhập..."],
        resume: [resumeBtn, resumeBtn?.dataset.label, "Đang đăng nhập..."],
        google: [googleBtn?.querySelector("span"), "Đăng nhập với Google", "Đang chuyển đến Google..."],
    };

    [submitButton, resumeBtn, googleBtn, input, remember, toggle].forEach((el) => {
        if (el) el.disabled = isLoading;
    });
    card?.classList.toggle("is-loading", isLoading);

    Object.entries(labels).forEach(([key, [el, idle, busy]]) => {
        if (!el) return;
        const active = isLoading && key === source;
        el.textContent = active ? busy : idle;
        const btn = el.closest("button") || el;
        btn.classList.toggle("is-busy", active);
        btn.setAttribute("aria-busy", active ? "true" : "false");
    });
}

function toggleApiKeyVisibility() {
    const input = document.getElementById("apiKeyInput");
    const toggle = document.getElementById("toggleApiKey");
    if (!input || !toggle) return;

    const isHidden = input.type === "password";
    input.type = isHidden ? "text" : "password";
    toggle.textContent = isHidden ? "Ẩn" : "Hiện";
    toggle.setAttribute("aria-label", isHidden ? "Ẩn mã truy cập" : "Hiển thị mã truy cập");
}

function normalizeLoginPayload(card, agent = DEFAULT_AGENT) {
    return {
        card,
        agent,
    };
}

// Primary key of the account = first enabled key stored in SQL
function getStoredApiConfigEntry() {
    return window.AppState.getPrimaryEntry();
}

async function ensureApiConfigEntry() {
    await window.AppState.ensureKeys();
    const entry = getStoredApiConfigEntry();
    applyNotificationState();
    return entry;
}

async function ensureApiConfigKey() {
    return (await ensureApiConfigEntry())?.token || "";
}

function isSuccessfulLoginResponse(loginResponse) {
    if (!loginResponse || typeof loginResponse !== "object") {
        return false;
    }

    const rootCode = loginResponse.code;
    const hasSuccessCode = rootCode === 0 || rootCode === "0";
    const hasUserData = Boolean(loginResponse.data && typeof loginResponse.data === "object");
    const hasCredential = Boolean(
        loginResponse.token ||
        loginResponse.data?.token ||
        loginResponse.access_token ||
        loginResponse.data?.access_token
    );

    if (hasSuccessCode && (hasUserData || hasCredential)) {
        return true;
    }

    const successFlags = [
        loginResponse.success,
        loginResponse.ok,
        loginResponse.status,
        loginResponse.msg,
        loginResponse.message,
    ];

    const normalizedFlags = successFlags
        .filter((value) => value !== undefined && value !== null)
        .map((value) => String(value).trim().toLowerCase());

    const hasExplicitSuccess = normalizedFlags.some((value) => ["true", "1", "200", "ok", "success", "登录成功", "đăng nhập thành công"].includes(value));
    const message = String(loginResponse.msg || loginResponse.message || loginResponse.error?.message || "").trim().toLowerCase();
    const hasFailureMessage = [
        "không tồn tại",
        "thất bại",
        "invalid",
        "not found",
        "required",
        "不存在",
        "必填",
        "错误",
        "失敗",
        "unauthorized",
        "forbidden",
    ].some((keyword) => message.includes(keyword));

    const hasExplicitFailure = rootCode !== undefined
        ? ![0, "0", 200, "200", true, "true"].includes(rootCode)
        : normalizedFlags.some((value) => ["false", "0", "404", "401", "403", "error", "fail", "failed"].includes(value));

    if (hasExplicitFailure || hasFailureMessage) {
        return false;
    }

    if (hasExplicitSuccess) {
        return true;
    }

    return Boolean(
        loginResponse.user ||
        loginResponse.data?.user ||
        loginResponse.profile ||
        loginResponse.data?.profile ||
        hasCredential
    );
}

function translateLoginMessage(message) {
    const normalizedMessage = String(message || "").trim();

    if (!normalizedMessage) {
        return "Đăng nhập thất bại. Vui lòng kiểm tra lại mã truy cập.";
    }

    const dictionary = [
        { match: ["授权码不存在"], text: "Mã truy cập không tồn tại." },
        { match: ["授权码是必填项"], text: "Vui lòng nhập mã truy cập." },
        { match: ["授权码格式错误"], text: "Mã truy cập không đúng định dạng." },
        { match: ["登录成功"], text: "Đăng nhập thành công." },
        { match: ["未登录", "请先登录"], text: "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại." },
        { match: ["系统错误", "服务器错误"], text: "Hệ thống đang gặp lỗi. Vui lòng thử lại sau." },
    ];

    const found = dictionary.find((entry) => entry.match.some((keyword) => normalizedMessage.includes(keyword)));
    return found?.text || normalizedMessage;
}

function getLoginErrorMessage(parsedResponse) {
    const fallbackMessage = "Đăng nhập thất bại. Vui lòng kiểm tra lại mã truy cập.";
    const candidates = [
        parsedResponse?.message,
        parsedResponse?.msg,
        parsedResponse?.error?.message,
        parsedResponse?.error,
    ];

    const resolved = candidates.find((value) => typeof value === "string" && value.trim());
    return translateLoginMessage(resolved || fallbackMessage);
}

async function readJsonResponse(response) {
    const responseText = await response.text();
    if (!responseText) return null;

    try {
        return JSON.parse(responseText);
    } catch {
        return { message: responseText };
    }
}

async function loginWithCard(card, agent = DEFAULT_AGENT, remember = true) {
    // "remember" tells the server to keep the session for 30 days and to remember this device
    const payload = { ...normalizeLoginPayload(card, agent), remember: Boolean(remember) };
    const response = await fetch(LOGIN_PROXY_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(payload)
    });

    const parsedResponse = await readJsonResponse(response);

    if (!response.ok) {
        throw new Error(getLoginErrorMessage(parsedResponse));
    }

    if (!isSuccessfulLoginResponse(parsedResponse)) {
        throw new Error(getLoginErrorMessage(parsedResponse));
    }

    return parsedResponse;
}

async function handleLoginSubmit(event) {
    event.preventDefault();

    const input = document.getElementById("apiKeyInput");
    const remember = document.getElementById("rememberApiKey");
    const accessCode = (input?.value || "").trim();

    if (!accessCode) {
        setStatus("Vui lòng nhập mã truy cập để tiếp tục.", "error");
        input?.focus();
        setFieldActiveState(input);
        return;
    }

    try {
        toggleLoginLoading(true);
        setStatus("Đang xác thực đăng nhập...", "");

        // Entering a new key replaces the remembered account (same as "use another account")
        const resumeBox = document.getElementById("resumeBox");
        if (resumeBox && !resumeBox.classList.contains("hidden")) {
            try {
                await fetch("/api/remember/forget", { method: "POST", credentials: "same-origin" });
            } catch (e) {
                // ignore: the new login issues its own token
            }
            resumeBox.classList.add("hidden");
        }

        await loginWithCard(accessCode, DEFAULT_AGENT, remember?.checked !== false);

        setStatus("Đăng nhập thành công. Đang tải cấu hình API...", "success");

        // The server created the session, stored the profile and imported the keys into SQL
        await window.AppState.refresh({ keys: true });
        if (!window.AppState.isLoggedIn()) {
            throw new Error("Không thể tạo phiên đăng nhập. Vui lòng thử lại.");
        }

        if (!hasConfiguredApiKey()) {
            setStatus("Đăng nhập thành công. Chưa cấu hình API.", "warning");
        } else {
            setStatus("Đăng nhập thành công. Đang chuyển vào dashboard...", "success");
        }

        window.setTimeout(() => {
            showDashboard();
        }, 500);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Không thể đăng nhập. Vui lòng thử lại.";
        setStatus(message, "error");
        toggleLoginLoading(false);
    }
}

function bindFloatingLabel() {
    const input = document.getElementById("apiKeyInput");
    if (!input) return;

    ["input", "focus", "blur"].forEach((eventName) => {
        input.addEventListener(eventName, () => {
            setFieldActiveState(input);
        });
    });

    setFieldActiveState(input);
}

// "Duy trì đăng nhập": the server keeps a trusted-device token, so after logging out the user
// can continue without typing the access code again.
async function setupRememberedDevice() {
    const box = document.getElementById("resumeBox");
    const resumeBtn = document.getElementById("resumeBtn");
    if (!box || !resumeBtn) return;

    try {
        const response = await fetch("/api/remember/status", { credentials: "same-origin", cache: "no-store" });
        const data = await response.json();
        if (!data?.available) return;
        resumeBtn.textContent = data.name ? `Tiếp tục với ${data.name}` : "Tiếp tục";
        resumeBtn.dataset.label = resumeBtn.textContent;
        box.classList.remove("hidden");
    } catch (e) {
        return; // no remembered device: the normal form stays
    }

    resumeBtn.addEventListener("click", async () => {
        toggleLoginLoading(true, "resume");
        setStatus("Đang đăng nhập...", "");
        try {
            const response = await fetch("/api/remember/resume", { method: "POST", credentials: "same-origin" });
            if (!response.ok) throw new Error("expired");
            await window.AppState.refresh({ keys: true });
            if (!window.AppState.isLoggedIn()) throw new Error("no session");
            showDashboard();
        } catch (e) {
            box.classList.add("hidden");
            setStatus("Phiên ghi nhớ đã hết hạn. Vui lòng nhập mã truy cập.", "error");
            toggleLoginLoading(false);
        }
    });
}

function bindLoginPage() {
    const form = document.getElementById("loginPageForm");
    const input = document.getElementById("apiKeyInput");
    const remember = document.getElementById("rememberApiKey");
    const toggle = document.getElementById("toggleApiKey");

    bindFloatingLabel();

    toggle?.addEventListener("click", toggleApiKeyVisibility);
    form?.addEventListener("submit", handleLoginSubmit);
}

window.isLoggedIn = isLoggedIn;
window.ensureApiConfigKey = ensureApiConfigKey;
window.ensureApiConfigEntry = ensureApiConfigEntry;
window["getApiConfigEntry"] = getStoredApiConfigEntry;
window.showLoginPanel = showLoginPanel;
window.navigateToLogin = navigateToLogin;
window.showDashboard = showDashboard;
window.goHome = goHome;
window.mountLoginPartial = mountLoginPartial;
window.mountDashboardPartial = mountDashboardPartial;

// Google OAuth Login
function googleLogin() {
    toggleLoginLoading(true, "google");
    setStatus('Đang chuyển đến Google...', 'success');
    // Must be a full-page navigation (Google does not allow fetch/XHR for OAuth)
    window.location.href = '/auth/google';
}

const GOOGLE_ERRORS = {
    not_configured: 'Chưa cấu hình Google OAuth trên server (thiếu GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).',
    denied: 'Bạn đã hủy đăng nhập Google.',
    invalid_state: 'Phiên đăng nhập Google không hợp lệ. Vui lòng thử lại.',
    unverified_email: 'Email Google chưa được xác minh.',
    failed: 'Đăng nhập Google thất bại. Vui lòng thử lại.',
};

async function handleGoogleReturn() {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('google_error');
    if (err) {
        setStatus(GOOGLE_ERRORS[err] || GOOGLE_ERRORS.failed, 'error');
        window.history.replaceState({}, '', '/login');
        return;
    }
    if (params.get('google') !== 'success') return;

    try {
        await window.AppState.refresh();
        if (!window.AppState.isLoggedIn()) throw new Error('not authenticated');

        setStatus('Đăng nhập Google thành công. Đang chuyển vào dashboard...', 'success');
        window.setTimeout(showDashboard, 600);
    } catch (e) {
        setStatus(GOOGLE_ERRORS.failed, 'error');
    }
}

function bindGoogleLogin() {
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', googleLogin);
    }
}

// Coming back with the browser back button can restore the page in a locked state
window.addEventListener("pageshow", (event) => {
    if (event.persisted && document.getElementById("loginPageForm")) toggleLoginLoading(false);
});

window.addEventListener("DOMContentLoaded", () => {
    // Bind Google first so a problem in the card-login code can never disable it
    bindGoogleLogin();
    handleGoogleReturn();
    // Only the real login page (it has the form) may redirect: login.js is also loaded on /dashboard
    if (document.getElementById("loginPageForm")) {
        bindLoginPage();

        // Still logged in: skip the form. Logged out but device remembered: offer "continue".
        const params = new URLSearchParams(window.location.search);
        if (!params.has("google") && !params.has("google_error")) {
            window.AppState.ready.then(() => {
                if (window.AppState.isLoggedIn()) showDashboard();
                else setupRememberedDevice();
            });
        }
    }
});
