<template>
  <section class="card" id="lookup-panel">
    <div class="card-header">
      <h2>{{ t('lookup.title') }}</h2>
      <span class="section-tag">{{ t('lookup.tag') }}</span>
    </div>
    
    <div class="card-body">
      <div class="row">
        <div class="input-group half">
          <label>{{ t('lookup.mt_label') }}</label>
          <CustomSelect
            v-model="settings.translationEngine"
            :options="translationEngineOptions"
            @change="saveSettings"
          />
        </div>
        <div class="input-group half">
          <label>{{ t('lookup.position_label') }}</label>
          <CustomSelect
            v-model="settings.translationPosition"
            :options="translationPositionOptions"
            @change="saveSettings"
          />
        </div>
      </div>

      <div class="row" style="margin-top: 20px;">
        <div class="input-group half">
          <label>{{ t('lookup.trigger_label') }}</label>
          <CustomSelect
            v-model="settings.translationTrigger"
            :options="translationTriggerOptions"
            @change="saveSettings"
          />
        </div>
      </div>

      <!-- DeepL API Key Field -->
      <template v-if="settings.translationEngine === 'deepl'">
        <div class="row" style="margin-top: 20px;">
          <div class="input-group half">
            <label>{{ t('lookup.deepl_api_key_label') }}</label>
            <div class="password-wrapper">
              <input 
                :type="showDeeplApiKey ? 'text' : 'password'" 
                v-model="settings.deeplApiKey" 
                :placeholder="t('lookup.deepl_api_key_placeholder')" 
                @change="saveSettings"
              />
              <button type="button" class="toggle-password-btn" @click="showDeeplApiKey = !showDeeplApiKey" :title="showDeeplApiKey ? t('llm.hide_key') : t('llm.show_key')">
                <svg v-if="!showDeeplApiKey" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <svg v-else viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              </button>
            </div>
          </div>
          <div class="half action-group">
            <button 
              type="button"
              class="btn btn-action" 
              @click="testDeeplApi" 
              :disabled="isTestingDeepl"
              style="min-width: 120px;"
            >
              {{ isTestingDeepl ? t('lookup.deepl_testing_btn') : t('lookup.deepl_test_btn') }}
            </button>
          </div>
        </div>

        <div style="margin-top: 12px;">
          <p class="input-help" style="font-size: 12.5px; color: var(--text-tertiary); margin: 0; line-height: 1.4;" v-html="t('lookup.deepl_api_key_help')"></p>
        </div>

        <div v-if="deeplTestResult" class="test-feedback" :class="deeplTestResult.success ? 'success' : 'error'" style="margin-top: 12px; width: 100%;">
          {{ deeplTestResult.success ? t('lookup.deepl_test_success_pre') + deeplTestResult.latency + t('lookup.deepl_test_success_suf') : t('lookup.deepl_test_fail_pre') + deeplTestResult.error }}
        </div>
      </template>

      <p class="dict-attribution">
        {{ t('lookup.dict_source') }}
        <a href="https://www.edrdg.org/jmdict/j_jmdict.html" target="_blank" rel="noopener">JMdict</a>
        {{ t('lookup.dict_org') }}
        <a href="https://www.edrdg.org/edrdg/licence.html" target="_blank" rel="noopener">CC BY-SA 4.0</a> {{ t('lookup.dict_license') }}
        {{ t('lookup.dict_count') }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { inject, ref, computed } from 'vue';
import CustomSelect from './CustomSelect.vue';

const settings = inject<any>('settings');
const saveSettings = inject<() => void>('saveSettings')!;
const t = inject<any>('t')!;

const showDeeplApiKey = ref(false);
const isTestingDeepl = ref(false);
const deeplTestResult = ref<{ success: boolean; latency?: number; error?: string } | null>(null);

const translationEngineOptions = computed(() => [
  { label: t('lookup.mt_local'), value: 'none' },
  { label: t('lookup.mt_google'), value: 'google' },
  { label: t('lookup.mt_deepl'), value: 'deepl' },
  { label: t('lookup.mt_bing'), value: 'bing' },
]);

const translationPositionOptions = computed(() => [
  { label: t('lookup.pos_bottom'), value: 'bottom' },
  { label: t('lookup.pos_top'), value: 'top' },
  { label: t('lookup.pos_badge'), value: 'pronounce-badge' },
]);

const translationTriggerOptions = computed(() => [
  { label: t('lookup.trigger_hover'), value: 'hover' },
  { label: t('lookup.trigger_click'), value: 'click' },
  { label: t('lookup.trigger_dblclick'), value: 'dblclick' },
]);

async function testDeeplApi() {
  isTestingDeepl.value = true;
  deeplTestResult.value = null;

  try {
    const startTime = Date.now();
    const resp = await browser.runtime.sendMessage({
      type: 'FETCH_TRANSLATION',
      text: 'こんにちは',
      sourceLang: 'ja',
      targetLang: 'zh-CN',
      engine: 'deepl'
    });

    if (resp && resp.targetText && resp.engine === 'deepl') {
      deeplTestResult.value = {
        success: true,
        latency: Date.now() - startTime
      };
    } else {
      deeplTestResult.value = {
        success: false,
        error: resp?.errorInfo || resp?.error || '接口请求失败，连接已被屏蔽或返回了 429 错误'
      };
    }
  } catch (err: any) {
    deeplTestResult.value = {
      success: false,
      error: err.message || '网络连接异常，无法访问 DeepL'
    };
  } finally {
    isTestingDeepl.value = false;
  }
}
</script>
