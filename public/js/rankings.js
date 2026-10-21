const RANKINGS_PAGE_SIZE = 20;

const rankingsState = {
    items: [],
    filteredItems: [],
    rawHistoryPoints: [],
    chartSeries: [],
    chartBuckets: [],
    chartMeta: { maxTotal: 0 },
    currentPeriod: "today",
    currentPage: 1,
    language: "vi",
    theme: "dark",
    isLoading: false,
    error: null,
};

const rankingTexts = {
    vi: {
        pageTitle: "AI STORE · Bảng xếp hạng",
        navHome: "Trang chủ",
        navConsole: "Bảng điều khiển",
        navModels: "Mô hình",
        navRanking: "Bảng xếp hạng",
        navDocs: "Tài liệu",
        signIn: "Đăng nhập",
        themeDark: "Tối",
        themeLight: "Ánh sáng",
        notifications: "Thông báo",
        notificationTag: "Mới",
        notificationTitle: "Bảng xếp hạng đã được cập nhật",
        notificationDescription: "Dữ liệu usage được làm mới để phản ánh hoạt động gần nhất trên nền tảng.",
        notificationTime: "Vừa xong",
        headerTitle: "Bảng xếp hạng",
        headerSubtitle: "Khám phá các mô hình được sử dụng nhiều nhất trên nền tảng, được cập nhật từ dữ liệu sử dụng thực tế.",
        periodToday: "Hôm nay",
        periodWeek: "Tuần",
        periodMonth: "Tháng",
        periodYear: "Năm",
        periodAll: "Tất cả",
        topModelsTitle: "Mô hình hàng đầu",
        topModelsDesc: "Các mô hình có mức sử dụng cao nhất trong giai đoạn đã chọn",
        searchPlaceholder: "Tìm kiếm tên mô hình, nhà cung cấp...",
        loading: "Đang tải dữ liệu bảng xếp hạng...",
        loadError: "Không thể tải dữ liệu bảng xếp hạng.",
        leaderboardTitle: "Bảng xếp hạng",
        leaderboardDesc: "So sánh các mô hình phổ biến nhất trên nền tảng",
        tableModel: "Mô hình",
        tableProvider: "Nhà cung cấp",
        tableTokens: "Yêu cầu",
        tableChange: "Thay đổi",
        pageLabel: "Trang",
        empty: "Không tìm thấy mô hình phù hợp.",
        defaultError: "Không thể tải dữ liệu rankings. Vui lòng thử lại.",
        todayLabel: "Hôm nay",
        weekLabel: "Tuần",
        monthLabel: "Tháng",
        yearLabel: "Năm",
        allLabel: "Tất cả",
        dataSourceNote: "Dữ liệu lấy trực tiếp từ API rankings",
        trendTitle: "Xu hướng tăng",
        trendDropTitle: "Xu hướng giảm",
        vendorShareTitle: "Thị phần nhà cung cấp",
        vendorShareDesc: "Tỷ trọng sử dụng theo từng vendor trên toàn bộ traffic được ghi nhận",
        topMoversTitle: "Bước nhảy mạnh",
        topMoversDesc: "Các model tăng hạng nhanh nhất trong kỳ",
        topDroppersTitle: "Giảm mạnh",
        topDroppersDesc: "Các model giảm hạng nhiều nhất trong kỳ",
    },
    en: {
        pageTitle: "AI STORE · Rankings",
        navHome: "Home",
        navConsole: "Console",
        navModels: "Models",
        navRanking: "Rankings",
        navDocs: "Docs",
        signIn: "Sign in",
        themeDark: "Dark",
        themeLight: "Light",
        notifications: "Notifications",
        notificationTag: "New",
        notificationTitle: "Rankings have been refreshed",
        notificationDescription: "Usage data has been updated to reflect the latest platform activity.",
        notificationTime: "Just now",
        headerTitle: "Rankings",
        headerSubtitle: "Explore the most-used models on the platform using real usage data.",
        periodToday: "Today",
        periodWeek: "Week",
        periodMonth: "Month",
        periodYear: "Year",
        periodAll: "All",
        topModelsTitle: "Top models",
        topModelsDesc: "Highest-usage models in the selected period",
        searchPlaceholder: "Search model or provider...",
        loading: "Loading rankings data...",
        loadError: "Unable to load rankings data.",
        leaderboardTitle: "Rankings",
        leaderboardDesc: "Compare the most popular models on the platform",
        tableModel: "Model",
        tableProvider: "Provider",
        tableTokens: "Tokens",
        tableChange: "Change",
        pageLabel: "Page",
        empty: "No matching models found.",
    },
    zh: {
        pageTitle: "AI STORE · 排行榜",
        navHome: "首页",
        navConsole: "控制台",
        navModels: "模型",
        navRanking: "排行榜",
        navDocs: "文档",
        signIn: "登录",
        themeDark: "深色",
        themeLight: "浅色",
        notifications: "通知",
        notificationTag: "新",
        notificationTitle: "排行榜已更新",
        notificationDescription: "使用数据已刷新，以反映平台最新活动。",
        notificationTime: "刚刚",
        headerTitle: "排行榜",
        headerSubtitle: "基于真实使用数据，查看平台上最常用的模型。",
        periodToday: "今天",
        periodWeek: "周",
        periodMonth: "月",
        periodYear: "年",
        periodAll: "全部",
        topModelsTitle: "热门模型",
        topModelsDesc: "所选时间段内使用量最高的模型",
        searchPlaceholder: "搜索模型或提供商...",
        loading: "正在加载排行榜数据...",
        loadError: "无法加载排行榜数据。",
        leaderboardTitle: "排行榜",
        leaderboardDesc: "对比平台上最受欢迎的模型",
        tableModel: "模型",
        tableProvider: "提供商",
        tableTokens: "Token",
        tableChange: "变化",
        pageLabel: "第",
        empty: "未找到匹配的模型。",
    },
    ja: {
        pageTitle: "AI STORE · ランキング",
        navHome: "ホーム",
        navConsole: "コンソール",
        navModels: "モデル",
        navRanking: "ランキング",
        navDocs: "ドキュメント",
        signIn: "ログイン",
        themeDark: "ダーク",
        themeLight: "ライト",
        notifications: "通知",
        notificationTag: "新着",
        notificationTitle: "ランキングを更新しました",
        notificationDescription: "最新のプラットフォーム利用状況を反映して使用データを更新しました。",
        notificationTime: "たった今",
        headerTitle: "ランキング",
        headerSubtitle: "実際の利用データをもとに、最も使われているモデルを確認できます。",
        periodToday: "今日",
        periodWeek: "週",
        periodMonth: "月",
        periodYear: "年",
        periodAll: "すべて",
        topModelsTitle: "注目モデル",
        topModelsDesc: "選択期間で最も利用されたモデル",
        searchPlaceholder: "モデル名またはプロバイダを検索...",
        loading: "ランキングデータを読み込み中...",
        loadError: "ランキングデータを読み込めません。",
        leaderboardTitle: "ランキング",
        leaderboardDesc: "プラットフォームで人気の高いモデルを比較",
        tableModel: "モデル",
        tableProvider: "プロバイダ",
        tableTokens: "トークン",
        tableChange: "変化",
        pageLabel: "ページ",
        empty: "一致するモデルが見つかりません。",
    },
};

function getText() {
    return rankingTexts[rankingsState.language] || rankingTexts.vi;
}

function detectLanguage() {
    const stored = window.AppState?.getSetting("language");
    if (stored && rankingTexts[stored]) return stored;
    const docLang = document.documentElement.lang;
    if (docLang && rankingTexts[docLang]) return docLang;
    return "vi";
}

function detectTheme() {
    const stored = window.AppState?.getSetting("theme");
    if (stored === "light" || stored === "dark") return stored;
    return document.body.classList.contains("light-theme") ? "light" : "dark";
}

function formatTokenCount(value) {
    return new Intl.NumberFormat(rankingsState.language === "vi" ? "vi-VN" : rankingsState.language).format(Math.round(value || 0));
}

function formatCompactNumber(value) {
    const abs = Math.abs(Number(value) || 0);
    if (abs >= 1_000_000_000) return `${(abs / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 0 : 1).replace(/\.0$/, "")}B`;
    if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
    if (abs >= 1_000) return `${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K`;
    return String(Math.round(abs));
}

function getRankingsText() {
    return getText();
}

function normalizeRankItem(item, index) {
    const tokens = Number(item.tokens ?? item.token ?? item.count ?? item.usage ?? item.total_tokens ?? 0);
    const change = Number(item.change ?? item.delta ?? item.trend ?? item.growth ?? item.growth_pct ?? 0);
    return {
        rank: Number(item.rank ?? index + 1),
        previousRank: Number(item.previous_rank ?? item.previousRank ?? 0),
        model: item.model || item.model_name || item.name || item.label || `Model ${index + 1}`,
        provider: item.provider || item.vendor || item.company || item.source || "Unknown",
        tokens,
        change,
    };
}

function sortItems(items) {
    return [...items].sort((a, b) => a.rank - b.rank || b.tokens - a.tokens || b.change - a.change || a.model.localeCompare(b.model));
}

function filterItems(query) {
    const normalized = (query || "").trim().toLowerCase();
    if (!normalized) return [...rankingsState.items];
    return rankingsState.items.filter((item) => `${item.model} ${item.provider}`.toLowerCase().includes(normalized));
}

function getPeriodLabel(period) {
    const text = getText();
    return {
        today: text.periodToday,
        week: text.periodWeek,
        month: text.periodMonth,
        year: text.periodYear,
        all: text.periodAll,
    }[period] || text.periodToday;
}

function getBucketConfig(period) {
    if (period === "week") return { count: 7, format: "day", labelStep: 1 };
    if (period === "month") return { count: 30, format: "day", labelStep: 1 };
    if (period === "year") return { count: 12, format: "month", labelStep: 1 };
    if (period === "all") return { count: 24, format: "hour", labelStep: 3 };
    return { count: 24, format: "hour", labelStep: 1 };
}

function getLocalHourFromTimestamp(ts) {
    const date = new Date(ts);
    return Number.isNaN(date.getTime()) ? null : date.getHours();
}

function getTodayCurrentHour() {
    return new Date().getHours();
}

function niceCeiling(value) {
    const units = [1, 2, 5];
    if (value <= 0) return 1;
    const magnitude = 10 ** Math.floor(Math.log10(value));
    for (const unit of units) {
        const candidate = unit * magnitude;
        if (candidate >= value) return candidate;
    }
    return 10 * magnitude;
}

function buildChartDatasetFromHistory(historyPoints, period) {
    const points = Array.isArray(historyPoints) ? historyPoints : [];
    const buckets = [];
    const bucketMap = new Map();
    const modelOrder = [];
    const seriesMap = new Map();

    const addModel = (name) => {
        if (!seriesMap.has(name)) {
            seriesMap.set(name, []);
            modelOrder.push(name);
        }
    };

    const currentHour = getTodayCurrentHour();

    if (period === "today") {
        for (let i = 0; i <= currentHour; i += 1) {
            const label = `${String(i).padStart(2, "0")}:00`;
            const bucket = { key: label, label, total: 0, models: new Map() };
            buckets.push(bucket);
            bucketMap.set(label, bucket);
        }
    } else if (period === "week") {
        const days = [];
        for (let i = 6; i >= 0; i -= 1) {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            const label = d.toLocaleDateString(rankingsState.language === "vi" ? "vi-VN" : rankingsState.language, { weekday: "short", day: "2-digit", month: "2-digit" });
            days.push({ key, label });
        }
        days.forEach(({ key, label }) => {
            const bucket = { key, label, total: 0, models: new Map() };
            buckets.push(bucket);
            bucketMap.set(key, bucket);
        });
    } else if (period === "month") {
        const daysInMonth = 30;
        for (let i = daysInMonth - 1; i >= 0; i -= 1) {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            const label = `${d.getDate()}/${d.getMonth() + 1}`;
            const bucket = { key, label, total: 0, models: new Map() };
            buckets.push(bucket);
            bucketMap.set(key, bucket);
        }
    } else if (period === "year") {
        const current = new Date();
        for (let i = 11; i >= 0; i -= 1) {
            const d = new Date(current.getFullYear(), current.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            const label = d.toLocaleDateString(rankingsState.language === "vi" ? "vi-VN" : rankingsState.language, { month: "short" });
            const bucket = { key, label, total: 0, models: new Map() };
            buckets.push(bucket);
            bucketMap.set(key, bucket);
        }
    } else {
        const topPoints = points.slice(0, 240);
        topPoints.forEach((point, index) => {
            const label = point.label || `#${index + 1}`;
            const bucket = { key: String(index), label, total: 0, models: new Map() };
            buckets.push(bucket);
            bucketMap.set(String(index), bucket);
        });
    }

    const normalizedPoints = points.map((point, index) => ({
        model: point.model || point.model_name || point.name || `Model ${index + 1}`,
        vendor: point.vendor || point.provider || "Unknown",
        tokens: Number(point.tokens ?? point.total_tokens ?? 0),
        label: point.label || "",
        ts: point.ts || point.time || "",
    }));

    normalizedPoints.forEach((point) => addModel(point.model));

    // fill series by bucket time
    normalizedPoints.forEach((point) => {
        let bucketKey = null;
        if (period === "today") {
            const hour = String(new Date(point.ts).getHours()).padStart(2, "0");
            bucketKey = `${hour}:00`;
        } else if (period === "week" || period === "month") {
            bucketKey = new Date(point.ts).toISOString().slice(0, 10);
        } else if (period === "year") {
            const d = new Date(point.ts);
            bucketKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        } else {
            bucketKey = String(buckets.findIndex((b) => b.label === (point.label || "")));
        }

        const bucket = bucketMap.get(bucketKey);
        if (!bucket) return;
        bucket.total += point.tokens;
        bucket.models.set(point.model, (bucket.models.get(point.model) || 0) + point.tokens);
    });

    const modelNames = [...new Set(normalizedPoints.map((p) => p.model))];
    const palette = ["#7c3aed", "#06b6d4", "#f97316", "#22c55e", "#eab308", "#ef4444", "#8b5cf6", "#14b8a6", "#f59e0b", "#6366f1", "#10b981", "#ec4899", "#0ea5e9", "#84cc16", "#f97316", "#a855f7"];
    const series = modelNames.map((model, i) => ({
        name: model,
        color: palette[i % palette.length],
        data: buckets.map((bucket) => bucket.models.get(model) || 0),
    }));

    rankingsState.chartSeries = series;
    rankingsState.chartBuckets = buckets;
    rankingsState.chartMeta.maxTotal = Math.max(1, ...buckets.map((b) => b.total));
}

async function fetchRankings(period) {
    const response = await fetch(`/api/rankings?period=${encodeURIComponent(period)}`, {
        headers: { Accept: "application/json, text/plain, */*" },
        credentials: "same-origin",
    });
    if (!response.ok) throw new Error(`Failed to load rankings: ${response.status}`);
    // The server builds this from the logged-in account's own API keys (one query per base URL)
    const data = await response.json();
    const models = Array.isArray(data?.data?.models) ? data.data.models : [];
    const historyPoints = Array.isArray(data?.data?.models_history?.points) ? data.data.models_history.points : [];
    console.log("models", models);
    console.log("history", historyPoints);
    const normalized = models.map(normalizeRankItem).filter((item) => item.model && item.provider);
    rankingsState.items = sortItems(normalized);
    rankingsState.filteredItems = [...rankingsState.items];
    rankingsState.rawHistoryPoints = historyPoints;
    buildChartDatasetFromHistory(historyPoints, period);
    console.log("chart dataset", { series: rankingsState.chartSeries, buckets: rankingsState.chartBuckets, meta: rankingsState.chartMeta });
}

function updateTitleAndLabels() {
    const text = getText();
    document.title = text.pageTitle;
    document.documentElement.lang = rankingsState.language;

    const mappings = [
        [".site-nav a:nth-child(1)", text.navHome],
        [".site-nav a:nth-child(2)", text.navConsole],
        [".site-nav a:nth-child(3)", text.navModels],
        [".site-nav a:nth-child(4)", text.navRanking],
        [".site-nav a:nth-child(5)", text.navDocs],
        [".nav-login-btn", text.signIn],
        [".rankings-header h1", text.headerTitle],
        [".rankings-subtitle", text.headerSubtitle],
        [".rankings-top-models .section-heading h2", text.topModelsTitle],
        [".rankings-top-models .section-heading p", text.topModelsDesc],
        [".rankings-leaderboard .section-heading h2", text.leaderboardTitle],
        [".rankings-leaderboard .section-heading p", text.leaderboardDesc],
        ["#rankingsLoading span", text.loading],
        ["#rankingsError span", text.loadError],
        ["#notificationMenu .notification-header span:first-child", text.notifications],
        ["#notificationMenu .notification-tag", text.notificationTag],
        ["#notificationMenu h4", text.notificationTitle],
        ["#notificationMenu p", text.notificationDescription],
        ["#notificationMenu .notification-time", text.notificationTime],
    ];

    mappings.forEach(([selector, value]) => {
        const el = document.querySelector(selector);
        if (el) el.textContent = value;
    });

    const periodLabels = {
        today: text.periodToday,
        week: text.periodWeek,
        month: text.periodMonth,
        year: text.periodYear,
        all: text.periodAll,
    };

    document.querySelectorAll("#rankingsPeriodTabs button").forEach((button) => {
        const period = button.dataset.period;
        if (period && periodLabels[period]) button.textContent = periodLabels[period];
    });

    const searchInput = document.getElementById("rankingsSearchInput");
    if (searchInput) searchInput.placeholder = text.searchPlaceholder;

    const themeMenuButtons = document.querySelectorAll("#themeMenu button");
    if (themeMenuButtons[0]) themeMenuButtons[0].textContent = text.themeDark;
    if (themeMenuButtons[1]) themeMenuButtons[1].textContent = text.themeLight;

    const tableHeaders = document.querySelectorAll(".rankings-table thead th");
    if (tableHeaders[1]) tableHeaders[1].textContent = text.tableModel;
    if (tableHeaders[2]) tableHeaders[2].textContent = text.tableProvider;
    if (tableHeaders[3]) tableHeaders[3].textContent = text.tableTokens;
    if (tableHeaders[4]) tableHeaders[4].textContent = text.tableChange;
}

function renderTopList() {
    const list = document.getElementById("rankingsTopList");
    if (!list) return;

    const text = getText();
    const items = rankingsState.filteredItems.slice(0, 6);
    if (!items.length) {
        list.innerHTML = `<li><div class="rank-content"><span class="rank-title">${text.empty}</span></div></li>`;
        return;
    }

    list.innerHTML = items.map((item, index) => `
        <li>
            <span class="rank-number">${index + 1}</span>
            <span class="rank-icon">${item.provider.charAt(0)}</span>
            <div class="rank-content">
                <span class="rank-title">${item.model}</span>
                <div class="rank-provider">${item.provider}</div>
            </div>
            <div class="rank-stats">
                <span class="rank-tokens">${formatTokenCount(item.tokens)}</span>
                <span class="rank-change ${item.change >= 0 ? "up" : "down"}">${item.change >= 0 ? "+" : ""}${item.change}%</span>
            </div>
        </li>
    `).join("");
}

function createChartSvg() {
    const svg = document.getElementById("rankingsChart");
    const legend = document.getElementById("rankingsChartLegend");
    const shell = document.getElementById("rankingsChartShell");
    if (!svg || !shell) return;

    shell.style.display = "block";
    if (legend) legend.textContent = getPeriodLabel(rankingsState.currentPeriod);

    const width = 1200;
    const height = 420;
    const padding = { top: 28, right: 22, bottom: 56, left: 62 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const buckets = rankingsState.chartBuckets;
    const series = rankingsState.chartSeries;
    const maxTotal = rankingsState.chartMeta.maxTotal || 1;
    const yMax = niceCeiling(maxTotal);
    const barWidth = buckets.length ? Math.max(6, Math.min(36, plotWidth / buckets.length * 0.72)) : 20;
    const gap = buckets.length ? (plotWidth / buckets.length) - barWidth : 8;

    const rawTicks = [0, 0.2, 0.4, 0.6, 0.8, 1].map((pct) => Math.round(yMax * pct));
    const yTicks = [...new Set(rawTicks)].sort((a, b) => a - b);
    const yLines = yTicks.map((tick) => {
        const y = padding.top + plotHeight - (tick / yMax) * plotHeight;
        const label = tick === 0 ? "0" : tick >= 1_000_000_000 ? `${Math.round(tick / 1_000_000_000)}B` : `${Math.round(tick / 1_000_000)}M`;
        return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" class="chart-grid-line"></line><text x="${padding.left - 10}" y="${y + 4}" class="chart-axis-label" text-anchor="end">${label}</text>`;
    }).join("");

    const bars = buckets.map((bucket, index) => {
        const x = padding.left + (index / Math.max(1, buckets.length)) * plotWidth + Math.max(0, gap / 2);
        let yCursor = padding.top + plotHeight;
        const total = bucket.total || 0;
        const stacked = series.map((serie) => {
            const value = serie.data[index] || 0;
            const h = (value / yMax) * plotHeight;
            const y = yCursor - h;
            yCursor = y;
            const opacity = value > 0 ? 1 : 0;
            return `<rect class="chart-segment" x="${x}" y="${y}" width="${barWidth}" height="${Math.max(h, 0)}" fill="${serie.color}" opacity="${opacity}" data-model="${serie.name}" data-value="${value}" data-total="${total}" data-label="${bucket.label}" data-index="${index}" data-mode="model"></rect>`;
        }).join("");
        const hitbox = `<rect class="chart-hitbox" x="${x}" y="${padding.top}" width="${barWidth}" height="${plotHeight}" fill="transparent" data-total="${total}" data-label="${bucket.label}" data-index="${index}" data-mode="bucket"></rect>`;
        return `<g class="chart-bar-group" data-index="${index}">${hitbox}${stacked}</g>`;
    }).join("");

    const xLabels = buckets.map((bucket, index) => {
        const showLabel = index % (rankingsState.currentPeriod === "all" ? 3 : 1) === 0 || index === buckets.length - 1;
        if (!showLabel) return "";
        const x = padding.left + (index / Math.max(1, buckets.length)) * plotWidth + barWidth / 2;
        return `<text x="${x}" y="${height - 16}" text-anchor="middle" class="chart-axis-label">${bucket.label}</text>`;
    }).join("");

    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.innerHTML = `
        <defs>
            <linearGradient id="chartBgGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="rgba(255,255,255,0.14)" />
                <stop offset="100%" stop-color="rgba(255,255,255,0.02)" />
            </linearGradient>
        </defs>
        <rect x="0" y="0" width="${width}" height="${height}" rx="20" fill="url(#chartBgGrad)" class="chart-bg"></rect>
        <g class="chart-y-axis">${yLines}</g>
        <g class="chart-bars-group">${bars}</g>
        <g class="chart-x-axis">${xLabels}</g>
    `;

    svg.querySelectorAll(".chart-hitbox").forEach((node) => {
        node.addEventListener("mouseenter", (event) => showBucketTooltip(event.target));
        node.addEventListener("mousemove", (event) => showBucketTooltip(event.target, event));
        node.addEventListener("mouseleave", hideChartTooltip);
    });
    svg.querySelectorAll(".chart-segment").forEach((node) => {
        node.addEventListener("mouseenter", (event) => showModelTooltip(event.target));
        node.addEventListener("mousemove", (event) => showModelTooltip(event.target, event));
        node.addEventListener("mouseleave", hideChartTooltip);
    });
}

function buildBucketTooltipContent(index) {
    const bucket = rankingsState.chartBuckets[index];
    if (!bucket) return "";
    const rows = rankingsState.chartSeries
        .map((serie) => ({ name: serie.name, value: serie.data[index] || 0 }))
        .filter((row) => row.value > 0);
    const lines = rows.map((row) => `<div class="tooltip-row"><span>${row.name}</span><span>${formatCompactNumber(row.value)} yêu cầu</span></div>`).join("");
    return `<strong>${bucket.label}</strong>${lines}<div class="tooltip-divider"></div><div class="tooltip-row tooltip-total"><span>Tổng</span><span>${formatCompactNumber(bucket.total)} yêu cầu</span></div>`;
}

function showBucketTooltip(target, event) {
    const tooltip = document.getElementById("rankingsChartTooltip");
    if (!tooltip || !(target instanceof SVGElement)) return;
    const index = Number(target.getAttribute("data-index") || -1);
    const html = buildBucketTooltipContent(index);
    if (!html) return hideChartTooltip();
    tooltip.innerHTML = html;
    tooltip.classList.remove("hidden");
    const x = event?.clientX || 0;
    const y = event?.clientY || 0;
    tooltip.style.left = `${x + 16}px`;
    tooltip.style.top = `${y + 16}px`;
}

function showModelTooltip(target, event) {
    const tooltip = document.getElementById("rankingsChartTooltip");
    if (!tooltip || !(target instanceof SVGElement)) return;
    const model = target.getAttribute("data-model") || "";
    const value = Number(target.getAttribute("data-value") || 0);
    if (!model || !value) return hideChartTooltip();
    tooltip.innerHTML = `<strong>${model}</strong><div class="tooltip-row tooltip-total"><span>${formatCompactNumber(value)} yêu cầu</span><span></span></div>`;
    tooltip.classList.remove("hidden");
    const x = event?.clientX || 0;
    const y = event?.clientY || 0;
    tooltip.style.left = `${x + 16}px`;
    tooltip.style.top = `${y + 16}px`;
}

function hideChartTooltip() {
    const tooltip = document.getElementById("rankingsChartTooltip");
    if (tooltip) tooltip.classList.add("hidden");
}


function renderTable() {
    const leftColumn = document.getElementById("rankingsLeftColumn");
    const rightColumn = document.getElementById("rankingsRightColumn");
    if (!leftColumn || !rightColumn) return;

    const text = getText();
    const items = rankingsState.filteredItems.slice(0, 20);
    const leftItems = items.slice(0, 10);
    const rightItems = items.slice(10, 20);

    const renderItem = (item, index) => {
        const changeValue = Math.abs(Number(item.change) || 0).toFixed(2);
        const changeArrow = item.change >= 0 ? "↗" : "↘";
        return `
            <li>
                <span class="rank-number">${index + 1}</span>
            <span class="rank-icon">${item.model.charAt(0)}</span>
            <div class="rank-content">
                <span class="rank-title">${item.model}</span>
            </div>
            <div class="rank-stats">
                <span class="rank-tokens">${formatTokenCount(item.tokens)}</span>
                <span class="rank-change ${item.change >= 0 ? "up" : "down"}">${changeArrow} ${changeValue}%</span>
            </div>
        </li>
    `;
    };

    leftColumn.innerHTML = leftItems.length ? leftItems.map((item, index) => renderItem(item, index)).join("") : `<li><div class="rank-content"><span class="rank-title">${text.empty}</span></div></li>`;
    rightColumn.innerHTML = rightItems.length ? rightItems.map((item, index) => renderItem(item, index + 10)).join("") : `<li><div class="rank-content"><span class="rank-title">${text.empty}</span></div></li>`;
}

function applyFilters() {
    const searchInput = document.getElementById("rankingsSearchInput");
    rankingsState.filteredItems = filterItems(searchInput?.value || "");
    renderTopList();
    renderTable();
    createChartSvg();
}

function setLanguage(lang, { persist = true } = {}) {
    rankingsState.language = rankingTexts[lang] ? lang : "vi";
    if (persist) window.AppState?.setSetting("language", rankingsState.language);
    updateTitleAndLabels();
    renderTopList();
    renderTable();
    createChartSvg();

    document.querySelectorAll("#languageMenu button").forEach((button) => {
        button.classList.toggle("active", button.dataset.lang === rankingsState.language);
    });
}

function setTheme(theme, { persist = true } = {}) {
    rankingsState.theme = theme === "light" ? "light" : "dark";
    document.body.classList.toggle("light-theme", rankingsState.theme === "light");
    if (persist) window.AppState?.setSetting("theme", rankingsState.theme);

    const themeToggle = document.getElementById("themeToggle");
    if (themeToggle) themeToggle.dataset.theme = rankingsState.theme;

    document.querySelectorAll("#themeMenu button").forEach((button) => {
        button.classList.toggle("active", button.dataset.theme === rankingsState.theme);
    });
}

function bindDropdown(toggleId, menuId) {
    const toggle = document.getElementById(toggleId);
    const menu = document.getElementById(menuId);
    if (!toggle || !menu) return;

    toggle.addEventListener("click", (event) => {
        event.stopPropagation();
        const isHidden = menu.classList.contains("hidden");
        document.querySelectorAll(".language-menu, .theme-menu, .notification-menu").forEach((panel) => {
            if (panel !== menu) panel.classList.add("hidden");
        });
        menu.classList.toggle("hidden", !isHidden);
        toggle.setAttribute("aria-expanded", String(isHidden));
    });
}

function syncActivePeriodButton() {
    document.querySelectorAll("#rankingsPeriodTabs button").forEach((button) => {
        button.classList.toggle("active", button.dataset.period === rankingsState.currentPeriod);
    });
}

function bindEvents() {
    document.getElementById("rankingsSearchInput")?.addEventListener("input", applyFilters);

    document.querySelectorAll("#rankingsPeriodTabs button").forEach((button) => {
        button.addEventListener("click", async () => {
            rankingsState.currentPeriod = button.dataset.period || "today";
            syncActivePeriodButton();
            await loadRankings();
        });
    });

    document.querySelectorAll("#languageMenu button").forEach((button) => {
        button.addEventListener("click", () => {
            setLanguage(button.dataset.lang || "vi");
            document.getElementById("languageMenu")?.classList.add("hidden");
        });
    });

    document.querySelectorAll("#themeMenu button").forEach((button) => {
        button.addEventListener("click", () => {
            setTheme(button.dataset.theme || "dark");
            document.getElementById("themeMenu")?.classList.add("hidden");
        });
    });

    document.addEventListener("click", (event) => {
        if (!(event.target instanceof HTMLElement)) return;
        if (!event.target.closest(".language-switcher")) {
            document.getElementById("languageMenu")?.classList.add("hidden");
        }
        if (!event.target.closest(".theme-switcher")) {
            document.getElementById("themeMenu")?.classList.add("hidden");
        }
        if (!event.target.closest(".notification-switcher")) {
            document.getElementById("notificationMenu")?.classList.add("hidden");
        }
    });

    bindDropdown("languageToggle", "languageMenu");
    bindDropdown("themeToggle", "themeMenu");
    bindDropdown("notificationToggle", "notificationMenu");
}

function setLoadingState(isLoading) {
    rankingsState.isLoading = isLoading;
    const loading = document.getElementById("rankingsLoading");
    const error = document.getElementById("rankingsError");
    const topList = document.getElementById("rankingsTopList");
    if (loading) loading.style.display = isLoading ? "flex" : "none";
    if (error) error.style.display = "none";
    if (topList) topList.style.display = isLoading ? "none" : "grid";
}

function setErrorState(message) {
    rankingsState.error = message || null;
    const loading = document.getElementById("rankingsLoading");
    const error = document.getElementById("rankingsError");
    const errorText = error?.querySelector("span");
    const topList = document.getElementById("rankingsTopList");
    if (loading) loading.style.display = "none";
    if (errorText && message) errorText.textContent = message;
    if (error) error.style.display = "flex";
    if (topList) topList.style.display = "none";
}

async function loadRankings() {
    setLoadingState(true);
    try {
        await fetchRankings(rankingsState.currentPeriod);
        rankingsState.filteredItems = [...rankingsState.items];
        const searchInput = document.getElementById("rankingsSearchInput");
        if (searchInput?.value) {
            applyFilters();
        } else {
            rankingsState.currentPage = 1;
            renderTopList();
            renderTable();
            createChartSvg();
        }
        setErrorState(null);
        setLoadingState(false);
    } catch (err) {
        console.error(err);
        setLoadingState(false);
        setErrorState(getText().loadError);
    }
}

async function initRankingsPage() {
    await window.AppState.ready;
    rankingsState.language = detectLanguage();
    rankingsState.theme = detectTheme();
    rankingsState.currentPeriod = new URLSearchParams(window.location.search).get("period") || "today";

    setTheme(rankingsState.theme, { persist: false });
    bindEvents();
    updateTitleAndLabels();
    syncActivePeriodButton();

    try {
        await loadRankings();
    } catch (err) {
        console.error(err);
        setErrorState(getText().loadError);
    }

    setLanguage(rankingsState.language, { persist: false });
}

window.initRankingsPage = initRankingsPage;
window.setRankingsLanguage = setLanguage;