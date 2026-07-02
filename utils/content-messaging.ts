export async function safeSendMessage(message: any): Promise<any> {
  try {
    // Proactively check — avoids throwing entirely in most cases
    if (!browser?.runtime?.id) return null;
    return await browser.runtime.sendMessage(message);
  } catch (e: any) {
    if (e?.message?.includes('Extension context invalidated') ||
        e?.message?.includes('Cannot read properties of undefined') ||
        e?.message?.includes('Receiving end does not exist') ||
        e?.message?.includes('Could not establish connection')) {
      // Silent: expected when extension is updated and old context is invalid.
      // The user does not need to see this in the extension error panel.
      return null;
    }
    throw e;
  }
}

let hasShownErrorToast = false;

export function showErrorToast(reason: string) {
  if (typeof document === 'undefined') return;
  if (hasShownErrorToast) return;
  hasShownErrorToast = true;

  let toast = document.getElementById('rubi-error-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'rubi-error-toast';
    Object.assign(toast.style, {
      all: 'initial',
      position: 'fixed',
      top: '24px',
      right: '24px',
      transform: 'translateY(-10px)',
      backgroundColor: '#f0f0f0',
      color: '#333333',
      border: '1px solid #dcdcdc',
      borderLeft: '4px solid #ef4444',
      padding: '12px 20px',
      borderRadius: '0px',
      fontSize: '13px',
      fontWeight: '500',
      zIndex: '2147483647',
      pointerEvents: 'none',
      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      opacity: '0',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      maxWidth: '350px',
      wordBreak: 'break-word',
      whiteSpace: 'pre-wrap'
    });
    document.documentElement.appendChild(toast);
  }
  toast.textContent = `传统翻译不可用（原因：${reason}），已自动切换为 AI 翻译`;
  
  void toast.offsetWidth;
  
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';
  
  if ((toast as any)._timeoutId) {
    clearTimeout((toast as any)._timeoutId);
  }
  
  (toast as any)._timeoutId = setTimeout(() => {
    if (toast) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
    }
  }, 5000);
}
