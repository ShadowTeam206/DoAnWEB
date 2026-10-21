const profileState = {
    data: null,
    loading: false,
    showApiKey: false,
    toastTimers: new Set(),
};

const profileRefs = {};

const PROFILE_MOCK_DATA = {
    meta: {
        source: "mock",
        live: false,
    },
    user: {
        id: "usr_01H8Q72NAX9R2M61ZV4P1S9Q6M",
        displayName: "Nguyễn Văn A",
        username: "nguyenvana",
        email: "nguyenvana@workspace.ai",
        joinedAt: "2026-06-01T09:15:00Z",
        role: "Owner",
        plan: "Pro",
        status: "Active",
        avatar: "",
        lastLoginAt: "2026-06-11T14:20:00Z",
        lastSeenText: "Seen 2 minutes ago",
    },
    stats: [
        {
            key: "requests",
            label: "Tổng API Requests",
            value: "12,482,190",
            subtext: "Khối lượng request 30 ngày gần nhất.",
            icon: "activity",
        },
        {
            key: "tokens",
            label: "Tổng Token đã dùng",
            value: "1.68B",
            subtext: "Bao gồm tất cả models đã gọi qua gateway.",
            icon: "layers",
        },
        {
            key: "models",
            label: "Số Model đã sử dụng",
            value: "18",
            subtext: "Đã dùng trên 4 nhà cung cấp khác nhau.",
            icon: "sparkles",
        },
        {
            key: "spend",
            label: "Chi phí ước tính",
            value: "$842.40",
            subtext: "Ước tính theo usage gần nhất của workspace.",
            icon: "wallet",
        },
        {
            key: "lastLogin",
            label: "Lần đăng nhập gần nhất",
            value: "2 phút trước",
            subtext: "Thiết bị hiện tại: Windows · Chrome.",
            icon: "clock",
        },
        {
            key: "apiKeys",
            label: "API Keys hiện có",
            value: "3",
            subtext: "2 key production, 1 key staging.",
            icon: "key",
        },
    ],
    account: {
        displayName: "Nguyễn Văn A",
        username: "nguyenvana",
        email: "nguyenvana@workspace.ai",
        userId: "usr_01H8Q72NAX9R2M61ZV4P1S9Q6M",
        joinDate: "01/06/2026",
        role: "Owner",
        plan: "Pro",
        accountStatus: "Active",
    },
    api: {
        maskedKey: "sk-********************V9K2",
        fullKey: "sk-live-3kj91akd82jj2q8wkk4v6v9k2",
        createdAt: "03/06/2026 · 09:12",
        lastUsedAt: "11/06/2026 · 14:20",
        scopes: "models.read, usage.read, chat.write",
        environment: "Production",
    },
    billing: {
        currentPlan: "Pro",
        expiresAt: "01/07/2026",
        cycle: "Monthly",
        totalSpend: "$2,418.70",
        seats: "08 thành viên",
        paymentMethod: "Visa ending in 1188",
    },
    security: {
        twoFactorEnabled: false,
        currentSession: "Windows · Chrome · Hồ Chí Minh",
        passwordUpdatedAt: "08/06/2026 · 23:18",
        recoveryEmail: "security@workspace.ai",
    },
    devices: [
        {
            name: "Windows 11 · Chrome",
            detail: "Hiện tại · Hồ Chí Minh · IP 113.161.xxx.xxx",
            tag: "Current session",
            tone: "success",
        },
        {
            name: "MacBook Pro · Safari",
            detail: "Hôm qua · Singapore · IP 103.18.xxx.xxx",
            tag: "Trusted device",
            tone: "muted",
        },
        {
            name: "iPhone 15 Pro · Mobile Safari",
            detail: "3 ngày trước · Hồ Chí Minh · IP 27.72.xxx.xxx",
            tag: "Recent mobile",
            tone: "muted",
        },
    ],
    activity: [
        {
            type: "login",
            title: "Đăng nhập thành công",
            description: "Phiên đăng nhập mới được mở từ Windows 11 · Chrome.",
            time: "2 phút trước",
        },
        {
            type: "key",
            title: "Tạo API Key mới",
            description: "Đã tạo key production mới cho environment live.",
            time: "Hôm qua · 09:12",
        },
        {
            type: "model",
            title: "Sử dụng GPT-5.5",
            description: "Request batch đã được gửi qua gateway với chế độ streaming.",
            time: "Hôm qua · 08:41",
        },
        {
            type: "billing",
            title: "Nâng cấp gói dịch vụ",
            description: "Workspace đã được nâng từ Starter lên Pro Monthly.",
            time: "05/06/2026",
        },
        {
            type: "security",
            title: "Thay đổi mật khẩu",
            description: "Mật khẩu tài khoản đã được cập nhật thành công.",
            time: "03/06/2026",
        },
    ],
};

function refreshProfileRefs() {
    profileRefs.skeleton = document.getElementById("profileSkeleton");
    profileRefs.content = document.getElementById("profileContent");
    profileRefs.errorState = document.getElementById("profileErrorState");
    profileRefs.errorMessage = document.getElementById("profileErrorMessage");
    profileRefs.retryBtn = document.getElementById("profileRetryBtn");
    profileRefs.toastStack = document.getElementById("profileToastStack");
    profileRefs.heroAvatar = document.getElementById("profileHeroAvatar");
    profileRefs.displayName = document.getElementById("profileDisplayName");
    profileRefs.username = document.getElementById("profileUsername");
    profileRefs.emailLink = document.getElementById("profileEmailLink");
    profileRefs.joinedText = document.getElementById("profileJoinedText");
    profileRefs.planText = document.getElementById("profilePlanText");
    profileRefs.billingCycleText = document.getElementById("profileBillingCycleText");
    profileRefs.statusText = document.getElementById("profileStatusText");
    profileRefs.lastSeenText = document.getElementById("profileLastSeenText");
    profileRefs.dataModeBadge = document.getElementById("profileDataModeBadge");
    profileRefs.statsGrid = document.getElementById("profileStatsGrid");
    profileRefs.accountDetails = document.getElementById("profileAccountDetails");
    profileRefs.apiKeyValue = document.getElementById("profileApiKeyValue");
    profileRefs.apiDetails = document.getElementById("profileApiDetails");
    profileRefs.billingSummary = document.getElementById("profileBillingSummary");
    profileRefs.securitySummary = document.getElementById("profileSecuritySummary");
    profileRefs.deviceList = document.getElementById("profileDeviceList");
    profileRefs.deviceCount = document.getElementById("profileDeviceCount");
    profileRefs.logoutAllDevicesBtn = document.getElementById("logoutAllDevicesBtn");
    profileRefs.activityList = document.getElementById("profileActivityList");
    profileRefs.toggleApiKeyBtn = document.getElementById("toggleApiKeyBtn");
    profileRefs.copyApiKeyBtn = document.getElementById("copyApiKeyBtn");
    profileRefs.regenerateApiKeyBtn = document.getElementById("regenerateApiKeyBtn");
    profileRefs.profileMenuProfile = document.getElementById("profileMenuProfile");
    profileRefs.profileMenuLogout = document.getElementById("profileMenuLogout");
}

// Profile of the logged-in account (login response + users row), loaded from SQL by state.js
function getStoredProfilePagePayload() {
    return window.AppState?.getPayload() || null;
}

function getProfileAvatarInitials(name = "") {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "AI";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function normalizeDate(dateLike, fallback = "—") {
    if (!dateLike) return fallback;
    const date = new Date(dateLike);
    if (Number.isNaN(date.getTime())) return String(dateLike);
    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(date);
}

function formatDateTime(dateLike, fallback = "—") {
    if (!dateLike) return fallback;
    const date = new Date(dateLike);
    if (Number.isNaN(date.getTime())) return String(dateLike);
    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function firstPresent(...values) {
    return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
}

function asObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function buildProfileFromStoredPayload(payload = null) {
    const source = asObject(payload);
    const loginPayload = asObject(source.login || source);
    const root = asObject(loginPayload.data || source.data || loginPayload);
    const user = asObject(root.user || loginPayload.user || source.user || root);
    const userId = firstPresent(
        user.id,
        user.user_id,
        user.userId,
        user.uid,
        root.id,
        root.user_id,
        root.userId,
        root.uid,
        loginPayload.id,
        loginPayload.user_id,
        loginPayload.userId,
        source.id,
        source.user_id,
        source.userId
    ) || "usr_local_profile";
    const displayName = [
        user.nickname,
        user.name,
        user.full_name,
        user.fullName,
        user.username,
        user.user_name,
        user.email,
        root.nickname,
        root.username,
    ].find((value) => typeof value === "string" && value.trim()) || "Người dùng AI STORE";
    const username = firstPresent(user.username, user.user_name, root.username, root.user_name, userId, "workspace");
    const email = firstPresent(user.email, root.email, loginPayload.email, source.email, "workspace@example.com");
    const vip = user.vip || root.vip || {};
    const plan = window.aiRelayUnlimited ? "VIP_SSS" : (user.plan || root.plan || (vip?.expire_at ? "Member" : "Free"));
    const status = user.status || root.status || (vip?.expire_at ? "Active" : "Standard");
    const joinedAt = user.created_at || user.createdAt || user.joinedAt || root.created_at || root.createdAt || new Date().toISOString();
    // Primary API key = first enabled key stored in SQL
    const primaryKey = window.AppState?.getPrimaryEntry() || null;
    const apiKey = primaryKey?.token || "";
    const keyCount = window.AppState?.getKeyCount() || 0;

    return {
        meta: {
            source: "stored",
            live: true,
        },
        user: {
            id: userId,
            displayName,
            username,
            email,
            joinedAt,
            role: user.role || root.role || "Member",
            plan,
            status,
            avatar: user.avatar || root.avatar || "",
            lastLoginAt: new Date().toISOString(),
            lastSeenText: "Seen just now",
        },
        stats: [
            {
                key: "requests",
                label: "Tổng API Requests",
                value: root.total_requests || root.requests || "—",
                subtext: "Cần gắn endpoint usage backend để hiển thị realtime.",
                icon: "activity",
            },
            {
                key: "tokens",
                label: "Tổng Token đã dùng",
                value: root.total_tokens || root.tokens || "—",
                subtext: "TODO: bind dữ liệu token từ API usage khi backend sẵn sàng.",
                icon: "layers",
            },
            {
                key: "models",
                label: "Số Model đã sử dụng",
                value: root.models_used || root.model_count || "—",
                subtext: "Tổng số model đã tương tác qua relay.",
                icon: "sparkles",
            },
            {
                key: "spend",
                label: "Chi phí ước tính",
                value: root.estimated_cost || "—",
                subtext: "TODO: tích hợp dữ liệu billing thực từ backend.",
                icon: "wallet",
            },
            {
                key: "lastLogin",
                label: "Lần đăng nhập gần nhất",
                value: formatDateTime(new Date().toISOString()),
                subtext: "Phiên đăng nhập được lấy từ local profile hiện tại.",
                icon: "clock",
            },
            {
                key: "apiKeys",
                label: "API Keys hiện có",
                value: String(keyCount),
                subtext: keyCount ? "Các API key đang bật của workspace hiện tại." : "Chưa có API key nào được lưu.",
                icon: "key",
            },
        ],
        account: {
            displayName,
            username,
            email,
            userId,
            joinDate: normalizeDate(joinedAt),
            role: user.role || root.role || "Member",
            plan,
            accountStatus: status,
        },
        api: {
            maskedKey: apiKey ? maskApiKey(apiKey) : "sk-********************",
            fullKey: apiKey || "",
            createdAt: root.api_key_created_at ? formatDateTime(root.api_key_created_at) : "Chưa có dữ liệu",
            lastUsedAt: root.api_key_last_used_at ? formatDateTime(root.api_key_last_used_at) : formatDateTime(new Date().toISOString()),
            scopes: root.api_scopes || "models.read, usage.read",
            environment: root.environment || "Workspace",
        },
        billing: {
            currentPlan: plan,
            expiresAt: window.aiRelayUnlimited ? "Không giới hạn" : (vip?.expire_at ? formatDateTime(vip.expire_at) : "Chưa có dữ liệu"),
            cycle: window.aiRelayUnlimited ? "Không giới hạn" : (root.billing_cycle || "Chưa có dữ liệu"),
            totalSpend: root.total_spend || "—",
            seats: root.team_size || "1 thành viên",
            paymentMethod: root.payment_method || "Chưa có dữ liệu",
        },
        security: {
            twoFactorEnabled: Boolean(root.two_factor_enabled),
            currentSession: root.current_session || "Trình duyệt hiện tại",
            passwordUpdatedAt: root.password_updated_at ? formatDateTime(root.password_updated_at) : "Chưa có dữ liệu",
            recoveryEmail: root.recovery_email || email,
        },
        devices: Array.isArray(root.devices) && root.devices.length
            ? root.devices.map((device, index) => ({
                name: device.name || device.device || `Thiết bị ${index + 1}`,
                detail: device.detail || device.last_seen || "Chưa có dữ liệu thiết bị",
                tag: device.tag || (index === 0 ? "Current session" : "Known device"),
                tone: index === 0 ? "success" : "muted",
            }))
            : [
                {
                    name: "Trình duyệt hiện tại",
                    detail: "Đang tải danh sách thiết bị...",
                    tag: "Current session",
                    tone: "success",
                },
            ],
        activity: Array.isArray(root.activity) && root.activity.length
            ? root.activity.map((item) => ({
                type: item.type || "activity",
                title: item.title || item.action || "Hoạt động hệ thống",
                description: item.description || item.detail || "Đã ghi nhận hoạt động trên tài khoản.",
                time: item.time || item.created_at || formatDateTime(new Date().toISOString()),
            }))
            : [
                {
                    type: "login",
                    title: "Đăng nhập thành công",
                    description: "Hệ thống đang hiển thị dữ liệu hồ sơ lấy từ phiên đăng nhập đã lưu.",
                    time: "Vừa xong",
                },
            ],
    };
}

async function loadProfileData() {
    const storedPayload = getStoredProfilePagePayload();

    if (storedPayload) {
        return buildProfileFromStoredPayload(storedPayload);
    }

    // Chưa có hồ sơ đăng nhập (xem state.js): dùng dữ liệu demo
    return PROFILE_MOCK_DATA;
}

function setLoadingState(isLoading) {
    profileState.loading = isLoading;
    profileRefs.skeleton?.classList.toggle("hidden", !isLoading);
    profileRefs.content?.classList.toggle("hidden", isLoading);
    profileRefs.errorState?.classList.add("hidden");
}

function showErrorState(message) {
    profileRefs.errorMessage && (profileRefs.errorMessage.textContent = message || "Không thể tải hồ sơ.");
    profileRefs.errorState?.classList.remove("hidden");
    profileRefs.skeleton?.classList.add("hidden");
    profileRefs.content?.classList.add("hidden");
}

function maskApiKey(value = "") {
    const key = String(value || "").trim();
    if (!key) return "sk-********************";
    if (key.length <= 8) return `${key.slice(0, 2)}******`;
    return `${key.slice(0, 3)}-${"*".repeat(Math.max(12, key.length - 7))}${key.slice(-4)}`;
}

function getStatIcon(type) {
    const icons = {
        activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 8-5-16-3 8H2"></path></svg>',
        layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 9 4.5-9 4.5-9-4.5L12 3Z"></path><path d="m3 12 9 4.5 9-4.5"></path><path d="m3 16.5 9 4.5 9-4.5"></path></svg>',
        sparkles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z"></path><path d="M5 3v4"></path><path d="M3 5h4"></path><path d="M19 17v4"></path><path d="M17 19h4"></path></svg>',
        wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"></path><path d="M3 7h18v10H3Z"></path><path d="M16 12h.01"></path></svg>',
        clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>',
        key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="4.5"></circle><path d="M21 2 11 12"></path><path d="M15 6l3 3"></path><path d="M18 3l3 3"></path></svg>',
    };

    return icons[type] || icons.activity;
}

function getActivityIcon(type) {
    const icons = {
        login: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><path d="M10 17l5-5-5-5"></path><path d="M15 12H3"></path></svg>',
        key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"></circle><path d="M20 4 11 13"></path><path d="M15 4h5v5"></path></svg>',
        model: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 8 4.5v11L12 22l-8-4.5v-11L12 2Z"></path><path d="M12 12 4 7.5"></path><path d="M12 12l8-4.5"></path><path d="M12 12v10"></path></svg>',
        billing: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 10h18"></path><path d="M7 15h3"></path></svg>',
        security: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 5 6v6c0 5 3.4 7.4 7 9 3.6-1.6 7-4 7-9V6l-7-3Z"></path><path d="M10.5 12.5 12 14l3-3"></path></svg>',
        activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 8-5-16-3 8H2"></path></svg>',
    };

    return icons[type] || icons.activity;
}

function getToneChip(label, tone = "muted") {
    const toneClass = tone === "success"
        ? "profile-chip-success"
        : tone === "warning"
            ? "profile-chip-warning"
            : tone === "danger"
                ? "profile-chip-danger"
                : "profile-chip-muted";

    return `<span class="profile-chip ${toneClass}">${label}</span>`;
}

function renderHero(data) {
    const user = data.user || {};
    const avatar = (window.AppState?.isLoggedIn() && window.AppState.data.user?.avatar) || "";
    const initials = getProfileAvatarInitials(user.displayName || user.username || "AI");

    if (profileRefs.heroAvatar) {
        if (typeof window.setAvatarImage === "function") {
            window.setAvatarImage(profileRefs.heroAvatar, avatar, initials);
        } else {
            profileRefs.heroAvatar.textContent = initials;
            profileRefs.heroAvatar.style.backgroundImage = "";
        }
    }

    if (profileRefs.displayName) profileRefs.displayName.textContent = user.displayName || "Người dùng AI STORE";
    if (profileRefs.username) profileRefs.username.textContent = `@${user.username || "workspace"}`;
    if (profileRefs.emailLink) {
        const email = user.email || "workspace@example.com";
        profileRefs.emailLink.textContent = email;
        profileRefs.emailLink.href = `mailto:${email}`;
    }
    if (profileRefs.joinedText) profileRefs.joinedText.textContent = `Joined ${normalizeDate(user.joinedAt)}`;
    if (profileRefs.planText) profileRefs.planText.textContent = user.plan || "Free";
    if (profileRefs.billingCycleText) profileRefs.billingCycleText.textContent = data.billing?.cycle || "Monthly";
    if (profileRefs.statusText) profileRefs.statusText.textContent = user.status || "Active";
    if (profileRefs.lastSeenText) profileRefs.lastSeenText.textContent = user.lastSeenText || formatDateTime(user.lastLoginAt);
    if (profileRefs.dataModeBadge) {
        profileRefs.dataModeBadge.textContent = data.meta?.live ? "Live data" : "Mock data";
    }
}

function renderProfileStats(data) {
    if (!profileRefs.statsGrid) return;
    const stats = Array.isArray(data.stats) ? data.stats : [];

    profileRefs.statsGrid.innerHTML = stats.map((item) => `
        <article class="glass-card profile-stat-card reveal-card">
            <div class="profile-stat-head">
                <span class="profile-stat-label">${item.label || "Metric"}</span>
                <span class="profile-stat-icon" aria-hidden="true">${getStatIcon(item.icon)}</span>
            </div>
            <strong class="profile-stat-value">${item.value ?? "—"}</strong>
            <span class="profile-stat-subtext">${item.subtext || ""}</span>
        </article>
    `).join("");
}

function renderProfileAccount(data) {
    if (!profileRefs.accountDetails) return;
    const account = data.account || {};
    const rows = [
        ["Display Name", account.displayName],
        ["Username", account.username ? `@${account.username}` : "—"],
        ["Email", account.email],
        ["User ID", account.userId],
        ["Join Date", account.joinDate],
        ["Role", account.role],
        ["Plan", account.plan],
        ["Account Status", account.accountStatus],
    ];

    profileRefs.accountDetails.innerHTML = rows.map(([label, value]) => `
        <div class="profile-detail-item">
            <span class="profile-detail-label">${label}</span>
            <div class="profile-detail-value">${value || "—"}</div>
        </div>
    `).join("");
}

function renderApiSection(data) {
    const api = data.api || {};
    if (profileRefs.apiKeyValue) {
        profileRefs.apiKeyValue.textContent = profileState.showApiKey ? (api.fullKey || api.maskedKey || "—") : (api.maskedKey || maskApiKey(api.fullKey));
    }

    if (profileRefs.apiDetails) {
        const rows = [
            ["Ngày tạo key", api.createdAt],
            ["Lần sử dụng gần nhất", api.lastUsedAt],
            ["Scopes", api.scopes],
            ["Environment", api.environment],
        ];

        profileRefs.apiDetails.innerHTML = rows.map(([label, value]) => `
            <div class="profile-detail-item">
                <span class="profile-detail-label">${label}</span>
                <div class="profile-detail-value">${value || "—"}</div>
            </div>
        `).join("");
    }

    if (profileRefs.toggleApiKeyBtn) {
        profileRefs.toggleApiKeyBtn.textContent = profileState.showApiKey ? "Ẩn" : "Hiện";
    }
}

function renderBilling(data) {
    if (!profileRefs.billingSummary) return;
    const billing = data.billing || {};
    const items = [
        { label: "Gói hiện tại", value: billing.currentPlan, copy: "Plan đang áp dụng cho workspace hiện tại." },
        { label: "Ngày hết hạn", value: billing.expiresAt, copy: "Thời điểm gia hạn hoặc kết thúc chu kỳ tiếp theo." },
        { label: "Chu kỳ thanh toán", value: billing.cycle, copy: "Hình thức thu phí hiện tại của subscription." },
        { label: "Tổng số tiền đã chi", value: billing.totalSpend, copy: "Tổng chi phí tích lũy của workspace." },
        { label: "Thành viên", value: billing.seats, copy: "Số lượng seat đang hoạt động trên tài khoản." },
        { label: "Phương thức thanh toán", value: billing.paymentMethod, copy: "Thông tin billing gần nhất được lưu trong hệ thống." },
    ];

    profileRefs.billingSummary.innerHTML = items.map((item) => `
        <div class="profile-stack-item">
            <span class="profile-stack-label">${item.label}</span>
            <strong>${item.value || "—"}</strong>
            <div class="profile-stack-copy">${item.copy}</div>
        </div>
    `).join("");
}

function renderSecurity(data) {
    const security = data.security || {};
    if (profileRefs.securitySummary) {
        profileRefs.securitySummary.innerHTML = [
            {
                label: "2FA",
                value: security.twoFactorEnabled ? "Đang bật" : "Chưa bật",
                copy: security.twoFactorEnabled ? "Xác thực hai lớp đang bảo vệ các lần đăng nhập mới." : "Bật 2FA để tăng độ an toàn cho tài khoản.",
                tone: security.twoFactorEnabled ? "success" : "warning",
            },
            {
                label: "Phiên hiện tại",
                value: security.currentSession,
                copy: "Phiên hoạt động đang được xác thực bởi trình duyệt hiện tại.",
                tone: "success",
            },
            {
                label: "Mật khẩu cập nhật lần cuối",
                value: security.passwordUpdatedAt,
                copy: "Nên thay đổi định kỳ để tăng cường bảo mật tài khoản.",
                tone: "muted",
            },
            {
                label: "Recovery Email",
                value: security.recoveryEmail,
                copy: "Địa chỉ này được dùng để khôi phục quyền truy cập khi cần.",
                tone: "muted",
            },
        ].map((item) => `
            <div class="profile-security-row">
                <div>
                    <span class="profile-stack-label">${item.label}</span>
                    <strong>${item.value || "—"}</strong>
                    <div class="profile-security-copy">${item.copy}</div>
                </div>
                ${getToneChip(item.tone === "success" ? "Protected" : item.tone === "warning" ? "Attention" : "Info", item.tone)}
            </div>
        `).join("");
    }

    if (profileRefs.toggleTwoFactorBtn) {
        profileRefs.toggleTwoFactorBtn.textContent = security.twoFactorEnabled ? "Tắt 2FA" : "Bật 2FA";
    }

    renderDevices(data);
}

function escapeDeviceText(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

// Real login sessions of this account (GET /api/sessions)
async function loadDevices() {
    if (!profileState.data) return;
    try {
        const response = await fetch("/api/sessions", { credentials: "same-origin", cache: "no-store" });
        if (!response.ok) throw new Error(`sessions ${response.status}`);
        const payload = await response.json();
        const list = Array.isArray(payload?.devices) ? payload.devices : [];
        if (!list.length) throw new Error("empty");

        profileState.data.devices = list.map((device) => ({
            name: device.name,
            detail: device.detail,
            tag: device.tag,
            tone: device.current ? "success" : "muted",
        }));
        const current = list.find((device) => device.current);
        if (current && profileState.data.security) profileState.data.security.currentSession = current.name;
    } catch (error) {
        profileState.data.devices = [{
            name: "Trình duyệt hiện tại",
            detail: "Không tải được danh sách thiết bị. Vui lòng thử lại sau.",
            tag: "Current session",
            tone: "success",
        }];
    }
    renderSecurity(profileState.data);
}

async function handleLogoutOtherDevices() {
    const btn = profileRefs.logoutAllDevicesBtn;
    if (btn) btn.disabled = true;
    try {
        const response = await fetch("/api/sessions/revoke-others", { method: "POST", credentials: "same-origin" });
        if (!response.ok) throw new Error(`revoke ${response.status}`);
        const result = await response.json();
        const count = Number(result?.revoked || 0);
        showToast("Đăng xuất thiết bị", count ? `Đã đăng xuất ${count} thiết bị khác.` : "Không có thiết bị nào khác đang đăng nhập.");
        await loadDevices();
    } catch (error) {
        showToast("Đăng xuất thiết bị", "Không thể đăng xuất các thiết bị khác. Vui lòng thử lại.", "error");
    } finally {
        if (btn) btn.disabled = false;
    }
}

function renderDevices(data) {
    const devices = Array.isArray(data.devices) ? data.devices : [];
    if (profileRefs.deviceCount) {
        profileRefs.deviceCount.textContent = `${devices.length} thiết bị`;
    }
    if (!profileRefs.deviceList) return;

    profileRefs.deviceList.innerHTML = devices.length
        ? devices.map((device) => `
            <article class="profile-device-item">
                <div class="profile-device-meta">
                    <div>
                        <span class="profile-stack-label">Device</span>
                        <strong class="profile-device-name">${escapeDeviceText(device.name || "Thiết bị")}</strong>
                    </div>
                    ${getToneChip(device.tag || "Known device", device.tone || "muted")}
                </div>
                <div class="profile-device-copy">${escapeDeviceText(device.detail || "—")}</div>
            </article>
        `).join("")
        : `<div class="profile-detail-item"><span class="profile-detail-value">Chưa có dữ liệu thiết bị.</span></div>`;
}

function renderProfileActivity(data) {
    const activities = Array.isArray(data.activity) ? data.activity : [];
    if (!profileRefs.activityList) return;

    profileRefs.activityList.innerHTML = activities.length
        ? activities.map((item) => `
            <li>
                <div class="profile-activity-item">
                    <span class="profile-activity-icon" aria-hidden="true">${getActivityIcon(item.type)}</span>
                    <div class="profile-activity-body">
                        <strong class="profile-activity-title">${item.title || "Hoạt động hệ thống"}</strong>
                        <div class="profile-activity-copy">${item.description || ""}</div>
                        <span class="profile-activity-time">${item.time || "—"}</span>
                    </div>
                </div>
            </li>
        `).join("")
        : `<li><div class="profile-detail-item"><span class="profile-detail-value">Chưa có hoạt động nào để hiển thị.</span></div></li>`;
}

function renderProfile(data) {
    profileState.data = data;
    renderHero(data);
    renderProfileStats(data);
    renderProfileAccount(data);
    renderApiSection(data);
    renderBilling(data);
    renderSecurity(data);
    renderProfileActivity(data);

    profileRefs.skeleton?.classList.add("hidden");
    profileRefs.errorState?.classList.add("hidden");
    profileRefs.content?.classList.remove("hidden");
}

function showToast(title, message, tone = "success") {
    if (!profileRefs.toastStack) return;
    const toast = document.createElement("div");
    toast.className = `profile-toast ${tone}`;
    toast.innerHTML = `<strong>${title}</strong><span>${message}</span>`;
    profileRefs.toastStack.appendChild(toast);

    const timer = window.setTimeout(() => {
        toast.remove();
        profileState.toastTimers.delete(timer);
    }, 3400);

    profileState.toastTimers.add(timer);
}

async function copyText(text) {
    if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
    }

    await navigator.clipboard.writeText(text);
    return true;
}

async function handleCopyApiKey() {
    const value = profileState.data?.api?.fullKey || "";
    if (!value) {
        showToast("Không có API key", "Workspace hiện chưa có key khả dụng để sao chép.", "error");
        return;
    }

    try {
        await copyText(value);
        showToast("Đã sao chép", "API key đã được sao chép vào clipboard.");
    } catch {
        showToast("Không thể sao chép", "Trình duyệt không hỗ trợ clipboard trong ngữ cảnh hiện tại.", "error");
    }
}

function handleToggleApiKey() {
    profileState.showApiKey = !profileState.showApiKey;
    renderApiSection(profileState.data || PROFILE_MOCK_DATA);
}

function handleRegenerateApiKey() {
    showToast("Chưa kết nối backend", "TODO: nối với endpoint regenerate API key khi backend profile sẵn sàng.");
}

function bindProfileActions() {
    profileRefs.retryBtn?.addEventListener("click", () => {
        hydrateProfilePage();
    });

    profileRefs.toggleApiKeyBtn?.addEventListener("click", handleToggleApiKey);
    profileRefs.copyApiKeyBtn?.addEventListener("click", handleCopyApiKey);
    profileRefs.regenerateApiKeyBtn?.addEventListener("click", handleRegenerateApiKey);
    profileRefs.editBtn?.addEventListener("click", () => showToast("Chỉnh sửa hồ sơ", "TODO: mở form chỉnh sửa hồ sơ khi backend/profile form sẵn sàng."));
    profileRefs.changePasswordBtn?.addEventListener("click", () => showToast("Đổi mật khẩu", "TODO: điều hướng tới luồng đổi mật khẩu của hệ thống."));
    profileRefs.upgradePlanBtn?.addEventListener("click", () => showToast("Upgrade Plan", "TODO: kết nối luồng nâng cấp gói dịch vụ."));
    profileRefs.manageSubscriptionBtn?.addEventListener("click", () => showToast("Manage Subscription", "TODO: kết nối trang quản lý subscription."));
    profileRefs.toggleTwoFactorBtn?.addEventListener("click", () => showToast("Bảo mật tài khoản", "TODO: tích hợp bật/tắt 2FA với backend bảo mật."));
    profileRefs.logoutAllDevicesBtn?.addEventListener("click", handleLogoutOtherDevices);
    profileRefs.profileMenuProfile?.addEventListener("click", () => {
        window.location.href = "/profile";
    });
    profileRefs.profileMenuLogout?.addEventListener("click", () => {
        if (typeof window.logout === "function") {
            window.logout();
        }
    });
}

async function hydrateProfilePage() {
    refreshProfileRefs();
    setLoadingState(true);

    try {
        const data = await loadProfileData();
        renderProfile(data);
        loadDevices();
        if (typeof window.applyUserProfile === "function") {
            window.applyUserProfile();
        }
    } catch (error) {
        showErrorState(error instanceof Error ? error.message : "Không thể tải hồ sơ tài khoản.");
    }
}

window.hydrateProfilePage = hydrateProfilePage;
window.bindProfileActions = bindProfileActions;
window.refreshProfileRefs = refreshProfileRefs;

window.addEventListener("DOMContentLoaded", async () => {
    const path = window.location.pathname;

    // Profile nhúng trong /dashboard: chỉ bind actions, dashboard sẽ gọi hydrate khi mở panel
    if (path === "/dashboard") {
        refreshProfileRefs();
        bindProfileActions();
        return;
    }

    // Trang /profile độc lập (menu header đã trỏ sang /dashboard#profile, trang này chỉ còn vào bằng URL): hydrate ngay
    if (path === "/profile") {
        refreshProfileRefs();
        bindProfileActions();
        await hydrateProfilePage();
    }
});
