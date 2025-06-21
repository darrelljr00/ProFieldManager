// Mobile-specific fixes and utilities

export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function preventIOSZoom(): void {
  if (isMobileDevice()) {
    // Prevent iOS zoom on input focus
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }
  }
}

export function addMobileTouchSupport(): void {
  if (isMobileDevice()) {
    // Add touch-action CSS to body
    document.body.style.touchAction = 'manipulation';
    
    // Disable webkit tap highlight
    document.body.style.webkitTapHighlightColor = 'transparent';
  }
}

// Initialize mobile fixes
export function initMobileFixes(): void {
  if (typeof window !== 'undefined' && isMobileDevice()) {
    preventIOSZoom();
    addMobileTouchSupport();
  }
}