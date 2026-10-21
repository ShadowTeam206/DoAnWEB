let sharedModelsCache = [];
let currentModelsPage = 1;
let currentModelsQuery = "";
let currentProviderFilter = "all";
let currentTypeFilter = "all";
let currentSort = "name-asc";
let modelsLastUpdated = null;

const MODELS_PER_PAGE = 12;

let searchDebounceTimer = null;
let processedCache = { key: "", value: [] };

/* ----------------------------- metadata lookup ---------------------------- */

const PROVIDER_PRETTY = {
  meta: "Meta", "meta-llama": "Meta", llama: "Meta",
  openai: "OpenAI", anthropic: "Anthropic", google: "Google", "google-deepmind": "Google",
  baai: "BAAI", qwen: "Alibaba", "qwen2": "Alibaba", "deepseek-ai": "DeepSeek", deepseek: "DeepSeek",
  mistralai: "Mistral", mistral: "Mistral", abacusai: "Abacus.AI", cohere: "Cohere",
  "01-ai": "01.AI", yi: "01.AI", nvidia: "NVIDIA", microsoft: "Microsoft",
  "x-ai": "xAI", xai: "xAI", nex: "Nex", "nex-agi": "Nex", siliconflow: "SiliconFlow",
  stabilityai: "Stability", thudm: "Zhipu", zhipu: "Zhipu", "z-ai": "Zhipu",
  perplexity: "Perplexity", kuaishou: "Kuaishou", moonshotai: "Moonshot", moonshot: "Moonshot",
  qd: "QD", openrouter: "OpenRouter", stepfun: "StepFun", "stepfun-ai": "StepFun",
  tencent: "Tencent", baidu: "Baidu", bytedance: "ByteDance", nousresearch: "Nous Research",
  "kwai-kolors": "Kwai", funaudiollm: "FunAudio", paddlepaddle: "PaddlePaddle",
  "netease-youdao": "NetEase", upstage: "Upstage", liquid: "Liquid", teleai: "TeleAI",
  inclusionai: "Inclusion AI", stockmark: "Stockmark", sarvamai: "Sarvam AI",
  canopylabs: "Canopy Labs", groq: "Groq", poolside: "Poolside", "cognitivecomputations": "Cognitive Computations",
};

const PROVIDER_KEYWORDS = [
  [/(^gpt|^o[1-4]\b|chatgpt|dall-?e|davinci|babbage|text-embedding|whisper|^tts|^omni|codex-)/i, "OpenAI"],
  [/claude/i, "Anthropic"],
  [/(gemini|gemma|palm|imagen|veo)/i, "Google"],
  [/grok/i, "xAI"],
  [/deepseek/i, "DeepSeek"],
  [/(glm|chatglm|cogview|cogvideo|THUDM)/i, "Zhipu"],
  [/(qwen|qwq)/i, "Alibaba"],
  [/llama/i, "Meta"],
  [/(mistral|mixtral|codestral|ministral|pixtral|devstral|magistral|voxtral|leanstral)/i, "Mistral"],
  [/(command|cohere|^c4ai|(^|[-/])north-)/i, "Cohere"],
  [/nemotron/i, "NVIDIA"],
  [/(mimo|miclaw|xiaomi)/i, "Xiaomi"],
  [/(hunyuan|tencent)/i, "Tencent"],
  [/(ernie|baidu)/i, "Baidu"],
  [/(doubao|seedance|seed-|bytedance)/i, "ByteDance"],
  [/(minimax|abab|hailuo)/i, "MiniMax"],
  [/sensenova|sensevoice/i, "SenseTime"],
  [/intern/i, "Shanghai AI Lab"],
  [/(^|[-/])step|stepfun|stepaudio/i, "StepFun"],
  [/(^yi-|01-ai)/i, "01.AI"],
  [/(bge|bce)/i, "BAAI"],
  [/(flux|stable-diffusion|^sd-?xl|^sd3|^sd-|StableDiffusion)/i, "Stability"],
  [/kling/i, "Kuaishou"],
  [/kimi|moonshot/i, "Moonshot"],
  [/nex/i, "Nex"],
  [/agnes/i, "Agnes"],
  [/Kolors/i, "Kwai"],
  [/PaddleOCR/i, "PaddlePaddle"],
  [/TeleSpeech/i, "TeleAI"],
  [/sarvam/i, "Sarvam AI"],
  [/orpheus/i, "Canopy Labs"],
  [/dolphin/i, "Cognitive Computations"],
  [/hermes/i, "Nous Research"],
  [/laguna/i, "Poolside"],
  [/kilo/i, "Kilo"],
  [/allam/i, "Allam"],
  [/mercury/i, "Inception"],
  [/huatuogpt/i, "HuaTuo"],
  [/Spark/i, "iFlytek"],
  [/kat-coder/i, "KAT"],
  [/LongCat/i, "LongCat"],
  [/Z-Image/i, "Zhipu"],
  [/ring-/i, "Inclusion AI"],
  [/stockmark/i, "Stockmark"],
  [/solar-/i, "Upstage"],
  [/riva/i, "NVIDIA"],
  [/gliner/i, "NVIDIA"],
  [/ising/i, "NVIDIA"],
];

function titleCase(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function prettyProvider(raw) {
  const key = String(raw || "").toLowerCase().trim();
  return PROVIDER_PRETTY[key] || titleCase(raw) || "Khác";
}

function deriveProvider(id, ownedBy) {
  if (id.includes("/")) {
    const prefix = id.split("/")[0];
    const pretty = prettyProvider(prefix);
    if (pretty !== "Khác") return pretty;
  }
  for (const [pattern, name] of PROVIDER_KEYWORDS) {
    if (pattern.test(id)) return name;
  }
  const owner = String(ownedBy || "").toLowerCase();
  if (owner && owner !== "openai" && owner !== "system" && owner !== "custom") {
    const pretty = prettyProvider(ownedBy);
    if (pretty !== "Khác") return pretty;
  }
  return "Khác";
}

function lookupMetadata(modelId) {
  if (typeof MODEL_METADATA !== "undefined" && MODEL_METADATA[modelId]) {
    return MODEL_METADATA[modelId];
  }
  return null;
}

function getModelType(modelId, metadata) {
  if (metadata && metadata.type) return metadata.type;
  return "Chat";
}

function getModelCaps(modelId, metadata) {
  if (metadata && metadata.caps && metadata.caps.length) return metadata.caps;
  return [];
}

function getModelContext(modelId, metadata) {
  if (metadata && metadata.context) return metadata.context;
  const match = modelId.match(/[-_/ ](\d+(?:\.\d+)?)\s*([km])\b/i);
  if (match) {
    const value = match[1];
    const unit = match[2].toUpperCase();
    return `${value}${unit}`;
  }
  return "";
}

function decorateModel(model) {
  const metadata = lookupMetadata(model.id);
  const type = getModelType(model.id, metadata);
  return {
    ...model,
    type,
    providerLabel: deriveProvider(model.id, model.provider),
    caps: getModelCaps(model.id, metadata),
    context: getModelContext(model.id, metadata),
  };
}

/* --------------------------------- core data -------------------------------- */

function normalizeModels(data) {
  const rawModels = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.models)
      ? data.models
      : Array.isArray(data)
        ? data
        : [];

  return rawModels
    .map((model) => {
      const id = model?.id || model?.name || model?.model;
      if (typeof id !== "string" || !id.trim()) return null;

      const provider = model?.owned_by || model?.provider || model?.owner || "Unknown";

      return decorateModel({
        id: id.trim(),
        provider,
        endpoint: typeof model?.endpoint === "string" && model.endpoint.trim() ? model.endpoint.trim() : "",
      });
    })
    .filter(Boolean);
}

function getSharedModelsCache() {
  return sharedModelsCache;
}

function setSharedModelsCache(models) {
  sharedModelsCache = Array.isArray(models) ? models : [];
  processedCache = { key: "", value: [] };
}

function filterModelsByQuery(models, query) {
  const normalizedQuery = (query || "").trim().toLowerCase();
  if (!normalizedQuery) return models;

  return models.filter((model) =>
    [model.id, model.providerLabel, model.provider, model.type, model.endpoint, ...(model.caps || [])]
      .some((value) => String(value || "").toLowerCase().includes(normalizedQuery))
  );
}

function renderModelCards(models, target) {
  if (!target) return;
  if (!models.length) {
    target.innerHTML = "Không có model nào để hiển thị.";
    return;
  }
  target.innerHTML = models
    .map((model) => `
      <div class="message">
        <strong>${model.id}</strong><br />
        <span>owned_by: ${model.providerLabel || model.provider || "Unknown"}</span>
      </div>
    `)
    .join("");
}

function populateModelSelect(models, selectEl) {
  if (!selectEl) return;
  selectEl.innerHTML = models
    .map((model) => `<option value="${model.id}">${model.id}</option>`)
    .join("");
}

/* --------------------------------- helpers ---------------------------------- */

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function providerHue(name) {
  let hash = 0;
  const key = String(name || "");
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % 360;
  }
  return hash;
}

function relativeTime(date) {
  if (!date) return "—";
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 10) return "Cập nhật vừa xong";
  if (seconds < 60) return `Cập nhật ${seconds}s trước`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `Cập nhật ${minutes}m trước`;
  const hours = Math.round(minutes / 60);
  return `Cập nhật ${hours}h trước`;
}

function getModelsRefs() {
  return {
    searchInput: document.getElementById("modelsSearchInput"),
    providerFilter: document.getElementById("modelsProviderFilter"),
    typeFilter: document.getElementById("modelsTypeFilter"),
    sortSelect: document.getElementById("modelsSortSelect"),
    refreshButton: document.getElementById("modelsRefreshButton"),
    totalCount: document.getElementById("modelsTotalCount"),
    providerCount: document.getElementById("modelsProviderCount"),
    updatedAt: document.getElementById("modelsUpdatedAt"),
    tableBody: document.getElementById("modelsSectionTable"),
    state: document.getElementById("modelsSectionStatus"),
    rangeInfo: document.getElementById("modelsRangeInfo"),
    indicator: document.getElementById("modelsPageIndicator"),
    prevButton: document.getElementById("modelsPrevPage"),
    nextButton: document.getElementById("modelsNextPage"),
  };
}

/* ----------------------------- filter + sorting ----------------------------- */

function compareModels(a, b) {
  switch (currentSort) {
    case "name-desc":
      return b.id.toLowerCase().localeCompare(a.id.toLowerCase());
    case "provider":
      return (a.providerLabel || "").localeCompare(b.providerLabel || "")
        || a.id.toLowerCase().localeCompare(b.id.toLowerCase());
    case "context-desc":
      return (contextToNumber(b.context) - contextToNumber(a.context))
        || a.id.toLowerCase().localeCompare(b.id.toLowerCase());
    case "name-asc":
    default:
      return a.id.toLowerCase().localeCompare(b.id.toLowerCase());
  }
}

function contextToNumber(context) {
  if (!context) return 0;
  const match = String(context).match(/^(\d+(?:\.\d+)?)([KM])$/i);
  if (!match) return 0;
  const value = Number(match[1]);
  return match[2].toUpperCase() === "M" ? value * 1_000_000 : value * 1_000;
}

function getProcessedModels() {
  const key = [
    currentModelsQuery.trim().toLowerCase(),
    currentProviderFilter,
    currentTypeFilter,
    currentSort,
    sharedModelsCache.length,
  ].join("|");

  if (processedCache.key === key) return processedCache.value;

  let list = filterModelsByQuery(sharedModelsCache, currentModelsQuery);
  if (currentProviderFilter === OTHER_PROVIDER) {
    const major = getMajorProviders();
    list = list.filter((model) => !major.has(model.providerLabel));
  } else if (currentProviderFilter !== "all") {
    list = list.filter((model) => model.providerLabel === currentProviderFilter);
  }
  if (currentTypeFilter !== "all") {
    list = list.filter((model) => model.type === currentTypeFilter);
  }
  list = [...list].sort(compareModels);

  processedCache = { key, value: list };
  return list;
}

/* --------------------------------- rendering -------------------------------- */

function rowMarkup(model) {
  const id = escapeHtml(model.id);
  const provider = escapeHtml(model.providerLabel || "Khác");
  const initial = escapeHtml((model.providerLabel || "?").charAt(0).toUpperCase());
  const type = escapeHtml(model.type);
  const context = model.context ? escapeHtml(model.context) : "—";

  const caps = model.caps && model.caps.length
    ? model.caps.map((cap) => `<span class="cap cap-${escapeHtml(cap.toLowerCase().replace(/[^a-z0-9]/g, "-"))}">${escapeHtml(cap)}</span>`).join("")
    : `<span class="cell-empty">—</span>`;

  return `
    <div class="models-row" role="row">
      <div class="col-model" role="cell" data-label="Model">
        <span class="m-id" title="${id}">${id}</span>
      </div>
      <div class="col-provider" role="cell" data-label="Provider">
        <span class="prov" style="--hue:${providerHue(model.providerLabel)}"><span class="prov-badge">${initial}</span>${provider}</span>
      </div>
      <div class="col-type" role="cell" data-label="Type">
        <span class="type-tag type-${type.toLowerCase()}">${type}</span>
      </div>
      <div class="col-caps" role="cell" data-label="Capabilities">${caps}</div>
      <div class="col-ctx" role="cell" data-label="Context">${context}</div>
      <div class="col-status" role="cell" data-label="Status">
        <span class="status-ok"><i></i>Available</span>
      </div>
      <div class="col-actions" role="cell">
        <button type="button" class="row-btn" data-model-details="${id}">View</button>
        <button type="button" class="row-btn ghost" data-model-copy="${id}">Copy ID</button>
      </div>
    </div>
  `;
}

function setState(refs, message) {
  if (!refs.state) return;
  if (!message) {
    refs.state.hidden = true;
    refs.state.textContent = "";
    return;
  }
  refs.state.hidden = false;
  refs.state.textContent = message;
}

const OTHER_PROVIDER = "Khác";

function getMajorProviders() {
  const counts = new Map();
  sharedModelsCache.forEach((m) => {
    counts.set(m.providerLabel, (counts.get(m.providerLabel) || 0) + 1);
  });
  const major = new Set();
  counts.forEach((count, provider) => {
    if (provider !== OTHER_PROVIDER && count > 1) major.add(provider);
  });
  return major;
}

function populateFilterOptions(refs) {
  if (refs.providerFilter) {
    const major = getMajorProviders();
    const hasOther = sharedModelsCache.some((m) => !major.has(m.providerLabel));

    const providers = [...major].sort((a, b) => a.localeCompare(b));
    const options = [`<option value="all">Tất cả provider</option>`]
      .concat(providers.map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`));
    if (hasOther) {
      options.push(`<option value="${OTHER_PROVIDER}">${OTHER_PROVIDER}</option>`);
    }

    refs.providerFilter.innerHTML = options.join("");

    const validValues = new Set([...providers, "all", ...(hasOther ? [OTHER_PROVIDER] : [])]);
    if (!validValues.has(currentProviderFilter)) currentProviderFilter = "all";
    refs.providerFilter.value = currentProviderFilter;
  }

  if (refs.typeFilter) {
    const order = ["Chat", "Reasoning", "Multimodal", "Image Generation", "Video", "Audio", "Speech", "Embedding", "Rerank", "OCR", "Moderation", "Translation", "Safety", "Unknown"];
    const types = [...new Set(sharedModelsCache.map((m) => m.type))]
      .sort((a, b) => {
        const ai = order.indexOf(a);
        const bi = order.indexOf(b);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });
    refs.typeFilter.innerHTML = `<option value="all">Tất cả loại</option>`
      + types.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
    refs.typeFilter.value = types.includes(currentTypeFilter) ? currentTypeFilter : "all";
  }
}

function renderStats(refs) {
  if (refs.totalCount) refs.totalCount.textContent = String(sharedModelsCache.length);
  if (refs.providerCount) {
    refs.providerCount.textContent = String(new Set(sharedModelsCache.map((m) => m.providerLabel)).size);
  }
  if (refs.updatedAt) refs.updatedAt.textContent = relativeTime(modelsLastUpdated);
}

function renderTable() {
  const refs = getModelsRefs();
  if (!refs.tableBody) return;

  const models = getProcessedModels();
  const totalPages = Math.max(1, Math.ceil(models.length / MODELS_PER_PAGE));
  currentModelsPage = Math.min(Math.max(1, currentModelsPage), totalPages);

  const start = (currentModelsPage - 1) * MODELS_PER_PAGE;
  const pageItems = models.slice(start, start + MODELS_PER_PAGE);

  renderStats(refs);

  if (!sharedModelsCache.length) {
    refs.tableBody.innerHTML = "";
    setState(refs, "Chưa có dữ liệu model. Bấm Làm mới để tải lại.");
  } else if (!models.length) {
    refs.tableBody.innerHTML = "";
    setState(refs, "Không có model phù hợp với bộ lọc hiện tại.");
  } else {
    setState(refs, "");
    refs.tableBody.innerHTML = pageItems.map(rowMarkup).join("");
  }

  if (refs.rangeInfo) {
    refs.rangeInfo.textContent = models.length
      ? `${start + 1}–${start + pageItems.length} / ${models.length} model`
      : "0 model";
  }
  if (refs.indicator) refs.indicator.textContent = `${currentModelsPage} / ${totalPages}`;
  if (refs.prevButton) refs.prevButton.disabled = currentModelsPage <= 1;
  if (refs.nextButton) refs.nextButton.disabled = currentModelsPage >= totalPages;
}

/* --------------------------------- details ---------------------------------- */

function ensureDetailsModal() {
  let overlay = document.getElementById("modelDetailsOverlay");
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = "modelDetailsOverlay";
  overlay.className = "model-details-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="model-details-card" role="dialog" aria-modal="true" aria-labelledby="modelDetailsTitle">
      <div class="model-details-head">
        <h3 id="modelDetailsTitle">Model</h3>
        <button type="button" class="model-details-close" aria-label="Đóng">×</button>
      </div>
      <div class="model-details-body" id="modelDetailsBody"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => { overlay.hidden = true; };
  overlay.addEventListener("click", (event) => { if (event.target === overlay) close(); });
  overlay.querySelector(".model-details-close")?.addEventListener("click", close);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !overlay.hidden) close();
  });

  return overlay;
}

function openModelDetails(model) {
  if (!model) return;
  const overlay = ensureDetailsModal();
  const title = overlay.querySelector("#modelDetailsTitle");
  const body = overlay.querySelector("#modelDetailsBody");
  if (title) title.textContent = model.id;

  const rows = [
    ["Provider", model.providerLabel || "—"],
    ["Type", model.type],
    ["Capabilities", model.caps && model.caps.length ? model.caps.join(", ") : "—"],
    ["Context window", model.context || "Không công bố"],
    ["Endpoint", model.endpoint || "openai-compatible"],
    ["Model ID", model.id],
  ];

  if (body) {
    body.innerHTML = rows.map(([label, value]) => `
      <div class="model-details-row">
        <span class="dt">${escapeHtml(label)}</span>
        <span class="dd">${escapeHtml(value)}</span>
      </div>
    `).join("");
  }
  overlay.hidden = false;
}

async function copyModelId(id, trigger) {
  try {
    await navigator.clipboard.writeText(id);
    if (trigger) {
      const original = trigger.textContent;
      trigger.textContent = "Đã copy";
      trigger.classList.add("is-copied");
      window.setTimeout(() => {
        trigger.textContent = original;
        trigger.classList.remove("is-copied");
      }, 1100);
    }
  } catch {
    if (trigger) trigger.textContent = "Lỗi copy";
  }
}

/* ---------------------------------- events ---------------------------------- */

function bindModelsEvents() {
  const refs = getModelsRefs();

  refs.searchInput?.addEventListener("input", () => {
    window.clearTimeout(searchDebounceTimer);
    searchDebounceTimer = window.setTimeout(() => {
      currentModelsQuery = refs.searchInput.value || "";
      currentModelsPage = 1;
      renderTable();
    }, 180);
  });

  refs.providerFilter?.addEventListener("change", () => {
    currentProviderFilter = refs.providerFilter.value || "all";
    currentModelsPage = 1;
    renderTable();
  });

  refs.typeFilter?.addEventListener("change", () => {
    currentTypeFilter = refs.typeFilter.value || "all";
    currentModelsPage = 1;
    renderTable();
  });

  refs.sortSelect?.addEventListener("change", () => {
    currentSort = refs.sortSelect.value || "name-asc";
    currentModelsPage = 1;
    renderTable();
  });

  refs.refreshButton?.addEventListener("click", async () => {
    refs.refreshButton.classList.add("is-loading");
    try {
      await fetchAllModels(true);
      modelsLastUpdated = new Date();
      populateFilterOptions(refs);
      renderTable();
    } catch (error) {
      setState(refs, error.message || "Không thể làm mới danh sách model.");
    } finally {
      refs.refreshButton.classList.remove("is-loading");
    }
  });

  refs.prevButton?.addEventListener("click", () => {
    currentModelsPage = Math.max(1, currentModelsPage - 1);
    renderTable();
  });

  refs.nextButton?.addEventListener("click", () => {
    currentModelsPage += 1;
    renderTable();
  });

  refs.tableBody?.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;

    const copyId = target.getAttribute("data-model-copy");
    if (copyId) {
      copyModelId(copyId, target);
      return;
    }

    const detailId = target.getAttribute("data-model-details");
    if (detailId) {
      openModelDetails(sharedModelsCache.find((model) => model.id === detailId));
    }
  });
}

/* --------------------------------- fetching --------------------------------- */

function buildModelsEndpoint(baseUrl) {
  const normalized = String(baseUrl || "").trim().replace(/\/+$/, "");
  if (!normalized) return "";
  return `${normalized}/models`;
}

async function resolveApiConfigEntry() {
  // Primary key of the logged-in account (stored in SQL)
  return typeof window.ensureApiConfigEntry === "function" ? window.ensureApiConfigEntry() : null;
}

async function requestModelsJson(url, token, extra = {}) {
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    ...extra,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return response.json();
}

// Models of the logged-in account's own primary key (used by the dashboard playground)
async function fetchSharedModels(forceRefresh = false) {
  if (!forceRefresh && sharedModelsCache.length) {
    return { models: sharedModelsCache, data: { data: sharedModelsCache } };
  }

  const entry = await resolveApiConfigEntry();
  const token = entry?.token || "";
  const endpoint = buildModelsEndpoint(entry?.url);

  if (!token || !endpoint) {
    setSharedModelsCache([]);
    throw new Error("Chưa cấu hình API để tải danh sách model.");
  }

  const data = await requestModelsJson(endpoint, token);
  const normalizedModels = normalizeModels(data);

  if (!normalizedModels.length) {
    setSharedModelsCache([]);
    throw new Error("API không trả về model hợp lệ.");
  }

  setSharedModelsCache(normalizedModels);
  return { models: normalizedModels, data };
}

// Models page: the server asks only the logged-in account's own keys and returns the merged list
async function fetchAllModels(forceRefresh = false) {
  const data = await requestModelsJson(forceRefresh ? "/api/models/all?refresh=1" : "/api/models/all", "", { credentials: "same-origin" });
  const normalizedModels = normalizeModels(data);

  if (!normalizedModels.length) {
    setSharedModelsCache([]);
    throw new Error(data?.meta?.keys
      ? "Các API key của tài khoản này không trả về model nào."
      : "Tài khoản này chưa cấu hình API key. Vui lòng đăng nhập và cấu hình API để xem danh sách model.");
  }

  setSharedModelsCache(normalizedModels);
  return { models: normalizedModels, data };
}

/* ---------------------------------- mount ----------------------------------- */

async function mountModelsSection() {
  const mount = document.getElementById("modelsSectionMount");
  if (!mount) return;

  try {
    const response = await fetch("/html/models-section.html");
    if (!response.ok) throw new Error(`Failed to load models section: ${response.status}`);

    mount.innerHTML = await response.text();
    bindModelsEvents();

    const refs = getModelsRefs();
    setState(refs, "Đang tải danh sách model...");

    await fetchAllModels();
    modelsLastUpdated = new Date();
    populateFilterOptions(refs);
    renderTable();
  } catch (error) {
    console.error(error);
    setSharedModelsCache([]);
    const refs = getModelsRefs();
    renderStats(refs);
    setState(refs, error.message || "Không thể tải danh sách mô hình.");
  }
}

window.fetchSharedModels = fetchSharedModels;
window.fetchAllModels = fetchAllModels;
window.getSharedModelsCache = getSharedModelsCache;
window.filterModelsByQuery = filterModelsByQuery;
window.renderModelCards = renderModelCards;
window.populateModelSelect = populateModelSelect;
window.mountModelsSection = mountModelsSection;
