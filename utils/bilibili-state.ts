/**
 * Fullscreen state detection utility for Rubi UI overlays.
 * Ensures floating badges position correctly inside HTML5 fullscreen elements.
 */
export const checkFullscreen = (): boolean => {
  if (typeof document === 'undefined') return false;
  
  // 1. Standard HTML5 fullscreen
  if (document.fullscreenElement) return true;
  
  // 2. Bilibili/YouTube video player web fullscreen class names
  const playerContainer = document.querySelector('.bpx-player-container, .bili-video-player, .html5-video-player');
  if (playerContainer) {
    if (
      playerContainer.classList.contains('bpx-state-web-fullscreen') ||
      playerContainer.classList.contains('bpx-state-fullscreen') ||
      playerContainer.classList.contains('player-fullscreen') ||
      playerContainer.classList.contains('webfullscreen')
    ) {
      return true;
    }
  }
  
  // 3. Fallback sizing check
  if (playerContainer) {
    const rect = playerContainer.getBoundingClientRect();
    if (Math.abs(rect.width - window.innerWidth) < 5 && Math.abs(rect.height - window.innerHeight) < 5) {
      return true;
    }
  }
  
  return false;
};
