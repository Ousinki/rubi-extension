<div align="center">
  <img src="public/rubi_logo.svg" alt="Rubi Logo" width="80" height="80">
  <h1>Rubi (ルビ)</h1>
  <p><strong>Immersive AI Japanese Furigana & Contextual Translation Extension</strong></p>
  <p>
    <a href="README.md"><b>English</b></a> |
    <a href="README.zh-CN.md">简体中文</a> |
    <a href="README.ja.md">日本語</a> |
    <a href="README.ko.md">한국어</a>
  </p>
  <p>
    <a href="https://github.com/Ousinki/rubi-extension/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/License-GPL--2.0-blue.svg" alt="License: GPL-2.0">
    </a>
    <img src="https://img.shields.io/badge/Vue.js-3.x-4fc08d.svg" alt="Vue">
    <img src="https://img.shields.io/badge/WXT-0.20-orange.svg" alt="WXT">
  </p>
</div>

**Rubi** is a next-generation browser extension designed for an immersive, interruption-free Japanese reading and learning experience. It automatically injects Furigana (ruby annotations) into Japanese webpages and offers context-aware AI explanations and inline paragraph translations without breaking your reading flow.

---

## ✨ Features

- **📖 Full-Page Furigana (Ruby) Injection:** Instantly annotate Japanese kanji with Hiragana readings. Filter annotations by JLPT levels (N5 to N1) to match your proficiency.
- **🔍 Word Lookup & Dictionary:** Powered by a high-performance offline dictionary (`@birchill/jpdict-idb` / 10ten-ja-reader engine) with deinflection support for inflected verbs and Suru-verbs.
- **🧠 Context-Aware AI Explanation:** Long-press any word or selection to bring up a floating card with detailed grammatical explanations, contextual definitions, and common collocations.
- **⌨️ Inline Paragraph Translation:** Translate entire paragraphs inline. The translation is injected directly below the original text block using a semi-transparent, non-disruptive style. Supports multiple trigger modes:
  - `Shift` / `Ctrl` / `Alt` keys + hover
  - Mouse long-press
  - Direct hover translation
  - Custom keyboard shortcut combinations
- **🗣️ Multi-Engine Text-to-Speech (TTS):** Hear native pronunciations with support for Microsoft Edge Neural TTS, Google Translate TTS, and the expressive Voicevox anime voice engine.
- **🎨 Premium UI Design:** Features beautiful HSL-tailored dark modes and gem-inspired color schemes (Amethyst, Ruby, Citrine, Sapphire).

---

## 🚀 Installation & Build

Rubi is built with [WXT](https://wxt.dev/) and Vue 3.

### 1. Build from Source

1. Clone this repository:
   ```bash
   git clone https://github.com/Ousinki/rubi-extension.git
   cd rubi-extension
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. The compiled extension will be available in the `.output/chrome-mv3` directory.

### 2. Load into Chrome

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked** and select the `.output/chrome-mv3` directory.

---

## ⚙️ Configuration

Click the Rubi extension action icon or visit `options.html` to open the **Options Page**. From there, you can:
- Enter your OpenAI-compatible API credentials for context-aware translations.
- Select your preferred machine translation engine (Google/DeepL/Bing).
- Configure TTS speech rates, volume, and voice characters.
- Customize trigger keys and display styles for Furigana and highlights.

---

## 🤝 Acknowledgements

Special thanks to the [10ten Japanese Reader](https://github.com/birchill/10ten-ja-reader) and [MouseTooltipTranslator](https://github.com/ttop32/MouseTooltipTranslator) projects for their excellent architecture and inspiration.

---

## 📜 License

This project is licensed under the [GPL-2.0 License](LICENSE).
