import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 48 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Glow filter */}
        <filter id="logo-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Dynamic theme gradients for glowing borders and fills */}
        <linearGradient id="theme-grad-left" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--color-brand-accent)" stopOpacity="0.85" />
          <stop offset="100%" stopColor="var(--color-brand-accent)" stopOpacity="0.3" />
        </linearGradient>
        
        <linearGradient id="theme-grad-center" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--color-brand-accent)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--color-brand-accent-hover)" stopOpacity="0.4" />
        </linearGradient>
        
        <linearGradient id="theme-grad-right" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--color-brand-accent)" stopOpacity="0.7" />
          <stop offset="100%" stopColor="var(--color-brand-accent)" stopOpacity="0.15" />
        </linearGradient>
      </defs>

      {/* Main container with deep dark background and subtle border - changed to a circle for transparent corners */}
      <circle cx="50" cy="50" r="46" fill="#09090b" stroke="#1d1d20" strokeWidth="2" />
      
      {/* Outer ambient circle line matching the prompt generation */}
      <circle cx="50" cy="50" r="42" stroke="var(--color-brand-accent)" strokeWidth="1.5" strokeOpacity="0.18" />

      {/* Three Kanban Columns with Glow effect */}
      <g filter="url(#logo-glow)">
        {/* Column 1 (Left) */}
        <g>
          {/* Column container */}
          <rect x="22" y="24" width="16" height="52" rx="5" stroke="url(#theme-grad-left)" strokeWidth="1.5" fill="var(--color-brand-accent)" fillOpacity="0.04" />
          {/* Cards inside Column 1 */}
          <rect x="25" y="28" width="10" height="8" rx="2" fill="var(--color-brand-accent)" fillOpacity="0.18" />
          <rect x="25" y="39" width="10" height="8" rx="2" fill="var(--color-brand-accent)" fillOpacity="0.18" />
          <rect x="25" y="50" width="10" height="8" rx="2" fill="var(--color-brand-accent)" fillOpacity="0.18" />
          <rect x="25" y="61" width="10" height="8" rx="2" fill="var(--color-brand-accent)" fillOpacity="0.18" />
        </g>

        {/* Column 2 (Center) - Highlighted column */}
        <g>
          {/* Column container */}
          <rect x="42" y="24" width="16" height="52" rx="5" stroke="url(#theme-grad-center)" strokeWidth="1.8" fill="var(--color-brand-accent)" fillOpacity="0.07" />
          {/* Cards inside Column 2 */}
          <rect x="45" y="28" width="10" height="8" rx="2" fill="var(--color-brand-accent)" fillOpacity="0.32" />
          <rect x="45" y="39" width="10" height="8" rx="2" fill="var(--color-brand-accent)" fillOpacity="0.32" />
          <rect x="45" y="50" width="10" height="8" rx="2" fill="var(--color-brand-accent)" fillOpacity="0.32" />
          <rect x="45" y="61" width="10" height="8" rx="2" fill="var(--color-brand-accent)" fillOpacity="0.32" />
        </g>

        {/* Column 3 (Right) */}
        <g>
          {/* Column container */}
          <rect x="62" y="24" width="16" height="52" rx="5" stroke="url(#theme-grad-right)" strokeWidth="1.2" fill="var(--color-brand-accent)" fillOpacity="0.02" />
          {/* Cards inside Column 3 */}
          <rect x="65" y="28" width="10" height="8" rx="2" fill="var(--color-brand-accent)" fillOpacity="0.10" />
          <rect x="65" y="39" width="10" height="8" rx="2" fill="var(--color-brand-accent)" fillOpacity="0.10" />
          <rect x="65" y="50" width="10" height="8" rx="2" fill="var(--color-brand-accent)" fillOpacity="0.10" />
          <rect x="65" y="61" width="10" height="8" rx="2" fill="var(--color-brand-accent)" fillOpacity="0.10" />
        </g>
      </g>
    </svg>
  );
};
