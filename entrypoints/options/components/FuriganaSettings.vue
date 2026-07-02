<template>
  <section class="card" id="furigana-preferences">
    <div class="card-header">
      <h2>{{ t('furigana.title') }}</h2>
      <span class="section-tag">{{ t('furigana.tag') }}</span>
    </div>
    
    <div class="card-body">
      <div class="toggle-row">
        <div class="toggle-desc">
          <h3>
            {{ t('furigana.enable_label') }}
            <input 
              type="text" 
              class="shortcut-input" 
              readonly
              :value="isRecording ? '输入快捷键...' : formatShortcut(settings.furiganaShortcut)"
              @focus="isRecording = true"
              @blur="isRecording = false"
              @keydown.prevent="recordShortcut"
              title="Click and press keys to set shortcut"
              :class="{ 'is-recording': isRecording }"
            />
          </h3>
          <p>{{ t('furigana.enable_desc') }}</p>
        </div>
        <button 
          class="toggle-btn" 
          :class="{ active: settings.enableFuriganaRuby }" 
          @click="settings.enableFuriganaRuby = !settings.enableFuriganaRuby; saveSettings()"
        >
          <span class="toggle-dot"></span>
        </button>
      </div>

      <div class="input-group">
        <label>{{ t('furigana.jlpt_label') }}</label>
        <div class="radio-group-bar">
          <label v-for="level in ['all', 'N5', 'N4', 'N3', 'N2', 'N1']" :key="level" class="radio-label-item" :class="{ selected: settings.jlptFilterLevel === level }">
            <input 
              type="radio" 
              name="jlpt" 
              :value="level" 
              v-model="settings.jlptFilterLevel" 
              @change="saveSettings"
            />
            <span class="radio-text">{{ level === 'all' ? t('furigana.jlpt_all') : t('furigana.jlpt_above_pre') + level + t('furigana.jlpt_above_suf') }}</span>
          </label>
        </div>
        <p class="description-hint">{{ t('furigana.jlpt_hint') }}</p>
      </div>

      <div class="row" style="margin-top: 1.5rem;">
        <div class="input-group third">
          <label>{{ t('furigana.color_label') }}</label>
          <CustomSelect 
            v-model="settings.furiganaColor" 
            :options="[
              { label: t('furigana.color_theme'), value: 'theme' },
              { label: t('furigana.color_gray'), value: 'gray' },
              { label: t('furigana.color_text'), value: 'text' }
            ]"
            @update:modelValue="saveSettings"
          />
        </div>
        <div class="input-group third">
          <label>{{ t('furigana.font_label') }}</label>
          <CustomSelect 
            v-model="settings.furiganaFont" 
            :options="[
              { label: t('furigana.font_system'), value: 'system' },
              { label: t('furigana.font_sans'), value: 'sans-serif' },
              { label: t('furigana.font_serif'), value: 'serif' },
              { label: t('furigana.font_mono'), value: 'monospace' }
            ]"
            @update:modelValue="saveSettings"
          />
        </div>
        <div class="input-group third">
          <label>{{ t('furigana.opacity_label') }}</label>
          <CustomSelect 
            v-model="settings.furiganaOpacity" 
            :options="[
              { label: '40%', value: '0.4' },
              { label: '60%', value: '0.6' },
              { label: '80%', value: '0.8' },
              { label: '100%', value: '1.0' }
            ]"
            @update:modelValue="saveSettings"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import CustomSelect from './CustomSelect.vue';

import { useOptions } from '../composables/useOptions';

const { settings, saveSettings, t } = useOptions();

const isRecording = ref(false);

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

const recordShortcut = (e: KeyboardEvent) => {
  if (['Shift', 'Control', 'Alt', 'Meta', 'Escape', 'Enter', 'Tab', 'Backspace', 'Delete'].includes(e.key)) {
    if (e.key === 'Backspace' || e.key === 'Escape') {
      settings.furiganaShortcut = '';
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
  
  settings.furiganaShortcut = keys.join('+');
  saveSettings();
  (e.target as HTMLElement).blur();
};
</script>
