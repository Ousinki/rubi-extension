<template>
  <div
    ref="badgeEl"
    id="rubi-translation-badge"
    class="rubi-translation-tooltip"
    :class="[
      { 'rubi-visible': uiState.translationBadge.visible },
      { 'rubi-ask-mode': uiState.translationBadge.askMode },
      actualPosition === 'top' ? 'pos-top' : 'pos-bottom'
    ]"
    :style="badgeStyle"
    @dblclick.prevent.stop="handleDblClick"
  >
    <!-- Original translation row -->
    <div class="trans-row">
      <div v-if="parsedText" class="trans-content-col">
        <span class="trans-original">{{ parsedText.original }}</span>
        <span class="trans-translation">{{ parsedText.translation }}</span>
      </div>
      <strong v-else>{{ uiState.translationBadge.text }}</strong>

      <span
        class="engine-tag"
        :class="{ 'has-error': !!uiState.translationBadge.errorInfo }"
        v-if="uiState.translationBadge.showEngine && !uiState.translationBadge.askMode"
        @click="handleEngineClick"
        :title="uiState.translationBadge.errorInfo ? `翻译失败已降级至 Google。错误: ${uiState.translationBadge.errorInfo} (请检查权限或刷新插件)` : '点击使用 AI 翻译'"
      >
        <span v-if="uiState.translationBadge.errorInfo" class="error-icon">⚠️</span>
        {{ safeEngine }}
      </span>

      <!-- Close button in ask mode -->
      <div
        v-if="uiState.translationBadge.askMode"
        class="ask-close"
        @click.stop="handleClose"
      >✕</div>
    </div>

    <!-- Ask mode: AI answer -->
    <div v-if="uiState.translationBadge.askMode && uiState.translationBadge.askAnswer" class="ask-answer">
      {{ uiState.translationBadge.askAnswer }}
    </div>

    <!-- Ask mode: loading -->
    <div v-if="uiState.translationBadge.askMode && uiState.translationBadge.askLoading" class="ask-loading">
      <span class="ask-loading-dot"></span>
      <span class="ask-loading-dot"></span>
      <span class="ask-loading-dot"></span>
    </div>

    <!-- Ask mode: input -->
    <div v-if="uiState.translationBadge.askMode && !uiState.translationBadge.askLoading" class="ask-input-row">
      <textarea
        ref="askInputEl"
        class="ask-input"
        rows="1"
        :placeholder="askPlaceholder"
        v-model="askQuestion"
        @input="autoResize"
        @keydown.enter.exact.prevent="handleAskSubmit"
        @keydown.esc.prevent="handleClose"
        @click.stop
        @mousedown.stop
        @pointerdown.stop
      ></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch, nextTick } from 'vue';
import { uiState, uiActions } from '@/utils/content-state';
import { checkFullscreen } from '@/utils/bilibili-state';
import { safeSendMessage } from '@/utils/content-messaging';
import { settingsStorage } from '@/utils/storage';
import { t } from '@/utils/i18n';

const badgeEl = ref<HTMLElement | null>(null);
const hostEl = ref<HTMLElement | null>(null);
const badgeWidth = ref(0);
const askInputEl = ref<HTMLTextAreaElement | null>(null);
const askQuestion = ref('');
const uiLanguage = ref('zh-CN');

onMounted(() => {
  settingsStorage.getValue().then(s => uiLanguage.value = s.uiLanguage || 'zh-CN');
  settingsStorage.watch(s => uiLanguage.value = s.uiLanguage || 'zh-CN');
  if (badgeEl.value) {
    const rootNode = badgeEl.value.getRootNode();
    if (rootNode instanceof ShadowRoot) {
      hostEl.value = rootNode.host as HTMLElement;
    }
  }
});

watch(
  () => [uiState.translationBadge.visible, uiState.translationBadge.text],
  async () => {
    if (uiState.translationBadge.visible) {
      await nextTick();
      if (badgeEl.value) {
        badgeWidth.value = badgeEl.value.offsetWidth;
      }
    } else {
      badgeWidth.value = 0;
      askQuestion.value = '';
    }
  },
  { immediate: true }
);

watch(
  () => uiState.translationBadge.askMode,
  async (askMode) => {
    if (askMode) {
      await nextTick();
      askInputEl.value?.focus();
    } else {
      askQuestion.value = '';
      if (askInputEl.value) {
        askInputEl.value.style.height = 'auto';
      }
    }
  }
);

const autoResize = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  target.style.height = 'auto';
  target.style.height = Math.min(target.scrollHeight, 120) + 'px';
};

const askPlaceholder = computed(() => {
  return uiState.translationBadge.askAnswer ? t('继续追问...', uiLanguage.value) : t('输入问题，按 Enter 发送', uiLanguage.value);
});

const safeEngine = computed(() => {
  const engine = uiState.translationBadge.engine;
  return engine ? engine.charAt(0).toUpperCase() + engine.slice(1) : '';
});

const parsedText = computed(() => {
  if (uiState.translationBadge.translationType !== 'dict') {
    return null;
  }
  // Regex to split: Original Word (Translation)
  const match = uiState.translationBadge.text.match(/^(.*?)\s*[\(（](.*?)[\)）]$/);
  if (match) {
    return { original: match[1].trim(), translation: match[2].trim() };
  }
  return null;
});

const actualPosition = computed(() => {
  const targetRect = uiState.translationBadge.rect;
  if (!targetRect) return 'bottom';
  let pos = uiState.translationBadge.position || 'bottom';
  
  if (pos === 'top' && targetRect.top < 100) {
    return 'bottom';
  }
  if (pos === 'bottom' && targetRect.bottom > window.innerHeight - 80) {
    return 'top';
  }
  return pos;
});

const badgeStyle = computed(() => {
  const targetRect = uiState.translationBadge.rect;
  if (!targetRect) return {};
  
  const host = hostEl.value;
  const isGlobalUi = !host || host.tagName === 'RUBI-UI-ROOT';
  
  let x: number;
  let y: number;

  let pronouncePos = 'none';
  let pronounceExtraHeight = 0;
  if (uiState.pronounceBadge.visible && uiState.pronounceBadge.rect) {
    const pRect = uiState.pronounceBadge.rect;
    pronouncePos = pRect.top < 100 ? 'bottom' : 'top';
    // Add extra space for the dual-row PronounceBadge (Original word + Hiragana reading)
    pronounceExtraHeight = uiState.pronounceBadge.word ? 18 : 0;
  }

  const pos = actualPosition.value;

  if (isGlobalUi) {
    const isFullscreen = checkFullscreen();
    const scrollX = isFullscreen ? 0 : window.scrollX;
    const scrollY = isFullscreen ? 0 : window.scrollY;

    x = targetRect.left + scrollX + targetRect.width / 2;
    if (pos === 'top') {
      y = targetRect.top + scrollY - 12;
      if (pronouncePos === 'top') {
        y -= (26 + pronounceExtraHeight);
      }
    } else {
      y = targetRect.bottom + scrollY + 12;
      if (pronouncePos === 'bottom') {
        y += (26 + pronounceExtraHeight);
      }
    }
  } else {
    let rootRect = host.getBoundingClientRect();
    const hasFullscreen = checkFullscreen();
    if (hasFullscreen) {
      rootRect = {
        left: 0,
        top: 0,
        right: window.innerWidth,
        bottom: window.innerHeight,
        width: window.innerWidth,
        height: window.innerHeight
      } as DOMRect;
    }
    const rootTop = rootRect.top ?? (rootRect as any).y ?? 0;

    x = targetRect.left - rootRect.left + targetRect.width / 2;
    if (pos === 'top') {
      y = targetRect.top - rootTop - 12;
      if (pronouncePos === 'top') {
        y -= (26 + pronounceExtraHeight);
      }
    } else {
      y = targetRect.bottom - rootTop + 12;
      if (pronouncePos === 'bottom') {
        y += (26 + pronounceExtraHeight);
      }
    }
  }

  const viewportCenterX = targetRect.left + targetRect.width / 2;
  const screenWidth = window.innerWidth;
  const halfWidth = badgeWidth.value / 2;
  const padding = 16;
  let shiftX = 0;

  if (halfWidth > 0) {
    if (viewportCenterX - halfWidth < padding) {
      shiftX = padding - (viewportCenterX - halfWidth);
    } else if (viewportCenterX + halfWidth > screenWidth - padding) {
      shiftX = (screenWidth - padding) - (viewportCenterX + halfWidth);
    }
  }

  return {
    left: `${x}px`,
    top: `${y}px`,
    '--shift-x': `${shiftX}px`,
  };
});

const isTranslating = ref(false);

const handleEngineClick = async (e: MouseEvent) => {
  e.stopPropagation();
  e.preventDefault();
  
  if (isTranslating.value) return;
  
  const originalText = uiState.translationBadge.originalText;
  if (!originalText) return;
  
  isTranslating.value = true;
  
  uiState.translationBadge.text = 'AI 翻译中...';
  uiState.translationBadge.engine = 'AI';
  uiState.translationBadge.translationType = 'ai';
  uiState.translationBadge.pinned = true;
  
  try {
    const resp = await safeSendMessage({
      type: 'CONTEXTUAL_TRANSLATE',
      word: originalText,
      sentence: uiState.translationBadge.askContext || originalText
    });
    
    if (resp && resp.success && resp.translation) {
      uiState.translationBadge.text = resp.translation;
    } else {
      uiState.translationBadge.text = resp?.error ? `翻译失败: ${resp.error}` : '翻译失败';
    }
  } catch (err) {
    uiState.translationBadge.text = '翻译出错';
    console.error('[Rubi-DEBUG] AI translation failed:', err);
  } finally {
    isTranslating.value = false;
  }
};

const handleDblClick = (e: MouseEvent) => {
  e.stopPropagation();
  e.preventDefault();
  if (!uiState.translationBadge.askMode) {
    uiActions.enterAskMode();
  }
};

const handleClose = () => {
  if (badgeEl.value) {
    badgeEl.value.style.transition = 'none';
    badgeEl.value.style.opacity = '0';
  }
  uiActions.hideTranslationBadge();
  requestAnimationFrame(() => {
    if (badgeEl.value) {
      badgeEl.value.style.transition = '';
      badgeEl.value.style.opacity = '';
    }
  });
};

const handleAskSubmit = async () => {
  const question = askQuestion.value.trim();
  if (!question) return;

  uiState.translationBadge.askLoading = true;
  askQuestion.value = '';
  if (askInputEl.value) {
    askInputEl.value.style.height = 'auto';
  }

  try {
    const resp = await safeSendMessage({
      type: 'ASK_AI',
      question,
      word: uiState.translationBadge.originalText || '',
      sentence: uiState.translationBadge.askContext || '',
      translation: uiState.translationBadge.text || '',
    });

    if (resp?.success && resp.answer) {
      uiActions.setAskAnswer(resp.answer);
    } else {
      uiActions.setAskAnswer(resp?.error ? `回答失败: ${resp.error}` : '回答失败');
    }
  } catch (err) {
    uiActions.setAskAnswer('请求出错，请重试');
    console.error('[Rubi-DEBUG] Ask AI failed:', err);
  }

  await nextTick();
  askInputEl.value?.focus();
};
</script>

<style scoped>
.rubi-translation-tooltip {
  position: absolute;
  background-color: #f0f0f0;
  color: #333333;
  border: 1px solid #dcdcdc;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 6px 10px;
  font-size: 14px;
  z-index: 2147483646;
  border-radius: 0px;
  pointer-events: auto;
  white-space: pre-wrap;
  width: max-content;
  max-width: 300px;
  font-family: system-ui, -apple-system, sans-serif;
  
  display: flex;
  flex-direction: column;
  text-align: left;
  gap: 0;
  
  opacity: 0;
  transition: opacity 0.2s ease-out, transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.rubi-translation-tooltip.rubi-ask-mode {
  max-width: 340px;
  min-width: 240px;
}

.rubi-translation-tooltip.rubi-visible {
  opacity: 1;
}

.rubi-translation-tooltip.pos-top {
  transform: translate(calc(-50% + var(--shift-x, 0px)), calc(-100% + 8px));
}
.rubi-translation-tooltip.pos-top.rubi-visible {
  transform: translate(calc(-50% + var(--shift-x, 0px)), -100%);
}

.rubi-translation-tooltip.pos-bottom {
  transform: translate(calc(-50% + var(--shift-x, 0px)), -8px);
}
.rubi-translation-tooltip.pos-bottom.rubi-visible {
  transform: translate(calc(-50% + var(--shift-x, 0px)), 0);
}

.trans-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.rubi-translation-tooltip .engine-tag {
  font-size: 10px;
  color: #888;
  border-left: 1px solid #ccc;
  padding-left: 8px;
  line-height: 1;
  white-space: nowrap;
  flex-shrink: 0;
  pointer-events: auto !important;
  cursor: pointer;
  transition: color 0.2s ease, font-weight 0.2s ease;
  display: flex;
  align-items: center;
  gap: 2px;
}

.rubi-translation-tooltip .engine-tag.has-error {
  color: #d97706; /* Amber */
}

.rubi-translation-tooltip .engine-tag:hover {
  color: #1a1a1a;
  font-weight: bold;
}

.rubi-translation-tooltip .engine-tag.has-error:hover {
  color: #b45309;
}

.error-icon {
  font-size: 10px;
}

.rubi-translation-tooltip .trans-content-col {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px;
}

.rubi-translation-tooltip .trans-original {
  font-weight: 500;
  color: #555;
  font-size: 13px;
  line-height: 1.4;
}
.rubi-translation-tooltip .trans-translation,
.rubi-translation-tooltip strong {
  font-weight: 700;
  color: #1a1a1a;
  font-size: 14px;
  line-height: 1.4;
}

/* Close button */
.ask-close {
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: #999;
  cursor: pointer;
  font-size: 11px;
  border-radius: 3px;
  flex-shrink: 0;
  transition: color 0.15s;
}
.ask-close:hover {
  color: #555;
}

/* Answer */
.ask-answer {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid #dcdcdc;
  font-size: 13px;
  line-height: 1.5;
  color: #333;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Loading dots */
.ask-loading {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid #dcdcdc;
  display: flex;
  align-items: center;
  gap: 4px;
  padding-bottom: 2px;
}
.ask-loading-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #999;
  animation: rubi-dot-bounce 1.2s infinite ease-in-out;
}
.ask-loading-dot:nth-child(2) { animation-delay: 0.15s; }
.ask-loading-dot:nth-child(3) { animation-delay: 0.3s; }

@keyframes rubi-dot-bounce {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1.1); }
}

/* Input */
.ask-input-row {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid #dcdcdc;
}

.ask-input {
  width: 100%;
  border: none;
  padding: 0;
  font-size: 13px;
  line-height: 1.4;
  font-family: system-ui, -apple-system, sans-serif;
  outline: none;
  background: transparent;
  color: #333;
  box-sizing: border-box;
  resize: none;
  overflow-y: auto;
  min-height: 18px;
  max-height: 120px;
}
.ask-input::placeholder {
  color: #aaa;
  font-size: 12px;
}

@media (prefers-color-scheme: dark) {
  .rubi-translation-tooltip {
    background-color: #222224;
    color: #e0e0e0;
    border-color: #333335;
  }
  .rubi-translation-tooltip .trans-original {
    color: #aaa;
  }
  .rubi-translation-tooltip .trans-translation,
  .rubi-translation-tooltip strong {
    color: #fff;
  }
  .rubi-translation-tooltip .engine-tag {
    border-left-color: #444;
    color: #777;
  }
  .rubi-translation-tooltip .engine-tag:hover {
    color: #ccc;
  }
  .ask-close {
    color: #666;
  }
  .ask-close:hover {
    color: #aaa;
  }
  .ask-answer {
    border-top-color: #333;
    color: #ccc;
  }
  .ask-loading {
    border-top-color: #333;
  }
  .ask-loading-dot {
    background: #666;
  }
  .ask-input-row {
    border-top-color: #333;
  }
  .ask-input {
    color: #e0e0e0;
  }
  .ask-input::placeholder {
    color: #555;
  }
}
</style>
