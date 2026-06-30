import asyncio
import websockets
import sys

EDGE_TTS_TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4'
url = f"wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken={EDGE_TTS_TRUSTED_CLIENT_TOKEN}"

async def test_origin(origin_value):
    try:
        headers = {}
        if origin_value:
            headers['Origin'] = origin_value
        async with websockets.connect(url, additional_headers=headers) as ws:
            print(f"Origin={origin_value}: SUCCESS")
    except Exception as e:
        print(f"Origin={origin_value}: FAILED ({e})")

async def main():
    await test_origin("chrome-extension://ajhggcjdijhldjfkdfoejjfofdfd")
    await test_origin(None)
    await test_origin("chrome-extension://")
    await test_origin("https://www.bing.com")

asyncio.run(main())
