const UNLIMITED_THRESHOLD = 100_000_000;
const ACTIVITY_KEY = "aiRelayActivity";   // Quick Playground — sessionStorage (giữ khi F5, mất khi đóng tab)
// Request History, danh sách key (kể cả key đã tắt), model Playground và tuỳ chọn web search
// được lưu trong SQL (xem /api/history, /api/api-keys/*, /api/settings).

const refs = {};
let activeModel = "";
let activityLog = [];     // Recent Activity (Quick Playground)
let requestHistory = [];  // Request History (Playground full)
let historyPage = 1;
let pendingRequest = null;   // bản ghi "đang xử lý" hiển thị realtime ở Request History
let pendingTimer = null;     // interval cập nhật latency tăng dần
const HISTORY_PER_PAGE = 10;
const ACTIVITY_MAX_VISIBLE = 6;
let sessionRequests = 0;
let modelsCount = 0;
let isUnlimitedAccount = false;

/* ------------------------------- refs setup ------------------------------ */

function refreshDashboardRefs() {
    const $ = (id) => document.getElementById(id);
    Object.assign(refs, {
        root: $("dashboard"),
        sidebar: $("consoleSidebar"),
        mobileToggle: $("consoleMobileToggle"),
        // stats
        statBalance: $("statBalance"), statBalanceSub: $("statBalanceSub"),
        statKeys: $("statKeys"), statUsage: $("statUsage"), statModels: $("statModels"),
        usageTotal: $("usageTotal"), usageBalance: $("usageBalance"), usageRequests: $("usageRequests"),
        // account
        welcomeBack: $("welcomeBack"),
        accUserId: $("accUserId"), accPlan: $("accPlan"), accStatus: $("accStatus"),
        accCredits: $("accCredits"), accEndpoint: $("accEndpoint"),
        billBalance: $("billBalance"), billCredits: $("billCredits"), billStatus: $("billStatus"), billPlan: $("billPlan"),
        // playground
        chatModel: $("chatModel"), chatModelFull: $("chatModelFull"),
        comboMini: $("modelComboMini"), comboFull: $("modelComboFull"),
        comboListMini: $("modelComboListMini"), comboListFull: $("modelComboListFull"),
        chatInput: $("chatInput"), chatInputFull: $("chatInputFull"),
        sendBtn: $("sendChatBtn"), sendBtnFull: $("sendChatBtnFull"),
        streamModeFull: $("streamModeFull"),
        miniResponse: $("pgMiniResponse"), chatMessages: $("chatMessages"),
        // playground attachments (ảnh / thư mục)
        pgAttach: $("pgAttach"), pgAttachBtn: $("pgAttachBtn"), pgAttachMenu: $("pgAttachMenu"),
        pgAttachImagesBtn: $("pgAttachImagesBtn"), pgAttachFolderBtn: $("pgAttachFolderBtn"), pgAttachFilesBtn: $("pgAttachFilesBtn"),
        pgFileImages: $("pgFileImages"), pgFileFolder: $("pgFileFolder"), pgFileGeneric: $("pgFileGeneric"), pgAttachments: $("pgAttachments"),
        pgWebSearchToggle: $("pgWebSearchToggle"), pgWebSearchBadge: $("pgWebSearchBadge"),
        pgFullDropzone: $("pgFullDropzone"), pgDropHint: $("pgDropHint"),
        pgImagePreviewModal: $("pgImagePreviewModal"), pgImagePreviewClose: $("pgImagePreviewClose"),
        pgImagePreviewImg: $("pgImagePreviewImg"), pgImagePreviewTitle: $("pgImagePreviewTitle"),
        pgFilePreviewModal: $("pgFilePreviewModal"), pgFilePreviewClose: $("pgFilePreviewClose"),
        pgFilePreviewTitle: $("pgFilePreviewTitle"), pgFilePreviewMeta: $("pgFilePreviewMeta"),
        pgFilePreviewWarning: $("pgFilePreviewWarning"), pgFilePreviewBody: $("pgFilePreviewBody"),
        // tables
        activityBody: $("activityBody"), historyBody: $("historyBody"),
        clearHistory: $("clearHistoryBtn"),
        historyFooter: $("historyFooter"), historyRange: $("historyRange"),
        historyPrev: $("historyPrev"), historyNext: $("historyNext"), historyPageInd: $("historyPageInd"),
        // keys
        keysGrid: $("keysGrid"),
        keysAddBtn: $("keysAddBtn"), keysSaveBtn: $("keysSaveBtn"),
        keysStatus: $("keysStatus"),
        keyModal: $("keyModal"), keyModalTitle: $("keyModalTitle"), keyModalClose: $("keyModalClose"),
        keyFieldUrl: $("keyFieldUrl"), keyFieldToken: $("keyFieldToken"), keyFieldModel: $("keyFieldModel"),
        keyFieldMode: $("keyFieldMode"), keyFieldEffortWrap: $("keyFieldEffortWrap"), keyFieldEffort: $("keyFieldEffort"),
        keyFormError: $("keyFormError"), keyFormCancel: $("keyFormCancel"), keyFormSave: $("keyFormSave"),
        // refresh / settings
        refreshBtn: $("dashboardRefreshBtn"),
        settingsTheme: $("settingsThemeBtn"), settingsLogout: $("settingsLogoutBtn"),
        // modal
        modal: $("rhModal"), modalTitle: $("rhModalTitle"), modalBody: $("rhModalBody"), modalClose: $("rhModalClose"),
        pgImagePreviewModal: $("pgImagePreviewModal"), pgImagePreviewTitle: $("pgImagePreviewTitle"),
        pgImagePreviewImg: $("pgImagePreviewImg"), pgImagePreviewClose: $("pgImagePreviewClose"),
    });
}

/* -------------------------------- helpers -------------------------------- */

function escapeHtml(v) {
    return String(v == null ? "" : v)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function getProfilePayload() {
    return window.AppState?.getPayload() || null;
}

// Keys that are switched on (disabled keys stay in SQL but are not used)
function getApiConfigList() {
    return window.AppState ? window.AppState.getEnabledKeys() : [];
}

function getPrimaryEntry() {
    return window.AppState?.getPrimaryEntry() || null;
}

function formatMoney(n) {
    const v = Number(n) || 0;
    return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function isUnlimited(amount) {
    return Number(amount) >= UNLIMITED_THRESHOLD;
}

function nowTime() {
    const d = new Date();
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/* --------------------------------- billing ------------------------------- */

function getSubscriptionBalance(subscription = {}) {
    const candidates = [
        subscription.balance_limit, subscription.balance, subscription.remaining_balance,
        subscription.hard_limit_usd, subscription.soft_limit_usd, subscription.system_hard_limit_usd,
    ];
    const value = candidates.find((c) => Number.isFinite(Number(c)));
    return Number(value || 0);
}

/* --------------------------------- stats --------------------------------- */

function renderBalance(amount) {
    const unlimited = isUnlimited(amount);
    isUnlimitedAccount = unlimited;
    window.aiRelayUnlimited = unlimited;
    if (unlimited) {
        if (refs.accPlan) refs.accPlan.textContent = "VIP_SSS";
        if (refs.billPlan) refs.billPlan.textContent = "VIP_SSS";
        // Nếu Profile đã render, cập nhật lại plan = VIP_SSS
        if (profileHydrated && typeof window.hydrateProfilePage === "function") window.hydrateProfilePage();
    }
    if (refs.statBalance) {
        refs.statBalance.innerHTML = unlimited
            ? `<span class="unit">$</span>∞ <span class="stat-badge">Unlimited</span>`
            : `<span class="unit">$</span>${formatMoney(amount)}`;
    }
    if (refs.statBalanceSub) {
        refs.statBalanceSub.textContent = unlimited ? "Không giới hạn · không trừ phí" : "Số dư khả dụng";
    }
    if (refs.usageBalance) refs.usageBalance.innerHTML = unlimited ? "∞" : `$${formatMoney(amount)}`;
    if (refs.billBalance) refs.billBalance.innerHTML = unlimited ? "$∞" : `$${formatMoney(amount)}`;
    if (refs.billCredits) refs.billCredits.textContent = unlimited ? "100%" : "—";
    if (refs.accCredits) refs.accCredits.textContent = unlimited ? "Unlimited" : `$${formatMoney(amount)}`;
}

function renderStatsFromBilling(subscription, usage) {
    const amount = getSubscriptionBalance(subscription);
    renderBalance(amount);

    const total = Number(usage?.total_usage || 0);
    const totalText = `$${formatMoney(total)}`;
    if (refs.statUsage) refs.statUsage.textContent = totalText;
    if (refs.usageTotal) refs.usageTotal.textContent = totalText;
}

function renderKeysStat() {
    const count = getApiConfigList().length;
    if (refs.statKeys) refs.statKeys.textContent = String(count);
}

function renderModelsStat(count) {
    modelsCount = count;
    if (refs.statModels) refs.statModels.textContent = String(count);
}

/* -------------------------------- account -------------------------------- */

function renderAccount() {
    const p = getProfilePayload();
    const user = p?.login?.data?.user || p?.login?.data || p?.login || p?.user || {};
    const entry = getPrimaryEntry();

    const userId = user.id || user.user_id || user.uid || user.username || "—";
    const plan = isUnlimitedAccount ? "VIP_SSS" : (user.plan || (user.vip?.expire_at ? "Member" : "Free"));
    const status = user.status || (user.vip?.expire_at ? "Active" : "Active");
    const name = user.nickname || user.name || user.username || "bạn";

    if (refs.welcomeBack) refs.welcomeBack.textContent = `Welcome back, ${name}`;
    if (refs.accUserId) refs.accUserId.textContent = String(userId);
    if (refs.accPlan) refs.accPlan.textContent = String(plan);
    if (refs.billPlan) refs.billPlan.textContent = String(plan);
    if (refs.accStatus) refs.accStatus.innerHTML = `<span class="badge badge-ok">${escapeHtml(status)}</span>`;
    if (refs.billStatus) refs.billStatus.innerHTML = `<span class="badge badge-ok">${escapeHtml(status)}</span>`;
    if (refs.accEndpoint) refs.accEndpoint.textContent = entry?.url || "—";
}

/* --------------------------------- keys ---------------------------------- */

function maskToken(token) {
    if (!token) return "";
    if (token.length <= 16) return token;
    return `${token.slice(0, 8)}${"•".repeat(12)}${token.slice(-4)}`;
}

let keysDraft = [];
let keysDirty = false;
let dragIndex = -1;
let editIndex = -1;
let keysRefreshing = false;

function syncDraftFromConfig() {
    // The full list (including disabled keys, flag enabled:false) comes from SQL
    keysDraft = window.AppState.getKeys().map((e) => ({ ...e }));
    keysDirty = false;
}

function setKeysDirty(v) {
    keysDirty = v;
    if (refs.keysSaveBtn) refs.keysSaveBtn.hidden = !v;
}

function setKeysStatus(msg, isError = false) {
    if (!refs.keysStatus) return;
    if (!msg) { refs.keysStatus.hidden = true; refs.keysStatus.textContent = ""; return; }
    refs.keysStatus.hidden = false;
    refs.keysStatus.textContent = msg;
    refs.keysStatus.style.color = isError ? "var(--c-danger)" : "var(--c-muted)";
}

function renderKeys() {
    if (!refs.keysGrid) return;

    if (!keysDraft.length) {
        refs.keysGrid.innerHTML = `<div class="rh-empty">Chưa có API key nào. Bấm "Thêm key" để tạo mới.</div>`;
        return;
    }

    refs.keysGrid.innerHTML = keysDraft.map((e, i) => {
        const modePreset = resolveModePreset(e);
        const modeLabel = modePreset === "auto"
            ? "Auto"
            : modePreset === "codex"
                ? "Codex"
                : "Claude";
        const tags = [modeLabel].filter(Boolean)
            .map((t) => `<span class="key-tag">${escapeHtml(t)}</span>`).join("");
        const primary = i === 0 ? `<span class="key-primary">Chính</span>` : "";
        const isDisabled = e.enabled === false;
        const disabledClass = isDisabled ? " is-disabled" : "";
        const checkedAttr = isDisabled ? "" : " checked";
        return `
        <div class="key-card${disabledClass}" draggable="true" data-key-index="${i}">
            <div class="key-card-head">
                <span class="key-drag" title="Kéo để sắp xếp" aria-hidden="true">⠿</span>
                <span class="key-model">${escapeHtml(e.model || "default")}</span>
                ${primary}
                <div class="key-tags">${tags}</div>
                <label class="key-toggle" title="${isDisabled ? "Đã tắt — không gửi lên server" : "Đang bật"}">
                    <span class="key-toggle-switch">
                        <input type="checkbox" data-key-toggle="${i}"${checkedAttr}>
                        <span class="key-toggle-track"></span>
                    </span>
                </label>
            </div>
            <div class="key-secret">
                <code data-key-code data-full="${escapeHtml(e.token)}">${escapeHtml(maskToken(e.token))}</code>
            </div>
            <div class="key-endpoint">${escapeHtml(e.url || "")}</div>
            <div class="key-card-actions">
                <button type="button" class="key-mini-btn" data-key-edit="${i}">Sửa</button>
                <button type="button" class="key-mini-btn" data-key-copy="${escapeHtml(e.token)}">Copy</button>
                <button type="button" class="key-mini-btn key-del" data-key-del="${i}">Xóa</button>
            </div>
        </div>`;
    }).join("");
}

/* ---- key form modal ---- */

function resolveModePreset(entry = {}) {
    const mode = String(entry.mode || "").trim().toLowerCase();
    if (mode === "codex") return "codex";
    if (mode === "claude") return "claude";
    return "auto";
}

function buildEntryFromPreset(prev = {}, preset = "auto") {
    const baseEntry = {
        url: refs.keyFieldUrl.value.trim(),
        token: refs.keyFieldToken.value.trim(),
        model: refs.keyFieldModel.value.trim(),
        channel: prev.channel || "",
        single_tool_use: Boolean(prev.single_tool_use),
    };

    if (preset === "codex") {
        return {
            ...baseEntry,
            channel: "",
            mode: "codex",
            effort: refs.keyFieldEffort?.value || prev.effort || "xhigh",
            single_tool_use: false,
        };
    }

    if (preset === "claude") {
        return {
            ...baseEntry,
            channel: "",
            mode: "claude",
            effort: "xhigh",
            single_tool_use: false,
        };
    }

    return {
        ...baseEntry,
        channel: "",
        mode: "",
        effort: "xhigh",
        single_tool_use: false,
    };
}

function toggleEffortField(modePreset) {
    if (!refs.keyFieldEffortWrap || !refs.keyFieldEffort) return;
    const normalizedMode = String(modePreset || "").trim().toLowerCase();
    const isCodex = normalizedMode === "codex";
    refs.keyFieldEffortWrap.hidden = !isCodex;
    refs.keyFieldEffortWrap.style.display = isCodex ? "flex" : "none";
    if (!isCodex) refs.keyFieldEffort.value = "xhigh";
}

function openKeyForm(index) {
    editIndex = index;
    const e = index >= 0 ? keysDraft[index] : {};
    const modePreset = resolveModePreset(e);
    if (refs.keyModalTitle) refs.keyModalTitle.textContent = index >= 0 ? "Sửa API Key" : "Thêm API Key";
    refs.keyFieldUrl.value = e.url || "";
    refs.keyFieldToken.value = e.token || "";
    refs.keyFieldModel.value = e.model || "";
    refs.keyFieldMode.value = modePreset;
    refs.keyFieldEffort.value = e.effort || "xhigh";
    toggleEffortField(modePreset);
    if (refs.keyFormError) refs.keyFormError.hidden = true;
    refs.keyModal.hidden = false;
}

function closeKeyForm() {
    if (refs.keyModal) refs.keyModal.hidden = true;
    toggleEffortField("auto");
    editIndex = -1;
}

function submitKeyForm() {
    const prev = editIndex >= 0 ? keysDraft[editIndex] : {};
    const preset = refs.keyFieldMode.value || "auto";
    const entry = buildEntryFromPreset(prev, preset);
    entry.enabled = prev.enabled !== false;

    if (!entry.url || !entry.token) {
        if (refs.keyFormError) {
            refs.keyFormError.hidden = false;
            refs.keyFormError.textContent = "URL và Token là bắt buộc.";
        }
        return;
    }

    if (editIndex >= 0) keysDraft[editIndex] = entry;
    else keysDraft.push(entry);

    setKeysDirty(true);
    renderKeys();
    closeKeyForm();
}

/* ---- save / cancel ---- */

async function saveKeys() {
    // SQL is the source of truth: the server stores every key (disabled ones too)
    // and mirrors the enabled ones to the external service.
    refs.keysSaveBtn?.classList.add("is-loading");
    setKeysStatus("Đang lưu cấu hình...");
    try {
        const res = await fetch("/api/api-keys/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ list: keysDraft }),
        });
        const data = await res.json().catch(() => ({}));

        if (res.status === 401) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        if (!res.ok) throw new Error(data?.message || data?.error || "Không thể lưu cấu hình. Thử lại sau.");

        window.AppState.setKeys(data.keys || []);
        const externalNote = data.external === "failed" ? " (chưa đồng bộ được sang dịch vụ ngoài)" : "";

        syncDraftFromConfig();
        setKeysDirty(false);
        renderKeys();
        renderKeysStat();
        renderAccount();
        setKeysStatus("Đã lưu. Đang đồng bộ dữ liệu...");
        await Promise.all([loadBilling(), loadModels()]);
        setKeysStatus("Đã lưu cấu hình thành công." + externalNote);
        setTimeout(() => setKeysStatus(""), externalNote ? 6000 : 2500);
    } catch (error) {
        setKeysStatus(error.message || "Không thể lưu cấu hình. Thử lại sau.", true);
    } finally {
        refs.keysSaveBtn?.classList.remove("is-loading");
    }
}

async function refreshKeysFromServer(options = {}) {
    if (keysRefreshing) return;
    if (keysDirty && !options.force) return;

    keysRefreshing = true;
    setKeysStatus("Đang cập nhật API key mới nhất...");

    try {
        // Reads SQL (and first adds keys that only exist on the external service)
        const res = await fetch("/api/api-keys/pull", { method: "POST", credentials: "same-origin" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || data?.error || "Không thể cập nhật API key mới nhất.");

        window.AppState.setKeys(data.keys || []);
        syncDraftFromConfig();
        setKeysDirty(false);
        renderKeys();
        renderKeysStat();
        renderAccount();
        setKeysStatus("");
    } catch (error) {
        setKeysStatus(error?.message || "Không thể cập nhật API key mới nhất.", true);
    } finally {
        keysRefreshing = false;
    }
}

function bindKeysEvents() {
    refs.keysGrid?.addEventListener("click", async (ev) => {
        const t = ev.target;
        if (!(t instanceof HTMLElement)) return;

        const copyVal = t.getAttribute("data-key-copy");
        if (copyVal) {
            try {
                await navigator.clipboard.writeText(copyVal);
                t.textContent = "Đã copy";
                t.classList.add("is-copied");
                setTimeout(() => { t.textContent = "Copy"; t.classList.remove("is-copied"); }, 1100);
            } catch { t.textContent = "Lỗi"; }
            return;
        }

        const editIdx = t.getAttribute("data-key-edit");
        if (editIdx !== null) { openKeyForm(Number(editIdx)); return; }

        const delIdx = t.getAttribute("data-key-del");
        if (delIdx !== null) {
            keysDraft.splice(Number(delIdx), 1);
            setKeysDirty(true);
            renderKeys();
        }
    });

    // Toggle Bật/Tắt key — tự động lưu vào SQL
    refs.keysGrid?.addEventListener("change", async (ev) => {
        const t = ev.target;
        if (!(t instanceof HTMLInputElement)) return;
        const toggleIdx = t.getAttribute("data-key-toggle");
        if (toggleIdx === null) return;

        const entry = keysDraft[Number(toggleIdx)];
        if (!entry?.token) return;

        // Bật/tắt key: cờ enabled nằm trong chính key và được lưu vào SQL
        entry.enabled = t.checked;
        setKeysDirty(true);
        renderKeys();

        // Tự động lưu cấu hình lên server
        await saveKeys();
    });

    // drag & drop reorder
    refs.keysGrid?.addEventListener("dragstart", (ev) => {
        const card = ev.target instanceof HTMLElement ? ev.target.closest(".key-card") : null;
        if (!card) return;
        dragIndex = Number(card.getAttribute("data-key-index"));
        card.classList.add("is-dragging");
        ev.dataTransfer.effectAllowed = "move";
    });
    refs.keysGrid?.addEventListener("dragend", (ev) => {
        const card = ev.target instanceof HTMLElement ? ev.target.closest(".key-card") : null;
        card?.classList.remove("is-dragging");
        dragIndex = -1;
    });
    refs.keysGrid?.addEventListener("dragover", (ev) => {
        ev.preventDefault();
        const card = ev.target instanceof HTMLElement ? ev.target.closest(".key-card") : null;
        refs.keysGrid.querySelectorAll(".key-card.drop-target").forEach((c) => c.classList.remove("drop-target"));
        if (card && Number(card.getAttribute("data-key-index")) !== dragIndex) card.classList.add("drop-target");
    });
    refs.keysGrid?.addEventListener("drop", (ev) => {
        ev.preventDefault();
        const card = ev.target instanceof HTMLElement ? ev.target.closest(".key-card") : null;
        refs.keysGrid.querySelectorAll(".key-card.drop-target").forEach((c) => c.classList.remove("drop-target"));
        if (!card || dragIndex < 0) return;
        const target = Number(card.getAttribute("data-key-index"));
        if (target === dragIndex) return;
        const [moved] = keysDraft.splice(dragIndex, 1);
        keysDraft.splice(target, 0, moved);
        setKeysDirty(true);
        renderKeys();
    });

    refs.keysAddBtn?.addEventListener("click", () => openKeyForm(-1));
    refs.keysSaveBtn?.addEventListener("click", saveKeys);
    refs.keyFieldMode?.addEventListener("change", () => toggleEffortField(refs.keyFieldMode.value || "auto"));
    refs.keyFormSave?.addEventListener("click", submitKeyForm);
    refs.keyFormCancel?.addEventListener("click", closeKeyForm);
    refs.keyModalClose?.addEventListener("click", closeKeyForm);
    refs.keyModal?.addEventListener("click", (ev) => { if (ev.target === refs.keyModal) closeKeyForm(); });
}

/* ------------------------------ request log ------------------------------ */

function getNavigationType() {
    try {
        const nav = performance.getEntriesByType("navigation")[0];
        if (nav && nav.type) return nav.type;            // "reload" | "navigate" | "back_forward"
        return performance.navigation?.type === 1 ? "reload" : "navigate";
    } catch { return "navigate"; }
}

function loadStoredLogs() {
    // Recent Activity (Quick Playground): giữ khi F5/back-forward, RESET khi điều hướng mới vào dashboard
    const navType = getNavigationType();
    if (navType === "reload" || navType === "back_forward") {
        try { activityLog = JSON.parse(sessionStorage.getItem(ACTIVITY_KEY) || "[]") || []; } catch { activityLog = []; }
    } else {
        activityLog = [];
        try { sessionStorage.removeItem(ACTIVITY_KEY); } catch { /* ignore */ }
    }
}

// Request History (Playground) nằm trong SQL. Danh sách chỉ gồm tóm tắt; request/response
// đầy đủ được tải khi bấm View.
async function loadHistoryFromServer() {
    try {
        const res = await fetch("/api/history", { credentials: "same-origin", cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const rows = Array.isArray(data?.data) ? data.data : [];
        // giữ dòng "đang xử lý" (nếu có) ở trên cùng
        requestHistory = (pendingRequest ? [pendingRequest] : []).concat(rows);
        historyPage = 1;
    } catch { /* offline: giữ nguyên danh sách hiện có */ }
}

function saveActivity() {
    try { sessionStorage.setItem(ACTIVITY_KEY, JSON.stringify(activityLog)); } catch { /* ignore */ }
}

// Lưu 1 bản ghi Request History vào SQL (nền); gán id để sau này View được chi tiết
function saveHistoryRecord(record) {
    fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
            time: record.time, model: record.model, tokens: record.tokens,
            latency: record.latency, ok: record.ok, request: record.request, response: record.response,
        }),
    })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => { if (data?.id) record.id = data.id; })
        .catch(() => { /* bản ghi vẫn hiển thị trong phiên hiện tại */ });
}

function renderActivity() {
    if (!refs.activityBody) return;
    if (!activityLog.length) {
        refs.activityBody.innerHTML = `<div class="rh-empty">Chưa có hoạt động Quick Playground. Gửi một prompt ở Quick Playground để bắt đầu.</div>`;
        return;
    }
    refs.activityBody.innerHTML = activityLog.slice(0, ACTIVITY_MAX_VISIBLE).map((r) => `
        <div class="rh-row act">
            <div class="rh-time">${escapeHtml(r.time)}</div>
            <div>Quick Playground</div>
            <div class="rh-model" title="${escapeHtml(r.model)}">${escapeHtml(r.model)}</div>
            <div class="ta-r"><span class="rh-status ${r.ok ? "ok" : "err"}"><i></i>${r.ok ? "Success" : "Failed"}</span></div>
        </div>`).join("");
}

// Định dạng latency: <1000ms -> ms, <60s -> giây (s), còn lại -> phút+giây (vd 1p30s)
function formatLatency(ms) {
    if (ms == null) return "—";
    if (ms < 1000) return ms + "ms";
    if (ms < 60000) return (ms / 1000).toFixed(1) + "s";
    const totalSec = Math.floor(ms / 1000);
    return `${Math.floor(totalSec / 60)}p${totalSec % 60}s`;
}

function renderHistory() {
    if (!refs.historyBody) return;

    if (!requestHistory.length) {
        refs.historyBody.innerHTML = `<div class="rh-empty">Chưa có request nào.</div>`;
        if (refs.historyFooter) refs.historyFooter.hidden = true;
        return;
    }

    const totalPages = Math.max(1, Math.ceil(requestHistory.length / HISTORY_PER_PAGE));
    historyPage = Math.min(Math.max(1, historyPage), totalPages);
    const start = (historyPage - 1) * HISTORY_PER_PAGE;
    const pageItems = requestHistory.slice(start, start + HISTORY_PER_PAGE);

    refs.historyBody.innerHTML = pageItems.map((r, j) => {
        const globalIdx = start + j;
        const isPending = !!r.pending;
        const statusCell = isPending
            ? `<span class="rh-status pending"><i></i></span>`
            : `<span class="rh-status ${r.ok ? "ok" : "err"}"><i></i></span>`;
        const viewCell = isPending
            ? `<span class="rh-view-pending">Đang xử lý…</span>`
            : `<button type="button" class="rh-view-btn" data-view="${globalIdx}">View</button>`;
        return `
        <div class="rh-row hist${isPending ? " is-pending" : ""}">
            <div class="rh-time">${escapeHtml(r.time)}</div>
            <div class="rh-model" title="${escapeHtml(r.model)}">${escapeHtml(r.model)}</div>
            <div class="ta-r">${r.tokens != null ? r.tokens : "—"}</div>
            <div class="ta-c">${statusCell}</div>
            <div class="ta-r rh-latency">${formatLatency(r.latency)}</div>
            <div class="ta-r">${viewCell}</div>
        </div>`;
    }).join("");

    if (refs.historyFooter) refs.historyFooter.hidden = false;
    if (refs.historyRange) refs.historyRange.textContent = `${start + 1}–${start + pageItems.length} / ${requestHistory.length}`;
    if (refs.historyPageInd) refs.historyPageInd.textContent = `${historyPage} / ${totalPages}`;
    if (refs.historyPrev) refs.historyPrev.disabled = historyPage <= 1;
    if (refs.historyNext) refs.historyNext.disabled = historyPage >= totalPages;
}

// Tạo dòng "đang xử lý" ngay khi request được gửi đi (chỉ Playground full).
// Latency sẽ đếm tăng dần realtime cho tới khi có pushLog kết thúc.
function startPendingLog(model, request) {
    stopPendingTimer();
    pendingRequest = {
        time: nowTime(), model, tokens: null, latency: 0,
        ok: null, pending: true, startedAt: Date.now(),
        request, response: null,
    };
    requestHistory.unshift(pendingRequest);
    if (requestHistory.length > 200) requestHistory.length = 200;
    historyPage = 1;
    renderHistory();   // bản ghi tạm chưa lưu vào SQL
    pendingTimer = setInterval(updatePendingLatency, 100);
    return pendingRequest;
}

function updatePendingLatency() {
    if (!pendingRequest) { stopPendingTimer(); return; }
    pendingRequest.latency = Date.now() - pendingRequest.startedAt;
    // chỉ cập nhật ô latency của dòng đang xử lý -> mượt, không render lại cả bảng
    const cell = refs.historyBody?.querySelector(".rh-row.hist.is-pending .rh-latency");
    if (cell) cell.textContent = formatLatency(pendingRequest.latency);
}

function stopPendingTimer() {
    if (pendingTimer) { clearInterval(pendingTimer); pendingTimer = null; }
}

// fromFull = true => Playground (Request History); false => Quick Playground (Recent Activity)
function pushLog(record, fromFull) {
    sessionRequests += 1;
    if (refs.usageRequests) refs.usageRequests.textContent = String(sessionRequests);

    if (fromFull) {
        // Gỡ dòng tạm "đang xử lý" (nếu có) rồi chèn bản ghi cuối cùng
        stopPendingTimer();
        if (pendingRequest) {
            const idx = requestHistory.indexOf(pendingRequest);
            if (idx !== -1) requestHistory.splice(idx, 1);
            pendingRequest = null;
        }
        requestHistory.unshift(record);
        if (requestHistory.length > 200) requestHistory.length = 200;
        historyPage = 1;
        saveHistoryRecord(record);
        renderHistory();
    } else {
        activityLog.unshift(record);
        if (activityLog.length > 50) activityLog.length = 50;
        saveActivity();
        renderActivity();
    }
}

async function openModal(record) {
    if (!refs.modal) return;
    if (refs.modalTitle) refs.modalTitle.textContent = `${record.model} · ${record.time}`;
    if (refs.modalBody) refs.modalBody.textContent = "Đang tải...";
    refs.modal.hidden = false;

    // Bản ghi đọc từ SQL chỉ có tóm tắt: lấy request/response khi cần
    if (record.request === undefined && record.id) {
        try {
            const res = await fetch(`/api/history/${record.id}`, { credentials: "same-origin" });
            const data = res.ok ? await res.json() : null;
            record.request = data?.data?.request ?? null;
            record.response = data?.data?.response ?? null;
        } catch { /* hiển thị phần có sẵn */ }
    }
    if (refs.modalBody) {
        refs.modalBody.textContent = JSON.stringify({ request: record.request, response: record.response }, null, 2);
    }
}

function bindHistoryEvents() {
    refs.historyBody?.addEventListener("click", (ev) => {
        const t = ev.target;
        if (t instanceof HTMLElement && t.hasAttribute("data-view")) {
            const idx = Number(t.getAttribute("data-view"));
            if (requestHistory[idx]) openModal(requestHistory[idx]);
        }
    });
    refs.modalClose?.addEventListener("click", () => { refs.modal.hidden = true; });
    refs.modal?.addEventListener("click", (ev) => { if (ev.target === refs.modal) refs.modal.hidden = true; });
    document.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape" && refs.modal && !refs.modal.hidden) refs.modal.hidden = true;
    });

    refs.clearHistory?.addEventListener("click", () => {
        // Xóa bảng Request History (dừng cả dòng đang xử lý nếu có)
        stopPendingTimer();
        pendingRequest = null;
        requestHistory = [];
        historyPage = 1;
        fetch("/api/history", { method: "DELETE", credentials: "same-origin" }).catch(() => {});
        renderHistory();
        // Xóa luôn khung chat phía trên + lịch sử hội thoại gửi lên AI
        if (refs.chatMessages) refs.chatMessages.innerHTML = "";
        pgConversation = [];
        savePlayground();
    });

    refs.historyPrev?.addEventListener("click", () => { historyPage = Math.max(1, historyPage - 1); renderHistory(); });
    refs.historyNext?.addEventListener("click", () => { historyPage += 1; renderHistory(); });
}

/* ------------------------------- playground ------------------------------ */

function autoResize(el) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
}

/* ----------------------------- model combobox ---------------------------- */

let modelList = [];
let playgroundToolState = {
    webSearchEnabled: true   // giá trị thật được nạp từ SQL trong hydrateDashboard()
};

const PROVIDER_CAPABILITIES = {
    openai: { tools: true, toolChoice: true, webSearch: true, functionCalling: true, reasoning: true },
    anthropic: { tools: true, toolChoice: true, webSearch: true, functionCalling: true, reasoning: true },
    google: { tools: true, toolChoice: false, webSearch: true, functionCalling: true, reasoning: true },
    gemini: { tools: true, toolChoice: false, webSearch: true, functionCalling: true, reasoning: true },
    mistral: { tools: true, toolChoice: true, webSearch: false, functionCalling: true, reasoning: true },
    xai: { tools: true, toolChoice: true, webSearch: false, functionCalling: true, reasoning: true },
    qwen: { tools: true, toolChoice: true, webSearch: false, functionCalling: true, reasoning: true },
    deepseek: { tools: true, toolChoice: true, webSearch: false, functionCalling: true, reasoning: true },
    zhipu: { tools: true, toolChoice: true, webSearch: true, functionCalling: true, reasoning: true },
    openrouter: { tools: true, toolChoice: true, webSearch: false, functionCalling: true, reasoning: true },
    unknown: { tools: false, toolChoice: false, webSearch: false, functionCalling: false, reasoning: false }
};

const MODEL_CAPABILITY_OVERRIDES = {
    "gpt-5": { tools: true, toolChoice: true, webSearch: true, functionCalling: true, reasoning: true },
    "gpt-5-mini": { tools: true, toolChoice: true, webSearch: true, functionCalling: true, reasoning: false },
    "gpt-4.1": { tools: true, toolChoice: true, webSearch: true, functionCalling: true, reasoning: false },
    "claude-opus": { tools: true, toolChoice: true, webSearch: true, functionCalling: true, reasoning: true },
    "claude-sonnet": { tools: true, toolChoice: true, webSearch: true, functionCalling: true, reasoning: true },
    "gemini-2.5-pro": { tools: true, toolChoice: false, webSearch: true, functionCalling: true, reasoning: true },
    "gemini-2.5-flash": { tools: true, toolChoice: false, webSearch: true, functionCalling: true, reasoning: true },
    "qwen-max": { tools: true, toolChoice: true, webSearch: false, functionCalling: true, reasoning: true },
    "deepseek-r1": { tools: true, toolChoice: true, webSearch: false, functionCalling: true, reasoning: true }
};

function saveSelectedPlaygroundModel(id) {
    window.AppState?.setSetting("playground_model", id || "");
}

function loadSelectedPlaygroundModel() {
    return window.AppState?.getSetting("playground_model") || "";
}

function loadWebSearchPreference() {
    return window.AppState?.getSetting("playground_web_search") !== "false";
}

function saveWebSearchPreference(enabled) {
    window.AppState?.setSetting("playground_web_search", String(Boolean(enabled)));
}

function setActiveModel(id, { persist = true } = {}) {
    activeModel = id || "";
    if (refs.chatModel) refs.chatModel.value = activeModel;
    if (refs.chatModelFull) refs.chatModelFull.value = activeModel;
    if (persist) saveSelectedPlaygroundModel(activeModel);
}

function renderComboList(listEl, query) {
    if (!listEl) return;
    const q = (query || "").trim().toLowerCase();
    const matches = (q ? modelList.filter((m) => m.toLowerCase().includes(q)) : modelList).slice(0, 50);

    if (!matches.length) {
        listEl.innerHTML = `<div class="model-combo-empty">Không tìm thấy model</div>`;
        return;
    }
    listEl.innerHTML = matches.map((id) => `
        <button type="button" class="model-combo-item${id === activeModel ? " is-sel" : ""}" data-model="${escapeHtml(id)}">${escapeHtml(id)}</button>
    `).join("");
}

function wireCombo(input, listEl, comboWrap) {
    if (!input || !listEl || !comboWrap) return;
    const caret = comboWrap.querySelector(".model-combo-caret");

    const open = () => { renderComboList(listEl, ""); listEl.hidden = false; comboWrap.classList.add("is-open"); };
    const close = () => { listEl.hidden = true; comboWrap.classList.remove("is-open"); };

    input.addEventListener("focus", open);
    input.addEventListener("input", () => { renderComboList(listEl, input.value); listEl.hidden = false; comboWrap.classList.add("is-open"); });

    caret?.addEventListener("click", () => {
        if (listEl.hidden) { input.focus(); open(); } else { close(); }
    });

    listEl.addEventListener("mousedown", (ev) => {
        const btn = ev.target instanceof HTMLElement ? ev.target.closest("[data-model]") : null;
        if (!btn) return;
        ev.preventDefault();
        setActiveModel(btn.getAttribute("data-model"));
        close();
    });

    input.addEventListener("blur", () => {
        setTimeout(() => {
            // nếu gõ tay khớp 1 model thì nhận, không thì khôi phục model đang chọn
            const typed = input.value.trim();
            if (modelList.includes(typed)) setActiveModel(typed);
            else input.value = activeModel;
            close();
        }, 120);
    });

    input.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") {
            const first = listEl.querySelector("[data-model]");
            const typed = input.value.trim();
            if (modelList.includes(typed)) { setActiveModel(typed); close(); }
            else if (first) { ev.preventDefault(); setActiveModel(first.getAttribute("data-model")); close(); }
        } else if (ev.key === "Escape") {
            input.value = activeModel; close(); input.blur();
        }
    });
}

function getCurrentModelMetadata(modelId) {
    if (!modelId || typeof MODEL_METADATA === "undefined") return null;
    return MODEL_METADATA[modelId] || null;
}

function normalizeProviderName(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return "unknown";
    if (raw.includes("anthropic") || raw.includes("claude")) return "anthropic";
    if (raw.includes("google") || raw.includes("gemini")) return "google";
    if (raw.includes("openai") || raw.includes("gpt")) return "openai";
    if (raw.includes("mistral") || raw.includes("pixtral") || raw.includes("codestral")) return "mistral";
    if (raw.includes("deepseek")) return "deepseek";
    if (raw.includes("qwen") || raw.includes("alibaba")) return "qwen";
    if (raw.includes("glm") || raw.includes("zhipu") || raw.includes("thudm")) return "zhipu";
    if (raw.includes("xai") || raw.includes("x-ai") || raw.includes("grok")) return "xai";
    if (raw.includes("openrouter")) return "openrouter";
    return raw;
}

function inferProviderFromModel(modelId, metadata) {
    const id = String(modelId || "").toLowerCase();
    const caps = Array.isArray(metadata?.caps) ? metadata.caps : [];

    if (id.includes("claude")) return "anthropic";
    if (id.includes("gemini") || id.includes("gemma")) return "google";
    if (id.includes("gpt") || id.includes("chatgpt") || id.includes("openai/")) return "openai";
    if (id.includes("mistral") || id.includes("pixtral") || id.includes("codestral")) return "mistral";
    if (id.includes("deepseek")) return "deepseek";
    if (id.includes("qwen")) return "qwen";
    if (id.includes("glm") || id.includes("thudm") || id.includes("z-ai")) return "zhipu";
    if (id.includes("grok")) return "xai";
    if (caps.includes("Web Search") && id.includes("gemini")) return "google";
    return "unknown";
}

function getCurrentProvider(modelId) {
    const metadata = getCurrentModelMetadata(modelId);
    const inferred = inferProviderFromModel(modelId, metadata);
    return normalizeProviderName(inferred);
}

function resolveProviderForEntry(entry, modelId) {
    const candidates = [entry?.provider, entry?.name, entry?.label, entry?.owned_by];

    for (const candidate of candidates) {
        const normalized = normalizeProviderName(candidate);
        if (normalized !== "unknown" && PROVIDER_CAPABILITIES[normalized]) {
            return normalized;
        }
    }

    return getCurrentProvider(modelId);
}

function getDefaultCapabilitySet() {
    return { tools: false, toolChoice: false, webSearch: false, functionCalling: false, reasoning: false };
}

function mergeCapabilities(base, override) {
    return { ...base, ...(override || {}) };
}

function getModelOverride(modelId) {
    if (!modelId) return null;
    const direct = MODEL_CAPABILITY_OVERRIDES[modelId];
    if (direct) return direct;

    const lower = String(modelId).toLowerCase();
    const entry = Object.entries(MODEL_CAPABILITY_OVERRIDES).find(([key]) => lower.startsWith(key.toLowerCase()));
    return entry ? entry[1] : null;
}

function detectModelCapabilities(provider, modelId) {
    const normalizedProvider = normalizeProviderName(provider);
    const providerCaps = PROVIDER_CAPABILITIES[normalizedProvider] || PROVIDER_CAPABILITIES.unknown || getDefaultCapabilitySet();
    const metadata = getCurrentModelMetadata(modelId);
    const metadataCaps = Array.isArray(metadata?.caps) ? metadata.caps : [];
    const metadataDerived = {
        tools: metadataCaps.includes("Function Calling") || metadataCaps.includes("Computer Use") || metadataCaps.includes("MCP"),
        toolChoice: metadataCaps.includes("Function Calling") || metadataCaps.includes("Computer Use") || metadataCaps.includes("MCP"),
        webSearch: metadataCaps.includes("Web Search"),
        functionCalling: metadataCaps.includes("Function Calling"),
        reasoning: metadataCaps.includes("Reasoning")
    };

    return mergeCapabilities(
        mergeCapabilities(
            mergeCapabilities(getDefaultCapabilitySet(), providerCaps),
            metadataDerived
        ),
        getModelOverride(modelId)
    );
}

function getProviderWebSearchTool(provider) {
    switch (normalizeProviderName(provider)) {
        case "anthropic":
            return { type: "web_search_20250305", name: "web_search" };
        case "google":
            return { google_search: {} };
        case "zhipu":
            return { type: "web_search", web_search: { enable: true } };
        default:
            return { type: "web_search" };
    }
}

function sanitizeTools(tools, capabilities) {
    if (!capabilities?.tools || !Array.isArray(tools) || !tools.length) return undefined;
    const sanitized = tools.filter((tool) => tool && typeof tool === "object");
    return sanitized.length ? sanitized : undefined;
}

function sanitizeToolChoice(toolChoice, capabilities, provider) {
    if (!capabilities?.toolChoice || !toolChoice) return undefined;
    return normalizeProviderName(provider) === "anthropic"
        ? { type: "auto" }
        : "auto";
}

function validateCapabilities(payload, capabilities) {
    if (!capabilities?.tools) delete payload.tools;
    if (!capabilities?.toolChoice) delete payload.tool_choice;
    if (!capabilities?.webSearch && Array.isArray(payload.tools)) {
        payload.tools = payload.tools.filter((tool) => {
            const serialized = JSON.stringify(tool);
            return !/web_search|google_search/i.test(serialized);
        });
        if (!payload.tools.length) delete payload.tools;
    }
    return payload;
}

function buildPlaygroundTools({ provider, capabilities, webSearchEnabled }) {
    const tools = [];

    if (webSearchEnabled && capabilities?.webSearch) {
        tools.push(getProviderWebSearchTool(provider));
    }

    return tools;
}

function buildToolPayload({ provider, model, webSearchEnabled }) {
    const capabilities = detectModelCapabilities(provider, model);
    const tools = sanitizeTools(buildPlaygroundTools({ provider, capabilities, webSearchEnabled }), capabilities);
    const toolChoice = sanitizeToolChoice(tools?.length ? "auto" : undefined, capabilities, provider);

    return validateCapabilities({
        capabilities,
        tools,
        tool_choice: toolChoice
    }, capabilities);
}

function updateWebSearchUi() {
    const btn = refs.pgWebSearchToggle;
    const badge = refs.pgWebSearchBadge;
    if (!btn) return;

    const enabled = Boolean(playgroundToolState.webSearchEnabled);
    btn.classList.toggle("is-active", enabled);
    btn.setAttribute("aria-pressed", String(enabled));
    if (badge) badge.textContent = enabled ? "On" : "Off";
}

function setWebSearchEnabled(enabled) {
    playgroundToolState.webSearchEnabled = Boolean(enabled);
    saveWebSearchPreference(playgroundToolState.webSearchEnabled);
    updateWebSearchUi();
}

function bindToolToggle() {
    refs.pgWebSearchToggle?.addEventListener("click", () => {
        setWebSearchEnabled(!playgroundToolState.webSearchEnabled);
    });
    updateWebSearchUi();
}

function populateModelCombos(models) {
    modelList = models.map((m) => m.id).filter(Boolean);

    const storedModel = loadSelectedPlaygroundModel();
    const nextModel = modelList.includes(activeModel)
        ? activeModel
        : modelList.includes(storedModel)
            ? storedModel
            : modelList[0] || "";

    setActiveModel(nextModel, { persist: nextModel !== storedModel });
    updateWebSearchUi();
}

const PG_STORAGE_KEY = "aiRelayPlayground";

// Lịch sử hội thoại của Playground full (gửi lên API ở định dạng OpenAI).
// Quick Playground KHÔNG dùng mảng này -> vẫn single-turn.
let pgConversation = [];

function countLines(text) {
    if (!text) return 0;
    return String(text).split(/\r?\n/).length;
}

function buildFileWarning(file) {
    if (!file) return "";
    if (file.previewUnavailable && file.sizeBytes > PG_TEXT_FILE_MAX_BYTES) {
        return `File lớn hơn ${formatFileSize(PG_TEXT_FILE_MAX_BYTES)} nên không đọc toàn bộ nội dung trước khi gửi.`;
    }
    if (file.previewUnavailable) {
        return "Đây là file nhị phân hoặc định dạng không hỗ trợ preview nội dung trực tiếp.";
    }
    if (file.wasTruncated) {
        return "Nội dung preview đã được cắt bớt để tránh payload quá lớn khi gửi.";
    }
    return "";
}

function renderGenericFileContent(file) {
    const header = [`[File: ${file.name || "untitled"}]`, `Type: ${file.mimeType || "unknown"}`];
    if (file.sizeText) header.push(`Size: ${file.sizeText}`);
    if (file.lineCount) header.push(`Lines: ${file.lineCount}`);
    const body = file.textContent ? `\n\n${file.textContent}` : "\n\n(Binary file attached; content preview unavailable.)";
    return `${header.join("\n")}${body}`;
}

// Dựng content cho 1 lượt user: có ảnh -> mảng vision; có file -> nhúng nội dung file vào text; không -> chuỗi thường.
function buildUserContent(text, attachments) {
    const imageAttachments = Array.isArray(attachments) ? attachments.filter((a) => a?.kind === "image") : [];
    const fileAttachments = Array.isArray(attachments) ? attachments.filter((a) => a?.kind === "file") : [];
    const fileText = fileAttachments.map(renderGenericFileContent).join("\n\n");
    const finalText = [text, fileText].filter(Boolean).join("\n\n");

    if (imageAttachments.length) {
        const arr = [];
        if (finalText) arr.push({ type: "text", text: finalText });
        imageAttachments.forEach((a) => arr.push({ type: "image_url", image_url: { url: a.dataUrl } }));
        return arr;
    }
    return finalText;
}

// Tách content (chuỗi hoặc mảng vision) -> { text, attachments } để vẽ lại bong bóng chat.
function splitMessageContent(content) {
    if (Array.isArray(content)) {
        let text = "";
        const attachments = [];
        content.forEach((p) => {
            if (p?.type === "text") text = p.text || "";
            else if (p?.type === "image_url" && p.image_url?.url) attachments.push({ kind: "image", dataUrl: p.image_url.url, name: "image" });
        });
        return { text, attachments: attachments.length ? attachments : null };
    }
    return { text: content || "", attachments: null };
}

// Bỏ ảnh khỏi 1 message (dùng khi sessionStorage tràn quota) -> chỉ giữ chữ.
function stripImagesFromMsg(msg) {
    if (!Array.isArray(msg.content)) return msg;
    const text = msg.content.filter((p) => p?.type === "text").map((p) => p.text || "").join("\n");
    return { role: msg.role, content: text, text: msg.text };
}

// Khoá gửi khi đang chờ phản hồi (mỗi playground một cờ riêng)
let sendingMini = false;
let sendingFull = false;

function setSending(fromFull, on) {
    if (fromFull) sendingFull = on; else sendingMini = on;
    const btn = fromFull ? refs.sendBtnFull : refs.sendBtn;
    if (btn) btn.disabled = on;
    const input = fromFull ? refs.chatInputFull : refs.chatInput;
    if (input) input.classList.toggle("is-sending", on);
}

// Lấy số token để hiển thị: ưu tiên total_tokens, nếu không có thì cộng
// prompt_tokens + completion_tokens.
function tokensFromUsage(usage) {
    if (!usage) return null;
    if (Number.isFinite(usage.total_tokens)) return usage.total_tokens;
    const prompt = Number(usage.prompt_tokens) || 0;
    const completion = Number(usage.completion_tokens) || 0;
    const sum = prompt + completion;
    return sum > 0 ? sum : null;
}

// Hội thoại Playground lưu trong SQL (theo tài khoản) -> không mất khi F5, đóng tab hay đăng xuất/đăng nhập lại.
// Chỉ bị xóa khi bấm "Xóa lịch sử". sessionStorage chỉ giữ phần Quick Playground (miniHtml).
let pgSaveBusy = false;
let pgSaveQueued = false;

async function flushPlaygroundToServer() {
    if (pgSaveBusy) { pgSaveQueued = true; return; }
    pgSaveBusy = true;
    try {
        do {
            pgSaveQueued = false;
            const conv = pgConversation.slice();
            try {
                if (conv.length) {
                    await fetch("/api/playground", {
                        method: "PUT",
                        credentials: "same-origin",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ conv })
                    });
                } else {
                    await fetch("/api/playground", { method: "DELETE", credentials: "same-origin" });
                }
            } catch { /* mạng lỗi: lần lưu sau sẽ ghi đè */ }
        } while (pgSaveQueued);
    } finally {
        pgSaveBusy = false;
    }
}

function savePlayground() {
    try {
        const miniHtml = refs.miniResponse ? refs.miniResponse.innerHTML : "";
        sessionStorage.setItem(PG_STORAGE_KEY, JSON.stringify({ miniHtml }));
    } catch { /* ignore */ }
    flushPlaygroundToServer();
}

async function restorePlayground() {
    let data = null;
    try { data = JSON.parse(sessionStorage.getItem(PG_STORAGE_KEY) || "null"); } catch { data = null; }
    if (refs.miniResponse && data?.miniHtml && !data.miniHtml.includes("pg-mini-loading")) {
        refs.miniResponse.innerHTML = data.miniHtml;
    }

    let conv = [];
    try {
        const res = await fetch("/api/playground", { credentials: "same-origin", cache: "no-store" });
        if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json?.conv)) conv = json.conv;
        }
    } catch { /* ignore */ }

    // Người dùng đã gửi tin mới trong lúc đang tải -> không ghi đè
    if (!conv.length || pgConversation.length || !refs.chatMessages) return;
    pgConversation = conv;
    refs.chatMessages.innerHTML = "";
    conv.forEach((m) => {
        const parsed = splitMessageContent(m.content);
        const el = addChatMessage(m.role, parsed.text, { skipSave: true, attachments: m.attachments || parsed.attachments });
        attachMessageActions(el, m);
    });
}

function openImagePreview(src, title = "Ảnh đã gửi") {
    if (!refs.pgImagePreviewModal || !refs.pgImagePreviewImg) return;
    refs.pgImagePreviewImg.src = src;
    refs.pgImagePreviewImg.alt = title;
    if (refs.pgImagePreviewTitle) refs.pgImagePreviewTitle.textContent = title;
    refs.pgImagePreviewModal.hidden = false;
}

function openFilePreview(file) {
    if (!file || !refs.pgFilePreviewModal || !refs.pgFilePreviewBody) return;
    if (refs.pgFilePreviewTitle) refs.pgFilePreviewTitle.textContent = file.name || "Xem file trước khi gửi";
    if (refs.pgFilePreviewMeta) {
        const meta = [file.sizeText, file.lineCount ? `${file.lineCount} dòng` : null, file.mimeType || null]
            .filter(Boolean)
            .join(" · ");
        refs.pgFilePreviewMeta.textContent = meta || "—";
    }
    const warning = buildFileWarning(file);
    if (refs.pgFilePreviewWarning) {
        refs.pgFilePreviewWarning.hidden = !warning;
        refs.pgFilePreviewWarning.textContent = warning;
    }
    refs.pgFilePreviewBody.textContent = file.textContent || "Không có preview nội dung cho file này.";
    refs.pgFilePreviewModal.hidden = false;
}

function closeImagePreview() {
    if (!refs.pgImagePreviewModal) return;
    refs.pgImagePreviewModal.hidden = true;
    if (refs.pgImagePreviewImg) {
        refs.pgImagePreviewImg.removeAttribute("src");
        refs.pgImagePreviewImg.alt = "Ảnh đã gửi";
    }
}

function bindImagePreviewModal() {
    refs.pgImagePreviewClose?.addEventListener("click", closeImagePreview);
    refs.pgImagePreviewModal?.addEventListener("click", (ev) => {
        if (ev.target === refs.pgImagePreviewModal) closeImagePreview();
    });
    refs.pgFilePreviewClose?.addEventListener("click", () => {
        if (refs.pgFilePreviewModal) refs.pgFilePreviewModal.hidden = true;
    });
    refs.pgFilePreviewModal?.addEventListener("click", (ev) => {
        if (ev.target === refs.pgFilePreviewModal) refs.pgFilePreviewModal.hidden = true;
    });
    document.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape" && refs.pgImagePreviewModal && !refs.pgImagePreviewModal.hidden) {
            closeImagePreview();
        }
        if (ev.key === "Escape" && refs.pgFilePreviewModal && !refs.pgFilePreviewModal.hidden) {
            refs.pgFilePreviewModal.hidden = true;
        }
    });
}

function addChatMessage(role, content, opts = false) {
    if (!refs.chatMessages) return null;
    // Tương thích ngược: tham số thứ 3 từng là boolean skipSave
    if (typeof opts === "boolean") opts = { skipSave: opts };
    const { skipSave = false, attachments = null } = opts || {};

    const el = document.createElement("div");
    el.className = `message ${role}`;

    if (Array.isArray(attachments) && attachments.length) {
        const grid = document.createElement("div");
        grid.className = "message-attachments";
        attachments.forEach((a) => {
            if (a?.kind === "image" && a.dataUrl) {
                const img = document.createElement("img");
                img.className = "message-thumb";
                img.src = a.dataUrl;
                img.alt = a.name || "image";
                img.loading = "lazy";
                img.addEventListener("click", () => openImagePreview(a.dataUrl, a.name || "Ảnh đã gửi"));
                grid.appendChild(img);
                return;
            }

            const fileEl = document.createElement("div");
            fileEl.className = "message-file";
            fileEl.innerHTML = `<strong>${escapeHtml(a?.name || "file")}</strong><span>${escapeHtml(a?.sizeText || a?.mimeType || "File")}</span>`;
            grid.appendChild(fileEl);
        });
        el.appendChild(grid);
        if (content) {
            const textEl = document.createElement("div");
            textEl.className = "message-text";
            textEl.textContent = content;
            el.appendChild(textEl);
        }
    } else {
        el.textContent = content;
    }

    refs.chatMessages.appendChild(el);
    refs.chatMessages.scrollTop = refs.chatMessages.scrollHeight;
    if (!skipSave) savePlayground();
    return el;
}

/* --------------------- playground attachments (ảnh/folder) --------------- */

// Attachment đang chờ gửi của Playground full.
let pgAttachmentsData = [];
let pgAttachIdSeq = 0;
const PG_ATTACH_MAX = 16;
const PG_ATTACH_MAX_DIM = 1536;
const PG_TEXT_FILE_MAX_BYTES = 128 * 1024;
const PG_TEXT_FILE_EXTENSIONS = new Set([
    "txt", "md", "markdown", "json", "js", "ts", "tsx", "jsx", "py", "java", "c", "cpp", "cs", "go", "rs",
    "php", "rb", "swift", "kt", "kts", "sql", "xml", "html", "css", "scss", "less", "yaml", "yml", "toml",
    "ini", "cfg", "conf", "csv", "log", "env", "sh", "bat", "ps1"
]);

function formatFileSize(bytes) {
    const size = Number(bytes) || 0;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(name) {
    const value = String(name || "");
    const idx = value.lastIndexOf(".");
    return idx >= 0 ? value.slice(idx + 1).toLowerCase() : "";
}

function isReadableTextFile(file) {
    if (!file) return false;
    if (/^(text\/|application\/(json|xml|javascript))/i.test(file.type || "")) return true;
    return PG_TEXT_FILE_EXTENSIONS.has(getFileExtension(file.name));
}

async function readTextFileAttachment(file) {
    const raw = await file.text();
    const wasTruncated = raw.length > 12000;
    const trimmed = wasTruncated ? `${raw.slice(0, 12000)}\n\n[Truncated: file too long]` : raw;
    return {
        kind: "file",
        id: ++pgAttachIdSeq,
        name: file.name || "file",
        mimeType: file.type || "text/plain",
        sizeBytes: Number(file.size) || 0,
        sizeText: formatFileSize(file.size),
        textContent: trimmed,
        lineCount: countLines(trimmed),
        previewUnavailable: false,
        wasTruncated,
        warning: wasTruncated ? "Preview đã được cắt bớt." : ""
    };
}

async function readGenericFileAttachment(file) {
    const readable = isReadableTextFile(file);
    const sizeBytes = Number(file.size) || 0;
    if (readable && sizeBytes <= PG_TEXT_FILE_MAX_BYTES) {
        return readTextFileAttachment(file);
    }

    const previewUnavailable = !readable || sizeBytes > PG_TEXT_FILE_MAX_BYTES;
    return {
        kind: "file",
        id: ++pgAttachIdSeq,
        name: file.name || "file",
        mimeType: file.type || "application/octet-stream",
        sizeBytes,
        sizeText: formatFileSize(file.size),
        textContent: "",
        lineCount: 0,
        previewUnavailable,
        wasTruncated: false,
        warning: readable && sizeBytes > PG_TEXT_FILE_MAX_BYTES
            ? `File lớn hơn ${formatFileSize(PG_TEXT_FILE_MAX_BYTES)}.`
            : (!readable ? "File này không hỗ trợ preview nội dung." : "")
    };
}

// Đọc 1 file ảnh -> data URL, thu nhỏ nếu vượt PG_ATTACH_MAX_DIM để giảm payload.
function readImageAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error || new Error("read error"));
        reader.onload = () => {
            const dataUrl = String(reader.result || "");
            const img = new Image();
            img.onerror = () => resolve(dataUrl); // không decode được thì giữ nguyên
            img.onload = () => {
                const { width, height } = img;
                const longest = Math.max(width, height);
                // GIF có thể là ảnh động -> giữ nguyên để không mất animation
                if (longest <= PG_ATTACH_MAX_DIM || /image\/gif/i.test(file.type)) {
                    resolve(dataUrl);
                    return;
                }
                const scale = PG_ATTACH_MAX_DIM / longest;
                const canvas = document.createElement("canvas");
                canvas.width = Math.round(width * scale);
                canvas.height = Math.round(height * scale);
                const ctx = canvas.getContext("2d");
                if (!ctx) { resolve(dataUrl); return; }
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                try {
                    resolve(canvas.toDataURL("image/jpeg", 0.85));
                } catch {
                    resolve(dataUrl);
                }
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    });
}

function renderAttachments() {
    const box = refs.pgAttachments;
    if (!box) return;
    box.innerHTML = "";
    if (!pgAttachmentsData.length) { box.hidden = true; return; }
    box.hidden = false;
    pgAttachmentsData.forEach((a) => {
        const item = document.createElement("div");
        item.className = `pg-attachment${a.kind === "file" ? " is-file" : ""}`;
        item.title = a.name || "";

        if (a.kind === "image") {
            const img = document.createElement("img");
            img.src = a.dataUrl;
            img.alt = a.name || "image";
            item.appendChild(img);
            item.addEventListener("click", (ev) => {
                if (ev.target instanceof HTMLElement && ev.target.closest(".pg-attachment-remove")) return;
                openImagePreview(a.dataUrl, a.name || "Ảnh đã tải lên");
            });
        } else {
            if (a.warning) item.classList.add("is-warning");
            const icon = document.createElement("div");
            icon.className = "pg-attachment-fileicon";
            icon.textContent = getFileExtension(a.name || "file").slice(0, 4).toUpperCase() || "FILE";
            item.appendChild(icon);

            const meta = document.createElement("div");
            meta.className = "pg-attachment-filemeta";
            const lineMeta = a.lineCount ? ` · ${a.lineCount} dòng` : "";
            meta.innerHTML = `<strong>${escapeHtml(a.name || "file")}</strong><span>${escapeHtml((a.sizeText || "") + lineMeta)}</span>`;
            if (a.warning) {
                const warn = document.createElement("div");
                warn.className = "pg-attachment-filewarn";
                warn.textContent = a.warning;
                meta.appendChild(warn);
            }
            item.appendChild(meta);
            item.addEventListener("click", (ev) => {
                if (ev.target instanceof HTMLElement && ev.target.closest(".pg-attachment-remove")) return;
                openFilePreview(a);
            });
        }

        const rm = document.createElement("button");
        rm.type = "button";
        rm.className = "pg-attachment-remove";
        rm.setAttribute("aria-label", "Xóa tệp đính kèm");
        rm.textContent = "×";
        rm.addEventListener("click", () => removeAttachment(a.id));
        item.appendChild(rm);

        box.appendChild(item);
    });
}

function removeAttachment(id) {
    pgAttachmentsData = pgAttachmentsData.filter((a) => a.id !== id);
    renderAttachments();
}

function clearAttachments() {
    pgAttachmentsData = [];
    renderAttachments();
}

async function addAttachmentFiles(fileList) {
    const files = [...(fileList || [])];
    if (!files.length) return;

    const room = PG_ATTACH_MAX - pgAttachmentsData.length;
    if (room <= 0) {
        alert(`Chỉ đính kèm tối đa ${PG_ATTACH_MAX} tệp mỗi lần gửi.`);
        return;
    }
    const picked = files.slice(0, room);
    if (files.length > room) {
        alert(`Chỉ thêm ${room} tệp đầu (tối đa ${PG_ATTACH_MAX} tệp mỗi lần gửi).`);
    }

    for (const file of picked) {
        try {
            if (/^image\//i.test(file.type)) {
                const dataUrl = await readImageAsDataUrl(file);
                pgAttachmentsData.push({ kind: "image", id: ++pgAttachIdSeq, name: file.name || "image", dataUrl });
            } else {
                pgAttachmentsData.push(await readGenericFileAttachment(file));
            }
            renderAttachments();
        } catch { /* bỏ qua file lỗi */ }
    }
}

let dropDepth = 0;

function setDropActive(active) {
    refs.pgFullDropzone?.classList.toggle("is-drop-active", active);
    if (refs.pgDropHint) refs.pgDropHint.hidden = !active;
}

function extractFilesFromEntry(entry) {
    return new Promise((resolve) => {
        if (!entry) {
            resolve([]);
            return;
        }

        if (entry.isFile) {
            entry.file((file) => resolve(file ? [file] : []));
            return;
        }

        if (!entry.isDirectory) {
            resolve([]);
            return;
        }

        const reader = entry.createReader();
        const files = [];

        const readBatch = () => {
            reader.readEntries(async (entries) => {
                if (!entries.length) {
                    resolve(files);
                    return;
                }

                for (const child of entries) {
                    files.push(...await extractFilesFromEntry(child));
                }

                readBatch();
            }, () => resolve(files));
        };

        readBatch();
    });
}

async function collectDroppedFiles(dataTransfer) {
    if (!dataTransfer) return [];

    const items = [...(dataTransfer.items || [])];
    const withEntries = items
        .map((item) => (typeof item.webkitGetAsEntry === "function" ? item.webkitGetAsEntry() : null))
        .filter(Boolean);

    if (withEntries.length) {
        const nested = await Promise.all(withEntries.map((entry) => extractFilesFromEntry(entry)));
        return nested.flat().filter(Boolean);
    }

    return [...(dataTransfer.files || [])].filter(Boolean);
}

function toggleAttachMenu(open) {
    const menu = refs.pgAttachMenu;
    const btn = refs.pgAttachBtn;
    if (!menu || !btn) return;
    const next = typeof open === "boolean" ? open : menu.hidden;
    menu.hidden = !next;
    btn.classList.toggle("is-open", next);
    btn.setAttribute("aria-expanded", String(next));
}

function bindAttachments() {
    if (!refs.pgAttachBtn) return;

    refs.pgAttachBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        toggleAttachMenu();
    });
    refs.pgAttachImagesBtn?.addEventListener("click", () => {
        toggleAttachMenu(false);
        refs.pgFileImages?.click();
    });
    refs.pgAttachFolderBtn?.addEventListener("click", () => {
        toggleAttachMenu(false);
        refs.pgFileFolder?.click();
    });
    refs.pgAttachFilesBtn?.addEventListener("click", () => {
        toggleAttachMenu(false);
        refs.pgFileGeneric?.click();
    });

    const onPick = async (inputEl) => {
        await addAttachmentFiles(inputEl.files);
        inputEl.value = ""; // cho phép chọn lại cùng file/thư mục
    };
    refs.pgFileImages?.addEventListener("change", () => onPick(refs.pgFileImages));
    refs.pgFileFolder?.addEventListener("change", () => onPick(refs.pgFileFolder));
    refs.pgFileGeneric?.addEventListener("change", () => onPick(refs.pgFileGeneric));

    // Đóng menu khi click ra ngoài hoặc nhấn Escape
    document.addEventListener("click", (ev) => {
        if (refs.pgAttachMenu && !refs.pgAttachMenu.hidden && !refs.pgAttach?.contains(ev.target)) {
            toggleAttachMenu(false);
        }
    });
    document.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape" && refs.pgAttachMenu && !refs.pgAttachMenu.hidden) toggleAttachMenu(false);
    });

    // Dán ảnh trực tiếp vào ô nhập (Ctrl+V)
    refs.chatInputFull?.addEventListener("paste", (ev) => {
        const items = ev.clipboardData?.items;
        if (!items) return;
        const imgs = [...items].filter((it) => /^image\//i.test(it.type)).map((it) => it.getAsFile()).filter(Boolean);
        if (imgs.length) { ev.preventDefault(); addAttachmentFiles(imgs); }
    });

    const dropzone = refs.pgFullDropzone;
    if (dropzone) {
        dropzone.addEventListener("dragenter", (ev) => {
            ev.preventDefault();
            dropDepth += 1;
            setDropActive(true);
        });

        dropzone.addEventListener("dragover", (ev) => {
            ev.preventDefault();
            if (ev.dataTransfer) ev.dataTransfer.dropEffect = "copy";
            setDropActive(true);
        });

        dropzone.addEventListener("dragleave", (ev) => {
            ev.preventDefault();
            dropDepth = Math.max(0, dropDepth - 1);
            if (dropDepth === 0) setDropActive(false);
        });

        dropzone.addEventListener("drop", async (ev) => {
            ev.preventDefault();
            dropDepth = 0;
            setDropActive(false);
            const files = await collectDroppedFiles(ev.dataTransfer);
            if (files.length) await addAttachmentFiles(files);
        });
    }
}

async function resolveChatTarget() {
    const entry = await window.ensureApiConfigEntry();

    const token = entry?.token || "";
    const base = String(entry?.url || "").trim().replace(/\/+$/, "");

    if (!token || !base) {
        throw new Error("Chưa có cấu hình API (url + token) hợp lệ để gửi yêu cầu.");
    }
    return { url: `${base}/chat/completions`, token, entry };
}

async function streamChatCompletion(payload, onDelta) {
    const { url, token } = await resolveChatTarget();

    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "text/event-stream",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok || !response.body) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Request failed with status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";
    let usage = null;

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (!data || data === "[DONE]") continue;

            try {
                const json = JSON.parse(data);
                if (json?.usage) usage = json.usage;   // chunk cuối chứa usage
                const delta = json?.choices?.[0]?.delta?.content
                    || json?.choices?.[0]?.message?.content
                    || "";
                if (delta) {
                    full += delta;
                    onDelta(full);
                }
            } catch { /* mảnh JSON chưa hoàn chỉnh, bỏ qua */ }
        }
    }

    return { content: full, usage };
}

/* ------------------- Playground: Thử lại / Chỉnh sửa / Sao chép ------------------- */

const MSG_ICONS = {
    retry: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>',
    edit: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>',
};

// Chữ gốc người dùng đã gõ ở 1 lượt user (dùng để sao chép / chỉnh sửa)
function getMessageText(msg) {
    if (!msg) return "";
    if (typeof msg.text === "string") return msg.text;
    return splitMessageContent(msg.content).text || "";
}

async function copyTextToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        // Trang http (không phải localhost) hoặc bị chặn clipboard -> dùng cách cũ
        const area = document.createElement("textarea");
        area.value = text;
        area.style.cssText = "position:fixed;opacity:0;left:-9999px";
        document.body.appendChild(area);
        area.select();
        let ok = false;
        try { ok = document.execCommand("copy"); } catch { ok = false; }
        area.remove();
        return ok;
    }
}

// Xóa bong bóng (và thanh nút của nó) từ phần tử "from" trở xuống cuối khung chat
function removeChatFrom(from, { includeSelf = true } = {}) {
    if (!from) return;
    let node = includeSelf ? from : from.nextElementSibling;
    while (node) {
        const next = node.nextElementSibling;
        node.remove();
        node = next;
    }
}

// Gắn thanh nút dưới bong bóng: user = Thử lại / Chỉnh sửa / Sao chép, assistant = Thử lại / Sao chép
function attachMessageActions(el, msg) {
    if (!el || !msg || !refs.chatMessages) return;
    const isUser = msg.role === "user";

    const bar = document.createElement("div");
    bar.className = `message-actions ${isUser ? "user" : "assistant"}`;
    const buttons = [["retry", "Thử lại"]];
    if (isUser) buttons.push(["edit", "Chỉnh sửa"]);
    buttons.push(["copy", "Sao chép"]);
    bar.innerHTML = buttons
        .map(([key, label]) => `<button type="button" class="message-action" data-action="${key}" title="${label}" aria-label="${label}">${MSG_ICONS[key]}</button>`)
        .join("");

    bar._bubble = el;
    bar._msg = msg;
    el._msg = msg;
    el._bar = bar;
    el.after(bar);
}

// Chạy lại từ vị trí hiện tại của hội thoại: pgConversation đã được cắt đúng, bong bóng thừa đã bị xóa
async function resendConversation() {
    if (sendingFull) return;
    const model = activeModel || refs.chatModel?.value || refs.chatModelFull?.value;
    if (!model) return;
    const useStream = Boolean(refs.streamModeFull?.checked);

    setSending(true, true);
    const last = pgConversation.at(-1);
    savePlayground();
    return runTurn(true, model, useStream, last?.content);
}

function retryFromMessage(bar) {
    if (sendingFull) return;
    const { _bubble: bubble, _msg: msg } = bar;
    const idx = pgConversation.indexOf(msg);

    if (msg.role === "user") {
        // Lượt user vừa lỗi đã bị bỏ khỏi hội thoại (idx < 0) -> thêm lại. Còn lại: giữ nó, bỏ mọi thứ phía sau.
        if (idx < 0) pgConversation.push(msg); else pgConversation.length = idx + 1;
        removeChatFrom(bar, { includeSelf: false });
    } else {
        if (idx < 0) return;
        pgConversation.length = idx;     // bỏ câu trả lời này và mọi thứ sau nó
        removeChatFrom(bubble);
    }
    resendConversation();
}

function startEditMessage(bar) {
    if (sendingFull) return;
    const { _bubble: bubble, _msg: msg } = bar;
    if (bubble.dataset.editing === "1") return;
    bubble.dataset.editing = "1";

    // Bản sao tệp đính kèm để sửa: có thể xóa ảnh cũ hoặc thêm ảnh mới
    let editAtts = (msg.attachments || []).slice();

    const editor = document.createElement("div");
    editor.className = "message-editor";
    const attBox = document.createElement("div");
    attBox.className = "message-editor__attachments";
    const area = document.createElement("textarea");
    area.className = "message-editor__input";
    area.value = getMessageText(msg);
    area.rows = Math.min(8, Math.max(2, area.value.split("\n").length));
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.multiple = true;
    fileInput.hidden = true;
    const row = document.createElement("div");
    row.className = "message-editor__buttons";
    row.innerHTML = `<button type="button" class="message-editor__add">+ Thêm ảnh</button><span class="message-editor__spacer"></span><button type="button" class="message-editor__cancel">Hủy</button><button type="button" class="message-editor__save">Lưu và gửi</button>`;
    editor.append(attBox, area, fileInput, row);

    const renderEditAtts = () => {
        attBox.innerHTML = "";
        attBox.hidden = !editAtts.length;
        editAtts.forEach((a, i) => {
            const item = document.createElement("div");
            item.className = "message-editor__att";
            if (a.kind === "image" && a.dataUrl) {
                const img = document.createElement("img");
                img.src = a.dataUrl;
                img.alt = a.name || "image";
                item.appendChild(img);
            } else {
                const name = document.createElement("span");
                name.className = "message-editor__attname";
                name.textContent = a.name || "file";
                item.appendChild(name);
            }
            const rm = document.createElement("button");
            rm.type = "button";
            rm.className = "message-editor__attrm";
            rm.title = "Xóa";
            rm.setAttribute("aria-label", "Xóa");
            rm.textContent = "×";
            rm.addEventListener("click", () => { editAtts.splice(i, 1); renderEditAtts(); });
            item.appendChild(rm);
            attBox.appendChild(item);
        });
    };
    renderEditAtts();

    bubble.hidden = true;
    bar.hidden = true;
    bubble.before(editor);
    area.focus();
    area.setSelectionRange(area.value.length, area.value.length);

    const close = () => {
        editor.remove();
        bubble.hidden = false;
        bar.hidden = false;
        delete bubble.dataset.editing;
    };

    row.querySelector(".message-editor__add").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async () => {
        const files = [...fileInput.files].filter((f) => /^image\//i.test(f.type));
        fileInput.value = "";
        for (const file of files) {
            if (editAtts.length >= PG_ATTACH_MAX) { alert(`Chỉ đính kèm tối đa ${PG_ATTACH_MAX} tệp mỗi lần gửi.`); break; }
            try {
                const dataUrl = await readImageAsDataUrl(file);
                editAtts.push({ kind: "image", id: ++pgAttachIdSeq, name: file.name || "image", dataUrl });
            } catch { /* bỏ qua ảnh lỗi */ }
        }
        renderEditAtts();
    });
    area.addEventListener("paste", async (ev) => {
        const imgs = [...(ev.clipboardData?.items || [])].filter((it) => /^image\//i.test(it.type)).map((it) => it.getAsFile()).filter(Boolean);
        if (!imgs.length) return;
        ev.preventDefault();
        for (const file of imgs) {
            if (editAtts.length >= PG_ATTACH_MAX) break;
            try { editAtts.push({ kind: "image", id: ++pgAttachIdSeq, name: file.name || "image", dataUrl: await readImageAsDataUrl(file) }); } catch { /* ignore */ }
        }
        renderEditAtts();
    });
    row.querySelector(".message-editor__cancel").addEventListener("click", close);
    area.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape") { ev.preventDefault(); close(); }
        if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); row.querySelector(".message-editor__save").click(); }
    });
    row.querySelector(".message-editor__save").addEventListener("click", () => {
        const newText = area.value.trim();
        const attachments = editAtts.length ? editAtts.slice() : null;
        if (!newText && !attachments) return;   // không gửi tin rỗng

        const idx = pgConversation.indexOf(msg);
        if (idx >= 0) pgConversation.length = idx;   // bỏ lượt cũ và mọi thứ sau nó
        // (idx < 0: lượt này vừa lỗi nên đã không còn trong hội thoại)

        const newMsg = { role: "user", content: buildUserContent(newText, attachments), text: newText, attachments };
        editor.remove();
        removeChatFrom(bubble);                       // xóa bong bóng cũ + mọi thứ phía sau
        const newEl = addChatMessage("user", newText, { attachments, skipSave: true });
        attachMessageActions(newEl, newMsg);
        pgConversation.push(newMsg);
        resendConversation();
    });
}

async function copyMessage(bar, button) {
    const { _msg: msg } = bar;
    const text = msg.role === "user" ? getMessageText(msg) : (typeof msg.content === "string" ? msg.content : splitMessageContent(msg.content).text);
    const ok = await copyTextToClipboard(text);
    const original = button.innerHTML;
    button.innerHTML = MSG_ICONS.check;
    button.title = ok ? "Đã sao chép" : "Không sao chép được";
    button.classList.toggle("is-done", ok);
    window.setTimeout(() => {
        button.innerHTML = original;
        button.title = "Sao chép";
        button.classList.remove("is-done");
    }, 1500);
}

function bindMessageActions() {
    refs.chatMessages?.addEventListener("click", (ev) => {
        const button = ev.target.closest(".message-action");
        const bar = button?.closest(".message-actions");
        if (!button || !bar || !bar._msg) return;
        const action = button.dataset.action;
        if (action === "copy") copyMessage(bar, button);
        else if (action === "retry") retryFromMessage(bar);
        else if (action === "edit") startEditMessage(bar);
    });
}

async function doSend(fromFull) {
    // Chặn gửi tiếp khi request trước chưa trả về (tránh chồng request gây lỗi)
    if (fromFull ? sendingFull : sendingMini) return;

    const input = fromFull ? refs.chatInputFull : refs.chatInput;
    const content = input?.value.trim();
    const model = activeModel || refs.chatModel?.value || refs.chatModelFull?.value;
    // Ảnh đính kèm chỉ áp dụng cho Playground full
    const attachments = fromFull ? pgAttachmentsData.slice() : [];
    if ((!content && !attachments.length) || !model) return;

    // Quick Playground (mini) luôn stream; Playground full theo checkbox
    const useStream = fromFull ? Boolean(refs.streamModeFull?.checked) : true;

    setSending(fromFull, true);
    input.value = "";
    autoResize(input);

    // Có ảnh -> định dạng vision OpenAI (mảng); không -> chuỗi thường
    const messageContent = buildUserContent(content, attachments);

    if (fromFull) {
        const userMsg = { role: "user", content: messageContent, text: content, attachments: attachments.length ? attachments : null };
        const userEl = addChatMessage("user", content, { attachments: userMsg.attachments, skipSave: true });
        attachMessageActions(userEl, userMsg);
        clearAttachments();
        pgConversation.push(userMsg);
        savePlayground();   // lưu ngay lượt user (kèm ảnh) để F5 không mất ngữ cảnh
    } else if (refs.miniResponse) {
        refs.miniResponse.innerHTML = `<div class="pg-mini-loading">Đang tạo phản hồi...</div>`;
    }

    return runTurn(fromFull, model, useStream, messageContent);
}

// Lấy câu lỗi thật từ phản hồi của API. Lỗi hay bị bọc nhiều lớp JSON, ví dụ
// {"error":{"message":"{\"error\":{\"message\":\"No endpoints found that support image input\"}}"}}
function extractApiErrorMessage(raw) {
    let value = raw;
    for (let i = 0; i < 4; i++) {
        if (typeof value === "string") {
            const trimmed = value.trim();
            if (!/^[{\[]/.test(trimmed)) return trimmed;
            try { value = JSON.parse(trimmed); } catch { return trimmed; }
        } else if (value && typeof value === "object") {
            const next = value.error?.message ?? value.error ?? value.message ?? value.detail;
            if (next === undefined || next === null) return "";
            value = next;
        } else {
            return "";
        }
    }
    return typeof value === "string" ? value.trim() : "";
}

// Nội dung hiện trong khung chat khi gửi thất bại: nói rõ lý do thay vì câu chung chung
function describeChatError(error) {
    const detail = extractApiErrorMessage(error?.message || "");
    const shortDetail = detail.length > 300 ? `${detail.slice(0, 300)}…` : detail;

    if (/image input|support(s|ed)? image|image[_ ]?url|vision|multimodal|does not support images?/i.test(detail)) {
        return `Model này không hỗ trợ ảnh. Hãy chọn model có hỗ trợ ảnh (vision) hoặc gửi lại mà không kèm ảnh.`;
    }
    if (shortDetail) return `Không thể gửi yêu cầu: ${shortDetail}`;
    return "Không thể gửi yêu cầu. Vui lòng thử lại.";
}

// Gửi yêu cầu cho lượt hiện tại và vẽ câu trả lời. Dùng chung cho gửi mới, Thử lại và Chỉnh sửa.
// (setSending(fromFull, true) đã được gọi trước khi vào đây.)
async function runTurn(fromFull, model, useStream, messageContent) {
    // Playground full: gửi cả lịch sử hội thoại (multi-turn, AI nhớ ảnh + ngữ cảnh).
    // Quick Playground: chỉ gửi 1 tin hiện tại (single-turn).
    // Chỉ gửi role + content lên API (các trường phụ như text/attachments chỉ để dùng phía giao diện).
    const messages = fromFull
        ? pgConversation.map(({ role, content }) => ({ role, content }))
        : [{ role: "user", content: messageContent }];
    const { entry } = await resolveChatTarget();
    const provider = resolveProviderForEntry(entry, model);
    const toolPayload = buildToolPayload({
        provider,
        model,
        webSearchEnabled: fromFull && playgroundToolState.webSearchEnabled
    });
    const payload = { model, stream: useStream, messages };
    if (toolPayload.tools) payload.tools = toolPayload.tools;
    if (toolPayload.tool_choice) payload.tool_choice = toolPayload.tool_choice;
    // Yêu cầu upstream trả usage trong chunk cuối khi stream (OpenAI-compatible)
    if (useStream) payload.stream_options = { include_usage: true };
    const started = Date.now();
    // Hiện ngay dòng "đang xử lý" + đếm latency realtime ở Request History
    if (fromFull) startPendingLog(model, payload);
    const assistantEl = fromFull ? addChatMessage("assistant", "Đang tạo phản hồi...", { skipSave: true }) : null;
    if (assistantEl) assistantEl.classList.add("is-loading");

    const setOutput = (text) => {
        if (fromFull && assistantEl) {
            assistantEl.classList.remove("is-loading");
            assistantEl.textContent = text;
            refs.chatMessages.scrollTop = refs.chatMessages.scrollHeight;
        } else if (refs.miniResponse) {
            refs.miniResponse.textContent = text;
            refs.miniResponse.scrollTop = refs.miniResponse.scrollHeight;
        }
    };

    // Chốt 1 lượt: cập nhật bong bóng + lưu hội thoại.
    // ok=true: thêm câu trả lời vào lịch sử. ok=false: bỏ lượt user vừa thêm để câu
    // sau không kéo theo lỗi (vd ảnh mà model không hỗ trợ vision).
    const finishTurn = (text, ok) => {
        setOutput(text);
        if (fromFull) {
            if (ok) {
                const assistantMsg = { role: "assistant", content: text, attachments: null };
                pgConversation.push(assistantMsg);
                if (assistantEl) attachMessageActions(assistantEl, assistantMsg);
            } else if (pgConversation.at(-1)?.role === "user") {
                pgConversation.pop();
            }
        }
        savePlayground();
    };

    try {
        if (useStream) {
            const { content: text, usage } = await streamChatCompletion(payload, setOutput);
            const latency = Date.now() - started;
            finishTurn(text || "(không có nội dung)", true);
            const tokens = tokensFromUsage(usage);
            pushLog({ time: nowTime(), model, tokens, latency, ok: true, request: payload, response: { streamed: true, content: text, usage } }, fromFull);
        } else {
            const { url, token } = await resolveChatTarget();
            const resp = await fetch(url, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!resp.ok) {
                const t = await resp.text().catch(() => "");
                throw new Error(t || `Request failed with status ${resp.status}`);
            }
            const data = await resp.json();
            const latency = Date.now() - started;
            const text = data?.choices?.[0]?.message?.content || "(không có nội dung)";
            const tokens = tokensFromUsage(data?.usage);
            finishTurn(text, true);
            pushLog({ time: nowTime(), model, tokens, latency, ok: true, request: payload, response: data }, fromFull);
        }
    } catch (error) {
        const latency = Date.now() - started;
        finishTurn(describeChatError(error), false);
        pushLog({ time: nowTime(), model, tokens: null, latency, ok: false, request: payload, response: { error: error.message || String(error) } }, fromFull);
    } finally {
        setSending(fromFull, false);
    }
}

function bindPlayground() {
    wireCombo(refs.chatModel, refs.comboListMini, refs.comboMini);
    wireCombo(refs.chatModelFull, refs.comboListFull, refs.comboFull);
    bindToolToggle();

    const wire = (input, btn, fromFull) => {
        input?.addEventListener("input", () => autoResize(input));
        input?.addEventListener("keydown", (ev) => {
            if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); doSend(fromFull); }
        });
        btn?.addEventListener("click", () => doSend(fromFull));
    };
    wire(refs.chatInput, refs.sendBtn, false);
    wire(refs.chatInputFull, refs.sendBtnFull, true);
    bindAttachments();
    bindMessageActions();
}

/* ------------------------------ navigation ------------------------------- */

let profileHydrated = false;

async function activatePanel(panelId) {
    document.querySelectorAll(".console-nav-item[data-panel]").forEach((i) => {
        i.classList.toggle("is-active", i.dataset.panel === panelId);
    });
    document.querySelectorAll(".console-panel").forEach((p) => p.classList.remove("is-active"));
    document.getElementById(panelId)?.classList.add("is-active");
    refs.sidebar?.classList.remove("is-open");

    if (panelId === "apiKeysPanel") {
        await refreshKeysFromServer();
    }

    if (panelId === "profilePanel" && !profileHydrated && typeof window.hydrateProfilePage === "function") {
        profileHydrated = true;
        window.hydrateProfilePage();
    }
}

function bindNav() {
    document.querySelectorAll(".console-nav-item[data-panel]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            await activatePanel(btn.dataset.panel);
        });
    });

    refs.mobileToggle?.addEventListener("click", () => refs.sidebar?.classList.toggle("is-open"));

    refs.refreshBtn?.addEventListener("click", async () => {
        refs.refreshBtn.classList.add("is-loading");
        try { await hydrateDashboard(); } finally { refs.refreshBtn.classList.remove("is-loading"); }
    });

    refs.settingsTheme?.addEventListener("click", () => {
        const cur = window.AppState.getSetting("theme");
        const next = cur === "dark" ? "light" : "dark";
        if (typeof window.applyTheme === "function") window.applyTheme(next);   // lưu vào SQL
    });
    refs.settingsLogout?.addEventListener("click", () => {
        if (typeof window.logout === "function") window.logout();
        else { window.location.href = "/login"; }
    });
}

/* --------------------------------- init ---------------------------------- */

function setStatsLoading() {
    [refs.statBalance, refs.statKeys, refs.statUsage, refs.statModels].forEach((el) => {
        if (el) el.innerHTML = `<span class="sk"></span>`;
    });
}

async function resolveApiBase() {
    const entry = await window.ensureApiConfigEntry();
    const token = entry?.token || "";
    const base = String(entry?.url || "").trim().replace(/\/+$/, "");
    return base && token ? { base, token } : null;
}

async function fetchConfigJson(path, token) {
    const resp = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
    if (!resp.ok) throw new Error(`Request failed with status ${resp.status}`);
    return resp.json();
}

async function loadBilling() {
    try {
        const target = await resolveApiBase();
        if (!target) throw new Error("no config");

        const year = new Date().getFullYear();
        const usageQuery = `?start_date=2024-01-01&end_date=${year}-12-31`;

        const [subscription, usage] = await Promise.all([
            fetchConfigJson(`${target.base}/dashboard/billing/subscription`, target.token),
            fetchConfigJson(`${target.base}/dashboard/billing/usage${usageQuery}`, target.token),
        ]);
        renderStatsFromBilling(subscription, usage);
    } catch {
        renderBalance(0);
        if (refs.statUsage) refs.statUsage.textContent = "—";
    }
}

async function loadModels() {
    try {
        const result = await window.fetchSharedModels(true);
        const models = result.models || [];
        renderModelsStat(models.length);
        populateModelCombos(models);
    } catch {
        renderModelsStat(0);
    }
}

async function hydrateDashboard() {
    setStatsLoading();
    try { await window.AppState.ensureKeys(); } catch { /* ignore */ }

    // Tuỳ chọn Playground (đã lưu trong SQL)
    playgroundToolState.webSearchEnabled = loadWebSearchPreference();
    updateWebSearchUi();
    await loadHistoryFromServer();

    renderKeysStat();
    if (!keysDirty) { syncDraftFromConfig(); setKeysDirty(false); }
    renderKeys();
    renderAccount();
    renderActivity();
    renderHistory();
    if (typeof window.applyUserProfile === "function") window.applyUserProfile();
    await Promise.all([loadBilling(), loadModels()]);
}

const HASH_PANELS = { profile: "profilePanel" };

function openPanelFromHash() {
    const panelId = HASH_PANELS[window.location.hash.replace("#", "")];
    if (panelId) activatePanel(panelId);
}

function initConsole() {
    refreshDashboardRefs();
    loadStoredLogs();
    bindNav();
    bindPlayground();
    bindKeysEvents();
    bindHistoryEvents();
    bindImagePreviewModal();
    restorePlayground();
    autoResize(refs.chatInput);
    autoResize(refs.chatInputFull);
    openPanelFromHash();
    window.addEventListener("hashchange", openPanelFromHash);
}

window.refreshDashboardRefs = refreshDashboardRefs;
window.initConsole = initConsole;
window.hydrateDashboard = hydrateDashboard;
