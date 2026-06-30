/**
 * Rubi TTS Engine Router
 *
 * Supports multiple TTS backends:
 *   - webspeech: Browser Web Speech API (local + Google network voices)
 *   - edge:      Microsoft Edge TTS (Azure Neural, free, highest quality)
 *   - google:    Google Translate TTS (unofficial, free, moderate quality)
 */

import { safeSendMessage } from './content-messaging';

let utteranceRef: SpeechSynthesisUtterance | null = null;
let edgeAudioContext: AudioContext | null = null;

const debugLog = (...args: any[]) => {
  if (import.meta.env.DEV) {
    console.log('[Rubi TTS DEBUG]', ...args);
  }
};

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
}

// ─── Main Entry Point ────────────────────────────────────────
export function speakText(
  text: string,
  currentSettings?: any,
  onComplete?: (success: boolean, errorMsg?: string, isFallback?: boolean) => void
) {
  const engine = currentSettings?.ttsEngine || 'webspeech';

  if (engine === 'edge') {
    speakEdgeTTS(text, currentSettings, onComplete);
  } else if (engine === 'voicevox') {
    speakVoicevox(text, currentSettings, onComplete);
  } else if (engine === 'google') {
    speakGoogleTTS(text, currentSettings, onComplete);
  } else {
    speakWebSpeech(text, currentSettings, onComplete);
  }
}

// ─── Engine 1: Microsoft Edge TTS (Neural, Free) ─────────────
async function speakEdgeTTS(
  text: string,
  currentSettings?: any,
  onComplete?: (success: boolean, errorMsg?: string, isFallback?: boolean) => void
) {
  try {
    debugLog('[EdgeTTS] Requesting audio for:', text.substring(0, 20));

    const response = await safeSendMessage({
      type: 'EDGE_TTS_SPEAK',
      text,
      voice: currentSettings?.edgeVoice || 'ja-JP-NanamiNeural',
      rate: currentSettings?.ttsRate || 0.85,
      volume: currentSettings?.ttsVolume ?? 1.0,
    });

    if (!response?.success || !response.audioBase64) {
      console.warn('[Rubi EdgeTTS] Failed:', response?.error || 'No audio returned');
      // Fallback to Web Speech API
      speakWebSpeech(text, currentSettings, (success, err) => onComplete?.(success, err, true));
      return;
    }

    // Decode base64 MP3 and play via Web Audio API
    const binary = atob(response.audioBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    if (!edgeAudioContext) {
      edgeAudioContext = new AudioContext();
    }

    const audioBuffer = await edgeAudioContext.decodeAudioData(bytes.buffer.slice(0));
    const source = edgeAudioContext.createBufferSource();
    source.buffer = audioBuffer;

    // Apply volume
    const gainNode = edgeAudioContext.createGain();
    gainNode.gain.value = currentSettings?.ttsVolume ?? 1.0;
    source.connect(gainNode);
    gainNode.connect(edgeAudioContext.destination);

    source.onended = () => {
      if (onComplete) onComplete(true);
    };

    source.start(0);
    debugLog('[EdgeTTS] Playback started');
  } catch (err: any) {
    console.error('[Rubi EdgeTTS] Error:', err);
    // Fallback to Web Speech API on error
    speakWebSpeech(text, currentSettings, (success, errMsg) => onComplete?.(success, errMsg, true));
  }
}

// ─── Engine 1.5: Voicevox (Anime, High Quality) ───────────────
async function speakVoicevox(
  text: string,
  currentSettings?: any,
  onComplete?: (success: boolean, errorMsg?: string, isFallback?: boolean) => void
) {
  try {
    debugLog('[Voicevox] Requesting audio for:', text.substring(0, 20));

    const endpoint = currentSettings?.voicevoxEndpoint || 'https://api.tts.quest/v3/voicevox';
    const speaker = currentSettings?.voicevoxSpeaker ?? 2;

    const response = await safeSendMessage({
      type: 'VOICEVOX_TTS_SPEAK',
      text,
      endpoint,
      speaker,
      rate: currentSettings?.ttsRate || 1.0,
      volume: currentSettings?.ttsVolume ?? 1.0,
    });

    if (!response?.success || !response.audioBase64) {
      console.warn('[Rubi Voicevox] Failed:', response?.error || 'No audio returned');
      // Fallback to Edge TTS if Voicevox fails
      speakEdgeTTS(text, currentSettings, (success, err, isFb) => onComplete?.(success, err, true));
      return;
    }

    // Decode base64 WAV and play via Web Audio API
    const binary = atob(response.audioBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    if (!edgeAudioContext) {
      edgeAudioContext = new AudioContext();
    }

    const audioBuffer = await edgeAudioContext.decodeAudioData(bytes.buffer.slice(0));
    const source = edgeAudioContext.createBufferSource();
    source.buffer = audioBuffer;

    // Apply volume (though Voicevox volume is already adjusted in query, we can still use gain node)
    const gainNode = edgeAudioContext.createGain();
    gainNode.gain.value = currentSettings?.ttsVolume ?? 1.0;
    source.connect(gainNode);
    gainNode.connect(edgeAudioContext.destination);

    source.onended = () => {
      if (onComplete) onComplete(true);
    };

    source.start(0);
    debugLog('[Voicevox] Playback started');
  } catch (err: any) {
    console.error('[Rubi Voicevox] Error:', err);
    // Fallback to Edge TTS on error
    speakEdgeTTS(text, currentSettings, (success, err, isFb) => onComplete?.(success, err, true));
  }
}

// ─── Engine 2: Google Translate TTS (Unofficial, Free) ────────
function speakGoogleTTS(
  text: string,
  currentSettings?: any,
  onComplete?: (success: boolean, errorMsg?: string, isFallback?: boolean) => void
) {
  // Google Translate TTS unofficial endpoint — works for short texts (<200 chars)
  // Longer texts need to be split
  const chunks = splitTextForGoogle(text, 180);
  let chunkIndex = 0;

  const playNext = () => {
    if (chunkIndex >= chunks.length) {
      if (onComplete) onComplete(true);
      return;
    }
    const chunk = chunks[chunkIndex++];
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ja&client=tw-ob&q=${encodeURIComponent(chunk)}`;
    const audio = new Audio(url);
    audio.volume = currentSettings?.ttsVolume ?? 1.0;

    audio.onended = playNext;
    audio.onerror = () => {
      console.warn('[Rubi GoogleTTS] Audio error, falling back to WebSpeech');
      speakWebSpeech(text, currentSettings, (success, err) => onComplete?.(success, err, true));
    };
    audio.play().catch(() => {
      speakWebSpeech(text, currentSettings, (success, err) => onComplete?.(success, err, true));
    });
  };

  playNext();
}

function splitTextForGoogle(text: string, maxLen: number): string[] {
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    // Split at punctuation or space
    let splitAt = maxLen;
    for (let i = maxLen; i > maxLen - 30 && i > 0; i--) {
      if ('、。！？,.!? '.includes(remaining[i])) {
        splitAt = i + 1;
        break;
      }
    }
    chunks.push(remaining.substring(0, splitAt));
    remaining = remaining.substring(splitAt);
  }
  return chunks;
}

// ─── Engine 3: Web Speech API (Browser built-in) ──────────────
function speakWebSpeech(
  text: string,
  currentSettings?: any,
  onComplete?: (success: boolean, errorMsg?: string, isFallback?: boolean) => void
) {
  debugLog('speakText 被调用', { text: text.substring(0, 20) + '...', currentSettings });
  
  if (!('speechSynthesis' in window)) {
    console.error('[Rubi TTS] 当前浏览器不支持 speechSynthesis');
    if (onComplete) onComplete(false, 'Browser does not support speechSynthesis');
    return;
  }
  
  const playVoice = () => {
    let voices = window.speechSynthesis.getVoices();
    debugLog('获取到系统发音人列表，数量:', voices.length);

    const doSpeak = () => {
      debugLog('进入 doSpeak 准备播放');
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef = utterance;
      
      let isRemoteVoice = false;

      if (currentSettings) {
        utterance.lang = currentSettings.ttsLanguage || 'ja-JP';
        utterance.rate = currentSettings.ttsRate || 0.85;
        utterance.volume = currentSettings.ttsVolume ?? 1.0;
        
        const voiceURI = currentSettings.ttsVoiceURI;
        if (voiceURI) {
          const selectedVoice = voices.find(v => v.voiceURI === voiceURI);
          if (selectedVoice) {
            utterance.voice = selectedVoice;
            isRemoteVoice = !selectedVoice.localService;
            debugLog('成功匹配到指定发音人:', selectedVoice.name, 'local:', selectedVoice.localService);
          }
        }
        
        if (!utterance.voice) {
          const fallbackVoice =
            voices.find(v => v.lang.startsWith('ja') && v.name.includes('Google')) ||
            voices.find(v => v.lang.startsWith('ja') && v.name.includes('Kyoko')) ||
            voices.find(v => v.lang.startsWith('ja')) ||
            voices.find(v => v.default) ||
            voices[0];
          if (fallbackVoice) {
            utterance.voice = fallbackVoice;
            isRemoteVoice = !fallbackVoice.localService;
            debugLog('使用降级发音人:', fallbackVoice.name, 'local:', fallbackVoice.localService);
          }
        }
      } else {
        utterance.lang = 'ja-JP';
        utterance.rate = 0.85;
      }
      
      let watchdog: ReturnType<typeof setTimeout>;
      const cleanup = (success: boolean, reason: string, errorMsg?: string) => {
        clearTimeout(watchdog);
        utteranceRef = null;
        if (onComplete) onComplete(success, errorMsg);
      };

      utterance.onend = () => cleanup(true, 'onend');
      utterance.onerror = (e) => {
        if (e.error !== 'interrupted') {
          console.error('[Rubi TTS] 语音合成错误:', e);
          cleanup(false, `onerror: ${e.error}`, `语音合成错误: ${e.error}`);
        }
      };

      const maxDuration = Math.max(10000, text.length * 300);
      watchdog = setTimeout(() => {
        window.speechSynthesis.cancel();
        let errorMsg = '语音播放超时。';
        if (isRemoteVoice) {
          errorMsg = '在线语音获取超时，请尝试在设置中切换为本地发音人。';
        }
        cleanup(false, 'watchdog_timeout', errorMsg);
      }, maxDuration);

      window.speechSynthesis.speak(utterance);
    };

    if (voices.length === 0) {
      let isHandled = false;
      const onVoicesReady = () => {
        if (isHandled) return;
        isHandled = true;
        voices = window.speechSynthesis.getVoices();
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesReady);
        doSpeak();
      };
      window.speechSynthesis.addEventListener('voiceschanged', onVoicesReady);
      
      setTimeout(() => {
        if (!isHandled) {
          isHandled = true;
          window.speechSynthesis.removeEventListener('voiceschanged', onVoicesReady);
          voices = window.speechSynthesis.getVoices();
          doSpeak();
        }
      }, 300);
    } else {
      doSpeak();
    }
  };

  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    window.speechSynthesis.cancel();
    setTimeout(playVoice, 50);
  } else {
    playVoice();
  }
}
