<template>
  <section class="card" id="speech-engine">
    <div class="card-header">
      <h2>{{ t('tts.title') }}</h2>
      <span class="section-tag">{{ t('tts.tag') }}</span>
    </div>
    
    <div class="card-body">
      <!-- Engine Selection -->
      <div class="input-group">
        <label>{{ t('tts.engine_label') }}</label>
        <div class="engine-selector">
          <label class="engine-option" :class="{ active: settings.ttsEngine === 'edge' }">
            <input type="radio" v-model="settings.ttsEngine" value="edge" @change="saveSettings" />
            <div class="engine-info">
              <div class="engine-name">
                Microsoft Edge TTS
                <span class="engine-badge best">{{ t('tts.edge_badge') }}</span>
              </div>
              <span class="engine-desc">{{ t('tts.edge_desc') }}</span>
            </div>
          </label>
          <label class="engine-option" :class="{ active: settings.ttsEngine === 'google' }">
            <input type="radio" v-model="settings.ttsEngine" value="google" @change="saveSettings" />
            <div class="engine-info">
              <div class="engine-name">
                Google Translate TTS
                <span class="engine-badge free">{{ t('tts.google_badge') }}</span>
              </div>
              <span class="engine-desc">{{ t('tts.google_desc') }}</span>
            </div>
          </label>
          <label class="engine-option" :class="{ active: settings.ttsEngine === 'voicevox' }">
            <input type="radio" v-model="settings.ttsEngine" value="voicevox" @change="saveSettings" />
            <div class="engine-info">
              <div class="engine-name">
                Voicevox
                <span class="engine-badge best">{{ t('tts.voicevox_badge') }}</span>
              </div>
              <span class="engine-desc">{{ t('tts.voicevox_desc') }}</span>
            </div>
          </label>
          <label class="engine-option" :class="{ active: settings.ttsEngine === 'webspeech' }">
            <input type="radio" v-model="settings.ttsEngine" value="webspeech" @change="saveSettings" />
            <div class="engine-info">
              <div class="engine-name">
                {{ t('tts.webspeech_name') }}
                <span class="engine-badge local">{{ t('tts.webspeech_badge') }}</span>
              </div>
              <span class="engine-desc">{{ t('tts.webspeech_desc') }}</span>
            </div>
          </label>
        </div>
      </div>

      <!-- Edge TTS Voice Selection -->
      <div v-if="settings.ttsEngine === 'edge'" class="input-group">
        <label>{{ t('tts.voice_label') }}</label>
        <CustomSelect
          v-model="settings.edgeVoice"
          :options="edgeVoiceOptions"
          @change="saveSettings"
        />
      </div>

      <!-- Voicevox Configuration -->
      <div v-if="settings.ttsEngine === 'voicevox'" class="input-group">
        <label>{{ t('tts.voicevox_endpoint_label') }}</label>
        <input 
          type="text" 
          v-model="settings.voicevoxEndpoint" 
          :placeholder="t('tts.voicevox_endpoint_placeholder')" 
          @change="saveSettings"
        />
      </div>
      <div v-if="settings.ttsEngine === 'voicevox'" class="input-group">
        <label>{{ t('tts.voicevox_speaker_label') }}</label>
        <CustomSelect
          v-model="settings.voicevoxSpeaker"
          :options="voicevoxSpeakerOptions"
          @change="saveSettings"
        />
      </div>

      <!-- Web Speech Voice Selection -->
      <div v-if="settings.ttsEngine === 'webspeech'" class="input-group">
        <label>{{ t('tts.voice_label') }}</label>
        <CustomSelect
          v-model="settings.ttsVoiceURI"
          :options="webSpeechVoiceOptions"
          @change="saveSettings"
        />
      </div>

      <div class="row">
        <div class="input-group half">
          <label>{{ t('tts.rate_label_pre') + settings.ttsRate + t('tts.rate_label_suf') }}</label>
          <input 
            type="range" 
            min="0.5" 
            max="1.5" 
            step="0.05" 
            v-model.number="settings.ttsRate" 
            @input="saveSettings"
            class="range-slider"
          />
        </div>
        <div class="input-group half">
          <label>{{ t('tts.volume_label_pre') + Math.round(settings.ttsVolume * 100) + t('tts.volume_label_suf') }}</label>
          <input 
            type="range" 
            min="0.0" 
            max="1.0" 
            step="0.05" 
            v-model.number="settings.ttsVolume" 
            @input="saveSettings"
            class="range-slider"
          />
        </div>
      </div>

      <div class="action-footer">
        <button class="btn btn-action secondary" @click="testTTS" :disabled="isSpeaking">
          {{ isSpeaking ? t('tts.testing_btn') : t('tts.test_btn') }}
        </button>
        <div v-if="ttsWarning" class="test-feedback error" style="margin-top: 12px; margin-bottom: 0;">
          {{ ttsWarning }}
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { speakText } from '@/utils/tts';
import CustomSelect from './CustomSelect.vue';

import { useOptions } from '../composables/useOptions';

const { settings, saveSettings, t } = useOptions();

const isSpeaking = ref(false);
const ttsWarning = ref<string | null>(null);
const jaVoices = ref<SpeechSynthesisVoice[]>([]);

const edgeVoiceOptions = computed(() => [
  { value: 'ja-JP-NanamiNeural', label: t('tts.edge_voice_nanami') },
  { value: 'ja-JP-KeitaNeural', label: t('tts.edge_voice_keita') },
]);

const voicevoxSpeakerOptions = computed(() => [
  { value: 2, label: '四国めたん (Normal - 甘め)' },
  { value: 0, label: '四国めたん (あまあま)' },
  { value: 3, label: 'ずんだもん (Normal - 活发)' },
  { value: 1, label: 'ずんだもん (あまあま)' },
  { value: 8, label: '春日部つむぎ (Normal - 元气)' },
  { value: 10, label: '雨晴はう (Normal - 清楚)' },
  { value: 9, label: '波音リツ (Normal)' },
  { value: 11, label: '玄野武宏 (Normal - 男性)' },
  { value: 12, label: '白上虎太郎 (Normal - 少年)' },
  { value: 14, label: '冥鳴ひまり (Normal - 柔らかい)' },
  { value: 20, label: 'もち子さん (Normal - 大人しい)' },
]);

const webSpeechVoiceOptions = computed(() => {
  const badVoices = ['Eddy', 'Flo', 'Grandma', 'Grandpa', 'Reed', 'Rocko', 'Sandy', 'Shelley', 'Zarvox', 'Trinoids', 'Whisper'];
  return [
    { value: 'Google 日本語', label: t('tts.google_voice_default') },
    ...jaVoices.value
      .filter(v => v.name !== 'Google 日本語' && !badVoices.some(bad => v.name.includes(bad)))
      .map(v => ({
        value: v.voiceURI,
        label: v.name + ' ' + (v.localService ? t('tts.voice_local') : t('tts.voice_network')),
      })),
  ];
});

onMounted(() => {
  loadVoices();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
});

function loadVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const list = window.speechSynthesis.getVoices();
  jaVoices.value = list.filter(v => v.lang.startsWith('ja'));
}

function testTTS() {
  isSpeaking.value = true;
  ttsWarning.value = null;
  speakText('日本語を勉強します。', settings, (success, errorMsg, isFallback) => {
    isSpeaking.value = false;
    if (isFallback) {
      ttsWarning.value = settings.uiLanguage === 'zh-CN' || settings.uiLanguage === 'zh-TW' 
        ? '⚠️ 在线语音连接失败 (可能被微软拦截)，已自动为您降级至本地内置发音。' 
        : '⚠️ Online TTS connection failed. Automatically fell back to local web speech.';
    } else if (!success) {
      ttsWarning.value = errorMsg || 'TTS Error';
    }
  });
}
</script>
