/**
 * Rubi AI Translation & Analysis Module
 * Encapsulates LLM API calls with custom Japanese system prompts.
 */

import type { RubiSettings } from './storage';

export interface AnnotationResult {
  text: string;
  word: string;
  start: number;
  end: number;
  importance: 'highlight';
  translation?: string;
  kind?: 'word' | 'phrase' | 'name' | 'number' | 'other';
  explanation?: string;
  reading?: string; // Furigana (hiragana/katakana)
}

function getLanguageName(code: string): string {
  switch (code) {
    case 'zh-TW': return '繁体中文';
    case 'ja': return '日文';
    case 'en': return '英文';
    case 'zh-CN':
    default: return '中文';
  }
}

export function getSystemPromptJa(targetLanguage: string): string {
  const langName = getLanguageName(targetLanguage);
  return `你是一个高级的日语阅读辅助与翻译引擎。

任务：从输入的日语段落中挑选出“真正值得学习的重点词汇或短语”。标注必须【短语/惯用句优先 + 宁缺毋滥】。不翻译整段，仅对重点进行标注。

====================
【输出预算与类别说明】
· 专有名词 n：如人名、地名、机构、软件名等，必须标出。
· 短语/惯用句 p：积极识别日语中的固定搭配、惯用形（如「気がする」、「取り組む」、「〜に関して」）以及复合词（如「宇宙線研究所」）。
· 单词 w：每 50 词最多 1 个，必须是 JLPT N2 及以上的低频难词（如「脆弱」、「些細」）。如果是常见词（如「言う」、「行く」、「本」）则不标为 w。

====================
【输出字段规范】
严格输出紧凑的 JSON，不要包含 Markdown 标记：
{"t":[[字段1, 字段2, 字段3, 字段4, 字段5, 字段6, 字段7]]}

字段1 = 原文文本 (如: "日本語")
字段2 = start 字符索引 (从0开始的精确字节/字符偏移)
字段3 = end 字符索引 (字符截止偏移)
字段4 = 类型 (w=单词, p=短语/惯用句, n=专有名词)
字段5 = ${langName}翻译 (直接、精炼的释义)
字段6 = 平假名/片假名读音 (用于 Ruby 注音，如 "にほんご"，不可带有汉字)
字段7 = 语境说明 (对于 n 专有名词和 w 难词，提供简短的一句话说明，p 类型可为空字符串)

示例输入："富士山は日本で最も高い山で、古くから信仰の対象とされてきた。"
示例输出：{"t":[["富士山",0,3,"n","富士山","ふじさん","日本最高峰的火山，日本的象征"],["古くから",13,17,"p","自古以来","ふるくから",""],["信仰の対象",18,23,"p","信仰的对象","しんこうのたいしょう",""]]}
`;
}

export function normalizeEndpoint(endpoint: string): string {
  let url = endpoint.trim();
  if (!url) return url;
  
  if (/\/v\d+\/?$/.test(url)) {
    return url.replace(/\/$/, '') + '/chat/completions';
  }
  
  if (!url.includes('/completions') && !url.includes('/messages') && !url.includes('/generate')) {
    return url.replace(/\/$/, '') + '/v1/chat/completions';
  }
  return url;
}

export async function translateParagraphJa(
  text: string,
  settings: RubiSettings
): Promise<AnnotationResult[]> {
  if (!settings.apiKey) {
    throw new Error('请先在插件设置中配置 API Key');
  }

  const userPrompt = `【日语段落】：\n${text}`;
  const url = normalizeEndpoint(settings.apiEndpoint);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        { role: 'system', content: getSystemPromptJa(settings.targetLanguage || 'zh-CN') },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`请求目标 [${url}] 失败 (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('AI 返回内容为空');
  }

  return parseAIResponseJa(content, text);
}

function parseAIResponseJa(content: string, originalText: string): AnnotationResult[] {
  try {
    const jsonStr = extractJson(content);
    const json = JSON.parse(jsonStr);
    const rawTokens = Array.isArray(json) ? json : (json?.t ?? json?.tokens ?? json?.results ?? []);
    return normalizeTokensJa(rawTokens, originalText);
  } catch (e) {
    console.error('[Rubi AI] AI 响应解析失败:', content);
    throw new Error('AI 响应解析失败，请检查模型输出格式');
  }
}

function extractJson(content: string): string {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced?.[1]) return fenced[1].trim();

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function normalizeTokensJa(rawTokens: unknown[], originalText: string): AnnotationResult[] {
  const results: AnnotationResult[] = [];
  let cursor = 0;

  const items = rawTokens
    .map(raw => normalizeRawTokenJa(raw))
    .filter(item => item && item.text)
    .sort((a, b) => (a!.start || 0) - (b!.start || 0));

  for (const item of items) {
    const { text, importance, kind, translation, explanation, reading } = item!;
    let start = item!.start;
    let end = item!.end;

    if (start < 0 || end < 0 || end < start || originalText.slice(start, end) !== text) {
      const nextIndex = originalText.indexOf(text, cursor);
      if (nextIndex === -1) continue;
      start = nextIndex;
      end = nextIndex + text.length;
    }

    if (start < cursor) continue;
    cursor = end;

    results.push({
      text,
      word: text,
      start,
      end,
      importance,
      kind,
      translation,
      explanation,
      reading,
    });
  }

  return results.sort((a, b) => a.start - b.start || a.end - b.end);
}

function normalizeRawTokenJa(raw: unknown): (Pick<AnnotationResult, 'text' | 'start' | 'end' | 'importance'> & {
  kind?: AnnotationResult['kind'];
  translation?: string;
  explanation?: string;
  reading?: string;
}) | null {
  if (Array.isArray(raw)) {
    const text = typeof raw[0] === 'string' ? raw[0].trim() : '';
    const kind = normalizeKindJa(typeof raw[3] === 'string' ? raw[3] : undefined);
    return {
      text,
      start: readInt(raw[1]),
      end: readInt(raw[2]),
      importance: 'highlight',
      kind,
      translation: typeof raw[4] === 'string' ? raw[4].trim() : undefined,
      reading: typeof raw[5] === 'string' ? raw[5].trim() : undefined,
      explanation: typeof raw[6] === 'string' && raw[6].trim() ? raw[6].trim() : undefined,
    };
  }
  return null;
}

function normalizeKindJa(kind?: string): AnnotationResult['kind'] | undefined {
  switch (kind) {
    case 'w':
    case 'word':
      return 'word';
    case 'p':
    case 'phrase':
      return 'phrase';
    case 'n':
    case 'name':
    case 'proper_noun':
      return 'name';
    default:
      return undefined;
  }
}

function readInt(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : -1;
  }
  return -1;
}

// ─── 单词详细语境解释 ──────────────────────────────────────
const EXPLAIN_WORD_PROMPT_JA = `你是一个高水平的日语语境词典与语法分析助手。

用户会提供一个【日语句子】和一个【目标词汇】。
你的任务是为目标词汇生成极其简洁的中文解释，直击要害。

输出格式要求：
直接输出内容，不要使用 Markdown 代码块。

格式规范如下：
【语境含义】：用一句话解释它在此句中的具体意思和语法作用。
【常用用法/搭配】：(如果有) 指出与之相关的常用搭配、敬语层级、或是惯用句型；(如果没有) 直接忽略此项。`;

export async function explainWordJa(settings: RubiSettings, word: string, sentence: string): Promise<string> {
  const messages = [
    { role: 'system', content: EXPLAIN_WORD_PROMPT_JA },
    { role: 'user', content: `【目标词汇】：${word}\n【日语句子】：${sentence}` }
  ];

  const payload = {
    model: settings.model || 'gemini-2.5-pro',
    messages,
    temperature: 0.1,
  };

  const url = normalizeEndpoint(settings.apiEndpoint);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`请求目标 [${url}] 失败 (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('AI 返回内容为空');
  }

  return content.trim();
}

// ─── AI 极简语境翻译 (仅翻译文本) ────────────────────────────────
function getContextualTranslatePromptJa(langName: string, collocEnabled: boolean): string {
  let prompt = `你是一个高级的日语语境 analysis 与翻译引擎。

【核心任务】：
用户在阅读日语文章时，鼠标点击（或长按）了其中一个单词或汉字。你需要结合整个句子的语境，判断用户真正想了解的是什么，并给出最精准的${langName}翻译。

【强制规则】：
1. 绝不要输出任何多余的开头语、拼音、假名或 Markdown 语法！（不要说“好的”之类的废话）
2. 翻译必须精准贴合当前日语语境。
3. 【专有名词强制解释】：如果目标词汇是软件名、品牌名、人名、地名、技术专有词汇等（如 Wikipedia 等），**绝对禁止**将其原样照抄作为翻译。你必须用一句话简明扼要地解释它是什么。`;

  if (collocEnabled) {
    prompt += `
4. 【智能语境搭配（最高优先级）】：请务必检查用户点击的单词/汉字，在句子中是否与相邻的助词、动词或名词组成了复合词、固定搭配（如「気がする」、「取り組む」）、惯用表达（如「〜に関して」）、或者语法句型。
   - 如果是，你**必须自动向外扩展**，将整个词组或语法结构作为一个整体提取出来！
   - 如果没有搭配，才只提取用户点击的独立单词。`;
  }

  prompt += `
5. 【输出格式（极其重要）】：必须严格输出 JSON 格式，**不要包含 any markdown 代码块标记（如 \`\`\`json）**：
{"word": "提取的日语原型或词组", "translation": "中文翻译或解释"}

【专有名词/无翻译词汇的红线规则】：
如果目标词汇是软件名、品牌等，或者在中文中没有对应的翻译词，**\`translation\` 字段的值绝对不允许和 \`word\` 字段相同**！
你必须在 \`translation\` 中写一句话简明扼要地解释它是什么。`;

  return prompt;
}

export async function contextualTranslateJa(settings: RubiSettings, word: string, sentence: string): Promise<string> {
  const langName = getLanguageName(settings.targetLanguage || 'zh-CN');
  const isMultiWord = word.length > 8 || word.includes('、') || word.includes(' ');

  let systemPrompt: string;
  let userContent: string;

  if (isMultiWord) {
    systemPrompt = `你是一个高级的日语翻译引擎。

【核心任务】：
用户选中了一段日语文本，请结合上下文语境，将整段选中文本翻译成${langName}。

【强制规则】：
1. 翻译用户选中的完整文本，不要只翻译其中某个单词！
2. 绝不要输出 any 多余的开头语、解释或 Markdown 语法！
3. 【输出格式】：直接输出${langName}翻译结果，不需要日文原文。`;
    userContent = `【选中的文本】：${word}\n【所在上下文】：${sentence}`;
  } else {
    const collocEnabled = settings.enableContextualCollocation ?? true;
    systemPrompt = getContextualTranslatePromptJa(langName, collocEnabled);
    userContent = `【用户点击的日语】：${word}\n【所在句子】：${sentence}`;
  }

  const combinedContent = `${systemPrompt}\n\n---\n\n${userContent}`;

  const messages = [
    { role: 'user', content: combinedContent }
  ];

  const payload = {
    model: settings.model || 'gemini-2.5-pro',
    messages,
    temperature: 0.1,
  };

  const url = normalizeEndpoint(settings.apiEndpoint);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`请求目标 [${url}] 失败 (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('AI 返回内容为空');
  }

  const trimmed = content.trim();

  if (isMultiWord) {
    return trimmed;
  }

  try {
    const jsonStr = trimmed.replace(/^```json/, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(jsonStr);
    if (parsed.translation) {
      return parsed.translation;
    }
  } catch (e) {
    console.warn('[Rubi AI] AI Response was not valid JSON:', trimmed);
  }

  return trimmed;
}

// ─── 翻译悬浮窗追问 AI ──────────────────────────────────────
const ASK_AI_PROMPT_JA = `你是一个日语学习助手。用户正在阅读日语文章，对其中一个单词或语法点有疑问。
请结合提供的语境信息，简洁、准确地回答用户的问题。

【回答规则】：
1. 用中文回答，简明扼要，拒绝废话
2. 不要使用 Markdown 格式
3. 如果问题涉及用法、敬语或搭配，给出实用的例子
4. 回答控制在 2-3 句话以内，除非用户明确要求详细解释`;

export async function askAIJa(
  settings: RubiSettings,
  question: string,
  word: string,
  sentence: string,
  translation: string
): Promise<string> {
  const userContent = [
    `【用户关注的日语】：${word}`,
    `【所在句子】：${sentence}`,
    translation ? `【已有翻译】：${translation}` : '',
    `【用户的问题】：${question}`,
  ].filter(Boolean).join('\n');

  const messages = [
    { role: 'system', content: ASK_AI_PROMPT_JA },
    { role: 'user', content: userContent },
  ];

  const url = normalizeEndpoint(settings.apiEndpoint);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model || 'gpt-4o-mini',
      messages,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`请求目标 [${url}] 失败 (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('AI 返回内容为空');
  }

  return content.trim();
}
