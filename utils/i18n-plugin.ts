/**
 * Lightweight i18n plugin for Vue 3, CSP-safe (no eval/Function).
 * Designed for Chrome Extension MV3 environments.
 */
import { ref, type App, type Ref, inject, type InjectionKey } from 'vue';

import zhCN from '@/locales/zh-CN.json';
import zhTW from '@/locales/zh-TW.json';
import en from '@/locales/en.json';
import ja from '@/locales/ja.json';
import ko from '@/locales/ko.json';

export type SupportedLocale = 'zh-CN' | 'zh-TW' | 'en' | 'ja' | 'ko';

type Messages = Record<string, any>;

const allMessages: Record<SupportedLocale, Messages> = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'en': en,
  'ja': ja,
  'ko': ko,
};

const I18N_KEY: InjectionKey<{ locale: Ref<SupportedLocale>; t: (key: string) => string }> = Symbol('i18n');

function resolveKey(messages: Messages, key: string): string {
  const parts = key.split('.');
  let current: any = messages;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return key;
    current = current[part];
  }
  return typeof current === 'string' ? current : key;
}

export function createI18nPlugin(defaultLocale: SupportedLocale = 'zh-CN') {
  const locale = ref<SupportedLocale>(defaultLocale);

  function t(key: string): string {
    return resolveKey(allMessages[locale.value] || allMessages['zh-CN'], key);
  }

  return {
    locale,
    t,
    install(app: App) {
      app.provide(I18N_KEY, { locale, t });
      app.config.globalProperties.$t = t;
    },
  };
}

export function useI18n() {
  const i18n = inject(I18N_KEY);
  if (!i18n) {
    throw new Error('[i18n] useI18n() called without installing the i18n plugin');
  }
  return i18n;
}

// Create and export a singleton
export const i18n = createI18nPlugin('zh-CN');
