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
  enableAutoPronounce: boolean;
  enableClickPronounce: boolean;
  enableShortcutPronounce: boolean;
  enableSingleClickPronounce: boolean;
  
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
  inlineParagraphTrigger: 'none' | 'shift' | 'ctrl' | 'alt' | 'longpress' | 'direct' | 'custom';
  inlineParagraphCustomShortcut: string;
  uiLanguage: 'zh-CN' | 'zh-TW' | 'ja' | 'en' | 'ko';
  targetLanguage: 'zh-CN' | 'zh-TW' | 'ja' | 'en' | 'ko';
  
  enableContextMenu: boolean;
  enableSearchGoogle: boolean;
  customSearchEngines: CustomSearchEngine[];
  enableContextMenuInfo: boolean;
  enableContextMenuExplain: boolean;
  enableContextMenuTranslate: boolean;
  enableContextMenuBlockTranslate: boolean;
  enableContextMenuFocus: boolean;

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
  enableAutoPronounce: true,
  enableClickPronounce: false,
  enableShortcutPronounce: true,
  enableSingleClickPronounce: true,
  
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
  uiLanguage: 'zh-CN',
  targetLanguage: 'zh-CN',
  
  enableContextMenu: true,
  enableSearchGoogle: true,
  customSearchEngines: [],
  enableContextMenuInfo: true,
  enableContextMenuExplain: true,
  enableContextMenuTranslate: true,
  enableContextMenuBlockTranslate: false,
  enableContextMenuFocus: true,

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
};

const rawSettingsStorage = storage.defineItem<RubiSettings>(
  'sync:rubi-settings',
  { fallback: DEFAULT_SETTINGS }
);

export const settingsStorage = {
  key: rawSettingsStorage.key,
  remove: () => rawSettingsStorage.removeValue(),
  async getValue(): Promise<RubiSettings> {
    const val = await rawSettingsStorage.getValue();
    return { ...DEFAULT_SETTINGS, ...val };
  },
  async setValue(val: RubiSettings): Promise<void> {
    const cleanVal = { ...val };
    for (const key of Object.keys(cleanVal) as Array<keyof RubiSettings>) {
      if (cleanVal[key] === undefined) {
        delete cleanVal[key];
      }
    }
    await rawSettingsStorage.setValue(cleanVal);
  },
  watch(callback: (newVal: RubiSettings | null, oldVal: RubiSettings | null) => void): () => void {
    return rawSettingsStorage.watch((newVal, oldVal) => {
      const mergedNew = newVal ? { ...DEFAULT_SETTINGS, ...newVal } : null;
      const mergedOld = oldVal ? { ...DEFAULT_SETTINGS, ...oldVal } : null;
      callback(mergedNew, mergedOld);
    });
  }
};

export type RTTRSettings = RubiSettings; // Alias for ported component compatibility
export type settingsStorageType = typeof settingsStorage;
