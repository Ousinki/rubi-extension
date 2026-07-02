<template>
  <section class="card" id="appearance">
    <div class="card-header">
      <h2>{{ t('appearance.title') }}</h2>
      <span class="section-tag">{{ t('appearance.tag') }}</span>
    </div>
    
    <div class="card-body">
      <div class="input-group">
        <label>{{ t('appearance.highlight_label') }}</label>
        <div class="engine-selector" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <label class="engine-option" :class="{ active: settings.highlightStyle === 'purple' }">
            <input type="radio" v-model="settings.highlightStyle" value="purple" @change="saveSettings" />
            <div class="engine-info" style="display: flex; align-items: center; gap: 8px;">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="#8b5cf6" stroke-width="2" fill="rgba(139, 92, 246, 0.2)" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 4px rgba(139, 92, 246, 0.4));">
                <path d="M6 3h12l4 6-10 12L2 9z"></path>
                <path d="M2 9h20"></path>
                <path d="M12 21V9"></path>
                <path d="M6 3l6 6"></path>
                <path d="M18 3l-6 6"></path>
              </svg>
              <span class="engine-name">{{ t('appearance.gems.purple') }} (Amethyst)</span>
            </div>
          </label>
          <label class="engine-option" :class="{ active: settings.highlightStyle === 'pink' }">
            <input type="radio" v-model="settings.highlightStyle" value="pink" @change="saveSettings" />
            <div class="engine-info" style="display: flex; align-items: center; gap: 8px;">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="#FF758F" stroke-width="2" fill="rgba(255, 117, 143, 0.2)" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 4px rgba(255, 117, 143, 0.4));">
                <path d="M6 3h12l4 6-10 12L2 9z"></path>
                <path d="M2 9h20"></path>
                <path d="M12 21V9"></path>
                <path d="M6 3l6 6"></path>
                <path d="M18 3l-6 6"></path>
              </svg>
              <span class="engine-name">{{ t('appearance.gems.ruby') }} (Ruby)</span>
            </div>
          </label>
          <label class="engine-option" :class="{ active: settings.highlightStyle === 'yellow' }">
            <input type="radio" v-model="settings.highlightStyle" value="yellow" @change="saveSettings" />
            <div class="engine-info" style="display: flex; align-items: center; gap: 8px;">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="#eab308" stroke-width="2" fill="rgba(234, 179, 8, 0.2)" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 4px rgba(234, 179, 8, 0.4));">
                <path d="M6 3h12l4 6-10 12L2 9z"></path>
                <path d="M2 9h20"></path>
                <path d="M12 21V9"></path>
                <path d="M6 3l6 6"></path>
                <path d="M18 3l-6 6"></path>
              </svg>
              <span class="engine-name">{{ t('appearance.gems.yellow') }} (Citrine)</span>
            </div>
          </label>
          <label class="engine-option" :class="{ active: settings.highlightStyle === 'blue' }">
            <input type="radio" v-model="settings.highlightStyle" value="blue" @change="saveSettings" />
            <div class="engine-info" style="display: flex; align-items: center; gap: 8px;">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="#3b82f6" stroke-width="2" fill="rgba(59, 130, 246, 0.2)" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 4px rgba(59, 130, 246, 0.4));">
                <path d="M6 3h12l4 6-10 12L2 9z"></path>
                <path d="M2 9h20"></path>
                <path d="M12 21V9"></path>
                <path d="M6 3l6 6"></path>
                <path d="M18 3l-6 6"></path>
              </svg>
              <span class="engine-name">{{ t('appearance.gems.blue') }} (Sapphire)</span>
            </div>
          </label>
        </div>
      </div>
      <div class="row" style="margin-top: 20px;">
        <div class="input-group half">
          <label>{{ t('appearance.tooltip_theme_label') }}</label>
          <CustomSelect
            v-model="settings.tooltipTheme"
            :options="tooltipThemeOptions"
            @change="saveSettings"
          />
        </div>
        <div class="input-group half">
          <label>{{ t('appearance.lookup_display_label') }}</label>
          <CustomSelect
            v-model="settings.lookupDisplayStyle"
            :options="[
              { label: t('appearance.lookup_display_tooltip'), value: 'tooltip' },
              { label: t('appearance.lookup_display_ruby'), value: 'ruby' }
            ]"
            @update:modelValue="saveSettings"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { inject, computed } from 'vue';
import CustomSelect from './CustomSelect.vue';

const settings = inject<any>('settings');
const saveSettings = inject<() => void>('saveSettings')!;
const t = inject<any>('t')!;

const tooltipThemeOptions = computed(() => [
  { label: t('appearance.tooltip_theme.system'), value: 'system' },
  { label: t('appearance.tooltip_theme.light'), value: 'light' },
  { label: t('appearance.tooltip_theme.dark'), value: 'dark' },
  { label: t('appearance.tooltip_theme.beige'), value: 'beige' },
  { label: t('appearance.tooltip_theme.glass'), value: 'glass' },
]);
</script>
