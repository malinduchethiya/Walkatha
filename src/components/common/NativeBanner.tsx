import React from 'react';

interface AdProps {
  className?: string;
  refreshKey?: string | number;
}

export const NativeBanner: React.FC<AdProps> = () => null;

export const StoryBanner468: React.FC<AdProps> = () => null;

export const VerticalSideBanner: React.FC<AdProps & { slotId?: string }> = () => null;

export const SideVerticalBannerRail: React.FC<{
  side: 'left' | 'right';
  refreshKey?: string | number;
}> = () => null;


