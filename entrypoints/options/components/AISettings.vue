<template>
  <section class="card" id="api-settings">
    <div class="card-header">
      <h2>{{ t('llm.title') }}</h2>
      <span class="section-tag">{{ t('llm.tag') }}</span>
    </div>
    
    <div class="card-body">
      <div class="input-group">
        <label>{{ t('llm.api_key') }}</label>
        <div class="password-wrapper">
          <input 
            :type="showApiKey ? 'text' : 'password'" 
            v-model="settings.apiKey" 
            :placeholder="t('llm.api_key_placeholder')" 
            @change="saveSettings"
          />
          <button type="button" class="toggle-password-btn" @click="showApiKey = !showApiKey" :title="showApiKey ? t('llm.hide_key') : t('llm.show_key')">
            <svg v-if="!showApiKey" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
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
      
      <div class="input-group">
        <label>{{ t('llm.endpoint') }}</label>
        <input 
          type="text" 
          v-model="settings.apiEndpoint" 
          placeholder="https://api.openai.com/v1/chat/completions" 
          @change="saveSettings"
        />
      </div>

      <div class="row">
        <div class="input-group half">
          <label>{{ t('llm.model') }}</label>
          <input 
            type="text" 
            v-model="settings.model" 
            placeholder="gpt-4o-mini" 
            @change="saveSettings"
          />
        </div>
        <div class="half action-group">
          <button 
            class="btn btn-action" 
            @click="testApi" 
            :disabled="isTestingApi || !settings.apiKey"
          >
            {{ isTestingApi ? t('llm.testing_btn') : t('llm.test_btn') }}
          </button>
        </div>
      </div>

      <div v-if="testResult" class="test-feedback" :class="testResult.success ? 'success' : 'error'">
        {{ testResult.success ? t('llm.test_success_pre') + testResult.latency + t('llm.test_success_suf') : t('llm.test_fail_pre') + testResult.error + t('llm.test_fail_suf') }}
      </div>
      <p class="description-hint" style="margin-top: 16px; margin-bottom: 0;">
        {{ t('llm.long_press_note') }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { inject, ref } from 'vue';

const settings = inject<any>('settings');
const saveSettings = inject<() => void>('saveSettings')!;
const t = inject<any>('t')!;

const showApiKey = ref(false);
const isTestingApi = ref(false);
const testResult = ref<{ success: boolean; latency?: number; error?: string } | null>(null);

async function testApi() {
  isTestingApi.value = true;
  testResult.value = null;

  try {
    const startTime = Date.now();
    const resp = await browser.runtime.sendMessage({
      type: 'ASK_AI',
      question: 'Hello, this is a test. Answer with one word: OK.',
      word: 'test',
      sentence: 'test',
      translation: '测试'
    });

    if (resp?.success && resp.answer) {
      testResult.value = {
        success: true,
        latency: Date.now() - startTime
      };
    } else {
      testResult.value = {
        success: false,
        error: resp?.error || '无法建立握手，请检查端点连通性'
      };
    }
  } catch (err: any) {
    testResult.value = {
      success: false,
      error: err.message || '底层请求异常，网络不可达'
    };
  } finally {
    isTestingApi.value = false;
  }
}
</script>
