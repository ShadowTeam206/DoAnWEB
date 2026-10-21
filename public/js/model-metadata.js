/**
 * Model metadata database - researched per-model from official documentation.
 * Type: Chat | Reasoning | Multimodal | Embedding | Image Generation | Speech | Audio | Video | Rerank | Moderation | OCR | Translation | Safety | Unknown
 * Capabilities: Input/Output modalities, Function Calling, Structured Output, Vision, Audio, Web Search, Code Generation, Image Generation, Streaming, Reasoning, MCP, etc.
 * Context: Context window size (e.g., "128K", "1M", "200K") or "Unknown"
 *
 * Sources: OpenAI Platform Docs, Mistral AI Docs, Zhipu AI Docs, Qwen Docs, Google AI Docs, xAI Docs, NVIDIA Docs, Hugging Face Model Cards.
 */

const MODEL_METADATA = {
  // ============================================================
  // OpenAI GPT-5 family (source: platform.openai.com/docs/models)
  // ============================================================
  "gpt-5": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Structured Output", "Vision", "Streaming", "Web Search", "Computer Use"], context: "1M" },
  "gpt-5-1": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Structured Output", "Vision", "Streaming", "Web Search", "Computer Use"], context: "1M" },
  "gpt-5-2": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Structured Output", "Vision", "Streaming", "Web Search", "Computer Use"], context: "1M" },
  "gpt-5-3": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Structured Output", "Vision", "Streaming", "Web Search", "Computer Use"], context: "1M" },
  "gpt-5-5": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Structured Output", "Vision", "Streaming", "Web Search", "Computer Use", "Reasoning"], context: "1M" },
  "gpt-5.1": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Structured Output", "Vision", "Streaming", "Web Search", "Computer Use"], context: "1M" },
  "gpt-5.2": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Structured Output", "Vision", "Streaming", "Web Search", "Computer Use"], context: "1M" },
  "gpt-5.3": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Structured Output", "Vision", "Streaming", "Web Search", "Computer Use"], context: "1M" },
  "gpt-5.3-mini": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Structured Output", "Vision", "Streaming", "Web Search"], context: "400K" },
  "gpt-5.5": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Structured Output", "Vision", "Streaming", "Web Search", "Computer Use", "Reasoning"], context: "1M" },
  "gpt-5-mini": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Structured Output", "Vision", "Streaming", "Web Search"], context: "400K" },
  "gpt-5-3-mini": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Structured Output", "Vision", "Streaming", "Web Search"], context: "400K" },
  // OpenAI special models
  "ChatGPT\u20114\u2011Turbo": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Function Calling", "Structured Output", "Vision", "Streaming"], context: "128K" },
  "gpt-image-2": { type: "Image Generation", caps: ["Text Input", "Image Output", "Image Editing"], context: "Unknown" },
  "codex-gpt-image-2": { type: "Image Generation", caps: ["Text Input", "Image Output", "Image Editing"], context: "Unknown" },
  "gpt-oss-20b": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "128K" },
  "openai/gpt-oss-20b": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "128K" },
  "openai/gpt-oss-20b:free": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "128K" },
  "openai/gpt-oss-120b": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming"], context: "128K" },
  "openai/gpt-oss-120b:free": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming"], context: "128K" },
  "openai/gpt-oss-safeguard-20b": { type: "Safety", caps: ["Text Input", "Text Output", "Content Moderation"], context: "128K" },
  // OpenAI Whisper (source: platform.openai.com/docs/guides/speech-to-text)
  "whisper-large-v3": { type: "Speech", caps: ["Audio Input", "Text Output", "Transcription", "Translation"], context: "Unknown" },
  "whisper-large-v3-turbo": { type: "Speech", caps: ["Audio Input", "Text Output", "Transcription", "Translation"], context: "Unknown" },

  // ============================================================
  // GLM family - Zhipu AI (source: open.bigmodel.cn docs)
  // ============================================================
  "GLM-5": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning", "Web Search"], context: "128K" },
  "GLM-5-Search": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Web Search"], context: "128K" },
  "GLM-5-thinking": { type: "Reasoning", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning"], context: "128K" },
  "GLM-5-thinking-search": { type: "Reasoning", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning", "Web Search"], context: "128K" },
  "GLM-5-Turbo": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming"], context: "128K" },
  "GLM-5-Turbo-search": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Web Search"], context: "128K" },
  "GLM-5-Turbo-thinking": { type: "Reasoning", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning"], context: "128K" },
  "GLM-5-Turbo-thinking-search": { type: "Reasoning", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning", "Web Search"], context: "128K" },
  "GLM-5.1": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning", "Web Search"], context: "128K" },
  "GLM-5.1-search": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Web Search"], context: "128K" },
  "GLM-5.1-thinking": { type: "Reasoning", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning"], context: "128K" },
  "GLM-5.1-thinking-search": { type: "Reasoning", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning", "Web Search"], context: "128K" },
  "GLM-5v-Turbo": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Vision", "Function Calling", "Streaming"], context: "128K" },
  "GLM-5v-Turbo-search": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Vision", "Function Calling", "Streaming", "Web Search"], context: "128K" },
  "GLM-5v-Turbo-thinking": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Vision", "Function Calling", "Streaming", "Reasoning"], context: "128K" },
  "GLM-5v-Turbo-thinking-search": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Vision", "Function Calling", "Streaming", "Reasoning", "Web Search"], context: "128K" },
  "GLM-4.5": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming"], context: "128K" },
  "GLM-4.5-Air": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming"], context: "128K" },
  "GLM-4.5-Air-search": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Web Search"], context: "128K" },
  "GLM-4.5-Air-thinking": { type: "Reasoning", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning"], context: "128K" },
  "GLM-4.5-Air-thinking-search": { type: "Reasoning", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning", "Web Search"], context: "128K" },
  "GLM-4.5-Search": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Web Search"], context: "128K" },
  "GLM-4.5-Thinking": { type: "Reasoning", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning"], context: "128K" },
  "GLM-4.5-thinking-search": { type: "Reasoning", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning", "Web Search"], context: "128K" },
  "GLM-4.5-V": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Vision", "Function Calling", "Streaming"], context: "128K" },
  "GLM-4.5-V-search": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Vision", "Function Calling", "Streaming", "Web Search"], context: "128K" },
  "GLM-4.5-V-thinking": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Vision", "Function Calling", "Streaming", "Reasoning"], context: "128K" },
  "GLM-4.5-V-thinking-search": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Vision", "Function Calling", "Streaming", "Reasoning", "Web Search"], context: "128K" },
  "GLM-4.6": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming"], context: "128K" },
  "GLM-4.6-search": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Web Search"], context: "128K" },
  "GLM-4.6-Thinking": { type: "Reasoning", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning"], context: "128K" },
  "GLM-4.6-thinking-search": { type: "Reasoning", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning", "Web Search"], context: "128K" },
  "GLM-4.6-V": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Vision", "Function Calling", "Streaming"], context: "128K" },
  "GLM-4.6-V-search": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Vision", "Function Calling", "Streaming", "Web Search"], context: "128K" },
  "GLM-4.6-V-thinking": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Vision", "Function Calling", "Streaming", "Reasoning"], context: "128K" },
  "GLM-4.6-V-thinking-search": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Vision", "Function Calling", "Streaming", "Reasoning", "Web Search"], context: "128K" },
  "GLM-4.6V-Flash": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Vision", "Streaming"], context: "128K" },
  "glm-4.6v": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Vision", "Function Calling", "Streaming"], context: "128K" },
  "glm-4.6v-search": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Vision", "Function Calling", "Streaming", "Web Search"], context: "128K" },
  "glm-4.6v-thinking": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Vision", "Function Calling", "Streaming", "Reasoning"], context: "128K" },
  "glm-4.6v-thinking-search": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Vision", "Function Calling", "Streaming", "Reasoning", "Web Search"], context: "128K" },
  "GLM-4.1V-Thinking-FlashX": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Vision", "Streaming", "Reasoning"], context: "128K" },
  "GLM-4.1V-Thinking-FlashX-search": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Vision", "Streaming", "Reasoning", "Web Search"], context: "128K" },
  "GLM-4.1V-Thinking-FlashX-thinking": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Vision", "Streaming", "Reasoning"], context: "128K" },
  "GLM-4.1V-Thinking-FlashX-thinking-search": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Vision", "Streaming", "Reasoning", "Web Search"], context: "128K" },
  "glm-4-flash": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming"], context: "128K" },
  "glm-4-flash-search": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Web Search"], context: "128K" },
  "glm-4-flash-thinking": { type: "Reasoning", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning"], context: "128K" },
  "glm-4-flash-thinking-search": { type: "Reasoning", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning", "Web Search"], context: "128K" },
  "glm-4-air-250414": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming"], context: "128K" },
  "glm-4-air-250414-search": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Web Search"], context: "128K" },
  "glm-4-air-250414-thinking": { type: "Reasoning", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning"], context: "128K" },
  "glm-4-air-250414-thinking-search": { type: "Reasoning", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning", "Web Search"], context: "128K" },
  "glm-4.7": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming"], context: "128K" },
  "Glm-4.7": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming"], context: "128K" },
  "GLM-4.7": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming"], context: "128K" },
  "GLM-4.7-search": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Web Search"], context: "128K" },
  "GLM-4.7-thinking": { type: "Reasoning", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning"], context: "128K" },
  "GLM-4.7-thinking-search": { type: "Reasoning", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning", "Web Search"], context: "128K" },
  "THUDM/GLM-4-9B-0414": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "128K" },
  "THUDM/GLM-Z1-9B-0414": { type: "Reasoning", caps: ["Text Input", "Text Output", "Streaming", "Reasoning"], context: "128K" },
  "z-ai/glm-4.5-air-free": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "128K" },

  // ============================================================
  // Mistral family (source: docs.mistral.ai/models)
  // ============================================================
  "mistral-large-latest": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Structured Output", "Vision", "Streaming"], context: "128K" },
  "mistral-large-2512": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Structured Output", "Vision", "Streaming"], context: "128K" },
  "mistral-large-2411": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Structured Output", "Vision", "Streaming"], context: "128K" },
  "mistral-large-pixtral-2411": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Function Calling", "Structured Output", "Vision", "Streaming"], context: "128K" },
  "mistral-medium-latest": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Structured Output", "Vision", "Streaming"], context: "128K" },
  "mistral-medium-3": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Structured Output", "Vision", "Streaming"], context: "128K" },
  "mistral-medium-3-5": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Structured Output", "Vision", "Streaming"], context: "128K" },
  "mistral-medium-3.5": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Structured Output", "Vision", "Streaming"], context: "128K" },
  "mistral-medium": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming"], context: "128K" },
  "mistral-medium-2505": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Structured Output", "Vision", "Streaming"], context: "128K" },
  "mistral-medium-2508": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Structured Output", "Vision", "Streaming"], context: "128K" },
  "mistral-medium-2604": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Structured Output", "Vision", "Streaming"], context: "128K" },
  "mistral-medium-c21211-r0-75": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming"], context: "128K" },
  "mistral-small-latest": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Structured Output", "Vision", "Streaming"], context: "128K" },
  "mistral-small-2506": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Structured Output", "Vision", "Streaming"], context: "128K" },
  "mistral-small-2603": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Structured Output", "Vision", "Streaming", "Reasoning"], context: "128K" },
  "mistral-tiny-latest": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "32K" },
  "mistral-tiny-2407": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "32K" },
  "ministral-3b-latest": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Vision", "Streaming"], context: "128K" },
  "ministral-3b-2512": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Vision", "Streaming"], context: "128K" },
  "ministral-8b-latest": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Vision", "Streaming"], context: "128K" },
  "ministral-8b-2512": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Vision", "Streaming"], context: "128K" },
  "ministral-14b-latest": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Vision", "Streaming"], context: "128K" },
  "ministral-14b-2512": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Vision", "Streaming"], context: "128K" },
  "mistralai/ministral-14b-instruct-2512": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Vision", "Streaming"], context: "128K" },
  "mistralai/mistral-small-4-119b-2603": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Structured Output", "Vision", "Streaming", "Reasoning"], context: "128K" },
  "mistralai/mistral-large-3-675b-instruct-2512": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Structured Output", "Vision", "Streaming"], context: "128K" },
  "mistralai/mistral-medium-3.5-128b": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Structured Output", "Vision", "Streaming"], context: "128K" },
  "mistralai/mistral-nemotron": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning"], context: "128K" },
  "mistralai/mistral-7b-instruct-v0.3": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "32K" },
  "mistralai/mixtral-8x7b-instruct-v0.1": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "32K" },
  "open-mistral-nemo": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming"], context: "128K" },
  "open-mistral-nemo-2407": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming"], context: "128K" },
  "pixtral-large-latest": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Function Calling", "Structured Output", "Vision", "Streaming"], context: "128K" },
  "pixtral-large-2411": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Function Calling", "Structured Output", "Vision", "Streaming"], context: "128K" },
  "codestral-latest": { type: "Chat", caps: ["Text Input", "Text Output", "Code Generation", "Streaming"], context: "256K" },
  "codestral-2508": { type: "Chat", caps: ["Text Input", "Text Output", "Code Generation", "Streaming"], context: "256K" },
  "codestral-embed": { type: "Embedding", caps: ["Text Input", "Embedding Output", "Code Embedding"], context: "256K" },
  "codestral-embed-2505": { type: "Embedding", caps: ["Text Input", "Embedding Output", "Code Embedding"], context: "256K" },
  "devstral-latest": { type: "Chat", caps: ["Text Input", "Text Output", "Code Generation", "Function Calling", "Streaming"], context: "128K" },
  "devstral-2512": { type: "Chat", caps: ["Text Input", "Text Output", "Code Generation", "Function Calling", "Streaming"], context: "128K" },
  "devstral-medium-latest": { type: "Chat", caps: ["Text Input", "Text Output", "Code Generation", "Function Calling", "Streaming"], context: "128K" },
  "devstral-medium-2507": { type: "Chat", caps: ["Text Input", "Text Output", "Code Generation", "Function Calling", "Streaming"], context: "128K" },
  "devstral-small-2507": { type: "Chat", caps: ["Text Input", "Text Output", "Code Generation", "Streaming"], context: "128K" },
  "magistral-small-latest": { type: "Reasoning", caps: ["Text Input", "Text Output", "Streaming", "Reasoning"], context: "128K" },
  "magistral-small-2509": { type: "Reasoning", caps: ["Text Input", "Text Output", "Streaming", "Reasoning"], context: "128K" },
  "magistral-medium-latest": { type: "Reasoning", caps: ["Text Input", "Text Output", "Streaming", "Reasoning"], context: "128K" },
  "magistral-medium-2509": { type: "Reasoning", caps: ["Text Input", "Text Output", "Streaming", "Reasoning"], context: "128K" },
  "mistral-embed": { type: "Embedding", caps: ["Text Input", "Embedding Output"], context: "8K" },
  "mistral-embed-2312": { type: "Embedding", caps: ["Text Input", "Embedding Output"], context: "8K" },
  "mistral-ocr-latest": { type: "OCR", caps: ["Image+PDF Input", "Text Output", "Document Parsing"], context: "Unknown" },
  "mistral-ocr-2505": { type: "OCR", caps: ["Image+PDF Input", "Text Output", "Document Parsing"], context: "Unknown" },
  "mistral-ocr-2512": { type: "OCR", caps: ["Image+PDF Input", "Text Output", "Document Parsing"], context: "Unknown" },
  "mistral-moderation-latest": { type: "Moderation", caps: ["Text Input", "Classification Output", "Content Moderation"], context: "128K" },
  "mistral-moderation-2411": { type: "Moderation", caps: ["Text Input", "Classification Output", "Content Moderation"], context: "128K" },
  "mistral-moderation-2603": { type: "Moderation", caps: ["Text Input", "Classification Output", "Content Moderation"], context: "128K" },
  "mistral-vibe-cli-latest": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "128K" },
  "mistral-vibe-cli-fast": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "128K" },
  "mistral-vibe-cli-with-tools": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming"], context: "128K" },
  "labs-leanstral-2603": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "128K" },
  // Mistral Voxtral family (source: docs.mistral.ai/models)
  "voxtral-mini-latest": { type: "Audio", caps: ["Text+Audio Input", "Text Output", "Streaming"], context: "128K" },
  "voxtral-mini-2507": { type: "Audio", caps: ["Text+Audio Input", "Text Output", "Streaming"], context: "128K" },
  "voxtral-mini-2602": { type: "Audio", caps: ["Text+Audio Input", "Text Output", "Streaming"], context: "128K" },
  "voxtral-mini-realtime-latest": { type: "Audio", caps: ["Audio Input", "Audio Output", "Streaming", "Realtime"], context: "Unknown" },
  "voxtral-mini-realtime-2602": { type: "Audio", caps: ["Audio Input", "Audio Output", "Streaming", "Realtime"], context: "Unknown" },
  "voxtral-mini-transcribe-2507": { type: "Speech", caps: ["Audio Input", "Text Output", "Transcription"], context: "Unknown" },
  "voxtral-mini-transcribe-realtime-2602": { type: "Speech", caps: ["Audio Input", "Text Output", "Transcription", "Realtime"], context: "Unknown" },
  "voxtral-mini-tts-latest": { type: "Speech", caps: ["Text Input", "Audio Output", "TTS"], context: "Unknown" },
  "voxtral-mini-tts-2603": { type: "Speech", caps: ["Text Input", "Audio Output", "TTS"], context: "Unknown" },
  "voxtral-small-latest": { type: "Audio", caps: ["Text+Audio Input", "Text Output", "Streaming"], context: "128K" },
  "voxtral-small-2507": { type: "Audio", caps: ["Text+Audio Input", "Text Output", "Streaming"], context: "128K" },

  // ============================================================
  // Qwen family (source: qwen.ai, huggingface.co/Qwen)
  // ============================================================
  "Qwen/Qwen3-8B": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning"], context: "128K" },
  "qwen/qwen3-32b": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning"], context: "128K" },
  "Qwen3-1.7B": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming", "Reasoning"], context: "32K" },
  "Qwen3.5-2B": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming", "Reasoning"], context: "32K" },
  "Qwen/Qwen3.5-4B": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming", "Reasoning"], context: "128K" },
  "qwen/qwen3.5-35b-a3b": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning"], context: "128K" },
  "Qwen3.5-397B-A17B": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning"], context: "128K" },
  "qwen/qwen3.5-397b-a17b": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning"], context: "128K" },
  "Qwen3.6-35B-A3B": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning"], context: "128K" },
  "qwen3.6-plus": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning"], context: "128K" },
  "Qwen3.7-Max": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning"], context: "128K" },
  "Qwen/Qwen3-VL-32B-Thinking": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Vision", "Streaming", "Reasoning"], context: "128K" },
  "Qwen3-Coder-Next-FP8": { type: "Chat", caps: ["Text Input", "Text Output", "Code Generation", "Function Calling", "Streaming"], context: "128K" },
  "qwen/qwen3-coder-480b-a35b-instruct": { type: "Chat", caps: ["Text Input", "Text Output", "Code Generation", "Function Calling", "Streaming"], context: "128K" },
  "qwen/qwen3-coder:free": { type: "Chat", caps: ["Text Input", "Text Output", "Code Generation", "Function Calling", "Streaming"], context: "128K" },
  "qwen/qwen3-next-80b-a3b-instruct": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning"], context: "128K" },
  "qwen/qwen3-next-80b-a3b-instruct:free": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning"], context: "128K" },
  "Qwen3-Embedding-8B": { type: "Embedding", caps: ["Text Input", "Embedding Output"], context: "32K" },
  "Qwen3-Reranker-8B": { type: "Rerank", caps: ["Text Input", "Relevance Scoring"], context: "32K" },
  "Qwen/Qwen2.5-7B-Instruct": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming"], context: "128K" },
  "qwen-8b": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "32K" },
  "qwen2.5-coder-32b": { type: "Chat", caps: ["Text Input", "Text Output", "Code Generation", "Streaming"], context: "128K" },
  "Qwen-Image-2512": { type: "Image Generation", caps: ["Text Input", "Image Output"], context: "Unknown" },

  // ============================================================
  // Meta Llama family (source: llama.meta.com, huggingface.co/meta-llama)
  // ============================================================
  "meta/llama-3.1-8b-instruct": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "128K" },
  "meta/llama-3.1-70b-instruct": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming"], context: "128K" },
  "llama-3.1-8b-instant": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "128K" },
  "meta/llama-3.2-1b-instruct": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "128K" },
  "meta/llama-3.2-3b-instruct": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "128K" },
  "meta-llama/llama-3.2-3b-instruct:free": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "128K" },
  "meta/llama-3.2-11b-vision-instruct": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Vision", "Streaming"], context: "128K" },
  "meta/llama-3.2-90b-vision-instruct": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Vision", "Function Calling", "Streaming"], context: "128K" },
  "meta/llama-3.3-70b-instruct": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming"], context: "128K" },
  "meta-llama/llama-3.3-70b-instruct:free": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming"], context: "128K" },
  "llama-3.3-70b-versatile": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming"], context: "128K" },
  "meta/llama-4-maverick-17b-128e-instruct": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Vision", "Function Calling", "Streaming"], context: "1M" },
  "meta-llama/llama-4-scout-17b-16e-instruct": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Vision", "Function Calling", "Streaming"], context: "10M" },
  "meta/llama-guard-4-12b": { type: "Safety", caps: ["Text Input", "Classification Output", "Content Moderation"], context: "128K" },
  "meta-llama/llama-prompt-guard-2-22m": { type: "Safety", caps: ["Text Input", "Classification Output", "Prompt Safety"], context: "512" },
  "meta-llama/llama-prompt-guard-2-86m": { type: "Safety", caps: ["Text Input", "Classification Output", "Prompt Safety"], context: "512" },
  "abacusai/dracarys-llama-3.1-70b-instruct": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "128K" },

  // ============================================================
  // Google Gemma family (source: ai.google.dev/gemma)
  // ============================================================
  "google/gemma-2-2b-it": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "8K" },
  "google/gemma-3n-e2b-it": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "32K" },
  "google/gemma-3n-e4b-it": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "32K" },
  "google/gemma-4-26b-a4b-it:free": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Vision", "Streaming"], context: "128K" },
  "google/gemma-4-31b-it": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Vision", "Function Calling", "Streaming"], context: "128K" },
  "google/gemma-4-31b-it:free": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Vision", "Function Calling", "Streaming"], context: "128K" },
  "gemma-4-E2B_q4_0-it.gguf": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "32K" },

  // ============================================================
  // DeepSeek family (source: api-docs.deepseek.com)
  // ============================================================
  "deepseek-v4-flash": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming"], context: "128K" },
  "DeepSeek-V4-Flash": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming"], context: "128K" },
  "deepseek/deepseek-v4-flash:free": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming"], context: "128K" },
  "Deepseek-r1-32b": { type: "Reasoning", caps: ["Text Input", "Text Output", "Streaming", "Reasoning"], context: "128K" },
  "deepseek-ai/DeepSeek-R1-0528-Qwen3-8B": { type: "Reasoning", caps: ["Text Input", "Text Output", "Streaming", "Reasoning"], context: "128K" },
  "deepseek-ai/DeepSeek-OCR": { type: "OCR", caps: ["Image+PDF Input", "Text Output", "Document Parsing"], context: "Unknown" },

  // ============================================================
  // xAI Grok family (source: x.ai/docs)
  // ============================================================
  "grok-4.20-0309": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Streaming", "Vision"], context: "128K" },
  "grok-4.20-0309-non-reasoning": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Streaming", "Vision"], context: "128K" },
  "grok-4.20-0309-reasoning": { type: "Reasoning", caps: ["Text+Image Input", "Text Output", "Function Calling", "Streaming", "Vision", "Reasoning"], context: "128K" },
  "grok-4.20-auto": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Streaming", "Vision"], context: "128K" },
  "grok-4.20-expert": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Streaming", "Vision", "Reasoning"], context: "128K" },
  "grok-4.20-fast": { type: "Chat", caps: ["Text+Image Input", "Text Output", "Function Calling", "Streaming", "Vision"], context: "128K" },
  "grok-imagine-image-lite": { type: "Image Generation", caps: ["Text Input", "Image Output"], context: "Unknown" },
  "x-ai/grok-code-fast-1:optimized:free": { type: "Chat", caps: ["Text Input", "Text Output", "Code Generation", "Streaming"], context: "128K" },

  // ============================================================
  // NVIDIA Nemotron family (source: docs.nvidia.com/nemotron)
  // ============================================================
  "nvidia/nemotron-3-nano-30b-a3b": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming", "Reasoning"], context: "128K" },
  "nvidia/nemotron-3-nano-30b-a3b:free": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming", "Reasoning"], context: "128K" },
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning": { type: "Reasoning", caps: ["Text+Audio Input", "Text Output", "Streaming", "Reasoning"], context: "128K" },
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free": { type: "Reasoning", caps: ["Text+Audio Input", "Text Output", "Streaming", "Reasoning"], context: "128K" },
  "nvidia/nemotron-3-super-120b-a12b": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming"], context: "128K" },
  "nvidia/nemotron-3-super-120b-a12b:free": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming"], context: "128K" },
  "nvidia/nemotron-3-ultra-550b-a55b:free": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning"], context: "128K" },
  "nemotron-3-ultra": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning"], context: "128K" },
  "nvidia/llama-3.3-nemotron-super-49b-v1": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "128K" },
  "nvidia/llama-3.3-nemotron-super-49b-v1.5": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "128K" },
  "nvidia/nemotron-mini-4b-instruct": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "128K" },
  "nvidia/nemotron-nano-12b-v2-vl": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Vision", "Streaming"], context: "128K" },
  "nvidia/nemotron-nano-12b-v2-vl:free": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Vision", "Streaming"], context: "128K" },
  "nvidia/nvidia-nemotron-nano-9b-v2": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "128K" },
  "nvidia/nemotron-nano-9b-v2:free": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "128K" },
  "nvidia/nemotron-3-content-safety": { type: "Safety", caps: ["Text Input", "Classification Output", "Content Moderation"], context: "8K" },
  "nvidia/nemotron-3.5-content-safety:free": { type: "Safety", caps: ["Text Input", "Classification Output", "Content Moderation"], context: "8K" },
  "nvidia/nemotron-content-safety-reasoning-4b": { type: "Safety", caps: ["Text Input", "Classification Output", "Content Moderation", "Reasoning"], context: "8K" },
  "nvidia/llama-3.1-nemoguard-8b-content-safety": { type: "Safety", caps: ["Text Input", "Classification Output", "Content Moderation"], context: "128K" },
  "nvidia/llama-3.1-nemoguard-8b-topic-control": { type: "Safety", caps: ["Text Input", "Classification Output", "Topic Control"], context: "128K" },
  "nvidia/llama-3.1-nemotron-safety-guard-8b-v3": { type: "Safety", caps: ["Text Input", "Classification Output", "Safety Classification"], context: "128K" },
  "nvidia/llama-3.1-nemotron-nano-8b-v1": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "128K" },
  "nvidia/llama-3.1-nemotron-nano-vl-8b-v1": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Vision", "Streaming"], context: "128K" },
  "nvidia/gliner-pii": { type: "Safety", caps: ["Text Input", "Entity Detection", "PII Detection"], context: "8K" },
  "nvidia/ising-calibration-1-35b-a3b": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "128K" },
  "nvidia/riva-translate-4b-instruct-v1.1": { type: "Translation", caps: ["Text Input", "Text Output", "Translation"], context: "8K" },

  // ============================================================
  // Image Generation models
  // ============================================================
  "StableDiffusion_XL_Base_1": { type: "Image Generation", caps: ["Text Input", "Image Output"], context: "Unknown" },
  "Kwai-Kolors/Kolors": { type: "Image Generation", caps: ["Text Input", "Image Output"], context: "Unknown" },
  "Z-Image-Turbo": { type: "Image Generation", caps: ["Text Input", "Image Output"], context: "Unknown" },
  "agnes-image-2.0-flash": { type: "Image Generation", caps: ["Text Input", "Image Output"], context: "Unknown" },
  "agnes-image-2.1-flash": { type: "Image Generation", caps: ["Text Input", "Image Output"], context: "Unknown" },
  "step-image-edit-2": { type: "Image Generation", caps: ["Text+Image Input", "Image Output", "Image Editing"], context: "Unknown" },

  // ============================================================
  // Video Generation models
  // ============================================================
  "agnes-video-v2.0": { type: "Video", caps: ["Text Input", "Video Output"], context: "Unknown" },

  // ============================================================
  // Audio/Speech models
  // ============================================================
  "mimo-v2-tts": { type: "Speech", caps: ["Text Input", "Audio Output", "TTS"], context: "Unknown" },
  "mimo-v2.5-tts": { type: "Speech", caps: ["Text Input", "Audio Output", "TTS"], context: "Unknown" },
  "mimo-v2.5-tts-voiceclone": { type: "Speech", caps: ["Text+Audio Input", "Audio Output", "TTS", "Voice Cloning"], context: "Unknown" },
  "mimo-v2.5-tts-voicedesign": { type: "Speech", caps: ["Text+Audio Input", "Audio Output", "TTS", "Voice Design"], context: "Unknown" },
  "stepaudio-2.5-tts": { type: "Speech", caps: ["Text Input", "Audio Output", "TTS"], context: "Unknown" },
  "stepaudio-2.5-chat": { type: "Audio", caps: ["Text+Audio Input", "Text+Audio Output", "Streaming"], context: "Unknown" },
  "stepaudio-2.5-realtime": { type: "Audio", caps: ["Audio Input", "Audio Output", "Streaming", "Realtime"], context: "Unknown" },
  "stepaudio-2.5-asr": { type: "Speech", caps: ["Audio Input", "Text Output", "Transcription"], context: "Unknown" },
  "canopylabs/orpheus-v1-english": { type: "Speech", caps: ["Text Input", "Audio Output", "TTS"], context: "Unknown" },
  "canopylabs/orpheus-arabic-saudi": { type: "Speech", caps: ["Text Input", "Audio Output", "TTS"], context: "Unknown" },
  "FunAudioLLM/SenseVoiceSmall": { type: "Speech", caps: ["Audio Input", "Text Output", "Speech Recognition", "Multilingual"], context: "Unknown" },
  "TeleAI/TeleSpeechASR": { type: "Speech", caps: ["Audio Input", "Text Output", "Speech Recognition"], context: "Unknown" },
  "sarvamai/sarvam-m": { type: "Chat", caps: ["Text+Audio Input", "Text Output", "Speech Recognition", "Multilingual"], context: "32K" },

  // ============================================================
  // Translation models
  // ============================================================
  "tencent/Hunyuan-MT-7B": { type: "Translation", caps: ["Text Input", "Text Output", "Translation"], context: "8K" },
  "Hunyuan-MT-7B": { type: "Translation", caps: ["Text Input", "Text Output", "Translation"], context: "8K" },
  "HunyuanOCR": { type: "OCR", caps: ["Image+PDF Input", "Text Output", "Document Parsing"], context: "Unknown" },

  // ============================================================
  // Embedding / Rerank models
  // ============================================================
  "BAAI/bge-large-en-v1.5": { type: "Embedding", caps: ["Text Input", "Embedding Output"], context: "512" },
  "BAAI/bge-large-zh-v1.5": { type: "Embedding", caps: ["Text Input", "Embedding Output"], context: "512" },
  "BAAI/bge-m3": { type: "Embedding", caps: ["Text Input", "Embedding Output", "Multilingual"], context: "8K" },
  "BAAI/bge-reranker-v2-m3": { type: "Rerank", caps: ["Text Input", "Relevance Scoring", "Multilingual"], context: "8K" },
  "netease-youdao/bce-embedding-base_v1": { type: "Embedding", caps: ["Text Input", "Embedding Output", "Bilingual"], context: "512" },
  "netease-youdao/bce-reranker-base_v1": { type: "Rerank", caps: ["Text Input", "Relevance Scoring", "Bilingual"], context: "512" },

  // ============================================================
  // Kimi / Moonshot (source: platform.moonshot.cn)
  // ============================================================
  "Kimi-k2.6": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning"], context: "128K" },
  "Kimi-K2.6": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning"], context: "128K" },
  "moonshotai/kimi-k2.6": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning"], context: "128K" },

  // ============================================================
  // StepFun models
  // ============================================================
  "step-3.5-flash": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "128K" },
  "step-3.5-flash-2603": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "128K" },
  "step-3.7-flash": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "128K" },
  "stepfun-ai/step-3.5-flash": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "128K" },
  "stepfun/step-3.5-flash:free": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "128K" },
  "step-router-v1": { type: "Chat", caps: ["Text Input", "Text Output", "Model Routing"], context: "128K" },

  // ============================================================
  // Intern / InternVL (source: huggingface.co/internlm)
  // ============================================================
  "intern-latest": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "128K" },
  "intern-s1": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming", "Reasoning"], context: "128K" },
  "intern-s1-mini": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming", "Reasoning"], context: "128K" },
  "intern-s1-pro": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming", "Reasoning"], context: "128K" },
  "intern-s2-preview": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming", "Reasoning"], context: "128K" },
  "internvl-latest": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Vision", "Streaming"], context: "128K" },
  "internvl3.5-latest": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Vision", "Streaming"], context: "128K" },
  "internvl3.5-241b-a28b": { type: "Multimodal", caps: ["Text+Image Input", "Text Output", "Vision", "Streaming"], context: "128K" },

  // ============================================================
  // Xiaomi MiMo models
  // ============================================================
  "mimo-auto": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming", "Reasoning"], context: "128K" },
  "mimo-v2-omni": { type: "Multimodal", caps: ["Text+Image+Audio Input", "Text+Audio Output", "Vision", "Streaming"], context: "128K" },
  "mimo-v2-pro": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming", "Reasoning"], context: "128K" },
  "mimo-v2.5": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming", "Reasoning"], context: "128K" },
  "mimo-v2.5-pro": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming", "Reasoning"], context: "128K" },

  // ============================================================
  // Cohere models
  // ============================================================
  "cohere/north-mini-code:free": { type: "Chat", caps: ["Text Input", "Text Output", "Code Generation", "Streaming"], context: "128K" },
  "north-mini-code": { type: "Chat", caps: ["Text Input", "Text Output", "Code Generation", "Streaming"], context: "128K" },

  // ============================================================
  // Other models
  // ============================================================
  "Spark-X2-Flash": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "Unknown" },
  "kat-coder-pro-v2": { type: "Chat", caps: ["Text Input", "Text Output", "Code Generation", "Streaming"], context: "Unknown" },
  "huatuogpt": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "Unknown" },
  "allam-2-7b": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "Unknown" },
  "mercury-2": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "Unknown" },
  "LongCat-Flash-Chat-2602-Exp": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "Unknown" },
  "sensenova-u1-fast": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "Unknown" },
  "sensenova-6.7-flash-lite": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "Unknown" },
  "minimax2.7": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "Unknown" },
  "stockmark/stockmark-2-100b-instruct": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "Unknown" },
  "upstage/solar-10.7b-instruct": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "Unknown" },
  "bytedance/seed-oss-36b-instruct": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "Unknown" },
  "inclusionai/ring-2.6-1t:free": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "Unknown" },
  "PaddlePaddle/PaddleOCR-VL-1.5": { type: "OCR", caps: ["Image Input", "Text Output", "Vision", "Document Parsing"], context: "Unknown" },
  "liquid/lfm-2.5-1.2b-instruct:free": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "32K" },
  "liquid/lfm-2.5-1.2b-thinking:free": { type: "Reasoning", caps: ["Text Input", "Text Output", "Streaming", "Reasoning"], context: "32K" },
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "32K" },
  "openrouter/free": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "Unknown" },
  "openrouter/owl-alpha": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "Unknown" },
  "poolside/laguna-m.1:free": { type: "Chat", caps: ["Text Input", "Text Output", "Code Generation", "Streaming"], context: "128K" },
  "poolside/laguna-xs.2:free": { type: "Chat", caps: ["Text Input", "Text Output", "Code Generation", "Streaming"], context: "128K" },
  "kilo-auto/free": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "Unknown" },
  "nex-agi/nex-n2-pro:free": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "Unknown" },
  "nousresearch/hermes-3-llama-3.1-405b:free": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming"], context: "128K" },
  "groq/compound": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning"], context: "128K" },
  "groq/compound-mini": { type: "Chat", caps: ["Text Input", "Text Output", "Function Calling", "Streaming", "Reasoning"], context: "128K" },
  "agnes-2.0-flash": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "Unknown" },
  "baidu/cobuddy:free": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "Unknown" },
  "auto": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming", "Model Routing"], context: "Unknown" },

  // ============================================================
  // QD (QianDu) models - internal/proprietary
  // ============================================================
  "qd/auto": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "Unknown" },
  "qd/lite": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "Unknown" },
  "qd/efficient": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "Unknown" },
  "qd/performance": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "Unknown" },
  "qd/ultimate": { type: "Chat", caps: ["Text Input", "Text Output", "Streaming"], context: "Unknown" },
  "qd/gm51model": { type: "Unknown", caps: ["Unknown"], context: "Unknown" },
  "qd/kmodel": { type: "Unknown", caps: ["Unknown"], context: "Unknown" },
  "qd/mmodel": { type: "Unknown", caps: ["Unknown"], context: "Unknown" },
  "qd/dmodel": { type: "Unknown", caps: ["Unknown"], context: "Unknown" },
  "qd/dfmodel": { type: "Unknown", caps: ["Unknown"], context: "Unknown" },
  "qd/qmodel": { type: "Unknown", caps: ["Unknown"], context: "Unknown" },
};
