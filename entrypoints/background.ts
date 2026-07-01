/**
 * Rubi Background Service Worker
 *
 * Responsibilities:
 * 1. Listen for messages from Content Script
 * 2. Invoke Japanese AI APIs for translation and collocation analysis
 * 3. Handle Chrome Commands keyboard shortcut dispatch
 * 4. Update the extension action badge & icon state based on active/inactive setting
 */

import { translateParagraphJa, explainWordJa, contextualTranslateJa, askAIJa } from '@/utils/ai';
import { handleFetchTranslation } from '@/utils/translator';
import { settingsStorage } from '@/utils/storage';
import { shouldSkipJa } from '@/utils/skip-words-ja';
import { fetchEdgeTTSAudio } from '@/utils/tts-edge';
import type { AnnotationResult } from '@/utils/ai';
import { initDictionary, searchWords } from './background/dict-manager';

const PARAGRAPH_SEGMENT_CACHE_KEY = 'rubi_paragraph_segment_cache_v1';
const SEGMENT_TIMEOUT_MS = 25000;
const MAX_SEGMENT_CACHE_ENTRIES = 150;

export default defineBackground(() => {
  console.log('[Rubi] Background service worker started', {
    id: browser.runtime.id,
  });

  // Initialize dictionary downloading/loading in background
  initDictionary();

  // ─── Setup declarativeNetRequest for Edge TTS & DeepL Bypass ─
  async function setupNetRules() {
    try {
      const RULE_ID_EDGE = 1;
      const RULE_ID_DEEPL = 2;
      await browser.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [RULE_ID_EDGE, RULE_ID_DEEPL],
        addRules: [
          {
            id: RULE_ID_EDGE,
            priority: 1,
            action: {
              type: 'modifyHeaders',
              requestHeaders: [
                {
                  header: 'Origin',
                  operation: 'remove',
                },
              ],
            },
            condition: {
              urlFilter: 'wss://speech.platform.bing.com/*',
              resourceTypes: ['websocket'],
            },
          },
          {
            id: RULE_ID_DEEPL,
            priority: 1,
            action: {
              type: 'modifyHeaders',
              requestHeaders: [
                {
                  header: 'Origin',
                  operation: 'set',
                  value: 'https://www.deepl.com',
                },
                {
                  header: 'Referer',
                  operation: 'set',
                  value: 'https://www.deepl.com/',
                },
                {
                  header: 'User-Agent',
                  operation: 'set',
                  value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
              ],
            },
            condition: {
              urlFilter: 'https://www2.deepl.com/*',
              resourceTypes: ['xmlhttprequest', 'other'],
            },
          },
        ],
      });
      console.log('[Rubi] declarativeNetRequest rules updated successfully');
    } catch (err) {
      console.error('[Rubi] Failed to set declarativeNetRequest rules:', err);
    }
  }

  // Run on startup
  setupNetRules();

  // ─── Update Extension Icon and Badge ─────────────────────────
  async function updateIconState(enabled: boolean) {
    if (enabled) {
      await browser.action.setBadgeText({ text: '' });
      await browser.action.setIcon({
        path: {
          16: '/icon/action-16.png',
          32: '/icon/action-32.png',
          48: '/icon/action-48.png',
          96: '/icon/action-96.png',
          128: '/icon/action-128.png',
        },
      });
      await browser.action.setTitle({ title: 'Rubi — 点击关闭' });
    } else {
      await browser.action.setBadgeText({ text: '' });
      await browser.action.setBadgeBackgroundColor({ color: '#6b7280' });
      await browser.action.setBadgeTextColor({ color: '#ffffff' });

      // Generate grayscale icon for disabled state
      try {
        const sizes = [16, 32, 48] as const;
        const imageDataMap: Record<number, ImageData> = {};
        for (const size of sizes) {
          const response = await fetch(browser.runtime.getURL(`/icon/action-${size}.png`));
          const blob = await response.blob();
          const bitmap = await createImageBitmap(blob);
          const canvas = new OffscreenCanvas(size, size);
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(bitmap, 0, 0, size, size);
          const imageData = ctx.getImageData(0, 0, size, size);
          // Convert to gray
          for (let i = 0; i < imageData.data.length; i += 4) {
            const gray = imageData.data[i] * 0.299 + imageData.data[i + 1] * 0.587 + imageData.data[i + 2] * 0.114;
            const muted = gray * 0.7 + 80;
            imageData.data[i] = muted;
            imageData.data[i + 1] = muted;
            imageData.data[i + 2] = muted;
            imageData.data[i + 3] = imageData.data[i + 3] * 0.6;
          }
          imageDataMap[size] = imageData;
        }
        await browser.action.setIcon({ imageData: imageDataMap as any });
      } catch (err) {
        console.warn('[Rubi] Grayscale icon generation failed:', err);
      }

      await browser.action.setTitle({ title: 'Rubi — 点击开启' });
    }
  }

  // Initialize icon state
  settingsStorage.getValue().then((s) => updateIconState(s.enabled));

  // Watch for setting changes
  settingsStorage.watch((newVal) => {
    if (newVal) updateIconState(newVal.enabled);
  });

  // Toggle extension state on action button click
  browser.action.onClicked.addListener(async () => {
    const settings = await settingsStorage.getValue();
    settings.enabled = !settings.enabled;
    await settingsStorage.setValue(settings);
    console.log(`[Rubi] Extension is now ${settings.enabled ? 'enabled' : 'disabled'}`);
  });

  // ─── Message Router ──────────────────────────────────────────
  browser.runtime.onMessage.addListener(
    (message: any, _sender, sendResponse) => {
      switch (message.type) {
        case 'TRANSLATE':
          handleTranslateJa(message.text)
            .then(sendResponse)
            .catch((err) =>
              sendResponse({
                success: false,
                error: err.message,
              })
            );
          return true; // Async response

        case 'EXPLAIN_WORD':
          handleExplainWordJa(message.word, message.sentence)
            .then(sendResponse)
            .catch((err) => sendResponse({ success: false, error: err.message }));
          return true;

        case 'CONTEXTUAL_TRANSLATE':
          handleContextualTranslateJa(message.word, message.sentence)
            .then(sendResponse)
            .catch((err) => sendResponse({ success: false, error: err.message }));
          return true;

        case 'ASK_AI':
          handleAskAIJa(message.question, message.word, message.sentence, message.translation)
            .then(sendResponse)
            .catch((err) => sendResponse({ success: false, error: err.message }));
          return true;

        case 'EDGE_TTS_SPEAK':
          handleEdgeTTS(message.text, message.voice, message.rate, message.volume)
            .then(sendResponse)
            .catch((err) => sendResponse({ success: false, error: err.message }));
          return true;

        case 'VOICEVOX_TTS_SPEAK':
          handleVoicevoxTTS(message.text, message.endpoint, message.speaker, message.rate, message.volume)
            .then(sendResponse)
            .catch((err) => sendResponse({ success: false, error: err.message }));
          return true;

        case 'SEARCH_WORD':
          searchWords(message.text)
            .then((result) => sendResponse({ success: true, result }))
            .catch((err) => sendResponse({ success: false, error: err.message }));
          return true;

        case 'SEARCH_NAMES':
          import('./background/dict-manager').then(({ searchNames }) => {
            searchNames(message.text)
              .then((result) => sendResponse({ success: true, result }))
              .catch((err) => sendResponse({ success: false, error: err.message }));
          });
          return true;

        case 'GET_DICT_STATE':
          import('./background/dict-manager').then(({ db }) => {
            if (!db) {
              sendResponse({ success: true, state: 'not_initialized' });
            } else {
              sendResponse({
                success: true,
                state: {
                  words: db.words.state,
                  names: db.names.state,
                  kanji: db.kanji.state
                }
              });
            }
          });
          return true;

        case 'OPEN_OPTIONS':
          browser.tabs.create({ url: browser.runtime.getURL('/options.html') });
          sendResponse({ success: true });
          return false;

        case 'FETCH_TRANSLATION':
          handleFetchTranslation(message.text, message.sourceLang, message.targetLang, message.engine)
            .then((res) => sendResponse(res))
            .catch((err) => sendResponse({ targetText: '', engine: message.engine, error: err.message }));
          return true;

        default:
          return false;
      }
    }
  );

  // ─── Paragraph Keyboard Shortcut ─────────────────────────────
  browser.commands.onCommand.addListener(async (command) => {
    if (command === 'translate-paragraph') {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab?.id) {
        browser.tabs.sendMessage(tab.id, { type: 'TRIGGER_TRANSLATE' });
      }
    }
  });

  // ─── AI Translation & Analysis Pipeline ────────────────────
  async function handleTranslateJa(text: string): Promise<any> {
    const settings = await settingsStorage.getValue();

    if (!settings.apiKey) {
      return {
        success: false,
        error: '请先在 Rubi 设置中配置 AI API Key',
      };
    }

    if (!settings.enabled) {
      return {
        success: false,
        error: 'Rubi 已禁用',
      };
    }

    const aiResults = await getSegmentedTokensJa(text, settings);

    // Filter out common skip words + dedup (same word only annotated once per paragraph)
    const seenTokens = new Set<string>();
    const displayResults = aiResults
      .filter((item) => {
        const word = item.word;
        if (shouldSkipJa(word)) return false;
        
        // Skip if reading or translation is identical to word
        if (item.kind !== 'name' &&
          (!item.translation || word === item.translation)) {
          return false;
        }
        
        // Dedup: for w/p tokens, only keep first occurrence
        if (item.kind === 'word' || item.kind === 'phrase') {
          if (seenTokens.has(word)) return false;
          seenTokens.add(word);
        }
        return true;
      })
      .sort((a, b) => a.start - b.start || a.end - b.end);

    return {
      success: true,
      results: displayResults,
    };
  }

  async function getSegmentedTokensJa(text: string, settings: any): Promise<AnnotationResult[]> {
    const cacheKey = await createSegmentCacheKey(text, settings.model, settings.targetLanguage || 'zh-CN');
    const cached = await readSegmentCache(cacheKey);
    if (cached) return cached;

    const segmentPromise = translateParagraphJa(text, settings);
    try {
      const tokens = await withTimeout(
        segmentPromise,
        SEGMENT_TIMEOUT_MS,
        `AI 日语分词分析超时 ${SEGMENT_TIMEOUT_MS}ms`
      );
      await writeSegmentCache(cacheKey, tokens);
      return tokens;
    } catch (err) {
      console.warn('[Rubi] AI 分词分析失败:', err);
      return [];
    }
  }

  // ─── Local Caching for AI Paragraph Segmentation ───────────────
  async function createSegmentCacheKey(text: string, model: string, targetLanguage: string): Promise<string> {
    const normalized = text.replace(/\s+/g, ' ').trim();
    const data = new TextEncoder().encode(`${model}\n${targetLanguage}\n${normalized}`);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  async function readSegmentCache(key: string): Promise<AnnotationResult[] | null> {
    try {
      const stored = await browser.storage.local.get(PARAGRAPH_SEGMENT_CACHE_KEY);
      const cache = stored[PARAGRAPH_SEGMENT_CACHE_KEY] as Record<string, { ts: number; tokens: AnnotationResult[] }> | undefined;
      return cache?.[key]?.tokens || null;
    } catch {
      return null;
    }
  }

  async function writeSegmentCache(key: string, tokens: AnnotationResult[]): Promise<void> {
    try {
      const stored = await browser.storage.local.get(PARAGRAPH_SEGMENT_CACHE_KEY);
      const cache = (stored[PARAGRAPH_SEGMENT_CACHE_KEY] || {}) as Record<string, { ts: number; tokens: AnnotationResult[] }>;
      cache[key] = { ts: Date.now(), tokens };

      const entries = Object.entries(cache).sort((a, b) => b[1].ts - a[1].ts);
      const trimmed = Object.fromEntries(entries.slice(0, MAX_SEGMENT_CACHE_ENTRIES));
      await browser.storage.local.set({ [PARAGRAPH_SEGMENT_CACHE_KEY]: trimmed });
    } catch (err) {
      console.warn('[Rubi] Write cache failed:', err);
    }
  }

  function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  // ─── Explain Word ──────────────────────────────────────────
  async function handleExplainWordJa(word: string, sentence: string): Promise<any> {
    try {
      const settings = await settingsStorage.getValue();
      if (!settings.apiKey) {
        throw new Error('未配置 API Key');
      }
      
      const explanation = await explainWordJa(settings, word, sentence);
      return {
        success: true,
        explanation
      };
    } catch (err: any) {
      console.error('[Rubi] 解释请求失败:', err);
      return { success: false, error: err.message };
    }
  }

  // ─── Contextual Translate ──────────────────────────────────
  async function handleContextualTranslateJa(word: string, sentence: string): Promise<any> {
    try {
      const settings = await settingsStorage.getValue();
      if (!settings.apiKey) {
        throw new Error('未配置 API Key');
      }
      if (!settings.enabled) {
        throw new Error('Rubi 已禁用');
      }

      const translation = await contextualTranslateJa(settings, word, sentence);
      return { success: true, translation };
    } catch (error: any) {
      console.error('[Rubi] Contextual Translate failed:', error);
      return { success: false, error: error.message };
    }
  }

  // ─── Ask AI ────────────────────────────────────────────────
  async function handleAskAIJa(question: string, word: string, sentence: string, translation: string): Promise<any> {
    try {
      const settings = await settingsStorage.getValue();
      if (!settings.apiKey) {
        throw new Error('未配置 API Key');
      }
      if (!settings.enabled) {
        throw new Error('Rubi 已禁用');
      }

      const answer = await askAIJa(settings, question, word, sentence, translation);
      return { success: true, answer };
    } catch (error: any) {
      console.error('[Rubi] Ask AI failed:', error);
      return { success: false, error: error.message };
    }
  }
  // ─── Edge TTS ──────────────────────────────────────────────
  async function handleEdgeTTS(text: string, voice: string, rate: number, volume: number): Promise<any> {
    try {
      const audioBuffer = await fetchEdgeTTSAudio(text, {
        voice: voice as any || 'ja-JP-NanamiNeural',
        rate: Math.round((rate - 1.0) * 100), // convert 0.85x → -15%
        volume: volume,
      });

      // Convert ArrayBuffer to base64 so it can be sent via chrome.runtime.sendMessage
      const uint8 = new Uint8Array(audioBuffer);
      let binary = '';
      for (let i = 0; i < uint8.byteLength; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      const base64 = btoa(binary);

      return { success: true, audioBase64: base64, mimeType: 'audio/mp3' };
    } catch (err: any) {
      console.error('[Rubi] Edge TTS failed:', err);
      return { success: false, error: err.message };
    }
  }

  // ─── Voicevox TTS ──────────────────────────────────────────
  async function handleVoicevoxTTS(text: string, endpoint: string, speaker: number, rate: number, volume: number): Promise<any> {
    try {
      const baseUrl = endpoint.replace(/\/$/, '');
      let audioBuffer: ArrayBuffer;
      
      if (baseUrl.includes('tts.quest')) {
        // Public API (api.tts.quest) does not use audio_query, it directly queues synthesis
        const synthUrl = `${baseUrl}/synthesis?text=${encodeURIComponent(text)}&speaker=${speaker}`;
        const synthRes = await fetch(synthUrl, { method: 'POST' });
        
        if (!synthRes.ok) {
          throw new Error(`Voicevox public API failed: ${synthRes.statusText}`);
        }
        
        const json = await synthRes.json();
        if (!json.success || !json.mp3DownloadUrl || !json.audioStatusUrl) {
          throw new Error('Voicevox public API returned invalid response');
        }
        
        // Wait for audio generation by polling status (fast poll: 200ms)
        let isReady = false;
        let attempts = 0;
        while (!isReady && attempts < 100) {
          const statusRes = await fetch(json.audioStatusUrl);
          if (statusRes.ok) {
            const statusJson = await statusRes.json();
            if (statusJson.isAudioError) {
              throw new Error('Voicevox public API failed to generate audio');
            }
            if (statusJson.isAudioReady) {
              isReady = true;
              break;
            }
          }
          await new Promise(r => setTimeout(r, 200)); // poll every 200ms for speed
          attempts++;
        }

        if (!isReady) {
          throw new Error('Voicevox public API timed out waiting for audio generation');
        }
        
        // Fetch the MP3 now that it's ready (MP3 is smaller/faster than WAV)
        const audioRes = await fetch(json.mp3DownloadUrl);
        if (!audioRes.ok) {
          throw new Error(`Failed to download audio from public API: ${audioRes.statusText}`);
        }
        audioBuffer = await audioRes.arrayBuffer();
        
      } else {
        // Local/Standard Voicevox Engine
        // Step 1: audio_query
        const queryUrl = `${baseUrl}/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`;
        const queryRes = await fetch(queryUrl, { method: 'POST' });
        
        if (!queryRes.ok) {
          throw new Error(`Voicevox audio_query failed: ${queryRes.statusText}`);
        }
        
        const queryJson = await queryRes.json();
        
        // Apply speed and volume parameters
        if (rate && rate !== 1.0) {
          queryJson.speedScale = rate;
        }
        if (volume && volume !== 1.0) {
          queryJson.volumeScale = volume;
        }
        
        // Step 2: synthesis
        const synthUrl = `${baseUrl}/synthesis?speaker=${speaker}`;
        const synthRes = await fetch(synthUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(queryJson)
        });
        
        if (!synthRes.ok) {
          throw new Error(`Voicevox synthesis failed: ${synthRes.statusText}`);
        }
        
        audioBuffer = await synthRes.arrayBuffer();
      }
      
      // Convert ArrayBuffer to base64
      const uint8 = new Uint8Array(audioBuffer);
      let binary = '';
      // Process in chunks to avoid stack overflow for large files
      const chunkSize = 8192;
      for (let i = 0; i < uint8.length; i += chunkSize) {
        const chunk = uint8.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64 = btoa(binary);

      // We use MP3 for public API, WAV for local, but both are decoded automatically by Web Audio API
      return { success: true, audioBase64: base64, mimeType: baseUrl.includes('tts.quest') ? 'audio/mp3' : 'audio/wav' };
    } catch (err: any) {
      console.error('[Rubi] Voicevox TTS failed:', err);
      return { success: false, error: err.message };
    }
  }
});
