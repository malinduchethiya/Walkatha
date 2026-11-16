import React from 'react';

export type AdBannerType = '468x60' | '320x50' | '160x600' | 'responsive';

interface AdBannerProps {
  type?: AdBannerType;
  className?: string;
}

export const AdBanner: React.FC<AdBannerProps> = () => null;

export const SMART_LINK_URL = '';

interface SmartLinkCalloutProps {
  label?: string;
  sublabel?: string;
  variant?: 'primary' | 'secondary' | 'badge';
  className?: string;
}

export const SmartLinkCallout: React.FC<SmartLinkCalloutProps> = () => null;

