/**
 * Shared content script context.
 *
 * Uses ES module live bindings — when updateContentContext() reassigns
 * these variables, every importer immediately sees the new value.
 */

import type { RubiSettings } from '@/utils/storage';

export let currentSettings: RubiSettings | null = null;
export let isEnabled = true;

export function updateContentContext(settings: RubiSettings, enabled: boolean): void {
  currentSettings = settings;
  isEnabled = enabled;
}
