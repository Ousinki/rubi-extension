/**
 * useOptions composable
 *
 * Provides fully typed access to shared Options page state
 * injected by App.vue. Use this in every settings sub-component
 * instead of raw `inject<any>('settings')`.
 */

import { inject } from 'vue';
import type { RubiSettings } from '@/utils/storage';

export function useOptions() {
  const settings = inject<RubiSettings>('settings');
  const saveSettings = inject<() => Promise<void>>('saveSettings');
  const t = inject<(key: string, lang?: string) => string>('t');

  if (!settings || !saveSettings || !t) {
    throw new Error('[Rubi] useOptions() must be called inside an Options sub-component tree provided by App.vue');
  }

  return { settings, saveSettings, t };
}
