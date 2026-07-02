<template>
  <section class="card" id="paragraph-translation">
    <div class="card-header">
      <h2>{{ t('paragraph.title') }}</h2>
      <span class="section-tag">{{ t('paragraph.tag') }}</span>
    </div>
    
    <div class="card-body">
      <div class="toggle-row" style="flex-direction: column; align-items: stretch; gap: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div class="toggle-desc">
            <h3>{{ t('paragraph.enable_label') }}</h3>
            <p>{{ t('paragraph.enable_desc') }}</p>
          </div>
          <CustomSelect
            v-model="settings.inlineParagraphTrigger"
            :options="inlineParagraphTriggerOptions"
            @change="saveSettings"
            style="width: 280px; flex-shrink: 0;"
          />
        </div>

        <!-- Custom shortcut input -->
        <div v-if="settings.inlineParagraphTrigger === 'custom'" class="input-group" style="margin-bottom: 0;">
          <label style="display: flex; align-items: center;">
            {{ t('paragraph.shortcut_label') }}
            <input 
              type="text" 
              class="shortcut-input" 
              readonly
              :value="recordingField === 'inlineParagraphCustomShortcut' ? t('paragraph.recording') : formatShortcut(settings.inlineParagraphCustomShortcut)"
              @focus="recordingField = 'inlineParagraphCustomShortcut'"
              @blur="recordingField = null"
              @keydown.prevent="recordShortcut($event, 'inlineParagraphCustomShortcut')"
              title="Click and press keys to set shortcut"
              :class="{ 'is-recording': recordingField === 'inlineParagraphCustomShortcut' }"
            />
          </label>
        </div>
      </div>

      <div class="toggle-row" style="border-bottom: none; margin-bottom: 0; padding-bottom: 0;">
        <div class="toggle-desc">
          <h3>
            {{ t('paragraph.full_page_shortcut_label') || '全文翻译快捷键' }}
            <input 
              type="text" 
              class="shortcut-input" 
              readonly
              :value="recordingField === 'fullPageTranslateShortcut' ? t('paragraph.recording') : formatShortcut(settings.fullPageTranslateShortcut)"
              @focus="recordingField = 'fullPageTranslateShortcut'"
              @blur="recordingField = null"
              @keydown.prevent="recordShortcut($event, 'fullPageTranslateShortcut')"
              title="Click and press keys to set shortcut"
              :class="{ 'is-recording': recordingField === 'fullPageTranslateShortcut' }"
            />
          </h3>
        </div>

        <div style="display: flex; align-items: center; gap: 12px; flex-shrink: 0;">
          <span style="font-size: 13px; color: var(--text-secondary); font-weight: 500;">{{ t('paragraph.display_mode') || '显示模式' }}</span>
          <CustomSelect
            v-model="settings.translationDisplayMode"
            :options="translationDisplayModeOptions"
            @change="saveSettings"
            style="width: 200px;"
          />
        </div>
      </div>

      <!-- Direct mode warning hint -->
      <div v-if="settings.inlineParagraphTrigger === 'direct'" class="direct-mode-hint" style="margin-top: 16px; font-size: 13px; color: #eab308; background: rgba(234, 179, 8, 0.08); padding: 12px; border-radius: 8px; border: 1px solid rgba(234, 179, 8, 0.2);">
        {{ t('paragraph.direct_hint') }}
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import CustomSelect from './CustomSelect.vue';

import { useOptions } from '../composables/useOptions';

const { settings, saveSettings, t } = useOptions();

const recordingField = ref<'inlineParagraphCustomShortcut' | 'fullPageTranslateShortcut' | null>(null);

const inlineParagraphTriggerOptions = computed(() => [
  { value: 'none', label: t('paragraph.trigger_none') },
  { value: 'shift', label: t('paragraph.trigger_shift') },
  { value: 'ctrl', label: t('paragraph.trigger_ctrl') },
  { value: 'alt', label: t('paragraph.trigger_alt') },
  { value: 'meta', label: t('paragraph.trigger_meta') },
  { value: 'longpress', label: t('paragraph.trigger_longpress') },
  { value: 'direct', label: t('paragraph.trigger_direct') },
  { value: 'custom', label: t('paragraph.trigger_custom') },
]);

const translationDisplayModeOptions = computed(() => [
  { value: 'append', label: t('paragraph.display_mode_append') || '原文下方显示' },
  { value: 'replace', label: t('paragraph.display_mode_replace') || '替代覆盖原文' },
]);

const formatShortcut = (shortcut: string | undefined) => {
  if (!shortcut) return '';
  let formatted = shortcut;
  formatted = formatted.replace(/Meta/g, '⌘');
  formatted = formatted.replace(/Shift/g, '⇧');
  formatted = formatted.replace(/Alt/g, '⌥');
  formatted = formatted.replace(/Ctrl/g, '⌃');
  formatted = formatted.replace(/\+/g, '');
  formatted = formatted.replace('Key', '');
  formatted = formatted.replace('Digit', '');
  return formatted;
};

const recordShortcut = (e: KeyboardEvent, key: 'inlineParagraphCustomShortcut' | 'fullPageTranslateShortcut') => {
  if (['Shift', 'Control', 'Alt', 'Meta', 'Escape', 'Enter', 'Tab', 'Backspace', 'Delete'].includes(e.key)) {
    if (e.key === 'Backspace' || e.key === 'Escape') {
      settings[key] = '';
      saveSettings();
    }
    return;
  }
  
  let keys = [];
  if (e.ctrlKey) keys.push('Ctrl');
  if (e.metaKey) keys.push('Meta');
  if (e.altKey) keys.push('Alt');
  if (e.shiftKey) keys.push('Shift');
  
  keys.push(e.code);
  
  settings[key] = keys.join('+');
  saveSettings();
  (e.target as HTMLElement).blur();
};
</script>
