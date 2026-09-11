import React from 'react';

interface VelcoraMascotProps {
  className?: string;
  size?: number;
  sparkles?: boolean;
}

export const VelcoraMascot: React.FC<VelcoraMascotProps> = ({
  className = '',
  size = 64,
  sparkles = true,
}) => {
  return (
    <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="filter drop-shadow-md"
      >
        <defs>
          {/* Volcano Body Gradient */}
          <linearGradient id="volcanoBody" x1="60" y1="35" x2="60" y2="105" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF6B4A" />
            <stop offset="50%" stopColor="#EA4826" />
            <stop offset="100%" stopColor="#D93815" />
          </linearGradient>

          {/* Molten Lava Top */}
          <linearGradient id="moltenLava" x1="60" y1="20" x2="60" y2="55" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFE066" />
            <stop offset="40%" stopColor="#FFB800" />
            <stop offset="100%" stopColor="#FF8A00" />
          </linearGradient>

          {/* Cheek Glow */}
          <radialGradient id="cheekGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFAAA0" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FFAAA0" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Floating Sparks / Stars in Background */}
        {sparkles && (
          <g className="animate-pulse">
            <circle cx="20" cy="30" r="2.5" fill="#FFE066" />
            <circle cx="100" cy="25" r="2" fill="#FFE066" />
            <circle cx="25" cy="85" r="1.5" fill="#FFAAA0" />
            <circle cx="95" cy="80" r="2.5" fill="#FFE066" />
            <path d="M60 8 L62 14 L68 16 L62 18 L60 24 L58 18 L52 16 L58 14 Z" fill="#FFE066" />
          </g>
        )}

        {/* Cute Tiny Arms */}
        <ellipse cx="28" cy="72" rx="7" ry="11" transform="rotate(-30 28 72)" fill="#EA4826" />
        <ellipse cx="92" cy="72" rx="7" ry="11" transform="rotate(30 92 72)" fill="#EA4826" />

        {/* Volcano Main Mountain Body */}
        <path
          d="M42 38 C42 38, 30 75, 26 92 C23 103, 30 106, 40 106 L80 106 C90 106, 97 103, 94 92 C90 75, 78 38, 78 38 Z"
          fill="url(#volcanoBody)"
        />

        {/* Molten Lava Crown Flow */}
        <path
          d="M40 38 C44 48, 48 52, 52 46 C56 40, 60 54, 64 48 C68 42, 72 50, 76 44 C80 38, 78 34, 75 30 C70 26, 50 26, 45 30 C42 33, 38 34, 40 38 Z"
          fill="url(#moltenLava)"
        />

        {/* Molten Lava Bubble Top */}
        <ellipse cx="60" cy="28" rx="16" ry="7" fill="#FFE066" />
        <ellipse cx="60" cy="26" rx="10" ry="4" fill="#FFF4A3" />

        {/* Cute Big Cartoon Eyes */}
        <g>
          {/* Left Eye */}
          <circle cx="48" cy="68" r="6.5" fill="#17182B" />
          <circle cx="46.5" cy="66" r="2.2" fill="#FFFFFF" />
          <circle cx="50" cy="70" r="1.1" fill="#FFFFFF" />

          {/* Right Eye */}
          <circle cx="72" cy="68" r="6.5" fill="#17182B" />
          <circle cx="70.5" cy="66" r="2.2" fill="#FFFFFF" />
          <circle cx="74" cy="70" r="1.1" fill="#FFFFFF" />
        </g>

        {/* Cheerful Mouth / Smile */}
        <path
          d="M54 77 C56 82, 64 82, 66 77"
          stroke="#17182B"
          strokeWidth="2.8"
          strokeLinecap="round"
          fill="none"
        />

        {/* Rosy Blush Cheeks */}
        <ellipse cx="40" cy="74" rx="4.5" ry="3" fill="url(#cheekGlow)" />
        <ellipse cx="80" cy="74" rx="4.5" ry="3" fill="url(#cheekGlow)" />
      </svg>
    </div>
  );
};

export const VelcoraLogoMonogram: React.FC<{ size?: number; className?: string }> = ({
  size = 32,
  className = '',
}) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-2xl bg-primary flex items-center justify-center text-white font-extrabold shadow-md shadow-primary/30 select-none shrink-0 ${className}`}
    >
      <svg
        width={size * 0.65}
        height={size * 0.65}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4 5L12 20L20 5H15.5L12 13.5L8.5 5H4Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
