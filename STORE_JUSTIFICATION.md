# Chrome Web Store Permission Justification (提交审核时复制粘贴用)

当你将 `.zip` 文件上传到 Chrome Web Store 开发者后台时，在“隐私权”或“权限说明”页面，你需要为每一个申请的权限提供正当理由。以下是为你准备的现成文本（建议直接复制使用）：

### 1. `activeTab` 权限
**Justification:**
This extension provides on-demand Japanese Furigana injection, word lookup, and contextual translation. The `activeTab` permission is strictly required to read the selected text or paragraph on the user's current webpage when they actively trigger a translation via a keyboard shortcut, mouse hover, or context menu. It is also required to inject the translation results and Ruby DOM elements back into the active page seamlessly without requesting broad access to all URLs.

### 2. `storage` 权限
**Justification:**
The `storage` permission is required to save and retrieve the user's customized settings. This includes their preferred translation engines (Google, DeepL, OpenAI, etc.), target language preferences, UI themes, and locally stored API keys necessary to authenticate requests to third-party AI translation providers.

### 3. `declarativeNetRequest` 权限
**Justification:**
This permission is needed to modify HTTP request headers (such as `Origin` or `Referer`) when communicating with certain external translation APIs or TTS (Text-to-Speech) endpoints directly from the browser extension. This ensures cross-origin resource sharing (CORS) compatibility and successful API calls to the user-configured backend services.

### 4. `Host Permissions` (例如 `*://api.openai.com/*`, `*://api.deepl.com/*` 等)
**Justification:**
Our extension acts as a client-side interface that allows users to utilize various third-party AI models (e.g., OpenAI, Anthropic, DeepSeek) and translation engines (e.g., DeepL, Google) for high-quality, context-aware paragraph translations and grammatical explanations. These host permissions are necessary to allow the extension's background scripts to make direct `fetch` requests to these API endpoints securely on behalf of the user, using their configured API keys. No data is routed through our own servers.
