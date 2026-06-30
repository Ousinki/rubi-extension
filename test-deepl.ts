function getICount(text: string) {
  return text.split("i").length - 1;
}

function getRandomNumber() {
  const rand = Math.floor(Math.random() * 99999) + 100000;
  return rand * 1000;
}

function getTimeStamp(iCount: number) {
  const ts = Date.now();
  if (iCount !== 0) {
    iCount = iCount + 1;
    return ts - (ts % iCount) + iCount;
  } else {
    return ts;
  }
}

async function testDeepL() {
  const text = "こんにちは";
  const dlSource = "JA";
  const dlTarget = "ZH";

  const postData = {
    jsonrpc: "2.0",
    method: "LMT_handle_texts",
    id: getRandomNumber(),
    params: {
      splitting: "newlines",
      lang: {
        source_lang_user_selected: dlSource,
        target_lang: dlTarget,
      },
      texts: [
        {
          text,
          requestAlternatives: 3,
        },
      ],
      timestamp: getTimeStamp(getICount(text))
    },
  };

  let postStr = JSON.stringify(postData);
  const id = postData.id;
  if ((id + 5) % 29 === 0 || (id + 3) % 13 === 0) {
    postStr = postStr.replace('"method":"', '"method" : "');
  } else {
    postStr = postStr.replace('"method":"', '"method": "');
  }

  console.log("Request Body:", postStr);

  const res = await fetch("https://www2.deepl.com/jsonrpc", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: postStr
  });

  console.log("Status:", res.status);
  const textRes = await res.text();
  console.log("Response:", textRes);
}

testDeepL();
