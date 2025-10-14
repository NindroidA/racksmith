import { JSX } from 'react';
import { DeviceGraphicProps } from '../../types/components';

export default function DeviceGraphic({ type, className = '' }: DeviceGraphicProps) {
  const graphics: Record<string, JSX.Element> = {
    server: (
      <svg viewBox="0 0 120 50" className={className} fill="none">
        <defs>
          <linearGradient id="serverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <rect x="10" y="5" width="100" height="40" rx="4" fill="url(#serverGrad)" stroke="currentColor" strokeWidth="1.5" opacity="0.8" />
        <circle cx="20" cy="25" r="4" fill="currentColor" opacity="0.6" />
        <circle cx="32" cy="25" r="4" fill="currentColor" opacity="0.6" />
        <rect x="45" y="18" width="45" height="3" rx="1.5" fill="currentColor" opacity="0.4" />
        <rect x="45" y="28" width="35" height="3" rx="1.5" fill="currentColor" opacity="0.4" />
        <rect x="95" y="15" width="10" height="20" rx="2" fill="currentColor" opacity="0.5" />
      </svg>
    ),
    router: (
      <svg viewBox="0 0 120 50" className={className} fill="none">
        <defs>
          <linearGradient id="routerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <rect x="10" y="5" width="100" height="40" rx="4" fill="url(#routerGrad)" stroke="currentColor" strokeWidth="1.5" opacity="0.8" />
        <circle cx="30" cy="25" r="10" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6" />
        <path d="M 30 15 L 30 35 M 20 25 L 40 25" stroke="currentColor" strokeWidth="2" opacity="0.6" />
        <rect x="55" y="18" width="8" height="14" rx="1" fill="currentColor" opacity="0.5" />
        <rect x="68" y="18" width="8" height="14" rx="1" fill="currentColor" opacity="0.5" />
        <rect x="81" y="18" width="8" height="14" rx="1" fill="currentColor" opacity="0.5" />
        <rect x="94" y="18" width="8" height="14" rx="1" fill="currentColor" opacity="0.5" />
      </svg>
    ),
    switch: (
      <svg viewBox="0 0 120 50" className={className} fill="none">
        <defs>
          <linearGradient id="switchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <rect x="10" y="5" width="100" height="40" rx="4" fill="url(#switchGrad)" stroke="currentColor" strokeWidth="1.5" opacity="0.8" />
        {Array.from({ length: 6 }).map((_, i) => (
          <rect 
            key={i} 
            x={18 + i * 15} 
            y="16" 
            width="10" 
            height="18" 
            rx="2" 
            fill="currentColor" 
            opacity={0.3 + (i % 2) * 0.2} 
          />
        ))}
      </svg>
    ),
    firewall: (
      <svg viewBox="0 0 120 50" className={className} fill="none">
        <defs>
          <linearGradient id="firewallGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <rect x="10" y="5" width="100" height="40" rx="4" fill="url(#firewallGrad)" stroke="currentColor" strokeWidth="1.5" opacity="0.8" />
        <path d="M 35 25 L 42 12 L 49 25 L 42 38 Z" fill="currentColor" opacity="0.5" stroke="currentColor" strokeWidth="1" />
        <path d="M 55 25 L 62 12 L 69 25 L 62 38 Z" fill="currentColor" opacity="0.5" stroke="currentColor" strokeWidth="1" />
        <path d="M 75 25 L 82 12 L 89 25 L 82 38 Z" fill="currentColor" opacity="0.5" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
    storage: (
      <svg viewBox="0 0 120 50" className={className} fill="none">
        <defs>
          <linearGradient id="storageGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <rect x="10" y="5" width="100" height="40" rx="4" fill="url(#storageGrad)" stroke="currentColor" strokeWidth="1.5" opacity="0.8" />
        <rect x="20" y="12" width="35" height="26" rx="2" fill="currentColor" opacity="0.4" stroke="currentColor" strokeWidth="1" />
        <rect x="65" y="12" width="35" height="26" rx="2" fill="currentColor" opacity="0.4" stroke="currentColor" strokeWidth="1" />
        <circle cx="30" cy="25" r="3" fill="white" opacity="0.8" />
        <circle cx="75" cy="25" r="3" fill="white" opacity="0.8" />
      </svg>
    ),
    ups: (
      <svg viewBox="0 0 120 50" className={className} fill="none">
        <defs>
          <linearGradient id="upsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <rect x="10" y="5" width="100" height="40" rx="4" fill="url(#upsGrad)" stroke="currentColor" strokeWidth="1.5" opacity="0.8" />
        <path d="M 30 15 L 42 25 L 30 35 Z" fill="currentColor" opacity="0.6" />
        <rect x="50" y="18" width="40" height="14" rx="2" fill="currentColor" opacity="0.4" />
        <rect x="56" y="21" width="6" height="8" rx="1" fill="white" opacity="0.7" />
        <rect x="67" y="21" width="6" height="8" rx="1" fill="white" opacity="0.7" />
        <rect x="78" y="21" width="6" height="8" rx="1" fill="white" opacity="0.7" />
      </svg>
    ),
    fiber_switch: (
      <svg viewBox="0 0 120 50" className={className} fill="none">
        <defs>
          <linearGradient id="fiberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <rect x="10" y="5" width="100" height="40" rx="4" fill="url(#fiberGrad)" stroke="currentColor" strokeWidth="1.5" opacity="0.8" />
        {Array.from({ length: 4 }).map((_, i) => (
          <g key={i}>
            <circle cx={25 + i * 20} cy="25" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
            <circle cx={25 + i * 20} cy="25" r="2" fill="currentColor" opacity="0.6" />
          </g>
        ))}
      </svg>
    ),
    patch_panel: (
      <svg viewBox="0 0 120 50" className={className} fill="none">
        <defs>
          <linearGradient id="patchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <rect x="10" y="5" width="100" height="40" rx="4" fill="url(#patchGrad)" stroke="currentColor" strokeWidth="1.5" opacity="0.8" />
        {Array.from({ length: 8 }).map((_, i) => (
          <circle key={i} cx={20 + i * 11} cy="25" r="4" fill="currentColor" opacity={0.4 + (i % 3) * 0.1} />
        ))}
      </svg>
    ),
  };

  return graphics[type] || graphics.server;
}