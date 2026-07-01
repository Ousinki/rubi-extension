<template>
  <div class="rubi-theme-provider">
    <div class="rubi-page-wrapper">
      <div class="rubi-options-app">
        <!-- Header -->
      <header class="rubi-header">
        <div class="logo-area">
          <img src="/icon/action-128.png" alt="Rubi Logo" class="app-logo" />
          <div class="logo-text">
            <h1>Rubi Settings</h1>
            <p class="subtitle">{{ t('header.subtitle') }}</p>
          </div>
        </div>
        <div class="header-controls">
          <!-- Theme Switcher -->
          <button class="theme-toggle-btn" @click="toggleTheme" :title="t('header.theme_toggle')">
            <svg v-if="theme === 'dark'" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            <svg v-else viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
            <span class="theme-label">{{ theme === 'dark' ? t('header.theme_light') : t('header.theme_dark') }}</span>
          </button>

          <!-- UI Language Selector -->
          <div class="lang-selector">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
            <CustomSelect
              v-model="settings.uiLanguage"
              :options="langOptions"
              compact
              @change="saveSettings"
            />
          </div>
        </div>
      </header>

      <div class="layout-grid">
        <!-- Left Column: Core settings -->
        <main class="settings-column">
          <!-- UI Themes -->
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
            </div>
          </section>
          
          <!-- Core Translation Options -->
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

              <p class="dict-attribution">
                {{ t('lookup.dict_source') }}
                <a href="https://www.edrdg.org/jmdict/j_jmdict.html" target="_blank" rel="noopener">JMdict</a>
                {{ t('lookup.dict_org') }}
                <a href="https://www.edrdg.org/edrdg/licence.html" target="_blank" rel="noopener">CC BY-SA 4.0</a> {{ t('lookup.dict_license') }}
                {{ t('lookup.dict_count') }}
              </p>
            </div>
          </section>
          
          <!-- AI Translation Configuration -->
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

          <!-- Japanese Rendering Preferences -->
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
                      :value="recordingShortcutFor === 'furiganaShortcut' ? '输入快捷键...' : formatShortcut(settings.furiganaShortcut)"
                      @focus="recordingShortcutFor = 'furiganaShortcut'"
                      @blur="recordingShortcutFor = null"
                      @keydown.prevent="recordShortcut($event, 'furiganaShortcut')"
                      title="Click and press keys to set shortcut"
                      :class="{ 'is-recording': recordingShortcutFor === 'furiganaShortcut' }"
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

          <!-- Paragraph Translation Preferences -->
          <section class="card" id="paragraph-translation">
            <div class="card-header">
              <h2>{{ t('paragraph.title') }}</h2>
              <span class="section-tag">{{ t('paragraph.tag') }}</span>
            </div>
            
            <div class="card-body">
              <div class="toggle-row">
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
              <div v-if="settings.inlineParagraphTrigger === 'custom'" class="input-group" style="margin-top: 16px; border-top: 1px solid var(--border-color); padding-top: 16px;">
                <label>{{ t('paragraph.shortcut_label') }}</label>
                <input 
                  type="text" 
                  class="shortcut-input" 
                  readonly
                  :value="recordingShortcutFor === 'inlineParagraphCustomShortcut' ? t('paragraph.recording') : formatShortcut(settings.inlineParagraphCustomShortcut)"
                  @focus="recordingShortcutFor = 'inlineParagraphCustomShortcut'"
                  @blur="recordingShortcutFor = null"
                  @keydown.prevent="recordShortcut($event, 'inlineParagraphCustomShortcut')"
                  title="Click and press keys to set shortcut"
                  :class="{ 'is-recording': recordingShortcutFor === 'inlineParagraphCustomShortcut' }"
                  style="width: 100%; max-width: 300px; text-align: left; padding: 8px 12px; font-family: monospace;"
                />
              </div>

              <!-- Direct mode warning hint -->
              <div v-if="settings.inlineParagraphTrigger === 'direct'" class="direct-mode-hint" style="margin-top: 16px; font-size: 13px; color: #eab308; background: rgba(234, 179, 8, 0.08); padding: 12px; border-radius: 8px; border: 1px solid rgba(234, 179, 8, 0.2);">
                {{ t('paragraph.direct_hint') }}
              </div>
            </div>
          </section>

          <!-- Speech Synthesis Preferences -->
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

              <!-- Web Speech Voice Selection (only shown for webspeech engine) -->
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



        </main>

        <!-- Right Column: Navigation TOC -->
        <aside class="info-column">
          <div class="sidebar-block doc-panel" style="position: sticky; top: 24px;">
            <h2>{{ t('nav.title') }}</h2>
            <ul class="doc-list">
              <li>
                <a href="#appearance" class="doc-label" :class="{ active: activeSection === 'appearance' }">{{ t('appearance.title') }}</a>
              </li>
              <li>
                <a href="#lookup-panel" class="doc-label" :class="{ active: activeSection === 'lookup-panel' }">{{ t('lookup.title') }}</a>
              </li>
              <li>
                <a href="#api-settings" class="doc-label" :class="{ active: activeSection === 'api-settings' }">{{ t('llm.title') }}</a>
              </li>
              <li>
                <a href="#furigana-preferences" class="doc-label" :class="{ active: activeSection === 'furigana-preferences' }">{{ t('furigana.title') }}</a>
              </li>
              <li>
                <a href="#paragraph-translation" class="doc-label" :class="{ active: activeSection === 'paragraph-translation' }">{{ t('paragraph.title') }}</a>
              </li>
              <li>
                <a href="#speech-engine" class="doc-label" :class="{ active: activeSection === 'speech-engine' }">{{ t('tts.title') }}</a>
              </li>
            </ul>
          </div>
        </aside>
      </div>

      <footer class="page-footer">
        <p class="dict-attribution" style="text-align: center; margin: 0; padding: 0; border: none;">
          {{ t('lookup.inspiration_pre') }}
          <a href="https://github.com/birchill/10ten-ja-reader" target="_blank" rel="noopener">10ten Japanese Reader</a>
          {{ t('lookup.inspiration_suf') }}
        </p>
      </footer>
    </div>
  </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, watch, computed } from 'vue';
import { useI18n } from '@/utils/i18n-plugin';
import type { SupportedLocale } from '@/utils/i18n-plugin';
import { settingsStorage, DEFAULT_SETTINGS } from '@/utils/storage';
import type { RubiSettings } from '@/utils/storage';
import { speakText } from '@/utils/tts';
import CustomSelect from './components/CustomSelect.vue';

const settings = reactive<RubiSettings>({ ...DEFAULT_SETTINGS });
const { t, locale } = useI18n();

watch(() => settings.uiLanguage, (newLang) => {
  locale.value = newLang as SupportedLocale;
});
const jaVoices = ref<SpeechSynthesisVoice[]>([]);
const isTestingApi = ref(false);
const showApiKey = ref(false);
const testResult = ref<{ success: boolean; latency?: number; error?: string } | null>(null);
const isSpeaking = ref(false);
const ttsWarning = ref<string | null>(null);
const showSavedStatus = ref(false);

const langOptions = computed(() => [
  { value: 'zh-CN', label: t('lang.zh_cn') },
  { value: 'zh-TW', label: t('lang.zh_tw') },
  { value: 'en', label: t('lang.en') },
  { value: 'ja', label: t('lang.ja') },
  { value: 'ko', label: t('lang.ko') },
]);

const edgeVoiceOptions = computed(() => [
  { value: 'ja-JP-NanamiNeural', label: t('tts.edge_voice_nanami') },
  { value: 'ja-JP-KeitaNeural', label: t('tts.edge_voice_keita') },
]);

const voicevoxSpeakerOptions = computed(() => [
  { value: 2, label: '四国めたん (Normal - 甘め)' },
  { value: 0, label: '四国めたん (あまあま)' },
  { value: 3, label: 'ずんだもん (Normal - 活発)' },
  { value: 1, label: 'ずんだもん (あまあま)' },
  { value: 8, label: '春日部つむぎ (Normal - 元気)' },
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

const inlineParagraphTriggerOptions = computed(() => [
  { value: 'none', label: t('paragraph.trigger_none') },
  { value: 'shift', label: t('paragraph.trigger_shift') },
  { value: 'ctrl', label: t('paragraph.trigger_ctrl') },
  { value: 'alt', label: t('paragraph.trigger_alt') },
  { value: 'longpress', label: t('paragraph.trigger_longpress') },
  { value: 'direct', label: t('paragraph.trigger_direct') },
  { value: 'custom', label: t('paragraph.trigger_custom') },
]);

const getInitialTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return 'dark';
  const saved = localStorage.getItem('rubi-theme') as 'light' | 'dark';
  if (saved) return saved;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

const theme = ref<'light' | 'dark'>(getInitialTheme());
const recordingShortcutFor = ref<string | null>(null);

const formatShortcut = (shortcut: string | undefined) => {
  if (!shortcut) return '';
  let formatted = shortcut;
  // Replace modifiers with Mac symbols
  formatted = formatted.replace(/Meta/g, '⌘');
  formatted = formatted.replace(/Shift/g, '⇧');
  formatted = formatted.replace(/Alt/g, '⌥');
  formatted = formatted.replace(/Ctrl/g, '⌃');
  // Remove the '+' for a cleaner look like ⌘⇧F
  formatted = formatted.replace(/\+/g, '');
  
  formatted = formatted.replace('Key', '');
  formatted = formatted.replace('Digit', '');
  return formatted;
};

const recordShortcut = (e: KeyboardEvent, key: 'furiganaShortcut' | 'paragraphShortcut' | 'inlineParagraphCustomShortcut') => {
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

const activeSection = ref<string>('appearance');
onMounted(async () => {
  // Load settings
  const stored = await settingsStorage.getValue();
  Object.assign(settings, stored);
  if (settings.uiLanguage) {
    locale.value = settings.uiLanguage;
  }
  
  applyThemeToDocument();

  // Load voices
  loadVoices();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  // Setup Scrollspy Observer
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          activeSection.value = entry.target.id;
        }
      });
    },
    { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
  );

  const sections = document.querySelectorAll('section.card[id]');
  sections.forEach((section) => {
    observer.observe(section);
  });
});

function toggleTheme() {
  if ((document as any).startViewTransition) {
    (document as any).startViewTransition(() => {
      theme.value = theme.value === 'light' ? 'dark' : 'light';
      localStorage.setItem('rubi-theme', theme.value);
      applyThemeToDocument();
    });
  } else {
    theme.value = theme.value === 'light' ? 'dark' : 'light';
    localStorage.setItem('rubi-theme', theme.value);
    applyThemeToDocument();
  }
}

function applyThemeToDocument() {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    const classesToRemove: string[] = [];
    root.classList.forEach(cls => {
      if (cls.startsWith('theme-') || cls.startsWith('gem-')) {
        classesToRemove.push(cls);
      }
    });
    classesToRemove.forEach(cls => root.classList.remove(cls));
    
    root.classList.add('theme-' + theme.value);
    root.classList.add('gem-' + settings.highlightStyle);
  }
}

function loadVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const list = window.speechSynthesis.getVoices();
  jaVoices.value = list.filter(v => v.lang.startsWith('ja'));
}

async function saveSettings() {
  await settingsStorage.setValue({ ...settings });
  applyThemeToDocument(); // Re-apply theme and gem class if highlightStyle changed
  showSavedStatus.value = true;
  setTimeout(() => {
    showSavedStatus.value = false;
  }, 1500);
}

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

<style>
/* CSS Variable Definitions for Day/Dark themes */
:root.theme-light {
  color-scheme: light;
  --bg-primary: #f6f6f9;
  --bg-secondary: #ffffff;
  --bg-card: #ffffff;
  --border-subtle: #e2e2ea;
  --border-strong: #c0c0cf;
  --text-primary: #121316;
  --text-secondary: #5a5d6a;
  --text-muted: #8e92a4;
  --accent-base: #5c35b4;
  --accent-light: #ece7f8;
  --accent-transparent: rgba(92, 53, 180, 0.12);
  --btn-bg: #5c35b4;
  --btn-hover: #4e299c;
  --btn-text: #ffffff;
  --input-bg: #f9f9fb;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03);
  --shadow-md: 0 4px 18px rgba(0, 0, 0, 0.04);
}

:root.theme-dark {
  color-scheme: dark;
  --bg-primary: #0d0e12;
  --bg-secondary: #14161d;
  --bg-card: #14161d;
  --border-subtle: #242731;
  --border-strong: #363b49;
  --text-primary: #eaecef;
  --text-secondary: #9aa2b1;
  --text-muted: #5e6675;
  --accent-base: #a78bfa;
  --accent-light: #211c34;
  --accent-transparent: rgba(167, 139, 250, 0.15);
  --btn-bg: #3d355b;
  --btn-hover: #4b4170;
  --btn-text: #f3f4f6;
  --input-bg: #090a0d;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.5);
  --shadow-md: 0 10px 30px rgba(0,0,0,0.3);
}

/* ═══ Gem Accent Color Themes ═══ */
/* Purple Amethyst (default — no overrides needed) */

/* Pink Ruby */
:root.gem-pink.theme-light {
  --accent-base: #d6336c;
  --accent-light: #fce4ec;
  --accent-transparent: rgba(214, 51, 108, 0.12);
  --btn-bg: #d6336c;
  --btn-hover: #c2255c;
}
:root.gem-pink.theme-dark {
  --accent-base: #f06595;
  --accent-light: #2d1520;
  --accent-transparent: rgba(240, 101, 149, 0.15);
  --btn-bg: #5b2340;
  --btn-hover: #73304f;
}

/* Yellow Citrine */
:root.gem-yellow.theme-light {
  --accent-base: #b8860b;
  --accent-light: #fef9e7;
  --accent-transparent: rgba(184, 134, 11, 0.12);
  --btn-bg: #b8860b;
  --btn-hover: #9a7209;
}
:root.gem-yellow.theme-dark {
  --accent-base: #facc15;
  --accent-light: #2a2510;
  --accent-transparent: rgba(250, 204, 21, 0.15);
  --btn-bg: #5c4d10;
  --btn-hover: #74610e;
}

/* Blue Sapphire */
:root.gem-blue.theme-light {
  --accent-base: #2563eb;
  --accent-light: #e0ecff;
  --accent-transparent: rgba(37, 99, 235, 0.12);
  --btn-bg: #2563eb;
  --btn-hover: #1d4fd8;
}
:root.gem-blue.theme-dark {
  --accent-base: #60a5fa;
  --accent-light: #131c2e;
  --accent-transparent: rgba(96, 165, 250, 0.15);
  --btn-bg: #1e3a5f;
  --btn-hover: #264b77;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* Apply transitions globally to everything under the theme provider,
   including custom components to prevent asynchronous snapping/flashing. */
.rubi-theme-provider,
.rubi-theme-provider * {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
}
</style>

<style scoped>
.rubi-theme-provider {
  min-height: 100vh;
}

.rubi-page-wrapper {
  min-height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
}

.rubi-page-wrapper {
  min-height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
}

.rubi-options-app {
  max-width: 1000px;
  margin: 0 auto;
  padding: 50px 24px;
}

/* Header style - Journal paper standard */
.rubi-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-bottom: 2px solid var(--accent-base);
  padding-bottom: 16px;
  margin-bottom: 40px;
  transition: border-color 0.3s ease;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 16px;
}

.app-logo {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.logo-text h1 {
  font-family: Georgia, "Times New Roman", "Songti SC", serif;
  font-size: 28px;
  font-weight: 400;
  margin: 0;
  color: var(--text-primary);
}

.subtitle {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 6px 0 0 0;
  letter-spacing: 0.8px;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 20px;
}

.theme-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: 1px solid var(--border-strong);
  border-radius: 4px;
  color: var(--text-primary);
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-toggle-btn:hover {
  background-color: var(--accent-light);
  border-color: var(--accent-base);
}

.lang-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
}

.lang-select {
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-primary);
  font-size: 13px;
  padding: 4px 24px 4px 8px;
  border-radius: 4px;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 6px center;
  background-size: 12px;
}

.lang-select:focus {
  border-color: var(--accent-base);
}

/* Academic layout grid */
.layout-grid {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 40px;
}

.settings-column {
  display: flex;
  flex-direction: column;
  gap: 36px;
}

/* Academic styled cards */
.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: 0; /* Boxy journal layout */
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.3s ease, background-color 0.3s ease, border-color 0.3s ease;
}

.page-footer {
  margin-top: 40px;
  padding-top: 20px;
  padding-bottom: 20px;
  border-top: 1px dashed var(--border-subtle);
  text-align: center;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-subtle);
  background-color: var(--bg-primary);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.card-header h2 {
  font-family: Georgia, "Times New Roman", "Songti SC", serif;
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.section-tag {
  font-family: monospace;
  font-size: 11px;
  color: var(--text-muted);
}

.card-body {
  padding: 24px;
}

/* Input Styles */
.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.input-group:last-child,
.row .input-group {
  margin-bottom: 0;
}

.input-group label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: capitalize;
  letter-spacing: 0.5px;
}

.input-group input[type="text"],
.input-group input[type="password"],
.select-field {
  background-color: var(--input-bg);
  border: 1px solid var(--border-strong);
  border-radius: 2px;
  color: var(--text-primary);
  padding: 8px 12px;
  font-size: 13.5px;
  outline: none;
  transition: all 0.2s ease;
}

.input-group input[type="text"]:focus,
.input-group input[type="password"]:focus,
.select-field:focus {
  border-color: var(--accent-base);
  box-shadow: 0 0 0 3px var(--accent-transparent);
}

.password-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-wrapper input {
  width: 100%;
  padding-right: 36px;
}

.toggle-password-btn {
  position: absolute;
  right: 6px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.toggle-password-btn:hover {
  color: var(--text-primary);
  background-color: var(--hover-bg);
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: end;
}

.half {
  min-width: 0;
}

.action-group {
  display: flex;
  align-items: flex-end;
}

/* Switches & Knobs */
.toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-subtle);
  padding-bottom: 18px;
  margin-bottom: 20px;
}

.shortcut-input {
  margin-left: 8px;
  width: 68px;
  padding: 3px 6px;
  font-size: 13px;
  letter-spacing: 1.5px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-strong);
  border-radius: 4px;
  color: var(--text-secondary);
  vertical-align: middle;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.shortcut-input.is-recording,
.shortcut-input:focus {
  outline: none;
  width: 90px;
  border-color: var(--accent-base);
  box-shadow: 0 0 0 2px var(--accent-transparent);
  color: var(--accent-base);
}

.toggle-desc h3 {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.toggle-desc p {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 4px 0 0 0;
}

.toggle-btn {
  width: 38px;
  height: 20px;
  background-color: var(--border-strong);
  border: none;
  border-radius: 10px;
  position: relative;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.toggle-btn.active {
  background-color: var(--accent-base);
}

.toggle-dot {
  width: 14px;
  height: 14px;
  background-color: #ffffff;
  border-radius: 50%;
  position: absolute;
  top: 3px;
  left: 3px;
  transition: transform 0.2s ease;
}

.toggle-btn.active .toggle-dot {
  transform: translateX(18px);
}

/* Radio groups - academic tabs style */
.radio-group-bar {
  display: flex;
  border: 1px solid var(--border-strong);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 4px;
}

.radio-label-item {
  flex: 1;
  text-align: center;
  position: relative;
  cursor: pointer;
  padding: 8px 0;
  background: var(--bg-secondary);
  transition: all 0.2s ease;
}

.radio-label-item:not(:last-child) {
  border-right: 1px solid var(--border-strong);
}

.radio-label-item input {
  position: absolute;
  opacity: 0;
}

.radio-text {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-secondary);
}

.radio-label-item.selected {
  background-color: var(--accent-light);
}

.radio-label-item.selected .radio-text {
  color: var(--accent-base);
  font-weight: 600;
}

/* Professional range slider */
.range-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  background: var(--border-strong);
  outline: none;
  margin-top: 12px;
}

.range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent-base);
  cursor: pointer;
  transition: transform 0.1s ease;
}

/* Action Buttons */
.btn {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  border-radius: 2px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
  border: 1px solid var(--border-strong);
}

.btn-action {
  background-color: var(--btn-bg);
  color: var(--btn-text);
  border-color: var(--btn-bg);
  padding: 8px 16px;
}

.btn-action:hover:not(:disabled) {
  background-color: var(--btn-hover);
  border-color: var(--btn-hover);
}

.btn-action.secondary {
  background-color: transparent;
  color: var(--text-primary);
  border-color: var(--border-strong);
}

.btn-action.secondary:hover:not(:disabled) {
  background-color: var(--bg-primary);
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* TTS Engine Selector */
.engine-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 6px;
}

.engine-option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.18s ease;
  background: var(--input-bg);
}

.engine-option:hover {
  border-color: var(--accent-base);
  background: var(--accent-light);
}

.engine-option.active {
  border-color: var(--accent-base);
  background: var(--accent-light);
  box-shadow: 0 0 0 2px rgba(92, 53, 180, 0.12);
}

.engine-option input[type="radio"] {
  margin-top: 3px;
  accent-color: var(--accent-base);
  flex-shrink: 0;
}

.engine-inf.row {
  display: flex;
  gap: 1.5rem;
}

.input-group.half {
  flex: 1;
}

.input-group.third {
  flex: 1;
}

.engine-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.engine-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.engine-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 20px;
  letter-spacing: 0.03em;
}

.engine-badge.best {
  background: linear-gradient(135deg, #6d28d9, #8b5cf6);
  color: #fff;
}

.engine-badge.free {
  background: linear-gradient(135deg, #0ea5e9, #38bdf8);
  color: #fff;
}

.engine-badge.local {
  background: var(--border-strong);
  color: var(--text-secondary);
}

.engine-desc {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.4;
}

/* Dictionary source attribution */
.dict-attribution {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--border-subtle);
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.6;
}

.dict-attribution a {
  color: var(--accent-base);
  text-decoration: none;
  opacity: 0.8;
}

.dict-attribution a:hover {
  opacity: 1;
  text-decoration: underline;
}

.action-footer {
  margin-top: 20px;
  border-top: 1px solid var(--border-subtle);
  padding-top: 16px;
}


/* Test results */
.test-feedback {
  margin-top: 12px;
  padding: 8px 12px;
  font-size: 12px;
  line-height: 1.5;
  border-left: 2px solid;
}

.test-feedback.success {
  background-color: rgba(16, 185, 129, 0.05);
  color: #10b981;
  border-color: #10b981;
}

.test-feedback.error {
  background-color: rgba(239, 68, 68, 0.05);
  color: #ef4444;
  border-color: #ef4444;
}

.description-hint {
  font-size: 12px;
  color: var(--text-muted);
  margin: 6px 0 0 0;
  line-height: 1.4;
}

/* Aside panel rules */
.info-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.sidebar-block {
  border-top: 2px solid var(--text-primary);
  padding-top: 16px;
}

.sidebar-block h2 {
  font-family: Georgia, "Times New Roman", "Songti SC", serif;
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: var(--text-primary);
  text-transform: capitalize;
}

.doc-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.doc-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  padding: 10px 14px;
  border-radius: 6px;
  text-decoration: none;
  transition: all 0.2s ease;
}

.doc-label:hover {
  color: var(--text-primary);
  background-color: var(--hover-bg, rgba(0, 0, 0, 0.05));
}

.doc-label.active {
  color: var(--accent-base);
  background-color: var(--accent-light);
  font-weight: 600;
}

.doc-desc {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-primary);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #10b981;
}

.status-details {
  font-size: 11.5px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 8px 0 0 0;
}
</style>
