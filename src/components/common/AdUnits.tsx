import React, { useEffect, useState, useCallback } from 'react';

export const SMART_LINK_URL = 'https://asiaso.org/4/a42f0d62a73d3849fff5623bad9ff5dd';
export const POPUNDER_SCRIPT_SRC = 'https://ahuramazda.org/1/9275b71384eefb562fbf9d9fd275cc5e';
export const SOCIAL_BAR_SCRIPT_SRC = 'https://brijmohan.org/14/c05ac7bd55736617f6c7021ffa7f49da';
export const NATIVE_BANNER_SCRIPT_SRC = 'https://brijmohan.org/21/e308aeebc92b2395c18ed45beda64648';
export const NATIVE_BANNER_CONTAINER_ID = 'container-e308aeebc92b2395c18ed45beda64648';

const SKYSCRAPER_KEY = '05ee890ed059b98d213910f338ece6d0';
const SKYSCRAPER_SRC = 'https://brijmohan.org/22/05ee890ed059b98d213910f338ece6d0';

const BANNER_320_KEY = '2e5f19d0bbe93686082673c139a7b1b1';
const BANNER_320_SRC = 'https://brijmohan.org/22/2e5f19d0bbe93686082673c139a7b1b1';

const SMART_LINK_STORAGE_KEY = 'walkathawa_smartlink_last_ts';

/**
 * Opens the smart link ad via a real anchor click when explicitly triggered
 */
export function openSmartLinkAdNow(): void {
  if (typeof document === 'undefined') return;
  try {
    const now = Date.now();
    sessionStorage.setItem(SMART_LINK_STORAGE_KEY, String(now));
    const a = document.createElement('a');
    a.href = SMART_LINK_URL;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {
    // ignore
  }
}

/**
 * Triggers the smart link on user interaction (throttled per cooldown window)
 */
export function triggerSmartLinkOnInteraction(cooldownMs = 5000): void {
  if (typeof window === 'undefined') return;
  try {
    const lastTs = Number(sessionStorage.getItem(SMART_LINK_STORAGE_KEY) || '0');
    const now = Date.now();
    if (now - lastTs >= cooldownMs) {
      openSmartLinkAdNow();
    }
  } catch {
    // ignore storage errors
  }
}

/**
 * Clears ad network frequency-cap cookies (such as co_9275b71384eefb562fbf9d9fd275cc5e*)
 * WITHOUT deleting window properties or variables, so Ahuramazda's runtime code and event
 * listeners remain active and intact in memory.
 */
export function clearPopunderFrequencyCaps(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  try {
    if (document.cookie) {
      const cookies = document.cookie.split(';');
      for (const rawCookie of cookies) {
        const eqPos = rawCookie.indexOf('=');
        const name = (eqPos > -1 ? rawCookie.slice(0, eqPos) : rawCookie).trim();
        if (
          name &&
          !/^(walkathawa|firebase|ga|_ga|theme)/i.test(name)
        ) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
        }
      }
    }
  } catch {
    // ignore
  }
}

/**
 * Safe reset for ad network frequency limits
 */
export function resetAdNetworkState(): void {
  clearPopunderFrequencyCaps();
}

/**
 * Ensures the official popunder and social bar scripts are loaded in document.head
 * using the exact script URLs without parameter distortion.
 */
export function ensureAdNetworkScripts(): void {
  if (typeof document === 'undefined') return;
  try {
    const existingPopunder = document.querySelector(
      `script[src^="${POPUNDER_SCRIPT_SRC}"]`
    );
    if (!existingPopunder) {
      const pScript = document.createElement('script');
      pScript.setAttribute('data-cfasync', 'false');
      pScript.src = POPUNDER_SCRIPT_SRC;
      document.head.appendChild(pScript);
    }

    const existingSocial = document.querySelector(
      `script[src^="${SOCIAL_BAR_SCRIPT_SRC}"]`
    );
    if (!existingSocial) {
      const sScript = document.createElement('script');
      sScript.setAttribute('data-cfasync', 'false');
      sScript.src = SOCIAL_BAR_SCRIPT_SRC;
      document.head.appendChild(sScript);
    }
  } catch {
    // ignore
  }
}

/**
 * Re-arms popunder frequency caps
 */
export function rearmMainPopunderScript(_slot = 1): void {
  clearPopunderFrequencyCaps();
  ensureAdNetworkScripts();
}

/**
 * Fires frequency cap clear
 */
export function firePopunderWave(_count = 2): void {
  clearPopunderFrequencyCaps();
}

/**
 * Synchronously executes inside a real user touch/scroll/click gesture (1 ad per 5 seconds):
 * Clears ad frequency-cap cookies and triggers simulated mouse/pointer events so Ahuramazda's
 * popunder script (https://ahuramazda.org/1/9275b71384eefb562fbf9d9fd275cc5e) triggers smoothly.
 */
let lastGlobalStoryAdOpenTs = 0;

export function triggerAdOnStoryTouchScroll(cooldownMs = 5000): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  const now = Date.now();
  if (now - lastGlobalStoryAdOpenTs < cooldownMs) {
    return false;
  }
  lastGlobalStoryAdOpenTs = now;

  try {
    // 1. Clear frequency cap cookies so Ahuramazda allows the ad to pop
    clearPopunderFrequencyCaps();

    // 2. Dispatch event during active user gesture so Ahuramazda catches it even on touch-scrolls
    const evTypes = ['mousedown', 'mouseup', 'click'];
    for (const evType of evTypes) {
      const ev = new MouseEvent(evType, { bubbles: true, cancelable: true, view: window });
      document.body.dispatchEvent(ev);
      document.documentElement.dispatchEvent(ev);
    }
  } catch {
    // ignore
  }

  return true;
}

/**
 * Hook for StoryReader:
 * Triggers the Ahuramazda popunder (1 ad every 5 seconds) when user touches the story to scroll or read.
 */
export function useStoryPopunderTrigger(storySlug: string) {
  const [triggerCount, setTriggerCount] = useState<number>(0);

  useEffect(() => {
    if (!storySlug) return;
    lastGlobalStoryAdOpenTs = 0;
    ensureAdNetworkScripts();
    clearPopunderFrequencyCaps();
  }, [storySlug]);

  const handleStoryTouchToScroll = useCallback(() => {
    const fired = triggerAdOnStoryTouchScroll(5000);
    if (fired) {
      setTriggerCount((prev) => prev + 1);
    }
  }, []);

  return {
    triggerCount,
    handleStoryInteraction: handleStoryTouchToScroll,
  };
}

/**
 * PopunderLoader:
 * Active site-wide:
 * - Ensures Popunder and Social Bar scripts are active.
 * - Triggers popunder at 1 per 5 seconds on touch/scroll.
 */
export const PopunderLoader: React.FC<{ routeKey: string }> = ({ routeKey }) => {
  const isStoryReaderRoute = routeKey.startsWith('reader-');

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    ensureAdNetworkScripts();
    clearPopunderFrequencyCaps();

    let lastHomeTouchTs = 0;

    const handleTouchOrClick = () => {
      if (isStoryReaderRoute) {
        triggerAdOnStoryTouchScroll(5000);
      } else {
        const now = Date.now();
        if (now - lastHomeTouchTs >= 5000) {
          lastHomeTouchTs = now;
          triggerAdOnStoryTouchScroll(5000);
        }
      }
    };

    window.addEventListener('touchend', handleTouchOrClick, { capture: true, passive: true });
    window.addEventListener('pointerup', handleTouchOrClick, { capture: true, passive: true });
    window.addEventListener('click', handleTouchOrClick, { capture: true, passive: true });

    const interval = setInterval(() => {
      clearPopunderFrequencyCaps();
    }, 5000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('touchend', handleTouchOrClick, { capture: true });
      window.removeEventListener('pointerup', handleTouchOrClick, { capture: true });
      window.removeEventListener('click', handleTouchOrClick, { capture: true });
    };
  }, [routeKey, isStoryReaderRoute]);

  return null;
};

/**
 * StoryReadingPopunderEngine:
 * Kept for StoryReader compatibility, keeps frequency cap cleared every 5 seconds while reading.
 */
export const StoryReadingPopunderEngine: React.FC<{
  storySlug: string;
  paragraphTick?: number;
}> = ({ storySlug, paragraphTick = 0 }) => {
  useEffect(() => {
    clearPopunderFrequencyCaps();
  }, [storySlug, paragraphTick]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = setInterval(() => {
      clearPopunderFrequencyCaps();
    }, 5000);
    return () => clearInterval(timer);
  }, [storySlug]);

  return null;
};

interface AdIframeUnitProps {
  adKey: string;
  scriptSrc: string;
  width: number;
  height: number;
  title: string;
  refreshIntervalMs?: number;
}

/**
 * Clean Banner Unit for 160x600 and 320x50 banners
 */
export const AdIframeUnit: React.FC<AdIframeUnitProps> = ({
  adKey,
  scriptSrc,
  width,
  height,
  title,
  refreshIntervalMs = 60000,
}) => {
  const [refreshTick, setRefreshTick] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshTick((prev) => prev + 1);
    }, refreshIntervalMs);

    return () => clearInterval(timer);
  }, [refreshIntervalMs]);

  const cacheBuster = `${refreshTick}_${Math.floor(Date.now() / 60000)}`;
  const srcDoc = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body { margin: 0; padding: 0; overflow: hidden; background: transparent; display: flex; align-items: center; justify-content: center; }
    </style>
  </head>
  <body>
    <script>
      atOptions = {
        'key' : '${adKey}',
        'format' : 'iframe',
        'height' : ${height},
        'width' : ${width},
        'params' : {}
      };
    </script>
    <script src="${scriptSrc}?_cb=${cacheBuster}"></script>
  </body>
</html>`;

  return (
    <div
      style={{ width: `${width}px`, height: `${height}px` }}
      className="shrink-0 overflow-hidden rounded bg-slate-100/50 dark:bg-[#0d152b]/50 flex items-center justify-center"
    >
      <iframe
        key={`iframe-${title}-${refreshTick}`}
        title={title}
        width={width}
        height={height}
        srcDoc={srcDoc}
        scrolling="no"
        frameBorder="0"
        loading="lazy"
        className="w-full h-full border-0 overflow-hidden"
      />
    </div>
  );
};

/**
 * Single 160x600 Vertical Skyscraper Banner
 */
export const SkyscraperBanner160x600: React.FC<{ index?: number; label?: string }> = ({
  index = 1,
  label = 'side',
}) => (
  <AdIframeUnit
    adKey={SKYSCRAPER_KEY}
    scriptSrc={SKYSCRAPER_SRC}
    width={160}
    height={600}
    title={`Side Banner 160x600 ${label} #${index}`}
  />
);

/**
 * Side Skyscraper Rails for Left or Right side of the page:
 * 5 vertically inline on Home, 3 on other routes.
 */
export const SideBannerColumn: React.FC<{
  side: 'left' | 'right';
  count?: number;
}> = ({ side, count = 3 }) => {
  return (
    <aside
      aria-label={`${side} advertisement rail`}
      className="hidden xl:flex flex-col items-center w-[160px] shrink-0"
    >
      <div className="sticky top-16 flex flex-col items-center gap-4">
        {Array.from({ length: count }).map((_, idx) => (
          <SkyscraperBanner160x600 key={`${side}-sky-${idx}`} label={side} index={idx + 1} />
        ))}
      </div>
    </aside>
  );
};

/**
 * Three inline 320x50 banners (used in Footer, middle of Home Gallery, and middle of Story Reader)
 */
export const TripleInlineBanners320x50: React.FC<{ label?: string }> = ({ label = 'inline' }) => {
  return (
    <div className="w-full py-3 flex flex-wrap items-center justify-center gap-3">
      {[1, 2, 3].map((num) => (
        <AdIframeUnit
          key={`${label}-320x50-${num}`}
          adKey={BANNER_320_KEY}
          scriptSrc={BANNER_320_SRC}
          width={320}
          height={50}
          title={`Banner 320x50 ${label} #${num}`}
        />
      ))}
    </div>
  );
};

/**
 * Native Banner Ad Unit:
 * Exact user snippet:
 * <script async="async" data-cfasync="false" src="https://brijmohan.org/21/e308aeebc92b2395c18ed45beda64648"></script>
 * <div id="container-e308aeebc92b2395c18ed45beda64648"></div>
 *
 * Rendered in an isolated responsive container so every break between 3 rows of stories
 * populates its own container without DOM ID collisions.
 */
export const NativeBannerAd: React.FC<{ slotIndex?: number }> = ({ slotIndex = 0 }) => {
  const [iframeHeight, setIframeHeight] = useState<number>(140);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResizeMsg = (ev: MessageEvent) => {
      if (
        ev.data &&
        typeof ev.data === 'object' &&
        ev.data.type === 'walkathawa-native-height' &&
        ev.data.slotIndex === slotIndex &&
        typeof ev.data.height === 'number'
      ) {
        setIframeHeight(Math.max(90, Math.min(480, ev.data.height)));
      }
    };
    window.addEventListener('message', handleResizeMsg);
    return () => window.removeEventListener('message', handleResizeMsg);
  }, [slotIndex]);

  const nativeSrcDoc = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background: transparent;
        overflow: hidden;
        font-family: system-ui, -apple-system, sans-serif;
      }
    </style>
  </head>
  <body>
    <script async="async" data-cfasync="false" src="${NATIVE_BANNER_SCRIPT_SRC}"></script>
    <div id="${NATIVE_BANNER_CONTAINER_ID}"></div>
    <script>
      (function(){
        function reportHeight() {
          try {
            var c = document.getElementById('${NATIVE_BANNER_CONTAINER_ID}');
            var h = Math.max(document.body.scrollHeight, c ? c.scrollHeight : 0);
            if (h > 20) {
              window.parent.postMessage({
                type: 'walkathawa-native-height',
                slotIndex: ${slotIndex},
                height: h + 8
              }, '*');
            }
          } catch (e) {}
        }
        if (typeof ResizeObserver !== 'undefined') {
          new ResizeObserver(reportHeight).observe(document.body);
        }
        window.addEventListener('load', function() {
          reportHeight();
          setTimeout(reportHeight, 600);
          setTimeout(reportHeight, 1800);
        });
      })();
    </script>
  </body>
</html>`;

  return (
    <div className="w-full my-2 py-1 rounded-xl bg-transparent overflow-hidden">
      <iframe
        title={`Native Banner #${slotIndex + 1}`}
        srcDoc={nativeSrcDoc}
        style={{ height: `${iframeHeight}px`, width: '100%' }}
        scrolling="no"
        frameBorder="0"
        loading="lazy"
        className="w-full border-0 overflow-hidden"
      />
    </div>
  );
};
