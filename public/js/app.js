let loginOverlay;
let apiKeyInput;
let loginError;
let userMenuWrap;
let userMenuTrigger;
let userMenuDropdown;
let languageToggle;
let languageMenu;
let themeToggle;
let themeMenu;
let notificationToggle;
let notificationMenu;
let siteHeader;
let loginTriggerBtn;
// Language/theme come from SQL (window.AppState); defaults apply until it has loaded
let currentLanguage = "vi";
let currentTheme = "dark";
let headerEventsBound = false;
let languageMenuEventsBound = false;
let themeMenuEventsBound = false;

const translations = window["aiRelayTranslations"] || {};

function refreshLoginRefs() {
    loginOverlay = document.getElementById("loginOverlay");
    apiKeyInput = document.getElementById("apikey");
    loginError = document.getElementById("loginError");
    userMenuWrap = document.getElementById("userMenuWrap");
    userMenuTrigger = document.getElementById("userMenuTrigger");
    userMenuDropdown = document.getElementById("userMenuDropdown");
    languageToggle = document.getElementById("languageToggle");
    languageMenu = document.getElementById("languageMenu");
    themeToggle = document.getElementById("themeToggle");
    themeMenu = document.getElementById("themeMenu");
    notificationToggle = document.getElementById("notificationToggle");
    notificationMenu = document.getElementById("notificationMenu");
    siteHeader = document.querySelector(".site-header");
    loginTriggerBtn = document.getElementById("loginTriggerBtn");
}

// Login state comes from the server session (SQL), see state.js
function hasLoginSession() {
    return Boolean(window.AppState?.isLoggedIn());
}

function goToConsole() {
    window.location.href = hasLoginSession() ? "/dashboard" : "/login";
}

function showLoginPanel() {
    window.location.href = "/login";
}

function hideLoginPanel() {
    loginOverlay?.classList.add("hidden");
}

function setDashboardMode(isActive) {
    document.body.classList.toggle("dashboard-mode", isActive);
    document.getElementById("dashboard")?.classList.toggle("hidden", !isActive);
    document.querySelector(".page-shell")?.classList.toggle("hidden", isActive);
    loginOverlay?.classList.add("hidden");

    if (!isActive) {
        hideLoginPanel();
    }
}

function closeMenus() {
    languageMenu?.classList.add("hidden");
    themeMenu?.classList.add("hidden");
    notificationMenu?.classList.add("hidden");
    userMenuDropdown?.classList.add("hidden");
    languageToggle?.setAttribute("aria-expanded", "false");
    themeToggle?.setAttribute("aria-expanded", "false");
    notificationToggle?.setAttribute("aria-expanded", "false");
    userMenuTrigger?.setAttribute("aria-expanded", "false");
}

function toggleMenu(menu, toggle) {
    const willOpen = menu?.classList.contains("hidden");
    closeMenus();

    if (willOpen) {
        menu?.classList.remove("hidden");
        toggle?.setAttribute("aria-expanded", "true");
    }
}

function toggleUserMenu() {
    const willOpen = userMenuDropdown?.classList.contains("hidden");
    closeMenus();

    if (willOpen) {
        userMenuDropdown?.classList.remove("hidden");
        userMenuTrigger?.setAttribute("aria-expanded", "true");
    }
}

function updateUserMenuState() {
    const hasAccess = hasLoginSession();
    loginTriggerBtn?.classList.toggle("hidden", hasAccess);
    userMenuWrap?.classList.toggle("hidden", !hasAccess);
}

function getStoredProfile() {
    return window.AppState?.getStoredProfile() || null;
}

function getDisplayNameFromProfile(profile = {}) {
    const candidates = [
        profile.nickname,
        profile.name,
        profile.full_name,
        profile.fullName,
        profile.username,
        profile.user_name,
        profile.email,
        profile.account,
        typeof profile.id === "number" ? String(profile.id) : profile.id,
    ];

    return candidates.find((value) => typeof value === "string" && value.trim())?.trim() || "Người dùng";
}

function getPlanLabelFromProfile(profile = {}) {
    if (profile?.vip && typeof profile.vip === "object" && profile.vip.expire_at) {
        return "Thành viên";
    }

    const candidates = [profile.plan, profile.tier, profile.role, profile.account_type, profile.utm];
    return candidates.find((value) => typeof value === "string" && value.trim())?.trim() || "Tài khoản";
}

function getAvatarInitials(name = "") {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "AI";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

// Shows the account picture (loaded through our own /api/avatar), and falls back to the initials
// when there is no picture or it cannot be loaded - never an empty dark circle.
function setAvatarImage(el, avatarUrl, initials) {
    if (!el) return;

    const showInitials = () => {
        el.style.backgroundImage = "";
        el.classList.remove("has-image");
        el.replaceChildren(document.createTextNode(initials));
    };

    showInitials();
    if (!avatarUrl) return;

    // Per-account URL so the browser cache can never hand one account's picture to another
    const src = `/api/avatar?u=${encodeURIComponent(window.AppState?.data?.user?.id ?? "")}`;
    const probe = new Image();
    probe.onload = () => {
        el.replaceChildren();
        el.style.backgroundImage = `url(${src})`;
        el.style.backgroundSize = "cover";
        el.style.backgroundPosition = "center";
        el.style.backgroundRepeat = "no-repeat";
        el.classList.add("has-image");
    };
    probe.onerror = showInitials;
    probe.src = src;
}
window.setAvatarImage = setAvatarImage;

function applyUserProfile(profile = null) {
    const resolvedProfile = profile || getStoredProfile() || {};
    const displayName = getDisplayNameFromProfile(resolvedProfile);
    const planLabel = getPlanLabelFromProfile(resolvedProfile);
    // Avatar comes only from the logged-in account's own record (Google picture), never from another source
    const accountUser = window.AppState?.isLoggedIn() ? window.AppState.data.user : null;
    const avatarUrl = typeof accountUser?.avatar === "string" ? accountUser.avatar.trim() : "";
    const initials = getAvatarInitials(displayName);

    document.getElementById("userDisplayName")?.replaceChildren(document.createTextNode(displayName));
    document.getElementById("userDisplayPlan")?.replaceChildren(document.createTextNode(planLabel));

    ["userAvatar", "overviewAvatar"].forEach((id) => {
        setAvatarImage(document.getElementById(id), avatarUrl, initials);
    });

    document.getElementById("overviewDisplayName")?.replaceChildren(document.createTextNode(displayName));
}

function applyNotificationState() {
    if (!notificationMenu) return;

    const loggedIn = hasLoginSession();
    // "No API key" = the account has no active key stored in SQL
    const missingApiConfig = loggedIn && window.AppState.getKeyCount() === 0;

    notificationMenu.innerHTML = missingApiConfig
        ? `
            <div class="notification-header">
                <span>Thông báo</span>
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
                <span>Thông báo</span>
                <span class="notification-count">01</span>
            </div>
            <article class="notification-card">
                <div class="notification-tag">AI STORE</div>
                <h4>Không gian làm việc đã sẵn sàng</h4>
                <p>Dashboard, hồ sơ và danh sách mô hình đang được đồng bộ theo tài khoản đăng nhập.</p>
                <div class="notification-time">Vừa xong · curated for your workspace</div>
            </article>
        `;
}

function goToProfile() {
    window.location.href = "/dashboard#profile";
}

function syncHeaderScrollState() {
    if (!siteHeader) return;
    siteHeader.classList.toggle("is-scrolled", window.scrollY > 18);
}

function animateCountUp(element) {
    if (!element || element.dataset.countAnimated === "true") return;

    element.dataset.countAnimated = "true";
    const type = element.dataset.countType || "integer";
    const suffix = element.dataset.countSuffix || "";
    const duration = 1400;
    const start = performance.now();

    const render = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        if (type === "fraction") {
            const [leftTarget, rightTarget] = (element.dataset.countTarget || "0/0")
                .split("/")
                .map((value) => Number(value) || 0);
            element.textContent = `${Math.round(leftTarget * eased)}/${Math.max(1, Math.round(rightTarget * eased))}`;
        } else {
            const target = Number(element.dataset.countTarget || 0);
            const value = target * eased;
            element.textContent = `${type === "decimal" ? value.toFixed(2) : Math.round(value)}${suffix}`;
        }

        if (progress < 1) requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
}

function initScrollAnimations(root = document) {
    const elements = [...root.querySelectorAll(".reveal-card, .count-up")];

    if (!elements.length) return;

    if (!("IntersectionObserver" in window)) {
        elements.forEach((element) => {
            element.classList.add("is-visible");
            if (element.classList.contains("count-up")) animateCountUp(element);
        });
        return;
    }

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-visible");
                if (entry.target.classList.contains("count-up")) animateCountUp(entry.target);
                observer.unobserve(entry.target);
            });
        },
        { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );

    elements.forEach((element) => observer.observe(element));
}

function applyTranslations(language) {
    const dictionary = translations[language] || translations.vi || {};
    document.documentElement.lang = language === "ja" ? "ja" : language === "zh" ? "zh" : language === "en" ? "en" : "vi";

    document.querySelectorAll("[data-i18n]").forEach((element) => {
        const key = element.getAttribute("data-i18n");
        if (dictionary[key]) element.textContent = dictionary[key];
    });

    // Set active class on language menu buttons
    const languageButtons = document.querySelectorAll("#languageMenu button");
    if (languageButtons.length > 0) {
        languageButtons.forEach((button) => {
            button.classList.toggle("active", button.dataset.lang === language);
        });
    } else {
        // Fallback: if menu not found yet, try to set after DOM is ready
        setTimeout(() => {
            const fallbackButtons = document.querySelectorAll("#languageMenu button");
            fallbackButtons.forEach((button) => {
                button.classList.toggle("active", button.dataset.lang === language);
            });
        }, 100);
    }
}

function applyTheme(theme, { persist = true } = {}) {
    currentTheme = theme;
    if (persist) window.AppState?.setSetting("theme", theme);
    document.body.classList.toggle("light-theme", theme === "light");

    document.querySelectorAll("#themeMenu button").forEach((button) => {
        button.classList.toggle("active", button.dataset.theme === theme);
    });

    if (themeToggle) themeToggle.dataset.theme = theme;
}

async function enterDashboard() {
    const apiKey = apiKeyInput?.value.trim();

    if (!apiKey) {
        if (loginError) loginError.textContent = "Vui lòng nhập API key.";
        return;
    }

    if (loginError) loginError.textContent = "";
    setDashboardMode(true);
    if (typeof window.hydrateDashboard === "function") await window.hydrateDashboard();
}

async function logout() {
    // 1. Destroy the server-side session (Google / card login). The trusted-device cookie
    //    (remember_token) is kept on purpose, so /login can offer "continue" without the access code.
    try {
        await fetch("/auth/logout", { credentials: "include" });
    } catch (e) {
        // ignore network errors - still clear the browser state below
    }

    // 2. Per-tab temporary data (playground chat, recent activity) is dropped on logout
    try {
        window.sessionStorage.clear();
    } catch (e) {
        // storage may be unavailable
    }

    if (apiKeyInput) apiKeyInput.value = "";
    closeMenus();
    updateUserMenuState();
    window.location.href = "/login";
}

function bindHeaderEvents() {
    if (!headerEventsBound) {
        document.addEventListener("click", (event) => {
            const target = event.target;
            const userTrigger = target instanceof Element ? target.closest("#userMenuTrigger") : null;
            const languageTrigger = target instanceof Element ? target.closest("#languageToggle") : null;
            const themeTrigger = target instanceof Element ? target.closest("#themeToggle") : null;
            const notificationTrigger = target instanceof Element ? target.closest("#notificationToggle") : null;
            const insideUserMenu = target instanceof Element ? target.closest("#userMenuDropdown") : null;
            const insideLanguageMenu = target instanceof Element ? target.closest("#languageMenu") : null;
            const insideThemeMenu = target instanceof Element ? target.closest("#themeMenu") : null;
            const insideNotificationMenu = target instanceof Element ? target.closest("#notificationMenu") : null;

            const userAction = target instanceof Element ? target.closest("[data-user-action]") : null;
            if (userAction) {
                event.stopPropagation();
                const action = userAction.dataset.userAction;
                closeMenus();
                if (action === "profile") goToProfile();
                else if (action === "logout") logout();
                return;
            }

            if (userTrigger) {
                event.stopPropagation();
                toggleUserMenu();
                return;
            }

            if (languageTrigger) {
                event.stopPropagation();
                toggleMenu(languageMenu, languageToggle);
                return;
            }

            if (themeTrigger) {
                event.stopPropagation();
                toggleMenu(themeMenu, themeToggle);
                return;
            }

            if (notificationTrigger) {
                event.stopPropagation();
                toggleMenu(notificationMenu, notificationToggle);
                return;
            }

            if (insideUserMenu || insideLanguageMenu || insideThemeMenu || insideNotificationMenu) return;
            closeMenus();
        });

        headerEventsBound = true;
    }

    if (!languageMenuEventsBound && languageMenu) {
        languageMenu.querySelectorAll("button").forEach((button) => {
            button.addEventListener("click", () => {
                currentLanguage = button.dataset.lang || "vi";
                window.AppState?.setSetting("language", currentLanguage);
// Apply translations on page load
applyTranslations(currentLanguage);
// Also set active class after DOM is fully ready if needed
setTimeout(() => {
    applyTranslations(currentLanguage);
}, 50);
                closeMenus();
            });
        });
        languageMenuEventsBound = true;
    }

    if (!themeMenuEventsBound && themeMenu) {
        themeMenu.querySelectorAll("button").forEach((button) => {
            button.addEventListener("click", () => {
                applyTheme(button.dataset.theme || "dark");
                closeMenus();
            });
        });
        themeMenuEventsBound = true;
    }
}

window.refreshLoginRefs = refreshLoginRefs;
window.applyTranslationsToCurrentLanguage = () => applyTranslations(currentLanguage);
window.getStoredProfile = getStoredProfile;
window.applyUserProfile = applyUserProfile;
window.showLoginPanel = showLoginPanel;
window.goToConsole = goToConsole;
window.hideLoginPanel = hideLoginPanel;
window.enterDashboard = enterDashboard;
window.logout = logout;
window.goToProfile = goToProfile;
window.initScrollAnimations = initScrollAnimations;

window.addEventListener("scroll", syncHeaderScrollState, { passive: true });

window.addEventListener("DOMContentLoaded", async () => {
    // Login state + preferences are loaded from SQL before anything is drawn
    await window.AppState.ready;
    currentLanguage = window.AppState.getSetting("language");
    currentTheme = window.AppState.getSetting("theme");

    refreshLoginRefs();
    bindHeaderEvents();

    if (typeof window.mountShowcasePartial === "function" && document.getElementById("showcaseMount")) {
        await window.mountShowcasePartial();
    }

    if (typeof window.mountLoginPartial === "function" && document.getElementById("loginMount")) {
        await window.mountLoginPartial();
    }

    refreshLoginRefs();
    bindHeaderEvents();

    const urlParams = new URLSearchParams(window.location.search);
    const shouldOpenDashboard = urlParams.get("dashboard") === "1";
    const isStandaloneConsolePage = document.body.classList.contains("dashboard-layout");
    const shouldShowLoggedInState = urlParams.get("logged_in") === "1" || hasLoginSession();

    applyTranslations(currentLanguage);
    applyTheme(currentTheme, { persist: false });
    syncHeaderScrollState();
    updateUserMenuState();
    applyNotificationState();

    if (shouldShowLoggedInState) applyUserProfile();

    if (urlParams.get("logged_in") === "1") {
        window.history.replaceState({}, document.title, "/");
    }

    if (isStandaloneConsolePage) {
        document.getElementById("dashboard")?.classList.remove("hidden");
    } else if (shouldOpenDashboard && hasLoginSession()) {
        setDashboardMode(true);
        if (typeof window.hydrateDashboard === "function") await window.hydrateDashboard();
    } else {
        setDashboardMode(false);
    }

    if (window.location.pathname === "/models" && typeof window.mountModelsSection === "function") {
        await window.mountModelsSection();
    }

    if (window.location.pathname === "/rankings" && typeof window.initRankingsPage === "function") {
        await window.initRankingsPage();
    }

    initScrollAnimations();
});
