import React, { useEffect, useRef } from 'react';

const NATIVE_BANNER_KEY = 'e308aeebc92b2395c18ed45beda64648';
const NATIVE_BANNER_SRC = `https://brijmohan.org/21/${NATIVE_BANNER_KEY}`;
const NATIVE_CONTAINER_ID = `container-${NATIVE_BANNER_KEY}`;

const BANNER_468_KEY = '41fe3a7c5be5b71cd4620d5d0fc4e600';
const BANNER_468_SRC = `https://brijmohan.org/22/${BANNER_468_KEY}`;

interface AdProps {
  className?: string;
  refreshKey?: string | number;
}

export const NativeBanner: React.FC<AdProps> = ({ className = '', refreshKey }) => {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Ensure no duplicate #container-e308aeebc92b2395c18ed45beda64648 exists elsewhere in DOM
    const existingContainers = document.querySelectorAll(`#${NATIVE_CONTAINER_ID}`);
    existingContainers.forEach((el) => {
      if (!host.contains(el)) {
        el.remove();
      }
    });

    // Remove any previously injected native banner script tags so route transitions re-trigger cleanly
    const oldScripts = document.querySelectorAll(`script[src*="${NATIVE_BANNER_KEY}"]`);
    oldScripts.forEach((s) => {
      if (!host.contains(s)) {
        s.remove();
      }
    });

    host.innerHTML = '';

    // 1. Mount container div FIRST so getElementById succeeds immediately when script runs
    const container = document.createElement('div');
    container.id = NATIVE_CONTAINER_ID;
    container.style.width = '100%';
    host.appendChild(container);

    // 2. Append live executable <script async="async" data-cfasync="false" src="...">
    const script = document.createElement('script');
    script.async = true;
    script.setAttribute('async', 'async');
    script.setAttribute('data-cfasync', 'false');
    script.src = NATIVE_BANNER_SRC;
    host.appendChild(script);
  }, [refreshKey]);

  return (
    <div
      ref={hostRef}
      className={`w-full my-4 min-h-[90px] flex flex-col items-center justify-center ${className}`.trim()}
    />
  );
};

export const StoryBanner468: React.FC<AdProps> = ({ className = '', refreshKey }) => {
  const slotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = slotRef.current;
    if (!container) return;

    container.innerHTML = '';

    // Create a synchronous parser-context iframe so Adsterra's atOptions + document.write()
    // inside https://brijmohan.org/22/41fe3a7c5be5b71cd4620d5d0fc4e600 always executes
    // without global atOptions collisions or post-DOMContentLoaded document.write blocking.
    const renderFrame = document.createElement('iframe');
    renderFrame.width = '468';
    renderFrame.height = '60';
    renderFrame.frameBorder = '0';
    renderFrame.scrolling = 'no';
    renderFrame.title = 'ad-468x60';
    renderFrame.style.border = '0';
    renderFrame.style.display = 'block';
    renderFrame.style.width = '468px';
    renderFrame.style.height = '60px';
    renderFrame.style.minHeight = '60px';
    renderFrame.style.maxWidth = '100%';
    renderFrame.style.overflow = 'hidden';

    container.appendChild(renderFrame);

    try {
      const frameDoc = renderFrame.contentDocument || renderFrame.contentWindow?.document;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <base href="${window.location.origin}/">
  <style>html,body{margin:0;padding:0;width:100%;height:60px;overflow:hidden;background:transparent;display:flex;align-items:center;justify-content:center;}</style>
</head>
<body>
  <script>
    atOptions = {
      'key' : '${BANNER_468_KEY}',
      'format' : 'iframe',
      'height' : 60,
      'width' : 468,
      'params' : {}
    };
  </script>
  <script data-cfasync="false" src="${BANNER_468_SRC}"></script>
</body>
</html>`);
        frameDoc.close();
      }
    } catch {
      // Fallback: direct DOM script injection if iframe document access is restricted
      (window as any).atOptions = {
        key: BANNER_468_KEY,
        format: 'iframe',
        height: 60,
        width: 468,
        params: {},
      };
      const extScript = document.createElement('script');
      extScript.setAttribute('data-cfasync', 'false');
      extScript.src = BANNER_468_SRC;
      container.appendChild(extScript);
    }
  }, [refreshKey]);

  return (
    <div
      ref={slotRef}
      className={`ad-468 w-full min-h-[60px] my-3 flex items-center justify-center overflow-hidden ${className}`.trim()}
    />
  );
};

export const VerticalSideBanner: React.FC<AdProps & { slotId?: string }> = ({
  className = '',
  refreshKey,
  slotId = 'v-slot',
}) => {
  const slotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = slotRef.current;
    if (!container) return;

    container.innerHTML = '';

    const renderFrame = document.createElement('iframe');
    renderFrame.width = '160';
    renderFrame.height = '320';
    renderFrame.frameBorder = '0';
    renderFrame.scrolling = 'no';
    renderFrame.title = `vertical-ad-${slotId}`;
    renderFrame.style.border = '0';
    renderFrame.style.display = 'block';
    renderFrame.style.width = '160px';
    renderFrame.style.height = '320px';
    renderFrame.style.minHeight = '320px';
    renderFrame.style.maxWidth = '100%';
    renderFrame.style.overflow = 'hidden';

    container.appendChild(renderFrame);

    try {
      const frameDoc = renderFrame.contentDocument || renderFrame.contentWindow?.document;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <base href="${window.location.origin}/">
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 160px;
      height: 320px;
      overflow: hidden;
      background: transparent;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
    }
    #${NATIVE_CONTAINER_ID} {
      width: 160px !important;
      max-width: 160px !important;
      overflow: hidden !important;
    }
  </style>
</head>
<body>
  <div id="${NATIVE_CONTAINER_ID}"></div>
  <script async="async" data-cfasync="false" src="${NATIVE_BANNER_SRC}"></script>
  <script>
    atOptions = {
      'key' : '${BANNER_468_KEY}',
      'format' : 'iframe',
      'height' : 60,
      'width' : 468,
      'params' : {}
    };
  </script>
  <script data-cfasync="false" src="${BANNER_468_SRC}"></script>
</body>
</html>`);
        frameDoc.close();
      }
    } catch {
      // ignore fallback errors
    }
  }, [refreshKey, slotId]);

  return (
    <div
      ref={slotRef}
      className={`vertical-ad-slot w-[160px] min-h-[320px] rounded-lg bg-[#0d152b]/60 border border-[#1c2b4f]/60 flex items-center justify-center overflow-hidden ${className}`.trim()}
    />
  );
};

export const SideVerticalBannerRail: React.FC<{
  side: 'left' | 'right';
  refreshKey?: string | number;
}> = ({ side, refreshKey }) => {
  return (
    <div
      aria-label={`${side} vertical banners`}
      className="hidden md:flex flex-col items-center justify-start gap-5 w-[160px] lg:w-[170px] shrink-0 pt-2"
    >
      <VerticalSideBanner slotId={`${side}-1`} refreshKey={`${side}-1-${refreshKey ?? ''}`} />
      <VerticalSideBanner slotId={`${side}-2`} refreshKey={`${side}-2-${refreshKey ?? ''}`} />
      <VerticalSideBanner slotId={`${side}-3`} refreshKey={`${side}-3-${refreshKey ?? ''}`} />
    </div>
  );
};

