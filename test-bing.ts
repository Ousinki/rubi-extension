let bingAccessToken: any = null;

async function getBingAccessToken() {
  const tokenUrl = "https://www.bing.com/translator";
  
  if (!bingAccessToken || Date.now() - bingAccessToken.tokenTs > bingAccessToken.tokenExpiryInterval) {
    const res = await fetch(tokenUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await res.text();
    
    const igMatch = html.match(/IG:"([^"]+)"/);
    const iidMatch = html.match(/data-iid="([^"]+)"/);
    const paramsMatch = html.match(/params_AbusePreventionHelper\s?=\s?([^\]]+\])/);
    
    if (!igMatch || !iidMatch || !paramsMatch) {
      throw new Error("Failed to extract Bing tokens");
    }

    const IG = igMatch[1];
    const IID = iidMatch[1];
    const [key, token, interval] = JSON.parse(paramsMatch[1]);
    
    bingAccessToken = {
      IG,
      IID,
      key,
      token,
      tokenTs: Date.now(),
      tokenExpiryInterval: interval,
      count: 0
    };
  }
  return bingAccessToken;
}

async function translateBing(text: string, sourceLang: string, targetLang: string) {
  const url = "https://www.bing.com/ttranslatev3";
  const auth = await getBingAccessToken();
  
  const searchParams = new URLSearchParams({
    IG: auth.IG,
    IID: auth.IID ? `${auth.IID}.${auth.count++}` : "",
    isVertical: "1"
  });

  const body = new URLSearchParams({
    text,
    fromLang: sourceLang === 'auto' ? 'auto-detect' : sourceLang,
    to: targetLang,
    token: auth.token,
    key: auth.key
  });

  const res = await fetch(`${url}?${searchParams.toString()}`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    body
  });

  if (!res.ok) throw new Error(`Bing API error: ${res.status}`);
  const data = await res.json();
  return data;
}

translateBing("こんにちは", "ja", "zh-Hans").then(console.log).catch(console.error);
