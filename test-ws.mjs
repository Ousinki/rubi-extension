import WebSocket from 'ws';

const EDGE_TTS_TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${EDGE_TTS_TRUSTED_CLIENT_TOKEN}`;

// Test 1: with typical chrome extension origin
const ws1 = new WebSocket(url, { headers: { Origin: 'chrome-extension://ajhggcjdijhldjfkdfoejjfofdfd' } });
ws1.on('error', e => console.log('WS1 Error:', e.message));
ws1.on('open', () => console.log('WS1 Opened'));

// Test 2: no origin (typical python script)
const ws2 = new WebSocket(url);
ws2.on('error', e => console.log('WS2 Error:', e.message));
ws2.on('open', () => console.log('WS2 Opened'));

