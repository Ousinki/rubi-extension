async function testBingCn() {
  const res = await fetch("https://cn.bing.com/translator", {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  console.log("Status:", res.status, "URL:", res.url);
  const html = await res.text();
  const igMatch = html.match(/IG:"([^"]+)"/);
  const iidMatch = html.match(/data-iid="([^"]+)"/);
  const paramsMatch = html.match(/params_AbusePreventionHelper\s?=\s?([^\]]+\])/);
  console.log("IG:", !!igMatch, "IID:", !!iidMatch, "Params:", !!paramsMatch);
}
testBingCn().catch(console.error);
