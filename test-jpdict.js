import { JpdictIdb, updateWithRetry } from '@birchill/jpdict-idb';

async function test() {
  const db = new JpdictIdb();
  await db.ready;
  const { wordSearch } = require('./.output/chrome-mv3/background.js') || {}; // Wait, background.js is packed.

  // Let's use jpdict directly
  const { getWords } = require('@birchill/jpdict-idb');
  
  const text = "２つの台風が来ている";
  const inputLengths = Array.from({ length: text.length + 1 }, (_, i) => i);
  
  try {
    let longestMatch = 0;
    let have = new Set();
    const data = [];
    
    let input = text;
    while(input.length > 0) {
      console.log('Testing prefix:', input);
      const res = await getWords(input, { matchType: 'exact', limit: 5 });
      console.log('Result for', input, res);
      if (res.length > 0) {
         break;
      }
      input = input.substring(0, input.length - 1);
    }
  } catch(e) {
    console.error(e);
  }
}

test();
