<template>
  <div :class="['rubi-page-wrapper', 'theme-' + theme]">
    <div class="rubi-options-app">
      <!-- Header -->
      <header class="rubi-header">
        <div class="logo-area">
          <div class="logo-text">
            <h1>Rubi Settings</h1>
            <p class="subtitle">日语学术文献辅助标注扩展</p>
          </div>
        </div>
        <div class="header-controls">
          <!-- Theme Switcher -->
          <button class="theme-toggle-btn" @click="toggleTheme" title="切换主题">
            <svg v-if="theme === 'dark'" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            <svg v-else viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
            <span class="theme-label">{{ theme === 'dark' ? '学术日照' : '深夜模式' }}</span>
          </button>

          <!-- Auto-save Status Indicator -->
          <div class="save-status" :class="{ saved: showSavedStatus }">
            <span class="dot"></span>
            {{ showSavedStatus ? '已保存更改' : '配置将即时保存' }}
          </div>
        </div>
      </header>

      <div class="layout-grid">
        <!-- Left Column: Core settings -->
        <main class="settings-column">
          
          <!-- AI Translation Configuration -->
          <section class="card">
            <div class="card-header">
              <h2>大型语言模型配置</h2>
              <span class="section-tag">API Settings</span>
            </div>
            
            <div class="card-body">
              <div class="input-group">
                <label>API Key</label>
                <div class="password-wrapper">
                  <input 
                    :type="showApiKey ? 'text' : 'password'" 
                    v-model="settings.apiKey" 
                    placeholder="请输入 API Key" 
                    @change="saveSettings"
                  />
                  <button type="button" class="toggle-password-btn" @click="showApiKey = !showApiKey" :title="showApiKey ? '隐藏 Key' : '显示 Key'">
                    <svg v-if="!showApiKey" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    <svg v-else viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  </button>
                </div>
              </div>
              
              <div class="input-group">
                <label>API Endpoint</label>
                <input 
                  type="text" 
                  v-model="settings.apiEndpoint" 
                  placeholder="https://api.openai.com/v1/chat/completions" 
                  @change="saveSettings"
                />
              </div>

              <div class="row">
                <div class="input-group half">
                  <label>模型 (Model)</label>
                  <input 
                    type="text" 
                    v-model="settings.model" 
                    placeholder="gpt-4o-mini" 
                    @change="saveSettings"
                  />
                </div>
                <div class="half action-group">
                  <button 
                    class="btn btn-action" 
                    @click="testApi" 
                    :disabled="isTestingApi || !settings.apiKey"
                  >
                    {{ isTestingApi ? '测试中...' : '测试连接' }}
                  </button>
                </div>
              </div>

              <div v-if="testResult" class="test-feedback" :class="testResult.success ? 'success' : 'error'">
                {{ testResult.success ? `连接测试通过 (响应时延: ${testResult.latency}ms)` : `连接建立失败: ${testResult.error}` }}
              </div>
            </div>
          </section>

          <!-- Japanese Rendering Preferences -->
          <section class="card">
            <div class="card-header">
              <h2>假名渲染偏好</h2>
              <span class="section-tag">Furigana Preferences</span>
            </div>
            
            <div class="card-body">
              <div class="toggle-row">
                <div class="toggle-desc">
                  <h3>启用假名标注</h3>
                  <p>在汉字上方显示平假名</p>
                </div>
                <button 
                  class="toggle-btn" 
                  :class="{ active: settings.enableFuriganaRuby }" 
                  @click="settings.enableFuriganaRuby = !settings.enableFuriganaRuby; saveSettings()"
                >
                  <span class="toggle-dot"></span>
                </button>
              </div>

              <div class="input-group">
                <label>JLPT 过滤</label>
                <div class="radio-group-bar">
                  <label v-for="level in ['all', 'N5', 'N4', 'N3', 'N2', 'N1']" :key="level" class="radio-label-item" :class="{ selected: settings.jlptFilterLevel === level }">
                    <input 
                      type="radio" 
                      name="jlpt" 
                      :value="level" 
                      v-model="settings.jlptFilterLevel" 
                      @change="saveSettings"
                    />
                    <span class="radio-text">{{ level === 'all' ? '全部标注' : level + '级以上' }}</span>
                  </label>
                </div>
                <p class="description-hint">过滤低难度词汇，仅为所选级别以上的单词显示假名。</p>
              </div>
            </div>
          </section>

          <!-- Speech Synthesis Preferences -->
          <section class="card">
            <div class="card-header">
              <h2>语音合成 (TTS)</h2>
              <span class="section-tag">Speech Engine</span>
            </div>
            
            <div class="card-body">
              <!-- Engine Selection -->
              <div class="input-group">
                <label>语音引擎</label>
                <div class="engine-selector">
                  <label class="engine-option" :class="{ active: settings.ttsEngine === 'edge' }">
                    <input type="radio" v-model="settings.ttsEngine" value="edge" @change="saveSettings" />
                    <div class="engine-info">
                      <span class="engine-name">Microsoft Edge TTS</span>
                      <span class="engine-badge best">神经网络 · 免费</span>
                      <span class="engine-desc">Azure 级别神经网络发音，最接近真人母语者</span>
                    </div>
                  </label>
                  <label class="engine-option" :class="{ active: settings.ttsEngine === 'google' }">
                    <input type="radio" v-model="settings.ttsEngine" value="google" @change="saveSettings" />
                    <div class="engine-info">
                      <span class="engine-name">Google Translate TTS</span>
                      <span class="engine-badge free">标准 · 免费</span>
                      <span class="engine-desc">Google 翻译合成，发音标准流畅</span>
                    </div>
                  </label>
                  <label class="engine-option" :class="{ active: settings.ttsEngine === 'webspeech' }">
                    <input type="radio" v-model="settings.ttsEngine" value="webspeech" @change="saveSettings" />
                    <div class="engine-info">
                      <span class="engine-name">浏览器内置 (Web Speech)</span>
                      <span class="engine-badge local">本地 · 离线可用</span>
                      <span class="engine-desc">调用系统和浏览器内置发音引擎，可离线使用</span>
                    </div>
                  </label>
                </div>
              </div>

              <!-- Edge TTS Voice Selection -->
              <div v-if="settings.ttsEngine === 'edge'" class="input-group">
                <label>发音人 (Voice)</label>
                <select v-model="settings.edgeVoice" @change="saveSettings" class="select-field">
                  <option value="ja-JP-NanamiNeural">七海 (Nanami) — 女声，自然清晰 ⭐ 推荐</option>
                  <option value="ja-JP-KeitaNeural">圭太 (Keita) — 男声，专业沉稳</option>
                  <option value="ja-JP-AoiNeural">葵 (Aoi) — 女声，明亮活泼</option>
                  <option value="ja-JP-DaichiNeural">大地 (Daichi) — 男声，年轻感</option>
                  <option value="ja-JP-ShioriNeural">しおり (Shiori) — 女声，温柔亲切</option>
                  <option value="ja-JP-MasaruMultilingualNeural">マサル (Masaru) — 男声，多语言</option>
                </select>
              </div>

              <!-- Web Speech Voice Selection (only shown for webspeech engine) -->
              <div v-if="settings.ttsEngine === 'webspeech'" class="input-group">
                <label>发音人 (Voice)</label>
                <select v-model="settings.ttsVoiceURI" @change="saveSettings" class="select-field">
                  <option value="Google 日本語">Google 日本語 (推荐音源)</option>
                  <option v-for="voice in jaVoices" :key="voice.voiceURI" :value="voice.voiceURI">
                    {{ voice.name }} {{ voice.localService ? '(本地合成)' : '(网络合成)' }}
                  </option>
                </select>
              </div>

              <div class="row">
                <div class="input-group half">
                  <label>语速: {{ settings.ttsRate }}x</label>
                  <input 
                    type="range" 
                    min="0.5" 
                    max="1.5" 
                    step="0.05" 
                    v-model.number="settings.ttsRate" 
                    @input="saveSettings"
                    class="range-slider"
                  />
                </div>
                <div class="input-group half">
                  <label>音量: {{ Math.round(settings.ttsVolume * 100) }}%</label>
                  <input 
                    type="range" 
                    min="0.0" 
                    max="1.0" 
                    step="0.05" 
                    v-model.number="settings.ttsVolume" 
                    @input="saveSettings"
                    class="range-slider"
                  />
                </div>
              </div>

              <div class="action-footer">
                <button class="btn btn-action secondary" @click="testTTS" :disabled="isSpeaking">
                  {{ isSpeaking ? '发音测试中...' : '测试发音' }}
                </button>
              </div>
            </div>
          </section>


          <!-- Core Translation Options -->
          <section class="card">
            <div class="card-header">
              <h2>查词与释义弹窗</h2>
              <span class="section-tag">Lookup & Panel</span>
            </div>
            
            <div class="card-body">
              <div class="row">
                <div class="input-group half">
                  <label>机器翻译</label>
                  <select v-model="settings.translationEngine" @change="saveSettings" class="select-field">
                    <option value="google">Google 翻译</option>
                    <option value="bing">Bing 翻译</option>
                    <option value="none">本地词典</option>
                  </select>
                </div>
                <div class="input-group half">
                  <label>弹窗位置</label>
                  <select v-model="settings.translationPosition" @change="saveSettings" class="select-field">
                    <option value="bottom">正下方 (推荐)</option>
                    <option value="top">正上方</option>
                    <option value="pronounce-badge">合并于发音栏</option>
                  </select>
                </div>
              </div>

              <p class="dict-attribution">
                本地词典数据来源：
                <a href="https://www.edrdg.org/jmdict/j_jmdict.html" target="_blank" rel="noopener">JMdict</a>
                (Electronic Dictionary Research &amp; Development Group)，
                以 <a href="https://www.edrdg.org/edrdg/licence.html" target="_blank" rel="noopener">CC BY-SA 4.0</a> 协议授权，
                共收录 419,643 条词条。
              </p>
            </div>
          </section>
        </main>

        <!-- Right Column: Academic guidelines / shortcuts -->
        <aside class="info-column">
          <div class="sidebar-block doc-panel">
            <h2>操作说明</h2>
            <ul class="doc-list">
              <li>
                <div class="doc-label">鼠标悬停</div>
                <div class="doc-desc">在日语文字上悬停，即可显示假名和翻译。</div>
              </li>
              <li>
                <div class="doc-label">点击发音</div>
                <div class="doc-desc">点击高亮单词，即可播放语音。</div>
              </li>
              <li>
                <div class="doc-label">AI 语境分析</div>
                <div class="doc-desc">长按单词 500 毫秒，调用 AI 分析上下文和语法结构。</div>
              </li>
              <li>
                <div class="doc-label">一键注音 (Alt+T)</div>
                <div class="doc-desc">为网页中的所有日文汉字标注平假名。可在浏览器设置中修改快捷键。</div>
              </li>
            </ul>
          </div>

          <div class="sidebar-block status-panel">
            <h2>本地引擎层</h2>
            <div class="status-indicator">
              <span class="status-dot"></span>
              <span>Intl.Segmenter 切词引擎激活</span>
            </div>
            <p class="status-details">
              当前系统内建的字词字典已经成功读取，提供最轻量的跨行词法归并解析。
            </p>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { settingsStorage, DEFAULT_SETTINGS } from '@/utils/storage';
import type { RubiSettings } from '@/utils/storage';
import { speakText } from '@/utils/tts';

const settings = reactive<RubiSettings>({ ...DEFAULT_SETTINGS });
const jaVoices = ref<SpeechSynthesisVoice[]>([]);
const isTestingApi = ref(false);
const showApiKey = ref(false);
const testResult = ref<{ success: boolean; latency?: number; error?: string } | null>(null);
const isSpeaking = ref(false);
const showSavedStatus = ref(false);

const getInitialTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return 'dark';
  const saved = localStorage.getItem('rubi-theme') as 'light' | 'dark';
  if (saved) return saved;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

const theme = ref<'light' | 'dark'>(getInitialTheme());

onMounted(async () => {
  // Load settings
  const stored = await settingsStorage.getValue();
  Object.assign(settings, stored);

  // Load voices
  loadVoices();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
});

function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light';
  localStorage.setItem('rubi-theme', theme.value);
}

function loadVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const list = window.speechSynthesis.getVoices();
  jaVoices.value = list.filter(v => v.lang.startsWith('ja'));
}

async function saveSettings() {
  await settingsStorage.setValue({ ...settings });
  showSavedStatus.value = true;
  setTimeout(() => {
    showSavedStatus.value = false;
  }, 1500);
}

async function testApi() {
  isTestingApi.value = true;
  testResult.value = null;

  try {
    const startTime = Date.now();
    const resp = await browser.runtime.sendMessage({
      type: 'ASK_AI',
      question: 'Hello, this is a test. Answer with one word: OK.',
      word: 'test',
      sentence: 'test',
      translation: '测试'
    });

    if (resp?.success && resp.answer) {
      testResult.value = {
        success: true,
        latency: Date.now() - startTime
      };
    } else {
      testResult.value = {
        success: false,
        error: resp?.error || '无法建立握手，请检查端点连通性'
      };
    }
  } catch (err: any) {
    testResult.value = {
      success: false,
      error: err.message || '底层请求异常，网络不可达'
    };
  } finally {
    isTestingApi.value = false;
  }
}

function testTTS() {
  isSpeaking.value = true;
  speakText('日本語を勉強します。', settings, () => {
    isSpeaking.value = false;
  });
}
</script>

<style>
/* CSS Variable Definitions for Day/Dark themes */
.theme-light {
  --bg-primary: #f6f6f9;
  --bg-secondary: #ffffff;
  --bg-card: #ffffff;
  --border-subtle: #e2e2ea;
  --border-strong: #c0c0cf;
  --text-primary: #121316;
  --text-secondary: #5a5d6a;
  --text-muted: #8e92a4;
  --accent-base: #5c35b4;
  --accent-light: #ece7f8;
  --btn-bg: #5c35b4;
  --btn-hover: #4e299c;
  --btn-text: #ffffff;
  --input-bg: #f9f9fb;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03);
  --shadow-md: 0 4px 18px rgba(0, 0, 0, 0.04);
}

.theme-dark {
  --bg-primary: #0d0e12;
  --bg-secondary: #14161d;
  --bg-card: #14161d;
  --border-subtle: #242731;
  --border-strong: #363b49;
  --text-primary: #eaecef;
  --text-secondary: #9aa2b1;
  --text-muted: #5e6675;
  --accent-base: #a78bfa;
  --accent-light: #211c34;
  --btn-bg: #3d355b;
  --btn-hover: #4b4170;
  --btn-text: #f3f4f6;
  --input-bg: #090a0d;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.5);
  --shadow-md: 0 10px 30px rgba(0,0,0,0.3);
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  transition: background-color var(--transition-speed), color var(--transition-speed);
}
</style>

<style scoped>
.rubi-page-wrapper {
  min-height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition: background-color 0.3s ease, color 0.3s ease;
  font-size: 14px;
}

.rubi-options-app {
  max-width: 1000px;
  margin: 0 auto;
  padding: 50px 24px;
}

/* Header style - Journal paper standard */
.rubi-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-bottom: 2px solid var(--text-primary);
  padding-bottom: 16px;
  margin-bottom: 40px;
}

.logo-text h1 {
  font-family: Georgia, "Times New Roman", "Songti SC", serif;
  font-size: 28px;
  font-weight: 400;
  margin: 0;
  color: var(--text-primary);
}

.subtitle {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 6px 0 0 0;
  letter-spacing: 0.8px;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 20px;
}

.theme-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: 1px solid var(--border-strong);
  border-radius: 4px;
  color: var(--text-primary);
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-toggle-btn:hover {
  background-color: var(--accent-light);
  border-color: var(--accent-base);
}

.save-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

.save-status .dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: var(--border-strong);
}

.save-status.saved {
  color: var(--accent-base);
}

.save-status.saved .dot {
  background-color: var(--accent-base);
}

/* Academic layout grid */
.layout-grid {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 40px;
}

.settings-column {
  display: flex;
  flex-direction: column;
  gap: 36px;
}

/* Academic styled cards */
.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: 0; /* Boxy journal layout */
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.3s ease;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-subtle);
  background-color: var(--bg-primary);
}

.card-header h2 {
  font-family: Georgia, "Times New Roman", "Songti SC", serif;
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.section-tag {
  font-family: monospace;
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
}

.card-body {
  padding: 24px;
}

/* Input Styles */
.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.input-group:last-child,
.row .input-group {
  margin-bottom: 0;
}

.input-group label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.input-group input[type="text"],
.input-group input[type="password"],
.select-field {
  background-color: var(--input-bg);
  border: 1px solid var(--border-strong);
  border-radius: 2px;
  color: var(--text-primary);
  padding: 8px 12px;
  font-size: 13.5px;
  outline: none;
  transition: all 0.2s ease;
}

.input-group input[type="text"]:focus,
.input-group input[type="password"]:focus,
.select-field:focus {
  border-color: var(--accent-base);
  box-shadow: 0 0 0 3px var(--accent-transparent);
}

.password-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-wrapper input {
  width: 100%;
  padding-right: 36px;
}

.toggle-password-btn {
  position: absolute;
  right: 6px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.toggle-password-btn:hover {
  color: var(--text-primary);
  background-color: var(--hover-bg);
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: end;
}

.half {
  min-width: 0;
}

.action-group {
  display: flex;
  align-items: flex-end;
}

/* Switches & Knobs */
.toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-subtle);
  padding-bottom: 18px;
  margin-bottom: 20px;
}

.toggle-desc h3 {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.toggle-desc p {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 4px 0 0 0;
}

.toggle-btn {
  width: 38px;
  height: 20px;
  background-color: var(--border-strong);
  border: none;
  border-radius: 10px;
  position: relative;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.toggle-btn.active {
  background-color: var(--accent-base);
}

.toggle-dot {
  width: 14px;
  height: 14px;
  background-color: #ffffff;
  border-radius: 50%;
  position: absolute;
  top: 3px;
  left: 3px;
  transition: transform 0.2s ease;
}

.toggle-btn.active .toggle-dot {
  transform: translateX(18px);
}

/* Radio groups - academic tabs style */
.radio-group-bar {
  display: flex;
  border: 1px solid var(--border-strong);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 4px;
}

.radio-label-item {
  flex: 1;
  text-align: center;
  position: relative;
  cursor: pointer;
  padding: 8px 0;
  background: var(--bg-secondary);
  transition: all 0.2s ease;
}

.radio-label-item:not(:last-child) {
  border-right: 1px solid var(--border-strong);
}

.radio-label-item input {
  position: absolute;
  opacity: 0;
}

.radio-text {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-secondary);
}

.radio-label-item.selected {
  background-color: var(--accent-light);
}

.radio-label-item.selected .radio-text {
  color: var(--accent-base);
  font-weight: 600;
}

/* Professional range slider */
.range-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  background: var(--border-strong);
  outline: none;
  margin-top: 12px;
}

.range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent-base);
  cursor: pointer;
  transition: transform 0.1s ease;
}

/* Action Buttons */
.btn {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  border-radius: 2px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
  border: 1px solid var(--border-strong);
}

.btn-action {
  background-color: var(--btn-bg);
  color: var(--btn-text);
  border-color: var(--btn-bg);
  padding: 8px 16px;
}

.btn-action:hover:not(:disabled) {
  background-color: var(--btn-hover);
  border-color: var(--btn-hover);
}

.btn-action.secondary {
  background-color: transparent;
  color: var(--text-primary);
  border-color: var(--border-strong);
}

.btn-action.secondary:hover:not(:disabled) {
  background-color: var(--bg-primary);
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* TTS Engine Selector */
.engine-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 6px;
}

.engine-option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.18s ease;
  background: var(--input-bg);
}

.engine-option:hover {
  border-color: var(--accent-base);
  background: var(--accent-light);
}

.engine-option.active {
  border-color: var(--accent-base);
  background: var(--accent-light);
  box-shadow: 0 0 0 2px rgba(92, 53, 180, 0.12);
}

.engine-option input[type="radio"] {
  margin-top: 3px;
  accent-color: var(--accent-base);
  flex-shrink: 0;
}

.engine-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.engine-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.engine-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 20px;
  letter-spacing: 0.03em;
}

.engine-badge.best {
  background: linear-gradient(135deg, #6d28d9, #8b5cf6);
  color: #fff;
}

.engine-badge.free {
  background: linear-gradient(135deg, #0ea5e9, #38bdf8);
  color: #fff;
}

.engine-badge.local {
  background: var(--border-strong);
  color: var(--text-secondary);
}

.engine-desc {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.4;
}

/* Dictionary source attribution */
.dict-attribution {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--border-subtle);
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.6;
}

.dict-attribution a {
  color: var(--accent-base);
  text-decoration: none;
  opacity: 0.8;
}

.dict-attribution a:hover {
  opacity: 1;
  text-decoration: underline;
}

.action-footer {
  margin-top: 20px;
  border-top: 1px solid var(--border-subtle);
  padding-top: 16px;
}


/* Test results */
.test-feedback {
  margin-top: 12px;
  padding: 8px 12px;
  font-size: 12px;
  line-height: 1.5;
  border-left: 2px solid;
}

.test-feedback.success {
  background-color: rgba(16, 185, 129, 0.05);
  color: #10b981;
  border-color: #10b981;
}

.test-feedback.error {
  background-color: rgba(239, 68, 68, 0.05);
  color: #ef4444;
  border-color: #ef4444;
}

.description-hint {
  font-size: 12px;
  color: var(--text-muted);
  margin: 6px 0 0 0;
  line-height: 1.4;
}

/* Aside panel rules */
.info-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.sidebar-block {
  border-top: 2px solid var(--text-primary);
  padding-top: 16px;
}

.sidebar-block h2 {
  font-family: Georgia, "Times New Roman", "Songti SC", serif;
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: var(--text-primary);
  text-transform: uppercase;
}

.doc-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.doc-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.doc-desc {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-primary);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #10b981;
}

.status-details {
  font-size: 11.5px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 8px 0 0 0;
}
</style>
