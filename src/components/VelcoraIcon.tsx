import React from 'react';

interface VelcoraIconProps {
  className?: string;
  size?: number;
  glow?: boolean;
}

export const VelcoraIcon: React.FC<VelcoraIconProps> = ({ className = 'w-7 h-7', size, glow = true }) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <div
      style={style}
      className={`relative inline-flex items-center justify-center shrink-0 rounded-2xl bg-gradient-to-tr from-primary-hover via-primary to-purple-400 p-1.5 border border-purple-400/30 transition-transform duration-200 hover:scale-105 shadow-sm shadow-primary/25 ${
        glow ? 'velcora-brand-glow' : ''
      } ${className}`}
    >
      {/* Subtle highlight overlay */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/25 via-transparent to-transparent pointer-events-none" />

      {/* Velcora Signature Star Monogram */}
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-full h-full text-white filter drop-shadow-[0_1px_4px_rgba(59,26,168,0.5)] relative z-10"
      >
        <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
      </svg>
    </div>
  );
};
