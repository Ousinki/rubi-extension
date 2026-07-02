import { createApp } from 'vue';
import ContentApp from '@/components/content/ContentApp.vue';
import { uiActions, uiState } from '@/utils/content-state';
import { settingsStorage } from '@/utils/storage';
import { safeSendMessage } from '@/utils/content-messaging';
import { updateContentContext } from './content/content-context';
import { injectHostStyles } from './content/style-injector';
import {
  setLocalFuriganaState,
  getEffectiveFuriganaState,
  removeRubyAnnotations,
  injectRubyAnnotations
} from './content/furigana-injector';
import { clearHoverHighlight } from './content/word-lookup';
import { setupEventListeners } from './content/event-manager';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  
  async main(ctx) {
    console.log('[Rubi] Content script main initialized.');

    // ─── Global context-invalidation guard ──────────────────────────────────
    // WXT's rawSettingsStorage.watch() registers a chrome.storage.onChanged
    // listener internally. When the extension is updated/reloaded, Chrome can
    // fire that listener BEFORE WXT's ctx cleanup runs. WXT then calls
    // chrome.storage.get() internally — this throws "Extension context
    // invalidated" as an uncaught Promise rejection that bypasses all of our
    // own try-catch wrappers. We intercept it here at the window level to
    // prevent it from polluting the extension error panel.
    const suppressContextErrors = (reason: unknown) => {
      const msg = (reason as any)?.message ?? String(reason);
      return msg.includes('context invalidated') || msg.includes('Extension context');
    };
    window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
      if (suppressContextErrors(e.reason)) e.preventDefault();
    });
    window.addEventListener('error', (e: ErrorEvent) => {
      if (suppressContextErrors(e.message)) e.preventDefault();
    });
    // ────────────────────────────────────────────────────────────────────────

    // Load initial settings
    const currentSettings = await settingsStorage.getValue();
    updateContentContext(currentSettings, currentSettings.enabled);


    // Inject global host styling for CSS Custom Highlight & Ruby
    injectHostStyles(currentSettings);

    // Watch settings changes — register unwatch so it stops on context invalidation
    const unwatch = settingsStorage.watch((newSettings, oldSettings) => {
      if (newSettings) {
        updateContentContext(newSettings, newSettings.enabled);
        injectHostStyles(newSettings);
        
        if (!newSettings.enabled) {
          clearHoverHighlight();
          uiActions.hidePronounceBadge();
          uiActions.hideTranslationBadge();
          setLocalFuriganaState(false);
          removeRubyAnnotations();
        }

        // Handle furigana settings changes
        if (oldSettings) {
          if (newSettings.enableFuriganaRuby !== oldSettings.enableFuriganaRuby) {
            if (!newSettings.enableFuriganaRuby) {
              setLocalFuriganaState(false); // Master switch turned off, force remove
              removeRubyAnnotations();
            }
          } else if (getEffectiveFuriganaState() && newSettings.jlptFilterLevel !== oldSettings.jlptFilterLevel) {
            removeRubyAnnotations();
            injectRubyAnnotations();
          }
        }
      }
    });
    ctx.onInvalidated(unwatch);

    // Setup WXT ShadowRoot UI for Vue floating components
    await setupUi(ctx);

    // Start event listeners
    setupEventListeners();

    // Check dict state and log it
    safeSendMessage({ type: 'GET_DICT_STATE' }).then(res => {
      console.log(`[Rubi] Initial dictionary state: WORDS=${res?.state?.words}, NAMES=${res?.state?.names}, KANJI=${res?.state?.kanji}`);
    });

    // Poll dict download status — cleared automatically when context is invalidated
    const dictPollInterval = setInterval(() => {
      safeSendMessage({ type: 'GET_DICT_STATE' }).then(res => {
        if (res && res.state && (res.state.words === 'updating' || res.state.words === 'init')) {
          console.log('[Rubi] Dictionary is currently downloading in background... Please wait.', res.state);
        }
      });
    }, 5000);
    ctx.onInvalidated(() => clearInterval(dictPollInterval));
  }
});

// ─── Mounting Shadow UI ──────────────────────────────────────
async function setupUi(ctx: any) {
  if (!document.body) {
    requestAnimationFrame(() => setupUi(ctx));
    return;
  }

  try {
    const ui = await createShadowRootUi(ctx, {
      name: 'rubi-ui-root',
      position: 'inline',
      anchor: () => document.body || document.documentElement,
      append: 'last',
      onMount: (container) => {
        const root = container.getRootNode() as ShadowRoot;
        if (root.host) {
          const host = root.host as HTMLElement;
          // CRITICAL: Ensure the host container is absolutely positioned at (0, 0)
          // and passes through all pointer events so it doesn't block page interactions.
          host.style.pointerEvents = 'none';
          host.style.position = 'absolute';
          host.style.top = '0';
          host.style.left = '0';
          host.style.width = '0';
          host.style.height = '0';
          host.style.zIndex = '2147483647';
          host.style.overflow = 'visible';
          host.classList.add('notranslate');
          host.setAttribute('translate', 'no');
        }
        
        const app = createApp(ContentApp);
        app.mount(container);
        return app;
      },
      onRemove: (app) => {
        app?.unmount();
      },
    });
    ui.mount();
  } catch (e) {
    console.error('[Rubi] Failed to setup ShadowRoot UI:', e);
  }
}
