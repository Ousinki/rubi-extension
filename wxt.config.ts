import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  vite: () => ({
  }),
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'zh_CN',
    permissions: ['storage', 'activeTab'],
    web_accessible_resources: [],
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
      '*://api.lingyiwanwu.com/*',
      '*://*.birchill.co.jp/*',
      '*://api.tts.quest/*',
      'http://127.0.0.1/*',
      'http://localhost/*'
    ],
    action: {
      default_icon: {
        '16': 'icon/action-16.png',
        '32': 'icon/action-32.png',
        '48': 'icon/action-48.png',
        '96': 'icon/action-96.png',
        '128': 'icon/action-128.png',
      },
      default_title: 'Rubi — 点击开启/关闭',
    },
    icons: {
      '16': 'icon/action-16.png',
      '32': 'icon/action-32.png',
      '48': 'icon/action-48.png',
      '96': 'icon/action-96.png',
      '128': 'icon/action-128.png',
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
