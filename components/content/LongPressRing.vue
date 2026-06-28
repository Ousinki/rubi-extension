<template>
  <div 
    class="rubi-long-press-ring"
    :class="{ 
      'active': uiState.longPressRing.visible,
      'pop': uiState.longPressRing.pop 
    }"
    :style="{
      left: `${uiState.longPressRing.x}px`,
      top: `${uiState.longPressRing.y}px`
    }"
  >
    <svg viewBox="0 0 32 32">
      <circle class="ring-progress" cx="16" cy="16" r="14"></circle>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { uiState } from '@/utils/content-state';
</script>

<style scoped>
.rubi-long-press-ring {
  position: fixed;
  pointer-events: none;
  z-index: 2147483647;
  width: 32px;
  height: 32px;
  margin-left: -16px;
  margin-top: -16px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.rubi-long-press-ring.active {
  opacity: 1;
}

.rubi-long-press-ring svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.rubi-long-press-ring .ring-progress {
  fill: transparent;
  stroke: var(--rubi-color, #8b5cf6);
  stroke-width: 4;
  stroke-linecap: round;
  stroke-dasharray: 87.96; /* 2 * pi * 14 */
  stroke-dashoffset: 87.96;
  opacity: 0.8;
  transition: stroke-dashoffset 400ms linear;
}

.rubi-long-press-ring.active .ring-progress {
  stroke-dashoffset: 0;
}

.rubi-long-press-ring.pop {
  transform: scale(1.15);
  opacity: 0;
  transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s ease-out;
}
</style>
