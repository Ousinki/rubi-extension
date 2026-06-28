import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  vite: () => ({
    plugins: [
      {
        // Fix kuromoji for browser extension bundling:
        //  1. BrowserDictionaryLoader uses zlibjs which breaks under Vite/rolldown
        //     → replace with native DecompressionStream (available in Chrome)
        //  2. DictionaryLoader uses path.join which collapses chrome-extension:// → chrome-extension:/
        //     → replace with simple URL string concatenation
        name: 'fix-kuromoji-for-extension',
        transform(code: string, id: string) {
          if (id.includes('BrowserDictionaryLoader')) {
            return {
              code: `
"use strict";
var DictionaryLoader = require("./DictionaryLoader");

function BrowserDictionaryLoader(dic_path) {
  DictionaryLoader.apply(this, [dic_path]);
}
BrowserDictionaryLoader.prototype = Object.create(DictionaryLoader.prototype);

// Use native DecompressionStream instead of zlibjs (which doesn't bundle correctly)
BrowserDictionaryLoader.prototype.loadArrayBuffer = function(url, callback) {
  fetch(url).then(function(response) {
    if (!response.ok || !response.body) {
      throw new Error("HTTP " + response.status + ": " + url);
    }
    var ds = new DecompressionStream("gzip");
    return new Response(response.body.pipeThrough(ds)).arrayBuffer();
  }).then(function(buffer) {
    callback(null, buffer);
  }).catch(function(err) {
    callback(err, null);
  });
};

module.exports = BrowserDictionaryLoader;
`,
              map: null,
            };
          }
          if (id.includes('kuromoji') && id.includes('DictionaryLoader') && !id.includes('Browser') && !id.includes('Node')) {
            // Fix path.join(dic_path, filename) — path.join collapses chrome-extension:// → chrome-extension:/
            return {
              code: code
                .replace(/var path = require\("path"\);?/g, '// path module removed')
                .replace(/path\.join\(dic_path,\s*filename\)/g, 'dic_path.replace(/\\/+$/, "") + "/" + filename')
                .replace(/path\.join\(dic_path,\s*"([^"]+)"\)/g, 'dic_path.replace(/\\/+$/, "") + "/$1"'),
              map: null,
            };
          }
        },
      },
    ],
  }),
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'zh_CN',
    permissions: ['storage', 'activeTab'],
    web_accessible_resources: [
      {
        resources: ['data/dict-ja.json'],
        matches: ['<all_urls>']
      },
      {
        resources: ['data/kuromoji/*.dat.gz'],
        matches: ['<all_urls>']
      }
    ],
    host_permissions: [
      '*://*.googleapis.com/*',
      '*://api.deepl.com/*',
      '*://api.openai.com/*',
      '*://api.deepseek.com/*',
      '*://open.bigmodel.cn/*',
      '*://generativelanguage.googleapis.com/*',
      '*://api.anthropic.com/*',
      '*://api.x.ai/*',
      '*://dashscope.aliyuncs.com/*',
      '*://api.moonshot.cn/*',
      '*://api.siliconflow.cn/*',
      '*://api.lingyiwanwu.com/*'
    ],
    action: {
      default_icon: {
        '16': 'icon/16.png',
        '32': 'icon/32.png',
        '48': 'icon/48.png',
        '96': 'icon/96.png',
        '128': 'icon/128.png',
      },
      default_title: 'Rubi — 点击开启/关闭',
    },
    icons: {
      '16': 'icon/16.png',
      '32': 'icon/32.png',
      '48': 'icon/48.png',
      '96': 'icon/96.png',
      '128': 'icon/128.png',
    },
    commands: {
      'translate-paragraph': {
        suggested_key: {
          default: 'Alt+T',
          mac: 'Alt+T',
        },
        description: '__MSG_commandTranslateParagraph__',
      },
      '_execute_action': {
        suggested_key: {
          default: 'Alt+Q',
          mac: 'Alt+Q',
        },
      },
    },
  },
});
