let showcaseTabs;
let showcaseMeta;
let showcaseMethod;
let showcaseEndpoint;
let showcaseRequestLabel;
let showcaseRequestCode;
let showcaseResponseLabel;
let showcaseResponseCode;
let showcaseFooter;
let currentShowcaseTab = "responses";

const showcaseContent = {
    chat: {
        meta: "JSON SSE",
        method: "POST",
        endpoint: "/v1/chat/completions",
        requestLabel: "REQUEST",
        responseLabel: "RESPONSE",
        requestCode: `curl -X POST "/v1/chat/completions" \\
  -H "Authorization: Bearer sk-******" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4.1-mini",
    "messages": [{ "role": "user", "content": "Hello AI STORE" }],
    "stream": true
  }'`,
        responseCode: `data: {"choices":[{"delta":{"content":"Hello"}}]}

data: {"choices":[{"delta":{"content":" from AI STORE"}}]}

data: [DONE]`,
        footer: ["1420 MS", "64 TOKENS", "STREAM • SSE"],
    },
    responses: {
        meta: "JSON SSE",
        method: "POST",
        endpoint: "/v1/responses",
        requestLabel: "REQUEST",
        responseLabel: "RESPONSE",
        requestCode: `curl -X POST "/v1/responses" \\
  -H "Authorization: Bearer sk-******" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "your-model",
    "input": "..."
  }'`,
        responseCode: `{
  "output": [{ "type": "output_text", "text": "Response workflow ready." }],
  "usage": { "total_tokens": 31 }
}`,
        footer: ["2381 MS", "31 TOKENS", "STREAM • SSE"],
    },
    claude: {
        meta: "JSON",
        method: "POST",
        endpoint: "/v1/messages",
        requestLabel: "REQUEST",
        responseLabel: "RESPONSE",
        requestCode: `curl -X POST "/v1/messages" \\
  -H "x-api-key: sk-******" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-3-5-sonnet",
    "max_tokens": 256,
    "messages": [{ "role": "user", "content": "Summarize our release notes." }]
  }'`,
        responseCode: `{
  "id": "msg_01",
  "content": [{ "type": "text", "text": "Here is a concise product summary..." }],
  "stop_reason": "end_turn"
}`,
        footer: ["1876 MS", "52 TOKENS", "READY • JSON"],
    },
    gemini: {
        meta: "JSON",
        method: "POST",
        endpoint: "/v1beta/models/gemini-1.5-pro:generateContent",
        requestLabel: "REQUEST",
        responseLabel: "RESPONSE",
        requestCode: `curl -X POST "/v1beta/models/gemini-1.5-pro:generateContent" \\
  -H "Authorization: Bearer sk-******" \\
  -H "Content-Type: application/json" \\
  -d '{
    "contents": [{ "parts": [{ "text": "Generate a launch headline" }] }]
  }'`,
        responseCode: `{
  "candidates": [{
    "content": { "parts": [{ "text": "Launch faster with a unified AI gateway." }] }
  }],
  "usageMetadata": { "totalTokenCount": 44 }
}`,
        footer: ["1644 MS", "44 TOKENS", "READY • JSON"],
    },
};

function refreshShowcaseRefs() {
    showcaseTabs = document.getElementById("showcaseTabs");
    showcaseMeta = document.getElementById("showcaseMeta");
    showcaseMethod = document.getElementById("showcaseMethod");
    showcaseEndpoint = document.getElementById("showcaseEndpoint");
    showcaseRequestLabel = document.getElementById("showcaseRequestLabel");
    showcaseRequestCode = document.getElementById("showcaseRequestCode");
    showcaseResponseLabel = document.getElementById("showcaseResponseLabel");
    showcaseResponseCode = document.getElementById("showcaseResponseCode");
    showcaseFooter = document.getElementById("showcaseFooter");
}

function renderShowcaseTab(tabName) {
    const content = showcaseContent[tabName] || showcaseContent.responses;
    currentShowcaseTab = tabName;

    showcaseTabs?.querySelectorAll("[data-showcase-tab]").forEach((button) => {
        button.classList.toggle("active", button.dataset.showcaseTab === tabName);
    });

    const showcaseRoot = document.querySelector(".hero-showcase");
    showcaseRoot?.classList.add("is-switching");

    window.setTimeout(() => {
        if (showcaseMeta) showcaseMeta.textContent = content.meta;
        if (showcaseMethod) showcaseMethod.textContent = content.method;
        if (showcaseEndpoint) showcaseEndpoint.textContent = content.endpoint;
        if (showcaseRequestLabel) showcaseRequestLabel.textContent = content.requestLabel;
        if (showcaseRequestCode) showcaseRequestCode.textContent = content.requestCode;
        if (showcaseResponseLabel) showcaseResponseLabel.textContent = content.responseLabel;
        if (showcaseResponseCode) showcaseResponseCode.textContent = content.responseCode;
        if (showcaseFooter) {
            showcaseFooter.innerHTML = content.footer.map((item) => `<span>${item}</span>`).join("");
        }

        showcaseRoot?.classList.remove("is-switching");
    }, 130);
}

function bindShowcaseTabEvents() {
    showcaseTabs?.querySelectorAll("[data-showcase-tab]").forEach((button) => {
        button.addEventListener("click", () => {
            renderShowcaseTab(button.dataset.showcaseTab || "responses");
        });
    });
}

async function mountShowcasePartial() {
    const mount = document.getElementById("showcaseMount");
    if (!mount) return;

    try {
        const response = await fetch("html/showcase.html");
        if (!response.ok) {
            throw new Error(`Failed to load showcase partial: ${response.status}`);
        }

        mount.innerHTML = await response.text();
        refreshShowcaseRefs();
        bindShowcaseTabEvents();
        renderShowcaseTab(currentShowcaseTab);
    } catch (error) {
        console.error(error);
    }
}

window.refreshShowcaseRefs = refreshShowcaseRefs;
window.renderShowcaseTab = renderShowcaseTab;
window.mountShowcasePartial = mountShowcasePartial;
