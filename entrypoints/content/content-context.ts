/**
 * Shared content script context.
 *
 * Uses ES module live bindings — when updateContentContext() reassigns
 * these variables, every importer immediately sees the new value.
 */

export let currentSettings: any = null;
export let isEnabled = true;

export function updateContentContext(settings: any, enabled: boolean): void {
  currentSettings = settings;
  isEnabled = enabled;
}
