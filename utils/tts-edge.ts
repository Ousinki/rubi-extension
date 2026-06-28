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
  | 'ja-JP-KeitaNeural'
  | 'ja-JP-AoiNeural'
  | 'ja-JP-DaichiNeural'
  | 'ja-JP-ShioriNeural'
  | 'ja-JP-MasaruMultilingualNeural';

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
  const rateStr = formatPercent(options.rate ?? 0);
  const pitchStr = formatHz(options.pitch ?? 0);
  const volumeStr = formatPercent(Math.round((options.volume ?? 1.0) * 100) - 100);

  const ssml = buildSSML(text, voice, rateStr, pitchStr, volumeStr);

  // Request ID for WebSocket session
  const requestId = generateUUID();
  const timestamp = new Date().toISOString().replace('T', 'T').replace('Z', 'Z');

  return new Promise<ArrayBuffer>((resolve, reject) => {
    const url = `${EDGE_TTS_WSS_URL}?TrustedClientToken=${EDGE_TTS_TRUSTED_CLIENT_TOKEN}`;
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';

    const audioChunks: ArrayBuffer[] = [];
    let headerSent = false;

    ws.onopen = () => {
      // Send speech config
      const configMsg = JSON.stringify({
        context: {
          synthesis: {
            audio: {
              metadataoptions: { sentenceBoundaryEnabled: false, wordBoundaryEnabled: false },
              outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
            },
          },
        },
      });

      ws.send(
        `X-Timestamp:${timestamp}\r\n` +
        `Content-Type:application/json; charset=utf-8\r\n` +
        `Path:speech.config\r\n\r\n` +
        configMsg
      );

      // Send SSML synthesis request
      ws.send(
        `X-RequestId:${requestId}\r\n` +
        `Content-Type:application/ssml+xml\r\n` +
        `X-Timestamp:${timestamp}\r\n` +
        `Path:ssml\r\n\r\n` +
        ssml
      );
    };

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        // Text frame: check for end signal
        if (event.data.includes('Path:turn.end')) {
          ws.close();
          if (audioChunks.length === 0) {
            reject(new Error('[EdgeTTS] No audio data received'));
            return;
          }
          // Concatenate all audio chunks
          const totalLength = audioChunks.reduce((acc, buf) => acc + buf.byteLength, 0);
          const combined = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of audioChunks) {
            combined.set(new Uint8Array(chunk), offset);
            offset += chunk.byteLength;
          }
          resolve(combined.buffer);
        }
      } else if (event.data instanceof ArrayBuffer) {
        // Binary frame: audio data (prefixed with a header we need to skip)
        // Find the audio payload offset by looking for the end of the header
        const view = new Uint8Array(event.data);
        // Header ends at the null-terminated string containing "Path:audio\r\n"
        // We look for the double CRLF pattern to find where audio data starts
        const headerEnd = findAudioDataOffset(view);
        if (headerEnd >= 0 && headerEnd < view.byteLength) {
          audioChunks.push(event.data.slice(headerEnd));
        }
      }
    };

    ws.onerror = (err) => {
      reject(new Error('[EdgeTTS] WebSocket error'));
    };

    ws.onclose = (event) => {
      if (!event.wasClean && audioChunks.length === 0) {
        reject(new Error(`[EdgeTTS] WebSocket closed unexpectedly: ${event.code}`));
      }
    };

    // Timeout safety
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('[EdgeTTS] Request timed out after 10s'));
    }, 10000);

    // Clear timeout when WS closes cleanly
    const origClose = ws.onclose;
    ws.onclose = (event) => {
      clearTimeout(timeout);
      if (origClose) (origClose as any)(event);
    };
  });
}

/** Finds the byte offset where audio data begins after the binary frame header */
function findAudioDataOffset(data: Uint8Array): number {
  // The binary frame header is a 2-byte length prefix followed by the header string
  // Header format: <2-byte big-endian length><header-text>
  // Audio data starts immediately after the header
  if (data.length < 2) return -1;
  const headerLen = (data[0] << 8) | data[1];
  return headerLen + 2;
}

function buildSSML(
  text: string,
  voice: string,
  rate: string,
  pitch: string,
  volume: string
): string {
  // Escape XML special characters
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='ja-JP'>` +
    `<voice name='${voice}'>` +
    `<prosody rate='${rate}' pitch='${pitch}' volume='${volume}'>` +
    escaped +
    `</prosody></voice></speak>`;
}

function formatPercent(val: number): string {
  return val >= 0 ? `+${val}%` : `${val}%`;
}

function formatHz(val: number): string {
  return val >= 0 ? `+${val}Hz` : `${val}Hz`;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
