<template>
  <div
    ref="badgeEl"
    id="rubi-pronounce-badge"
    :class="[
      { 'rubi-badge-visible': uiState.pronounceBadge.visible },
      isBottom ? 'pos-bottom' : 'pos-top',
      'theme-' + tooltipTheme
    ]"
    :style="badgeStyle"
    @click="handlePlayTts"
  >
    <!-- Top Row: Japanese Kanji / Word -->
    <div v-if="uiState.pronounceBadge.word" class="rubi-syl-word">
      {{ uiState.pronounceBadge.word }}
    </div>
    
    <!-- Bottom Row: Pronunciation (Hiragana Reading) -->
    <div v-if="uiState.pronounceBadge.content" class="rubi-badge-content">
      <span v-if="uiState.pronounceBadge.content === '...'" class="rubi-loading-dots">
        <span>.</span><span>.</span><span>.</span>
      </span>
      <span v-else-if="uiState.pronounceBadge.isHTML" v-html="uiState.pronounceBadge.content"></span>
      <span v-else>{{ uiState.pronounceBadge.content }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch, nextTick } from 'vue';
import { uiState } from '@/utils/content-state';
import { checkFullscreen } from '@/utils/bilibili-state';
import { speakText } from '@/utils/tts';
import { settingsStorage } from '@/utils/storage';

const badgeEl = ref<HTMLElement | null>(null);
const hostEl = ref<HTMLElement | null>(null);
const badgeWidth = ref(0);
const tooltipTheme = ref('system');

onMounted(() => {
  settingsStorage.getValue().then(s => tooltipTheme.value = s?.tooltipTheme || 'system');
  settingsStorage.watch(s => tooltipTheme.value = s?.tooltipTheme || 'system');
  if (badgeEl.value) {
    const rootNode = badgeEl.value.getRootNode();
    if (rootNode instanceof ShadowRoot) {
      hostEl.value = rootNode.host as HTMLElement;
    }
  }
});

watch(
  () => [uiState.pronounceBadge.visible, uiState.pronounceBadge.content, uiState.pronounceBadge.word],
  async () => {
    if (uiState.pronounceBadge.visible) {
      await nextTick();
      if (badgeEl.value) {
        badgeWidth.value = badgeEl.value.offsetWidth;
      }
    } else {
      badgeWidth.value = 0;
    }
  },
  { immediate: true }
);

const isBottom = computed(() => {
  if (!uiState.pronounceBadge.rect) return false;
  const rect = uiState.pronounceBadge.rect;
  return rect.top < 100;
});

const badgeStyle = computed(() => {
  if (!uiState.pronounceBadge.rect) return {};
  const rect = uiState.pronounceBadge.rect;
  
  const host = hostEl.value;
  const isGlobalUi = !host || host.tagName === 'RUBI-UI-ROOT';
  
  let x: number;
  let y: number;

  if (isGlobalUi) {
    const isFullscreen = checkFullscreen();
    const scrollX = isFullscreen ? 0 : window.scrollX;
    const scrollY = isFullscreen ? 0 : window.scrollY;

    x = rect.left + scrollX + rect.width / 2;
    if (isBottom.value) {
      y = rect.bottom + scrollY + 6;
    } else {
      y = rect.top + scrollY - 6;
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
    
    x = rect.left - rootRect.left + rect.width / 2;
    if (isBottom.value) {
      y = rect.bottom - rootTop + 6;
    } else {
      y = rect.top - rootTop - 6;
    }
  }

  // Calculate shiftX to prevent overflow on left/right edges
  const viewportCenterX = rect.left + rect.width / 2;
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

const handlePlayTts = async () => {
  let word = uiState.pronounceBadge.word || uiState.pronounceBadge.content;
  // If the word contains only Latin characters (etymology word like "accent"),
  // use the Kana reading instead so we pronounce the Japanese version of the word!
  if (word && /^[a-zA-Z\s\-,'.（）()]+$/.test(word)) {
    word = uiState.pronounceBadge.content;
  }
  if (!word) return;
  const settings = await settingsStorage.getValue();
  speakText(word, settings);
};
</script>

<style scoped>
#rubi-pronounce-badge {
  position: absolute;
  z-index: 2147483647;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid #e2e2ea;
  color: #121316;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  font-weight: 500;
  padding: 5px 12px;
  border-radius: 4px;
  box-shadow: 0 4px 14px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.02);
  pointer-events: auto !important;
  cursor: pointer;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.15s ease, transform 0.15s ease, visibility 0.15s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.rubi-syl-word {
  color: var(--rubi-highlight-main, #5c35b4);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.rubi-badge-content {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5a5d6a; /* Slate color for transcription */
  font-size: 12px;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

#rubi-pronounce-badge:hover .rubi-badge-content {
  transform: scale(1.1);
}

.rubi-loading-dots span {
  animation: rubi-dot-blink 1.4s infinite both;
  font-size: 14px;
  letter-spacing: 2px;
}
.rubi-loading-dots span:nth-child(2) {
  animation-delay: 0.2s;
}
.rubi-loading-dots span:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes rubi-dot-blink {
  0% { opacity: 0.2; }
  20% { opacity: 1; }
  100% { opacity: 0.2; }
}

#rubi-pronounce-badge.pos-top {
  transform: translate(calc(-50% + var(--shift-x, 0px)), -100%) scale(0.9);
}
#rubi-pronounce-badge.pos-top.rubi-badge-visible {
  opacity: 1;
  visibility: visible;
  transform: translate(calc(-50% + var(--shift-x, 0px)), -100%) scale(1);
}

#rubi-pronounce-badge.pos-bottom {
  transform: translate(calc(-50% + var(--shift-x, 0px)), 0) scale(0.9);
}
#rubi-pronounce-badge.pos-bottom.rubi-badge-visible {
  opacity: 1;
  visibility: visible;
  transform: translate(calc(-50% + var(--shift-x, 0px)), 0) scale(1);
}

#rubi-pronounce-badge::after {
  content: '';
  position: absolute;
  left: calc(50% - var(--shift-x, 0px));
  margin-left: -4px;
  border-width: 4px 4px 0 4px;
  border-style: solid;
}

#rubi-pronounce-badge.pos-top::after {
  bottom: -4px;
  border-color: #e2e2ea transparent transparent transparent;
}

#rubi-pronounce-badge.pos-bottom::after {
  top: -4px;
  border-width: 0 4px 4px 4px;
  border-color: transparent transparent #e2e2ea transparent;
}

/* Dark theme overrides */
#rubi-pronounce-badge.theme-dark {
  background: rgba(20, 22, 29, 0.96);
  border-color: #242731;
  color: #eaecef;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}
#rubi-pronounce-badge.theme-dark .rubi-syl-word {
  color: var(--rubi-highlight-dark, #a78bfa);
}
#rubi-pronounce-badge.theme-dark .rubi-badge-content {
  color: #9aa2b1;
}
#rubi-pronounce-badge.theme-dark.pos-top::after {
  border-color: #242731 transparent transparent transparent;
}
#rubi-pronounce-badge.theme-dark.pos-bottom::after {
  border-color: transparent transparent #242731 transparent;
}

/* Beige theme */
#rubi-pronounce-badge.theme-beige {
  background: #fdf6e3;
  border-color: #eee8d5;
  color: #657b83;
}
#rubi-pronounce-badge.theme-beige .rubi-syl-word {
  color: var(--rubi-highlight-main, #d33682); 
}
#rubi-pronounce-badge.theme-beige .rubi-badge-content {
  color: #93a1a1;
}
#rubi-pronounce-badge.theme-beige.pos-top::after {
  border-color: #eee8d5 transparent transparent transparent;
}
#rubi-pronounce-badge.theme-beige.pos-bottom::after {
  border-color: transparent transparent #eee8d5 transparent;
}

/* Glass theme */
#rubi-pronounce-badge.theme-glass {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-color: rgba(255, 255, 255, 0.5);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.1);
}
#rubi-pronounce-badge.theme-glass.pos-top::after {
  border-color: rgba(255, 255, 255, 0.5) transparent transparent transparent;
}
#rubi-pronounce-badge.theme-glass.pos-bottom::after {
  border-color: transparent transparent rgba(255, 255, 255, 0.5) transparent;
}

/* System Dark Mode support */
@media (prefers-color-scheme: dark) {
  #rubi-pronounce-badge.theme-system {
    background: rgba(20, 22, 29, 0.96);
    border-color: #242731;
    color: #eaecef;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  }
  #rubi-pronounce-badge.theme-system .rubi-syl-word {
    color: var(--rubi-highlight-dark, #a78bfa);
  }
  #rubi-pronounce-badge.theme-system .rubi-badge-content {
    color: #9aa2b1;
  }
  #rubi-pronounce-badge.theme-system.pos-top::after {
    border-color: #242731 transparent transparent transparent;
  }
  #rubi-pronounce-badge.theme-system.pos-bottom::after {
    border-color: transparent transparent #242731 transparent;
  }
  
  #rubi-pronounce-badge.theme-glass {
    background: rgba(0, 0, 0, 0.75);
    border-color: rgba(255, 255, 255, 0.15);
    color: #fff;
  }
  #rubi-pronounce-badge.theme-glass .rubi-badge-content {
    color: rgba(255, 255, 255, 0.7);
  }
  #rubi-pronounce-badge.theme-glass.pos-top::after {
    border-color: rgba(255, 255, 255, 0.15) transparent transparent transparent;
  }
  #rubi-pronounce-badge.theme-glass.pos-bottom::after {
    border-color: transparent transparent rgba(255, 255, 255, 0.15) transparent;
  }
}
</style>
