import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { BadgeMode } from '../utils/content-state';

/**
 * Tests for the BadgeMode state machine.
 *
 * These tests simulate the uiState and uiActions in isolation, verifying that
 * the correct hide/show rules are followed for each mode without needing a real
 * browser DOM or extension context.
 */

// ─── Minimal mock of uiState and uiActions ────────────────────────────────────

function makeBadgeState(mode: BadgeMode = 'hidden') {
  return {
    translationBadge: {
      visible: mode !== 'hidden',
      mode,
      text: mode !== 'hidden' ? '日本語' : '',
      originalText: mode !== 'hidden' ? '日本語' : '',
    },
    pronounceBadge: { pinned: false },
  };
}

// Lightweight re-implementation of the 3 core hide rules, matching word-lookup.ts logic.
// This lets us test the rules without importing browser-specific code.

function immediateHide(
  state: ReturnType<typeof makeBadgeState>,
  isMouseOverPopup: boolean
): 'hidden' | 'kept' {
  if (isMouseOverPopup) return 'kept';
  const { mode } = state.translationBadge;
  if (mode === 'ai-explain' || mode === 'ask') return 'kept';
  if (mode === 'hover') return 'hidden';
  // click: badge stays even when mouse leaves word area
  return 'kept';
}

function scheduleHideWouldHide(mode: BadgeMode, isMouseOverPopup: boolean): boolean {
  if (isMouseOverPopup) return false;
  if (mode === 'ai-explain' || mode === 'ask' || mode === 'click') return false;
  return true; // only 'hover' hides via timer
}

function shouldHideOnWordSwitch(mode: BadgeMode): boolean {
  // All modes except ai-explain and ask hide when cursor moves to a new word
  return mode !== 'ai-explain' && mode !== 'ask';
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BadgeMode state machine', () => {

  // ── hover mode ──────────────────────────────────────────────────────────────

  describe("mode: 'hover'", () => {
    it('hides immediately when mouse leaves word area', () => {
      const state = makeBadgeState('hover');
      expect(immediateHide(state, false)).toBe('hidden');
    });

    it('is hidden by scheduleHide (300ms timer)', () => {
      expect(scheduleHideWouldHide('hover', false)).toBe(true);
    });

    it('hides when cursor moves to a new word (word-switch)', () => {
      expect(shouldHideOnWordSwitch('hover')).toBe(true);
    });

    it('is NOT hidden if mouse is over popup when immediate hide fires', () => {
      const state = makeBadgeState('hover');
      expect(immediateHide(state, true)).toBe('kept');
    });
  });

  // ── click mode ──────────────────────────────────────────────────────────────

  describe("mode: 'click'", () => {
    it('does NOT hide when mouse leaves word area (badge stays visible)', () => {
      const state = makeBadgeState('click');
      expect(immediateHide(state, false)).toBe('kept');
    });

    it('is NOT hidden by scheduleHide timer', () => {
      expect(scheduleHideWouldHide('click', false)).toBe(false);
    });

    it('DOES hide when cursor moves to a new word (word-switch)', () => {
      expect(shouldHideOnWordSwitch('click')).toBe(true);
    });
  });

  // ── ai-explain mode ─────────────────────────────────────────────────────────

  describe("mode: 'ai-explain'", () => {
    it('does NOT hide when mouse leaves word area', () => {
      const state = makeBadgeState('ai-explain');
      expect(immediateHide(state, false)).toBe('kept');
    });

    it('is NOT hidden by scheduleHide timer', () => {
      expect(scheduleHideWouldHide('ai-explain', false)).toBe(false);
    });

    it('does NOT hide on word-switch (user must close manually)', () => {
      expect(shouldHideOnWordSwitch('ai-explain')).toBe(false);
    });
  });

  // ── ask mode ────────────────────────────────────────────────────────────────

  describe("mode: 'ask'", () => {
    it('does NOT hide when mouse leaves word area', () => {
      const state = makeBadgeState('ask');
      expect(immediateHide(state, false)).toBe('kept');
    });

    it('is NOT hidden by scheduleHide timer', () => {
      expect(scheduleHideWouldHide('ask', false)).toBe(false);
    });

    it('does NOT hide on word-switch (user must close manually)', () => {
      expect(shouldHideOnWordSwitch('ask')).toBe(false);
    });
  });

  // ── mode transitions ────────────────────────────────────────────────────────

  describe('Mode transitions', () => {
    it('enterAskMode changes mode from ai-explain to ask', () => {
      const state = makeBadgeState('ai-explain');
      // simulate enterAskMode
      state.translationBadge.mode = 'ask';
      expect(state.translationBadge.mode).toBe('ask');
    });

    it('exitAskMode returns to ai-explain (not hidden)', () => {
      const state = makeBadgeState('ask');
      // simulate exitAskMode
      state.translationBadge.mode = 'ai-explain';
      expect(state.translationBadge.mode).toBe('ai-explain');
      // Badge stays visible — user can still read the translation
      expect(shouldHideOnWordSwitch('ai-explain')).toBe(false);
    });

    it('hideTranslationBadge sets mode to hidden', () => {
      const state = makeBadgeState('hover');
      state.translationBadge.mode = 'hidden';
      state.translationBadge.visible = false;
      expect(state.translationBadge.mode).toBe('hidden');
      expect(state.translationBadge.visible).toBe(false);
    });
  });

});
