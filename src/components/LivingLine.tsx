import React from 'react';

export type LivingLineMode = 'ambient' | 'thinking' | 'routing' | 'generating' | 'completed' | 'error';

interface LivingLineProps {
  mode?: LivingLineMode;
  className?: string;
  width?: string | number;
  height?: number;
  label?: string;
  sublabel?: string;
  showNodes?: boolean;
}

export const LivingLine: React.FC<LivingLineProps> = ({
  mode = 'ambient',
  className = '',
  width = '100%',
  height = 14,
  label,
  sublabel,
  showNodes = false,
}) => {
  const isError = mode === 'error';
  const isRouting = mode === 'routing';
  const isGenerating = mode === 'generating';
  const isThinking = mode === 'thinking';
  const isAmbient = mode === 'ambient';

  return (
    <div
      className={`relative flex flex-col items-center justify-center select-none overflow-hidden max-w-full ${className}`}
      style={{ width }}
      role="status"
      aria-label={label || `Velcora ${mode} active signal`}
    >
      {/* Optional text header for processing states */}
      {(label || sublabel) && (
        <div className="flex items-center gap-2 mb-1 text-center">
          {label && (
            <span className="text-xs font-semibold text-slate-800 dark:text-[#F8FAFC] tracking-tight">
              {label}
            </span>
          )}
          {sublabel && (
            <span className="text-[11px] text-slate-400 dark:text-[#94A3B8]">
              {sublabel}
            </span>
          )}
        </div>
      )}

      {/* Living Line SVG Canvas */}
      <div className="w-full relative flex items-center justify-center" style={{ height }}>
        <svg
          viewBox="0 0 400 16"
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
        >
          <defs>
            {/* Ambient / Thinking Indigo-Violet-Cyan Flowing Gradient */}
            <linearGradient id="velcora-living-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6D5DFB" stopOpacity="0.2" />
              <stop offset="30%" stopColor="#6D5DFB" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#8B5CF6" stopOpacity="1" />
              <stop offset="70%" stopColor="#22D3EE" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#6D5DFB" stopOpacity="0.2" />
            </linearGradient>

            {/* Error Gradient */}
            <linearGradient id="velcora-error-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#DC2626" stopOpacity="1" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0.3" />
            </linearGradient>

            {/* Soft Luminous Glow Filter */}
            <filter id="velcora-line-glow" x="-20%" y="-100%" width="140%" height="300%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Baseline Track (Neutral & Subtle) */}
          <path
            d="M 0 8 L 400 8"
            stroke="currentColor"
            className="text-slate-200 dark:text-[#1E293B]"
            strokeWidth="1"
            strokeLinecap="round"
          />

          {/* The Living Wave Signal Path */}
          <path
            d="M 0 8 Q 60 8 100 8 T 150 4 T 190 12 T 230 4 T 270 8 L 400 8"
            fill="none"
            stroke={isError ? 'url(#velcora-error-gradient)' : 'url(#velcora-living-gradient)'}
            strokeWidth={isGenerating || isThinking ? '2' : '1.5'}
            strokeLinecap="round"
            filter="url(#velcora-line-glow)"
            className={`transition-all duration-300 ${
              isError
                ? 'opacity-90'
                : isGenerating
                ? 'velcora-living-wave-fast'
                : isThinking
                ? 'velcora-living-wave-medium'
                : isRouting
                ? 'velcora-living-wave-routing'
                : 'velcora-living-wave-ambient'
            }`}
          />

          {/* Traveling Luminous Energy Particle */}
          {!isError && (
            <circle
              r="2.5"
              fill="#22D3EE"
              filter="url(#velcora-line-glow)"
              className={`opacity-90 ${
                isGenerating
                  ? 'velcora-living-particle-fast'
                  : isThinking || isRouting
                  ? 'velcora-living-particle-medium'
                  : 'velcora-living-particle-ambient'
              }`}
            >
              <animateMotion
                path="M 0 8 Q 60 8 100 8 T 150 4 T 190 12 T 230 4 T 270 8 L 400 8"
                dur={isGenerating ? '1.8s' : isThinking ? '2.6s' : isRouting ? '2.2s' : '4s'}
                repeatCount="indefinite"
              />
            </circle>
          )}

          {/* Optional Connection Nodes for Router visual */}
          {showNodes && (
            <>
              <circle cx="20" cy="8" r="3" className="fill-slate-400 dark:fill-slate-600" />
              <circle cx="200" cy="8" r="3.5" className="fill-[#6D5DFB] ring-2 ring-indigo-400/30" />
              <circle cx="380" cy="8" r="3" className="fill-slate-400 dark:fill-slate-600" />
            </>
          )}
        </svg>
      </div>
    </div>
  );
};
