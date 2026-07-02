/**
 * Rubi Style Injector
 *
 * Manages the injection of global host-page styles for:
 *   - CSS Custom Highlight API (hover word highlight)
 *   - Full-page injected Furigana (Ruby) annotations
 *   - Paragraph translation loading states
 */

export const HIGHLIGHT_THEMES: Record<string, { main: string; dark: string; bg: string }> = {
  purple: { main: '#8b5cf6', dark: '#a78bfa', bg: 'rgba(139, 92, 246, 0.28)' },
  pink:   { main: '#FF758F', dark: '#FFB3C1', bg: 'rgba(255, 117, 143, 0.28)' },
  yellow: { main: '#eab308', dark: '#fde047', bg: 'rgba(234, 179, 8, 0.28)' },
  blue:   { main: '#3b82f6', dark: '#60a5fa', bg: 'rgba(59, 130, 246, 0.28)' },
};

export function injectHostStyles(settings: any = {}): void {
  let style = document.getElementById('rubi-host-styles') as HTMLStyleElement;
  if (!style) {
    style = document.createElement('style');
    style.id = 'rubi-host-styles';
    (document.head || document.documentElement).appendChild(style);
  }

  const styleKey = settings.highlightStyle || 'purple';
  const furiganaColor = settings.furiganaColor || 'theme';
  const furiganaFont = settings.furiganaFont || 'system';
  const furiganaOpacity = settings.furiganaOpacity || '0.8';

  const theme = HIGHLIGHT_THEMES[styleKey as keyof typeof HIGHLIGHT_THEMES] || HIGHLIGHT_THEMES.purple;

  let rtColor = `${theme.main} !important`;
  let rtDarkColor = `${theme.dark} !important`;

  if (furiganaColor === 'gray') {
    rtColor = '#6b7280 !important';
    rtDarkColor = '#9ca3af !important';
  } else if (furiganaColor === 'text') {
    rtColor = 'inherit !important';
    rtDarkColor = 'inherit !important';
  }

  let fontStyle = '';
  if (furiganaFont === 'sans-serif') {
    fontStyle = 'font-family: sans-serif !important;';
  } else if (furiganaFont === 'serif') {
    fontStyle = 'font-family: serif !important;';
  } else if (furiganaFont === 'monospace') {
    fontStyle = 'font-family: monospace !important;';
  } else {
    fontStyle = 'font-family: system-ui, -apple-system, sans-serif !important;';
  }

  style.textContent = `
    rubi-ui-root {
      --rubi-highlight-main: ${theme.main};
      --rubi-highlight-dark: ${theme.dark};
      --rubi-highlight-bg: ${theme.bg};
    }

    /* CSS Custom Highlight API styling */
    ::highlight(rubi-hover-highlight) {
      background-color: ${theme.bg} !important;
      color: inherit !important;
      text-decoration: underline double ${theme.main} 2px !important;
      text-underline-offset: 3px !important;
    }
    
    #rubi-error-toast {
      font-family: system-ui, -apple-system, sans-serif;
    }

    /* Full-page injected Furigana (Ruby) styling to prevent overlap */
    ruby.rubi-injected-ruby {
      ruby-position: over;
      ruby-align: center;
      line-height: 2.3 !important;
    }
    
    ruby.rubi-injected-ruby rt {
      font-size: 0.52em !important;
      font-weight: 500 !important;
      color: ${rtColor};
      opacity: ${furiganaOpacity} !important;
      user-select: none !important;
      padding: 0 0.12em !important;
      ${fontStyle}
    }
    
    @media (prefers-color-scheme: dark) {
      ruby.rubi-injected-ruby rt {
        color: ${rtDarkColor};
      }
    }

    .rubi-paragraph-loading {
      color: #999 !important;
      transition: color 0.3s ease;
    }
    .rubi-paragraph-loading > :not(.rubi-inline-spinner) {
      opacity: 0.5 !important;
      transition: opacity 0.3s ease;
    }
    .rubi-inline-spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(150, 150, 150, 0.3);
      border-top-color: #888;
      border-radius: 50%;
      animation: rubi-spin 0.8s linear infinite;
      margin-left: 8px;
      vertical-align: middle;
    }
    @keyframes rubi-spin {
      to { transform: rotate(360deg); }
    }

    font.rubi-paragraph-translation {
      display: inline;
      margin: 0;
      padding: 0;
      background: transparent;
      white-space: pre-wrap;
    }
    font.rubi-paragraph-translation-inner {
      opacity: 0.65;
      animation: rubi-para-fade-in 0.3s ease forwards;
    }
    font.rubi-paragraph-translation-inner.rubi-loading {
      animation: rubi-para-fade-in 0.3s ease forwards, rubi-para-pulse 1.5s ease-in-out infinite;
    }
    font.rubi-paragraph-translation.rubi-para-trans-exit {
      animation: rubi-para-fade-out 0.2s ease forwards;
    }
    @keyframes rubi-para-fade-in {
      from { opacity: 0; }
      to { opacity: 0.65; }
    }
    @keyframes rubi-para-fade-out {
      from { opacity: 0.65; }
      to { opacity: 0; }
    }
    @keyframes rubi-para-pulse {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 0.65; }
    }
  `;
}
