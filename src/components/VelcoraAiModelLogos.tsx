import React from 'react';

interface ModelIconProps {
  size?: number;
  className?: string;
  color?: string;
}

/**
 * Omni Model Logo: General/All-purpose intelligence, neural network nexus, multi-dimensional reasoning
 */
export const OmniModelLogo: React.FC<ModelIconProps> = ({ size = 20, className = '', color = '#6366F1' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth="1.7" strokeDasharray="3 2" />
      <circle cx="12" cy="12" r="5" stroke={color} strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.2" fill={color} />
      <circle cx="12" cy="3.5" r="1.5" fill={color} />
      <circle cx="12" cy="20.5" r="1.5" fill={color} />
      <circle cx="3.5" cy="12" r="1.5" fill={color} />
      <circle cx="20.5" cy="12" r="1.5" fill={color} />
    </svg>
  );
};

/**
 * Flash Model Logo: Fast-response, lightning-speed execution, agile processing
 */
export const FlashModelLogo: React.FC<ModelIconProps> = ({ size = 20, className = '', color = '#F59E0B' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M13 2.5L4 13.5H11.5L10 21.5L20 9.5H12.5L13 2.5Z"
        fill={color}
        stroke={color}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * Axiom Model Logo: Financial & business intelligence, ledger computation, analytics matrix
 */
export const AxiomModelLogo: React.FC<ModelIconProps> = ({ size = 20, className = '', color = '#10B981' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Financial Bar Matrix & Axiomatic Growth Vector */}
      <rect x="3.5" y="13" width="3.5" height="7.5" rx="1" fill={color} fillOpacity="0.8" />
      <rect x="8.5" y="9" width="3.5" height="11.5" rx="1" fill={color} fillOpacity="0.9" />
      <rect x="13.5" y="5.5" width="3.5" height="15" rx="1" fill={color} />
      <path
        d="M3.5 10L10 4.5L14 7.5L20.5 2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.5 2H20.5V6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * Chat Model Logo: Simple, fast, everyday conversational AI
 */
export const ChatModelLogo: React.FC<ModelIconProps> = ({ size = 20, className = '', color = '#0EA5E9' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12 3C6.48 3 2 6.94 2 11.8C2 14.47 3.34 16.85 5.48 18.42V21.5L8.74 19.82C9.77 20.17 10.86 20.36 12 20.36C17.52 20.36 22 16.42 22 11.56C22 6.7 17.52 3 12 3Z"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="11.5" r="1.4" fill={color} />
      <circle cx="12" cy="11.5" r="1.4" fill={color} />
      <circle cx="16" cy="11.5" r="1.4" fill={color} />
    </svg>
  );
};

