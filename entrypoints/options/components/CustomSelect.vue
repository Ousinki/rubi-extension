<template>
  <div class="custom-select" :class="{ open: isOpen, 'compact': compact }" ref="selectRef">
    <button
      type="button"
      class="custom-select-trigger"
      @click="toggle"
      @keydown.escape="close"
      @keydown.enter.prevent="toggle"
      @keydown.space.prevent="toggle"
      @keydown.up.prevent="selectPrev"
      @keydown.down.prevent="selectNext"
    >
      <span class="custom-select-value">{{ selectedLabel }}</span>
      <svg class="custom-select-arrow" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>
    <Transition name="dropdown">
      <div v-if="isOpen" class="custom-select-dropdown">
        <div class="custom-select-options">
          <button
            v-for="option in options"
            :key="option.value"
            type="button"
            class="custom-select-option"
            :class="{ selected: option.value === modelValue }"
            @click="selectOption(option.value)"
          >
            <svg v-if="option.value === modelValue" class="check-icon" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span v-else class="check-placeholder"></span>
            <span class="option-label">{{ option.label }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

interface SelectOption {
  value: string;
  label: string;
}

const props = defineProps<{
  modelValue: string;
  options: SelectOption[];
  compact?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'change': [];
}>();

const isOpen = ref(false);
const selectRef = ref<HTMLElement | null>(null);

const selectedLabel = computed(() => {
  const found = props.options.find(o => o.value === props.modelValue);
  return found ? found.label : props.modelValue;
});

function toggle() {
  isOpen.value = !isOpen.value;
}

function close() {
  isOpen.value = false;
}

function selectOption(value: string) {
  emit('update:modelValue', value);
  emit('change');
  isOpen.value = false;
}

function selectPrev() {
  const idx = props.options.findIndex(o => o.value === props.modelValue);
  if (idx > 0) {
    selectOption(props.options[idx - 1].value);
  }
}

function selectNext() {
  const idx = props.options.findIndex(o => o.value === props.modelValue);
  if (idx < props.options.length - 1) {
    selectOption(props.options[idx + 1].value);
  }
}

function handleClickOutside(e: MouseEvent) {
  if (selectRef.value && !selectRef.value.contains(e.target as Node)) {
    close();
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside));
onUnmounted(() => document.removeEventListener('click', handleClickOutside));
</script>

<style scoped>
.custom-select {
  position: relative;
  width: 100%;
}

.custom-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid var(--border-subtle);
  border-radius: 10px;
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 13.5px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  gap: 8px;
  font-family: inherit;
  line-height: 1.4;
}

.custom-select-trigger:hover {
  border-color: var(--accent-base);
  box-shadow: 0 0 0 3px var(--accent-transparent);
}

.custom-select.open .custom-select-trigger {
  border-color: var(--accent-base);
  box-shadow: 0 0 0 3px var(--accent-transparent);
}

.custom-select-value {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.custom-select-arrow {
  flex-shrink: 0;
  opacity: 0.5;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.custom-select.open .custom-select-arrow {
  transform: rotate(180deg);
  opacity: 0.8;
}

.custom-select-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 100;
  border: 1.5px solid var(--border-subtle);
  border-radius: 12px;
  background: var(--bg-card);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  backdrop-filter: blur(12px);
}

.custom-select-options {
  max-height: 240px;
  overflow-y: auto;
  padding: 5px;
}

.custom-select-options::-webkit-scrollbar {
  width: 6px;
}

.custom-select-options::-webkit-scrollbar-track {
  background: transparent;
}

.custom-select-options::-webkit-scrollbar-thumb {
  background: var(--border-subtle);
  border-radius: 3px;
}

.custom-select-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 9px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary);
  font-size: 13.5px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  font-family: inherit;
  line-height: 1.4;
}

.custom-select-option:hover {
  background: var(--accent-light);
}

.custom-select-option.selected {
  color: var(--accent-base);
  font-weight: 560;
  background: var(--accent-light);
}

.check-icon {
  flex-shrink: 0;
  color: var(--accent-base);
}

.check-placeholder {
  display: inline-block;
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.option-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Compact variant for header language selector */
.custom-select.compact .custom-select-trigger {
  padding: 5px 10px;
  font-size: 12.5px;
  border-radius: 8px;
  border-color: transparent;
  background: transparent;
}

.custom-select.compact .custom-select-trigger:hover {
  background: var(--accent-light);
  border-color: transparent;
  box-shadow: none;
}

.custom-select.compact.open .custom-select-trigger {
  background: var(--accent-light);
  border-color: transparent;
  box-shadow: none;
}

.custom-select.compact .custom-select-dropdown {
  min-width: 160px;
  right: auto;
}

.custom-select.compact .custom-select-option {
  font-size: 12.5px;
  padding: 7px 10px;
}

/* Dropdown animation */
.dropdown-enter-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.dropdown-leave-active {
  transition: all 0.15s ease-in;
}
.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-6px) scale(0.97);
}
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}

/* Dark mode enhancements */
:root .theme-dark .custom-select-dropdown {
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.35),
    0 2px 8px rgba(0, 0, 0, 0.25),
    inset 0 0.5px 0 rgba(255, 255, 255, 0.06);
}
</style>
