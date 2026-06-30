let bingAccessToken: any = null;

async function getBingAccessToken() {
  const tokenUrl = "https://www.bing.com/translator";
  
  if (!bingAccessToken || Date.now() - bingAccessToken.tokenTs > bingAccessToken.tokenExpiryInterval) {
    const res = await fetch(tokenUrl); // NO USER AGENT
    const html = await res.text();
    
    const igMatch = html.match(/IG:"([^"]+)"/);
    const iidMatch = html.match(/data-iid="([^"]+)"/);
    const paramsMatch = html.match(/params_AbusePreventionHelper\s?=\s?([^\]]+\])/);
    
    if (!igMatch || !iidMatch || !paramsMatch) {
      console.log("IG:", !!igMatch, "IID:", !!iidMatch, "Params:", !!paramsMatch);
      throw new Error("Failed to extract Bing tokens");
    }

    const IG = igMatch[1];
    const IID = iidMatch[1];
    const [key, token, interval] = JSON.parse(paramsMatch[1]);
    console.log("Tokens fetched successfully");
  }
}
getBingAccessToken().catch(console.error);
