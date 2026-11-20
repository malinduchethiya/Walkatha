import React, { useEffect, useMemo, useRef } from 'react';

export interface BannerAdConfig {
  adKey: string;
  width: number;
  height: number;
  scriptSrc: string;
}

export const SIDE_BANNER_CONFIG: BannerAdConfig = {
  adKey: '05ee890ed059b98d213910f338ece6d0',
  width: 160,
  height: 600,
  scriptSrc: 'https://brijmohan.org/22/05ee890ed059b98d213910f338ece6d0',
};

export const SIDE_BANNER_SLOTS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

export const MOBILE_STORY_BANNER_CONFIG: BannerAdConfig = {
  adKey: '2e5f19d0bbe93686082673c139a7b1b1',
  width: 320,
  height: 50,
  scriptSrc: 'https://brijmohan.org/22/2e5f19d0bbe93686082673c139a7b1b1',
};

export const MOBILE_STORY_BANNER_SLOTS = [0, 1, 2] as const;

export const FOOTER_NATIVE_BANNER_CONFIG = {
  containerId: 'container-e308aeebc92b2395c18ed45beda64648',
  scriptSrc: 'https://brijmohan.org/21/e308aeebc92b2395c18ed45beda64648',
} as const;

export function buildBannerSrcDoc(config: BannerAdConfig): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="color-scheme" content="dark" />
<style>html,body{margin:0;padding:0;width:${config.width}px;height:${config.height}px;overflow:hidden;color-scheme:dark;background:#0e0e10;}</style>
</head>
<body>
<script>
  atOptions = {
    'key' : '${config.adKey}',
    'format' : 'iframe',
    'height' : ${config.height},
    'width' : ${config.width},
    'params' : {}
  };
</script>
<script src="${config.scriptSrc}"></script>
</body>
</html>`;
}

interface BannerAdProps extends BannerAdConfig {
  slotId: string;
  className?: string;
}

export const BannerAd: React.FC<BannerAdProps> = ({
  slotId,
  adKey,
  width,
  height,
  scriptSrc,
  className = '',
}) => {
  const srcDoc = useMemo(
    () => buildBannerSrcDoc({ adKey, width, height, scriptSrc }),
    [adKey, width, height, scriptSrc]
  );

  return (
    <div
      data-banner-slot={slotId}
      className={`shrink-0 overflow-hidden bg-transparent ${className}`}
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <iframe
        title={`Advertisement ${slotId}`}
        srcDoc={srcDoc}
        width={width}
        height={height}
        scrolling="no"
        frameBorder={0}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="block border-0 overflow-hidden bg-transparent"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          colorScheme: 'dark',
          backgroundColor: 'transparent',
        }}
      />
    </div>
  );
};

interface NativeBannerAdProps {
  containerId: string;
  scriptSrc: string;
  className?: string;
}

export const NativeBannerAd: React.FC<NativeBannerAdProps> = ({
  containerId,
  scriptSrc,
  className = '',
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const existing = host.querySelector(`script[src="${scriptSrc}"]`);
    if (existing) return;

    const script = document.createElement('script');
    script.async = true;
    script.setAttribute('async', 'async');
    script.setAttribute('data-cfasync', 'false');
    script.src = scriptSrc;

    const container = host.querySelector(`#${CSS.escape(containerId)}`);
    if (container) {
      host.insertBefore(script, container);
    } else {
      host.appendChild(script);
    }

    return () => {
      if (script.parentNode === host) {
        host.removeChild(script);
      }
    };
  }, [containerId, scriptSrc]);

  return (
    <div
      ref={hostRef}
      data-testid="footer-native-banner"
      className={`w-full overflow-hidden ${className}`}
    >
      <div id={containerId} />
    </div>
  );
};
