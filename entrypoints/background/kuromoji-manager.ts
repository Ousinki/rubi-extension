import kuromoji from '@sglkc/kuromoji';

let tokenizer: any = null;
let initPromise: Promise<any> | null = null;

export async function initKuromoji() {
  if (tokenizer) return tokenizer;
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    console.log('[Kuromoji] Loading dictionaries from extension bundle...');
    // In MV3 Service Workers, using browser.runtime.getURL can cause 'Failed to fetch' errors.
    // Using an absolute path starting with '/' resolves to the extension root correctly.
    const dicPath = '/kuromoji/dict/';
    
    kuromoji.builder({ dicPath }).build((err: any, _tokenizer: any) => {
      if (err) {
        console.error('[Kuromoji] Initialization failed:', err);
        initPromise = null;
        return reject(err);
      }
      tokenizer = _tokenizer;
      console.log('[Kuromoji] Initialized successfully. Ready for morphological analysis.');
      resolve(tokenizer);
    });
  });

  return initPromise;
}

export async function parseWithKuromoji(text: string) {
  if (!tokenizer) {
    await initKuromoji();
  }
  return tokenizer.tokenize(text);
}
