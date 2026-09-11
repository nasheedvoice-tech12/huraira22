import React from 'react';
import { LivingLine } from './LivingLine';

interface VelcoraWordmarkProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLivingLine?: boolean;
  livingLineWidth?: string | number;
  className?: string;
  badge?: string;
}

export const VelcoraWordmark: React.FC<VelcoraWordmarkProps> = ({
  size = 'md',
  showLivingLine = false,
  livingLineWidth = 120,
  className = '',
  badge,
}) => {
  const sizeClasses = {
    sm: 'text-sm tracking-tight',
    md: 'text-base sm:text-lg tracking-tight',
    lg: 'text-xl sm:text-2xl tracking-tight',
    xl: 'text-2xl sm:text-3xl tracking-tight',
  }[size];

  return (
    <div className={`inline-flex flex-col items-start select-none ${className}`}>
      <div className="flex items-center gap-2">
        <span className={`font-black text-slate-900 dark:text-white tracking-tight ${sizeClasses}`}>
          velcora
        </span>
        {badge && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 uppercase tracking-wider">
            {badge}
          </span>
        )}
      </div>

      {/* Subtle living line underneath */}
      {showLivingLine && (
        <div className="mt-1 -ml-0.5">
          <LivingLine mode="ambient" width={livingLineWidth} height={10} />
        </div>
      )}
    </div>
  );
};
