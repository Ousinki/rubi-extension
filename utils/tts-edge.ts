/**
 * Microsoft Edge TTS (Azure Neural) — Unofficial Free Endpoint
 *
 * Uses the same neural voice backend as Azure Cognitive Services TTS,
 * accessible via the Edge Read Aloud infrastructure for free.
 *
 * Quality: Neural (near-human), significantly better than browser Web Speech API.
 *
 * Available Japanese voices:
 *   ja-JP-NanamiNeural  — Female, natural, clear (recommended)
 *   ja-JP-KeitaNeural   — Male, professional
 *   ja-JP-AoiNeural     — Female, bright
 *   ja-JP-DaichiNeural  — Male, casual
 *   ja-JP-ShioriNeural  — Female, warm
 *   ja-JP-MasaruMultilingualNeural — Male, multilingual capable
 *
 * API flow:
 *   1. GET /token → receives a WSS connection token
 *   2. Open WebSocket to the synthesis endpoint
 *   3. Send SSML text + receive audio/webm chunks
 *   4. Decode and play audio in browser
 */

const EDGE_TTS_TOKEN_URL =
  'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1/token';

const EDGE_TTS_WSS_URL =
  'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';

const EDGE_TTS_TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';

export type EdgeVoiceName =
  | 'ja-JP-NanamiNeural'
  | 'ja-JP-KeitaNeural';

export interface EdgeTTSOptions {
  voice?: EdgeVoiceName;
  rate?: number;   // -50% to +100%, default 0
  pitch?: number;  // -50Hz to +50Hz, default 0
  volume?: number; // 0.0 - 1.0
}

/**
 * Speaks text using the Microsoft Edge TTS neural API.
 * Audio is streamed via WebSocket and played via Web Audio API.
 *
 * Must be called from a background service worker context where
 * WebSocket connections are not blocked by page CSP.
 *
 * Returns audio data as ArrayBuffer that the content script can play.
 */
export async function fetchEdgeTTSAudio(
  text: string,
  options: EdgeTTSOptions = {}
): Promise<ArrayBuffer> {
  const voice = options.voice || 'ja-JP-NanamiNeural';

  // The Azure proxy endpoint used in jyutping-extension
  const EDGE_TTS_PROXY_URL = 'http://114.55.243.162:8090/v1/audio/speech';

  // Convert WXT rate (-50% to +100%) to the proxy's speed multiplier (e.g., 1.0)
  // -50% -> 0.5x, 0% -> 1.0x, +100% -> 2.0x
  const speed = 1.0 + (options.rate ?? 0) / 100;

  const response = await fetch(EDGE_TTS_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: text,
      voice: voice,
      model: 'tts-1',
      speed: speed
    })
  });

  if (!response.ok) {
    throw new Error(`[EdgeTTS] Proxy server error: ${response.status}`);
  }

  return await response.arrayBuffer();
}

