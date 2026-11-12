export const AD_SMARTLINK_URL = 'https://asiaso.org/4/a42f0d62a73d3849fff5623bad9ff5dd';
export const POPUNDER_SCRIPT_SRC = 'https://ahuramazda.org/1/9275b71384eefb562fbf9d9fd275cc5e';

/**
 * Triggers the popunder and opens the advertisement tab when a user clicks on a story.
 */
export function triggerStoryAd(): void {
  if (typeof window === 'undefined') return;

  // 1. Ensure popunder script tag exists in <head>
  try {
    const existing = document.head.querySelector(`script[src*="ahuramazda.org"]`);
    if (!existing) {
      const script = document.createElement('script');
      script.setAttribute('data-cfasync', 'false');
      script.src = POPUNDER_SCRIPT_SRC;
      document.head.appendChild(script);
    }
  } catch {
    // ignore
  }

  // 2. Open advertisement smartlink tab in a new window/tab via anchor click
  try {
    const a = document.createElement('a');
    a.href = AD_SMARTLINK_URL;
    a.target = '_blank';
    a.rel = 'noopener';
    a.style.position = 'absolute';
    a.style.top = '-9999px';
    a.style.left = '-9999px';
    a.style.opacity = '0';
    a.style.pointerEvents = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try {
        a.remove();
      } catch {
        // ignore
      }
    }, 150);
  } catch (err) {
    console.warn('Ad tab trigger notice:', err);
  }
}
