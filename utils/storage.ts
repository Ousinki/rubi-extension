/**
 * Rubi Storage Layer
 * Manages user configurations and JLPT settings, using chrome.storage.sync for synchronization.
 */

import { storage } from '#imports';

export interface CustomSearchEngine {
  name: string;
  urlTemplate: string;
  enabled: boolean;
}

export interface ApiProfile {
  id: string;
  name: string;
  apiKey: string;
  apiEndpoint: string;
  model: string;
}

export interface RubiSettings {
  apiKey: string;
  apiEndpoint: string;
  model: string;
  deeplApiKey: string;

  apiProfiles: ApiProfile[];
  activeApiProfileId: string;

  enabled: boolean;
  ttsEngine: 'webspeech' | 'edge' | 'google' | 'voicevox';  // TTS backend engine
  ttsLanguage: string;     // Default: 'ja-JP'
  ttsRate: number;         // Speech rate (0.1 - 2.0)
  ttsVolume: number;       // Speech volume (0.0 - 1.0)
  ttsVoiceURI: string;     // Speech voice name (e.g. Google 日本語)
  edgeVoice: string;       // Microsoft Edge TTS voice name
  voicevoxEndpoint: string; // Voicevox API Endpoint
  voicevoxSpeaker: number; // Voicevox Speaker ID
  pronounceTrigger: 'hover' | 'click' | 'dblclick';
  
  translationEngine: 'none' | 'google' | 'deepl' | 'bing';
  translationPosition: 'top' | 'bottom' | 'pronounce-badge';
  showTranslationEngine: boolean;
  showSingleClickReading: boolean; // Show furigana tooltip on single click
  translationTrigger: 'hover' | 'click' | 'dblclick';
  
  enableAutoTranslate: boolean;
  enableClickTranslate: boolean;
  enableLongPressTranslate: boolean;
  enableContextualCollocation: boolean;
  paragraphShortcut: string;
  enableInlineParagraphTranslate: boolean;
  inlineParagraphTrigger: 'none' | 'shift' | 'ctrl' | 'alt' | 'meta' | 'longpress' | 'direct' | 'custom';
  inlineParagraphCustomShortcut: string;
  fullPageTranslateShortcut: string;
  uiLanguage: 'zh-CN' | 'zh-TW' | 'ja' | 'en' | 'ko';
  targetLanguage: 'zh-CN' | 'zh-TW' | 'ja' | 'en' | 'ko';
  translationDisplayMode: 'append' | 'replace';
  
  enableContextMenu: boolean;
  enableSearchGoogle: boolean;
  customSearchEngines: CustomSearchEngine[];
  enableContextMenuInfo: boolean;
  enableContextMenuExplain: boolean;
  enableContextMenuTranslate: boolean;
  enableContextMenuBlockTranslate: boolean;
  enableContextMenuFocus: boolean;
  
  enableCustomContextMenu: boolean;
  customMenuConfig: { id: string, enabled: boolean }[];

  // Japanese specific settings
  enableFuriganaRuby: boolean;       // Enable full-page Furigana ruby annotations
  furiganaShortcut: string;          // Shortcut to toggle Furigana (e.g. Alt+KeyF)
  furiganaDisplayMode: 'ruby' | 'overlay' | 'inline'; // Furigana display mode
  jlptFilterLevel: 'all' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1'; // Filter annotations by JLPT difficulty
  furiganaColor: 'theme' | 'gray' | 'text';          // Furigana color
  furiganaFont: 'system' | 'sans-serif' | 'serif' | 'monospace'; // Furigana font
  furiganaOpacity: '0.4' | '0.6' | '0.8' | '1.0';    // Furigana opacity
  
  highlightStyle: 'purple' | 'yellow' | 'pink' | 'blue'; // UI highlight color theme
  tooltipTheme: 'system' | 'light' | 'dark' | 'beige' | 'glass'; // Tooltip style/theme
  lookupDisplayStyle: 'tooltip' | 'ruby'; // Display Word Lookup as tooltip or inline ruby
}

export const DEFAULT_SETTINGS: RubiSettings = {
  apiKey: '',
  apiEndpoint: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o-mini',
  deeplApiKey: '',

  apiProfiles: [],
  activeApiProfileId: '',

  enabled: true,
  ttsEngine: 'edge',
  ttsLanguage: 'ja-JP',
  ttsRate: 1.0,
  ttsVolume: 1.0,
  ttsVoiceURI: 'Google 日本語',
  edgeVoice: 'ja-JP-NanamiNeural',
  voicevoxEndpoint: 'https://api.tts.quest/v3/voicevox',
  voicevoxSpeaker: 2, // 2 is typically Shikoku Metan (Normal)
  pronounceTrigger: 'click',
  
  translationEngine: 'google',
  translationPosition: 'bottom',
  showTranslationEngine: true,
  showSingleClickReading: true,
  translationTrigger: 'hover',
  
  enableAutoTranslate: true,
  enableClickTranslate: false,
  enableLongPressTranslate: true,
  enableContextualCollocation: true,
  paragraphShortcut: 'Alt+KeyT',
  enableInlineParagraphTranslate: true,
  inlineParagraphTrigger: 'shift',
  inlineParagraphCustomShortcut: 'Alt+KeyP',
  fullPageTranslateShortcut: '',
  uiLanguage: 'zh-CN',
  targetLanguage: 'zh-CN',
  translationDisplayMode: 'append',
  
  enableContextMenu: true,
  enableSearchGoogle: true,
  customSearchEngines: [],
  enableContextMenuInfo: true,
  enableContextMenuExplain: true,
  enableContextMenuTranslate: true,
  enableContextMenuBlockTranslate: false,
  enableContextMenuFocus: true,

  enableCustomContextMenu: true,
  customMenuConfig: [
    { id: 'translate', enabled: true },
    { id: 'machine_translate', enabled: true },
    { id: 'furigana', enabled: true },
    { id: 'explain', enabled: true },
    { id: 'copy', enabled: true },
    { id: 'weblio', enabled: true },
    { id: 'jisho', enabled: true },
    { id: 'wikipedia', enabled: true },
    { id: 'google', enabled: true },
    { id: 'x', enabled: true },
    { id: 'divider_default', enabled: true },
    { id: 'settings', enabled: true }
  ],

  // Japanese specific settings default
  enableFuriganaRuby: false,
  furiganaShortcut: 'Alt+KeyF',
  furiganaDisplayMode: 'ruby',
  jlptFilterLevel: 'N3',
  furiganaColor: 'theme',
  furiganaFont: 'system',
  furiganaOpacity: '0.8',
  
  highlightStyle: 'purple',
  tooltipTheme: 'system',
  lookupDisplayStyle: 'tooltip'
};

const rawSettingsStorage = storage.defineItem<RubiSettings>(
  'sync:rubi-settings',
  { fallback: DEFAULT_SETTINGS }
);

/**
 * Guard: check if the extension runtime context is still valid.
 * When an extension is updated/reloaded, old content-script contexts are
 * invalidated. Any chrome API call after this point will throw
 * "Extension context invalidated". Checking chrome.runtime.id is the
 * canonical way to detect this before making any storage/messaging call.
 */
function isExtensionContextValid(): boolean {
  try {
    return typeof browser !== 'undefined'
      && typeof browser.runtime !== 'undefined'
      && !!browser.runtime.id;
  } catch {
    return false;
  }
}

export const settingsStorage = {
  key: rawSettingsStorage.key,
  remove: () => rawSettingsStorage.removeValue(),
  async getValue(): Promise<RubiSettings> {
    if (!isExtensionContextValid()) return DEFAULT_SETTINGS;
    try {
      const val = await rawSettingsStorage.getValue();
      const merged = { ...DEFAULT_SETTINGS, ...val };
      
      // Smart migration for array settings like customMenuConfig
      if (val && val.customMenuConfig) {
        if (!Array.isArray(val.customMenuConfig)) {
          if (typeof val.customMenuConfig === 'object') {
            merged.customMenuConfig = Object.values(val.customMenuConfig);
          } else {
            merged.customMenuConfig = [...DEFAULT_SETTINGS.customMenuConfig];
          }
        }
        
        // Removed obsolete items check, 'copy' is now valid again
        
        // 2. Add new default items that are missing from user storage
        const existingIds = new Set(merged.customMenuConfig.map((i: any) => i.id));
        for (const defItem of DEFAULT_SETTINGS.customMenuConfig) {
          if (!existingIds.has(defItem.id)) {
            merged.customMenuConfig.push(defItem);
          }
        }
      }
      
      return merged;
    } catch (e: any) {
      // Silently fall back on context invalidation (expected after extension update)
      if (e?.message?.includes('context invalidated') || e?.message?.includes('Extension context')) {
        return DEFAULT_SETTINGS;
      }
      console.warn('[Rubi] 扩展存储读取失败，回退到默认设置以防崩溃:', e);
      return DEFAULT_SETTINGS;
    }
  },
  async setValue(val: RubiSettings): Promise<void> {
    try {
      const cleanVal = { ...val };
      for (const key of Object.keys(cleanVal) as Array<keyof RubiSettings>) {
        if (cleanVal[key] === undefined) {
          delete cleanVal[key];
        }
      }
      await rawSettingsStorage.setValue(cleanVal);
    } catch (e: any) {
      if (e?.message?.includes('context invalidated') || e?.message?.includes('storage') || e?.message?.includes('undefined')) {
        console.warn('[Rubi] 扩展上下文已失效 (Storage setValue)，请刷新页面以恢复正常', e);
        return;
      }
      throw e;
    }
  },
  watch(callback: (newVal: RubiSettings | null, oldVal: RubiSettings | null) => void): () => void {
    if (!isExtensionContextValid()) return () => {};
    try {
      return rawSettingsStorage.watch((newVal, oldVal) => {
        // Guard against race: storage.onChanged can fire just after invalidation
        if (!isExtensionContextValid()) return;
        const mergedNew = newVal ? { ...DEFAULT_SETTINGS, ...newVal } : null;
        const mergedOld = oldVal ? { ...DEFAULT_SETTINGS, ...oldVal } : null;
        callback(mergedNew, mergedOld);
      });
    } catch (e: any) {
      if (!e?.message?.includes('context invalidated') && !e?.message?.includes('Extension context')) {
        console.warn('[Rubi] 扩展上下文已失效 (Storage watch)，无法监听设置变化', e);
      }
      return () => {};
    }
  }
};

export type RTTRSettings = RubiSettings; // Alias for ported component compatibility
export type settingsStorageType = typeof settingsStorage;
