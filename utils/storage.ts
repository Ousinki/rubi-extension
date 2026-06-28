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

  apiProfiles: ApiProfile[];
  activeApiProfileId: string;

  enabled: boolean;
  ttsEngine: 'webspeech' | 'edge' | 'google';  // TTS backend engine
  ttsLanguage: string;     // Default: 'ja-JP'
  ttsRate: number;         // Speech rate (0.1 - 2.0)
  ttsVolume: number;       // Speech volume (0.0 - 1.0)
  ttsVoiceURI: string;     // Speech voice name (e.g. Google 日本語)
  edgeVoice: string;       // Microsoft Edge TTS voice name
  enableAutoPronounce: boolean;
  enableClickPronounce: boolean;
  enableShortcutPronounce: boolean;
  enableSingleClickPronounce: boolean;
  
  translationEngine: 'none' | 'google' | 'deepl' | 'bing';
  translationPosition: 'top' | 'bottom' | 'pronounce-badge';
  showTranslationEngine: boolean;
  showSingleClickReading: boolean; // Show furigana tooltip on single click
  
  enableAutoTranslate: boolean;
  enableClickTranslate: boolean;
  enableLongPressTranslate: boolean;
  enableContextualCollocation: boolean;
  paragraphShortcut: string;
  uiLanguage: 'zh-CN' | 'zh-TW' | 'ja' | 'en';
  targetLanguage: 'zh-CN' | 'zh-TW' | 'ja' | 'en';
  
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
  furiganaDisplayMode: 'ruby' | 'overlay' | 'inline'; // Furigana display mode
  jlptFilterLevel: 'all' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1'; // Filter annotations by JLPT difficulty
}

export const DEFAULT_SETTINGS: RubiSettings = {
  apiKey: '',
  apiEndpoint: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o-mini',

  apiProfiles: [],
  activeApiProfileId: '',

  enabled: true,
  ttsEngine: 'edge',
  ttsLanguage: 'ja-JP',
  ttsRate: 1.0,
  ttsVolume: 1.0,
  ttsVoiceURI: 'Google 日本語',
  edgeVoice: 'ja-JP-NanamiNeural',
  enableAutoPronounce: true,
  enableClickPronounce: false,
  enableShortcutPronounce: true,
  enableSingleClickPronounce: true,
  
  translationEngine: 'google',
  translationPosition: 'bottom',
  showTranslationEngine: true,
  showSingleClickReading: true,
  
  enableAutoTranslate: true,
  enableClickTranslate: false,
  enableLongPressTranslate: true,
  enableContextualCollocation: true,
  paragraphShortcut: 'Alt+KeyT',
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
  furiganaDisplayMode: 'ruby',
  jlptFilterLevel: 'all',
};

export const settingsStorage = storage.defineItem<RubiSettings>(
  'sync:rubi-settings',
  { fallback: DEFAULT_SETTINGS }
);
export type RTTRSettings = RubiSettings; // Alias for ported component compatibility
export type settingsStorageType = typeof settingsStorage;
