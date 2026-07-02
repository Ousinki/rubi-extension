<template>
  <div class="rubi-theme-provider">
    <div class="rubi-page-wrapper">
      <div class="rubi-options-app">
        <!-- Header -->
        <header class="rubi-header">
          <div class="logo-area">
            <img :src="locale === 'ja' ? '/logo-ja.svg' : '/icon/action-128.png'" alt="Rubi Logo" :class="['app-logo', { 'is-ja': locale === 'ja' }]" />
            <div class="logo-text">
              <h1>Rubi Settings</h1>
              <p class="subtitle">{{ t('header.subtitle') }}</p>
            </div>
          </div>
          <div class="header-controls">
            <!-- Theme Switcher -->
            <button class="theme-toggle-btn" @click="toggleTheme" :title="t('header.theme_toggle')">
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
              <span class="theme-label">{{ theme === 'dark' ? t('header.theme_light') : t('header.theme_dark') }}</span>
            </button>

            <!-- UI Language Selector -->
            <div class="lang-selector">
              <CustomSelect
                v-model="settings.uiLanguage"
                :options="langOptions"
                compact
                @change="saveSettings"
              >
                <template #icon>
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                </template>
              </CustomSelect>
            </div>
          </div>
        </header>

        <div class="layout-grid">
          <!-- Left Column: Settings panels -->
          <main class="settings-column">
            <AppearanceSettings />
            <LookupSettings />
            <ContextMenuSettings />
            <AISettings />
            <FuriganaSettings />
            <ParagraphSettings />
            <TTSSettings />
          </main>

          <!-- Right Column: Navigation TOC -->
          <aside class="info-column">
            <div class="sidebar-block doc-panel" style="position: sticky; top: 24px;">
              <h2>{{ t('nav.title') }}</h2>
              <ul class="doc-list">
                <li>
                  <a href="#appearance" class="doc-label" :class="{ active: activeSection === 'appearance' }">{{ t('appearance.title') }}</a>
                </li>
                <li>
                  <a href="#lookup-panel" class="doc-label" :class="{ active: activeSection === 'lookup-panel' }">{{ t('lookup.title') }}</a>
                </li>
                <li>
                  <a href="#context-menu-panel" class="doc-label" :class="{ active: activeSection === 'context-menu-panel' }">右键菜单</a>
                </li>
                <li>
                  <a href="#api-settings" class="doc-label" :class="{ active: activeSection === 'api-settings' }">{{ t('llm.title') }}</a>
                </li>
                <li>
                  <a href="#furigana-preferences" class="doc-label" :class="{ active: activeSection === 'furigana-preferences' }">{{ t('furigana.title') }}</a>
                </li>
                <li>
                  <a href="#paragraph-translation" class="doc-label" :class="{ active: activeSection === 'paragraph-translation' }">{{ t('paragraph.title') }}</a>
                </li>
                <li>
                  <a href="#speech-engine" class="doc-label" :class="{ active: activeSection === 'speech-engine' }">{{ t('tts.title') }}</a>
                </li>
              </ul>

              <!-- Autosave status info inside the sticky area -->
              <div v-show="showSavedStatus" class="status-indicator" style="margin-top: 24px; animation: rubi-fade 0.2s ease forwards;">
                <span class="status-dot"></span>
                <span>已自动保存</span>
              </div>
            </div>
          </aside>
        </div>

        <footer class="page-footer">
          <p class="dict-attribution" style="text-align: center; margin: 0; padding: 0; border: none;">
            {{ t('lookup.inspiration_pre') }}
            <a href="https://github.com/birchill/10ten-ja-reader" target="_blank" rel="noopener">10ten Japanese Reader</a>
            {{ t('lookup.inspiration_suf') }}
          </p>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, computed, provide } from 'vue';
import { useI18n } from '@/utils/i18n-plugin';
import type { SupportedLocale } from '@/utils/i18n-plugin';
import { settingsStorage, DEFAULT_SETTINGS } from '@/utils/storage';
import type { RubiSettings } from '@/utils/storage';
import CustomSelect from './components/CustomSelect.vue';

// Subcomponents
import AppearanceSettings from './components/AppearanceSettings.vue';
import LookupSettings from './components/LookupSettings.vue';
import ContextMenuSettings from './components/ContextMenuSettings.vue';
import AISettings from './components/AISettings.vue';
import FuriganaSettings from './components/FuriganaSettings.vue';
import ParagraphSettings from './components/ParagraphSettings.vue';
import TTSSettings from './components/TTSSettings.vue';

const settings = reactive<RubiSettings>({ ...DEFAULT_SETTINGS });
const { t, locale } = useI18n();

const theme = ref<'light' | 'dark'>('dark');
const activeSection = ref<string>('appearance');
const showSavedStatus = ref(false);

// Provide state and common methods to subcomponents
provide('settings', settings);
provide('saveSettings', saveSettings);
provide('t', t);

watch(() => settings.uiLanguage, (newLang) => {
  locale.value = newLang as SupportedLocale;
});

const langOptions = computed(() => [
  { value: 'zh-CN', label: t('lang.zh_cn') },
  { value: 'zh-TW', label: t('lang.zh_tw') },
  { value: 'en', label: t('lang.en') },
  { value: 'ja', label: t('lang.ja') },
  { value: 'ko', label: t('lang.ko') },
]);

onMounted(async () => {
  // Load settings
  const stored = await settingsStorage.getValue();
  Object.assign(settings, stored);
  
  theme.value = getInitialTheme();
  applyThemeToDocument();
  
  if (settings.uiLanguage) {
    locale.value = settings.uiLanguage;
  }

  // Setup Scrollspy Observer
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          activeSection.value = entry.target.id;
        }
      });
    },
    { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
  );

  const sections = document.querySelectorAll('section.card[id]');
  sections.forEach((section) => {
    observer.observe(section);
  });
});

const getInitialTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return 'dark';
  const saved = localStorage.getItem('rubi-theme') as 'light' | 'dark';
  if (saved) return saved;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

function toggleTheme() {
  const nextTheme = theme.value === 'light' ? 'dark' : 'light';
  if ((document as any).startViewTransition) {
    (document as any).startViewTransition(() => {
      theme.value = nextTheme;
      localStorage.setItem('rubi-theme', nextTheme);
      applyThemeToDocument();
    });
  } else {
    theme.value = nextTheme;
    localStorage.setItem('rubi-theme', nextTheme);
    applyThemeToDocument();
  }
}

function applyThemeToDocument() {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    const classesToRemove: string[] = [];
    root.classList.forEach(cls => {
      if (cls.startsWith('theme-') || cls.startsWith('gem-')) {
        classesToRemove.push(cls);
      }
    });
    classesToRemove.forEach(cls => root.classList.remove(cls));
    
    root.classList.add('theme-' + theme.value);
    root.classList.add('gem-' + settings.highlightStyle);
  }
}

async function saveSettings() {
  await settingsStorage.setValue(JSON.parse(JSON.stringify(settings)));
  applyThemeToDocument();
  showSavedStatus.value = true;
  setTimeout(() => {
    showSavedStatus.value = false;
  }, 1500);
}
</script>

<style>
/* CSS Variable Definitions for Day/Dark themes */
:root.theme-light {
  color-scheme: light;
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
  --accent-transparent: rgba(92, 53, 180, 0.12);
  --btn-bg: #5c35b4;
  --btn-hover: #4e299c;
  --btn-text: #ffffff;
  --input-bg: #f9f9fb;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03);
  --shadow-md: 0 4px 18px rgba(0, 0, 0, 0.04);
}

:root.theme-dark {
  color-scheme: dark;
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
  --accent-transparent: rgba(167, 139, 250, 0.15);
  --btn-bg: #3d355b;
  --btn-hover: #4b4170;
  --btn-text: #f3f4f6;
  --input-bg: #090a0d;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.5);
  --shadow-md: 0 10px 30px rgba(0,0,0,0.3);
}

/* ═══ Gem Accent Color Themes ═══ */
/* Pink Ruby */
:root.gem-pink.theme-light {
  --accent-base: #d6336c;
  --accent-light: #fce4ec;
  --accent-transparent: rgba(214, 51, 108, 0.12);
  --btn-bg: #d6336c;
  --btn-hover: #c2255c;
}
:root.gem-pink.theme-dark {
  --accent-base: #f06595;
  --accent-light: #2d1520;
  --accent-transparent: rgba(240, 101, 149, 0.15);
  --btn-bg: #5b2340;
  --btn-hover: #73304f;
}

/* Yellow Citrine */
:root.gem-yellow.theme-light {
  --accent-base: #b8860b;
  --accent-light: #fef9e7;
  --accent-transparent: rgba(184, 134, 11, 0.12);
  --btn-bg: #b8860b;
  --btn-hover: #9a7209;
}
:root.gem-yellow.theme-dark {
  --accent-base: #facc15;
  --accent-light: #2a2510;
  --accent-transparent: rgba(250, 204, 21, 0.15);
  --btn-bg: #5c4d10;
  --btn-hover: #74610e;
}

/* Blue Sapphire */
:root.gem-blue.theme-light {
  --accent-base: #2563eb;
  --accent-light: #e0ecff;
  --accent-transparent: rgba(37, 99, 235, 0.12);
  --btn-bg: #2563eb;
  --btn-hover: #1d4fd8;
}
:root.gem-blue.theme-dark {
  --accent-base: #60a5fa;
  --accent-light: #131c2e;
  --accent-transparent: rgba(96, 165, 250, 0.15);
  --btn-bg: #1e3a5f;
  --btn-hover: #264b77;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition: background-color 0.3s ease, color 0.3s ease;
}

.rubi-theme-provider,
.rubi-theme-provider * {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
}
</style>

<style scoped>
.rubi-theme-provider {
  min-height: 100vh;
}

.rubi-page-wrapper {
  min-height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
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
  border-bottom: 2px solid var(--accent-base);
  padding-bottom: 16px;
  margin-bottom: 40px;
  transition: border-color 0.3s ease;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 16px;
}

.app-logo {
  width: 48px;
  height: 48px;
  object-fit: contain;
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

.lang-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
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

.page-footer {
  margin-top: 40px;
  padding-top: 20px;
  padding-bottom: 20px;
  border-top: 1px dashed var(--border-subtle);
  text-align: center;
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
  text-transform: capitalize;
}

.doc-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.doc-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  padding: 10px 14px;
  border-radius: 6px;
  text-decoration: none;
  transition: all 0.2s ease;
}

.doc-label:hover {
  color: var(--text-primary);
  background-color: rgba(0, 0, 0, 0.05);
}

.doc-label.active {
  color: var(--accent-base);
  background-color: var(--accent-light);
  font-weight: 600;
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

@keyframes rubi-fade {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
