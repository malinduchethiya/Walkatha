import React, { useMemo } from 'react';
import { isSearchEngineCrawler } from '../../utils/botDetection';

export interface BannerAdConfig {
  adKey: string;
  scriptSrc: string;
  width: number;
  height: number;
}

export const SIDE_BANNER_CONFIG: BannerAdConfig = {
  adKey: '05ee890ed059b98d213910f338ece6d0',
  scriptSrc: 'https://brijmohan.org/22/05ee890ed059b98d213910f338ece6d0',
  width: 160,
  height: 600,
};

export const HOME_MIDDLE_BANNER_CONFIG: BannerAdConfig = {
  adKey: '2e5f19d0bbe93686082673c139a7b1b1',
  scriptSrc: 'https://brijmohan.org/22/2e5f19d0bbe93686082673c139a7b1b1',
  width: 320,
  height: 50,
};

interface BannerAdProps extends BannerAdConfig {
  slotId: string;
  className?: string;
}

export function buildBannerSrcDoc(config: BannerAdConfig): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <style>html,body{margin:0;padding:0;width:${config.width}px;height:${config.height}px;overflow:hidden;background:transparent;}</style>
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

export const BannerAd: React.FC<BannerAdProps> = ({
  adKey,
  scriptSrc,
  width,
  height,
  slotId,
  className = '',
}) => {
  const srcDoc = useMemo(
    () => buildBannerSrcDoc({ adKey, scriptSrc, width, height }),
    [adKey, scriptSrc, width, height]
  );

  if (typeof window === 'undefined' || isSearchEngineCrawler()) {
    return null;
  }

  const sizeClass =
    width === 160 && height === 600
      ? 'w-[160px] h-[600px]'
      : width === 320 && height === 50
      ? 'w-[320px] h-[50px]'
      : '';

  return (
    <div
      data-ad-slot={slotId}
      className={`shrink-0 overflow-hidden ${sizeClass} ${className}`.trim()}
    >
      <iframe
        title={`banner-${slotId}`}
        srcDoc={srcDoc}
        width={width}
        height={height}
        scrolling="no"
        frameBorder={0}
        className="block border-0 overflow-hidden bg-transparent"
      />
    </div>
  );
};
