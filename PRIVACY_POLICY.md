# Privacy Policy for Rubi (ルビ) Extension

**Effective Date:** July 2026

Thank you for using the Rubi (ルビ) browser extension ("we," "us," or "our"). We are committed to protecting your privacy. This Privacy Policy explains how our extension handles your data to provide its core functionalities.

## 1. Information We Collect and How We Use It

Rubi is designed to enhance your Japanese reading experience by providing Furigana annotations and context-aware translations. To achieve this, the extension requires access to certain data:

- **Webpage Content (Active Tab):** When you explicitly interact with the extension (e.g., clicking on a word, hovering for translation, or triggering a paragraph translation via keyboard shortcuts), Rubi reads the relevant text from the active webpage. This data is strictly used to provide the translation, definition, and Furigana injection features in real-time.
- **User Settings and Preferences:** Your preferences, such as selected translation engines, target languages, API keys (e.g., OpenAI, DeepSeek, DeepL), TTS voice choices, and UI theme settings, are saved locally in your browser using the `storage` API. 

## 2. Third-Party Services and Data Sharing

Rubi is a client-side tool that connects directly to third-party APIs configured by you. 

- **Translation and AI Services:** When you use features that require machine translation or AI explanation, the selected text is transmitted securely via HTTPS directly to the respective third-party API you have selected (e.g., OpenAI, Anthropic, Google, DeepL, etc.). 
- **No Intermediary Servers:** We do not route your data through any of our own servers. Your data flows directly from your browser to the third-party provider.
- **Your API Keys:** API keys entered into the extension's Options page are stored locally on your device and are only transmitted to the respective API provider to authenticate your requests. We never collect, monitor, or store your API keys remotely.

By using these features, your data is subject to the privacy policies of the respective third-party API providers you choose to use.

## 3. Data Retention

- **Local Storage:** All user preferences, history, and API keys are stored locally on your device and can be deleted by you at any time by clearing your browser's extension data or uninstalling the extension.
- **No Remote Storage:** We do not maintain any databases or servers that store your personal information or browsing history.

## 4. Required Permissions

- **`activeTab`**: Required to read the text on the current webpage when you trigger a translation or dictionary lookup, and to inject the resulting Furigana or translation boxes back into the page.
- **`storage`**: Required to save your customized settings, API keys, and extension preferences locally.
- **`host_permissions`**: The extension requests permissions to communicate with various third-party AI and translation APIs (such as `*://api.openai.com/*`, `*://api.deepl.com/*`, etc.). These are necessary for the extension to send the text you wish to translate directly to the service provider of your choice.

## 5. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. Any changes will be reflected by updating the "Effective Date" at the top of this policy. We encourage you to review this policy periodically.

## 6. Contact Us

If you have any questions or concerns about this Privacy Policy or our data practices, please contact the developer via the GitHub repository: https://github.com/Ousinki/rubi-extension
