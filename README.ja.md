<div align="center">
  <img src="public/rubi_logo.svg" alt="Rubi Logo" width="80" height="80">
  <h1>Rubi (ルビ)</h1>
  <p><strong>没入感のある AI 日本語ふりがな・文脈翻訳ブラウザ拡張機能</strong></p>
  <p>
    <a href="README.md">English</a> |
    <a href="README.zh-CN.md">简体中文</a> |
    <a href="README.ja.md"><b>日本語</b></a> |
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

**Rubi** は、日本語の没入型読書・学習体験のために設計された次世代ブラウザ拡張機能です。日本語ウェブページの漢字に自動でふりがな（ルビ）を付与し、読書フローを妨げることなく、文脈を考慮した AI 解説や段落ごとのインライン翻訳を提供します。

---

## ✨ 主な機能

- **📖 全ページふりがな（ルビ）自動付与：** 日本語の漢字に平仮名を即座に注記します。JLPT レベル（N5〜N1）でフィルタリングでき、自分の習熟度に合わせた表示が可能です。
- **🔍 単語検索・辞書機能：** 高性能なオフライン辞書エンジン（`@birchill/jpdict-idb` / 10ten-ja-reader）を搭載し、活用形の動詞やサ変動詞にも対応した語幹復元検索ができます。
- **🧠 文脈 AI 解説：** 任意の単語や選択テキストを長押しすると、詳細な文法解説・文脈に沿った語義・よく使われる表現をまとめたフローティングカードを表示します。
- **⌨️ インライン段落翻訳：** 段落全体をその場で翻訳します。翻訳結果は元のテキストブロックの直下に、半透明で読みやすいスタイルでインライン挿入されます。複数のトリガー方法に対応しています：
  - `Shift` / `Ctrl` / `Alt` キー + ホバー
  - マウス長押し
  - ホバーによる直接翻訳
  - カスタムキーボードショートカットの組み合わせ
- **🗣️ マルチエンジン音声読み上げ（TTS）：** Microsoft Edge ニューラル TTS、Google 翻訳 TTS、そして表情豊かな Voicevox アニメ音声エンジンによるネイティブ発音を提供します。
- **🎨 プレミアム UI デザイン：** HSL 調整済みのダークモードと、宝石をモチーフにしたカラースキーム（アメジスト・ルビー・シトリン・サファイア）を採用した美しいデザインです。

---

## 🚀 インストール・ビルド方法

Rubi は [WXT](https://wxt.dev/) と Vue 3 で構築されています。

### 1. ソースからビルドする

1. リポジトリをクローンします：
   ```bash
   git clone https://github.com/Ousinki/rubi-extension.git
   cd rubi-extension
   ```
2. 依存パッケージをインストールします：
   ```bash
   npm install
   ```
3. 拡張機能をビルドします：
   ```bash
   npm run build
   ```
4. コンパイル済みの拡張機能は `.output/chrome-mv3` ディレクトリに出力されます。

### 2. Chrome へ読み込む

1. Chrome を開き、`chrome://extensions/` にアクセスします。
2. 右上の **デベロッパーモード** を有効にします。
3. **パッケージ化されていない拡張機能を読み込む** をクリックし、`.output/chrome-mv3` ディレクトリを選択します。

---

## ⚙️ 設定

Rubi の拡張機能アイコンをクリックするか、`options.html` にアクセスして **オプションページ** を開くと、以下の設定が行えます：
- 文脈翻訳のための OpenAI 互換 API キーと認証情報を入力する。
- 機械翻訳エンジンを選択する（Google / DeepL / Bing）。
- TTS の読み上げ速度・音量・音声キャラクターを設定する。
- ふりがな表示スタイルやトリガーキーをカスタマイズする。

---

## 🤝 謝辞

[10ten Japanese Reader](https://github.com/birchill/10ten-ja-reader) および [MouseTooltipTranslator](https://github.com/ttop32/MouseTooltipTranslator) プロジェクトの優れたアーキテクチャとインスピレーションに深く感謝します。

---

## 📜 ライセンス

このプロジェクトは [GPL-2.0 ライセンス](LICENSE) のもとで公開されています。
