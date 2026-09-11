import React from 'react';

interface UserAvatarRingProps {
  photoUrl?: string | null;
  displayName?: string | null;
  email?: string | null;
  isGoogle?: boolean;
  tier?: 'free' | 'plus' | 'premium' | string;
  size?: number;
  className?: string;
}

export const UserAvatarRing: React.FC<UserAvatarRingProps> = ({
  photoUrl,
  displayName = 'User',
  email = '',
  isGoogle = false,
  tier = 'free',
  size = 36,
  className = '',
}) => {
  const isPlus = tier === 'plus';
  const isPremium = tier === 'premium';
  const hasAnimatedRing = isGoogle || isPlus || isPremium;

  const initials = (displayName || email || 'V')
    .split(' ')
    .map(w => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // Determine ring styling classes
  let ringClass = '';
  if (isGoogle) {
    ringClass = 'velcora-google-ring';
  } else if (isPremium) {
    ringClass = 'velcora-premium-ring';
  } else if (isPlus) {
    ringClass = 'velcora-plus-ring';
  }

  const ringPadding = hasAnimatedRing ? 2 : 0;
  const innerSize = size - ringPadding * 2;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full select-none ${className}`}
      style={{ width: size, height: size }}
      title={`${displayName || 'User'} (${isGoogle ? 'Google Account' : ''} ${(tier || 'free').toUpperCase()})`}
    >
      {/* Surrounding Animated Ring Layer (If Google or Plus/Premium) */}
      {hasAnimatedRing && (
        <div
          className={`absolute inset-0 rounded-full p-[2px] overflow-hidden ${ringClass}`}
          aria-hidden="true"
        />
      )}

      {/* Internal Inner Background Gap to Isolate Avatar Cleanly */}
      <div
        className="relative rounded-full overflow-hidden flex items-center justify-center bg-white dark:bg-[#0B101D] z-10"
        style={{
          width: innerSize,
          height: innerSize,
          margin: ringPadding,
        }}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={displayName || 'User Profile'}
            className="w-full h-full object-cover rounded-full"
            referrerPolicy="no-referrer"
            onError={(e) => {
              // Graceful fallback to initials if photo fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div
            className={`w-full h-full rounded-full flex items-center justify-center font-bold text-xs ${
              isGoogle
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100'
                : isPremium
                ? 'bg-gradient-to-tr from-[#6D5DFB] to-[#8B5CF6] text-white'
                : isPlus
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            {initials}
          </div>
        )}
      </div>
    </div>
  );
};
