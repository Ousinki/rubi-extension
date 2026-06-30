export const uiDict: Record<string, Record<string, string>> = {
  "继续追问...": { "zh-TW": "繼續追問...", "ja": "さらに質問する...", "en": "Ask follow-up question...", "ko": "추가 질문..." },
  "输入问题，按 Enter 发送": { "zh-TW": "輸入問題，按 Enter 發送", "ja": "質問を入力し、Enterで送信", "en": "Type question, press Enter to send", "ko": "질문을 입력하고 Enter를 누르세요" },
  "AI 翻译中...": { "zh-TW": "AI 翻譯中...", "ja": "AI翻訳中...", "en": "Translating by AI...", "ko": "AI 번역 중..." },
  "翻译失败": { "zh-TW": "翻譯失敗", "ja": "翻訳に失敗しました", "en": "Translation failed", "ko": "번역 실패" },
  "翻译出错": { "zh-TW": "翻譯出錯", "ja": "翻訳エラーが発生しました", "en": "Translation error", "ko": "번역 오류" },
  "回答失败": { "zh-TW": "回答失敗", "ja": "回答に失敗しました", "en": "Failed to get answer", "ko": "응답 실패" },
  "请求出错，请重试": { "zh-TW": "請求出錯，請重試", "ja": "エラーが発生しました。再試行してください", "en": "Request failed, please try again", "ko": "요청 오류, 다시 시도하세요" },
  "正在解析日语语境和用法...": { "zh-TW": "正在解析日語語境和用法...", "ja": "日本語の文脈と語彙の用法を分析中...", "en": "Analyzing Japanese context and usage...", "ko": "일본어 문맥 및 용법 분석 중..." },
  "语境含义": { "zh-TW": "語境含義", "ja": "文脈上の意味", "en": "Context Meaning", "ko": "문맥적 의미" },
  "常用用法/搭配": { "zh-TW": "常用用法/搭配", "ja": "一般的なコロケーション/用法", "en": "Common Usage & Collocation", "ko": "자주 쓰는 용법/연어" }
};

export function t(key: string, lang = 'zh-CN'): string {
  const dict = uiDict[key];
  if (!dict) return key;

  const normalized = lang.replace('_', '-');
  if (normalized.startsWith('zh-CN')) return key;
  if (normalized.startsWith('zh-TW') || normalized.startsWith('zh-HK')) return dict['zh-TW'] || key;
  if (normalized.startsWith('ja')) return dict['ja'] || key;
  if (normalized.startsWith('ko')) return dict['ko'] || key;
  if (normalized.startsWith('en')) return dict['en'] || key;

  return dict[normalized] || key;
}
