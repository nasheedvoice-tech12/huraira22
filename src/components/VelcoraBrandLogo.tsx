import React from 'react';

export interface VelcoraBrandLogoProps {
  size?: number;
  className?: string;
  variant?: 'monogram' | 'full';
  showText?: boolean;
}

/**
 * Velcora Project/Company Brand Logo
 * Clean wordmark identity representing the Velcora POS & ERP enterprise platform.
 */
export const VelcoraBrandLogo: React.FC<VelcoraBrandLogoProps> = ({
  className = '',
}) => {
  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <span className="font-extrabold tracking-tight text-slate-900 dark:text-white lowercase text-base">
        velcora
      </span>
    </div>
  );
};

/**
 * Lava Model Mascot Logo (for AI Chat screen & AI bottom profile area)
 */
export { VelcoraMascot as LavaModelLogo } from './VelcoraMascot';

