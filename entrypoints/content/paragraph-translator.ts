/**
 * Rubi Paragraph Translator
 *
 * Handles inline paragraph translation:
 *   - Finding the nearest block-level paragraph element under the cursor
 *   - Showing/hiding loading state spinners
 *   - Fetching and injecting inline translations via machine or AI engines
 */

import { safeSendMessage } from '@/utils/content-messaging';
import { t } from '@/utils/i18n';
import { currentSettings } from './content-context';

// ─── Block-level paragraph detection ─────────────────────────

const BLOCK_TAGS = new Set([
  'P', 'DIV', 'LI', 'TD', 'TH', 'BLOCKQUOTE',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'ARTICLE', 'SECTION', 'PRE',
]);

export function findParagraph(el: HTMLElement | null): HTMLElement | null {
  while (el && el.tagName !== 'BODY' && el.tagName !== 'MAIN') {
    if (el.classList?.contains('rubi-paragraph-translation')) {
      const orig = (el as any)._rubi_original_paragraph;
      if (orig) return orig;
      const prev = el.previousElementSibling as HTMLElement;
      if (prev) return prev;
      return null;
    }
    if (el.classList && BLOCK_TAGS.has(el.tagName)) return el;
    el = el.parentElement;
  }
  return null;
}

// ─── Loading State ────────────────────────────────────────────

function setParagraphLoading(paragraph: HTMLElement, isLoading: boolean): void {
  paragraph.querySelectorAll(':scope > .rubi-inline-spinner').forEach(el => el.remove());
  if (isLoading) {
    paragraph.classList.add('rubi-paragraph-loading');
    const spinner = document.createElement('span');
    spinner.className = 'rubi-inline-spinner';
    paragraph.appendChild(spinner);
  } else {
    paragraph.classList.remove('rubi-paragraph-loading');
  }
}

// ─── Inline Paragraph Translation ────────────────────────────

export async function handleInlineParagraphTranslate(paragraph: HTMLElement): Promise<void> {
  if ((paragraph as any)._rubi_original_paragraph) {
    paragraph = (paragraph as any)._rubi_original_paragraph;
  } else if (paragraph.classList.contains('rubi-paragraph-translation')) {
    const prev = paragraph.previousElementSibling;
    if (prev && !prev.classList.contains('rubi-paragraph-translation')) {
      paragraph = prev as HTMLElement;
    } else {
      paragraph.remove();
      return;
    }
  }

  const existing = (paragraph as any)._rubi_translation_block;
  if (existing && document.body.contains(existing)) {
    existing.classList.add('rubi-para-trans-exit');
    existing.addEventListener('animationend', () => existing.remove(), { once: true });
    setTimeout(() => { if (existing.parentNode) existing.remove(); }, 500);
    (paragraph as any)._rubi_translation_block = null;
    return;
  }

  const nested = paragraph.querySelector(':scope > .rubi-paragraph-translation');
  if (nested) {
    nested.classList.add('rubi-para-trans-exit');
    nested.addEventListener('animationend', () => nested.remove(), { once: true });
    setTimeout(() => { if (nested.parentNode) nested.remove(); }, 500);
    (paragraph as any)._rubi_translation_block = null;
    return;
  }

  let sibling = paragraph.nextElementSibling;
  let removedSibling = false;
  while (sibling && sibling.classList.contains('rubi-paragraph-translation')) {
    const toRemove = sibling;
    toRemove.classList.add('rubi-para-trans-exit');
    toRemove.addEventListener('animationend', () => toRemove.remove(), { once: true });
    setTimeout(() => { if (toRemove.parentNode) toRemove.remove(); }, 500);
    removedSibling = true;
    sibling = sibling.nextElementSibling;
  }
  if (removedSibling) {
    (paragraph as any)._rubi_translation_block = null;
    return;
  }

  const fullText = (paragraph.textContent || '').trim();
  if (!fullText) return;

  const isHeading = /^H[1-6]$/.test(paragraph.tagName);
  await handleBlockTranslate(paragraph, isHeading);
}

async function handleBlockTranslate(paragraph: HTMLElement, isHeading: boolean): Promise<void> {
  let textToTranslate = paragraph.innerText || paragraph.textContent || '';
  textToTranslate = textToTranslate.replace(/◯/g, ' ').trim();
  if (!textToTranslate) return;

  const transWrapper = document.createElement('font');
  transWrapper.className = 'rubi-paragraph-translation notranslate';
  transWrapper.setAttribute('translate', 'no');

  const spacer = document.createElement('font');
  const isShortHeading = isHeading && paragraph.textContent && paragraph.textContent.trim().length < 20;
  spacer.innerHTML = isShortHeading ? '&nbsp;&nbsp;' : '<br>';

  const transInner = document.createElement('font');
  transInner.className = 'rubi-paragraph-translation-inner rubi-loading';
  transInner.innerHTML = t('AI 翻译中...', currentSettings?.uiLanguage);

  transWrapper.appendChild(spacer);
  transWrapper.appendChild(transInner);

  (paragraph as any)._rubi_original_paragraph = paragraph;
  (paragraph as any)._rubi_translation_block = transWrapper;
  (transWrapper as any)._rubi_original_paragraph = paragraph;

  paragraph.appendChild(transWrapper);

  try {
    const engine = currentSettings?.translationEngine || 'google';
    if (engine !== 'none') {
      const resp = await safeSendMessage({
        type: 'FETCH_TRANSLATION',
        text: textToTranslate,
        sourceLang: 'auto',
        targetLang: currentSettings?.targetLanguage || 'zh-CN',
        engine,
      });
      if (resp?.targetText) {
        transInner.textContent = resp.targetText;
        transInner.classList.remove('rubi-loading');
        return;
      }
    }
    const aiResp = await safeSendMessage({
      type: 'CONTEXTUAL_TRANSLATE',
      word: textToTranslate,
      sentence: textToTranslate,
    });
    if (aiResp?.success && aiResp.translation) {
      transInner.textContent = aiResp.translation;
    } else {
      transInner.textContent = aiResp?.error
        ? `${t('翻译失败', currentSettings?.uiLanguage)}: ${aiResp.error}`
        : t('翻译失败', currentSettings?.uiLanguage);
    }
  } catch (err: any) {
    transInner.textContent = t('翻译出错', currentSettings?.uiLanguage) + `: ${err?.message || err}`;
  } finally {
    transInner.classList.remove('rubi-loading');
  }
}
