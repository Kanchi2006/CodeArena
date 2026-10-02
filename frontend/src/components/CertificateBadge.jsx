import React from 'react';

const milestoneThemes = {
  5: {
    name: 'bronze',
    primary: '#cd7f32',
    secondary: '#a0522d',
    light: '#d2b48c',
    glow: 'rgba(205, 127, 50, 0.25)',
    gradient: 'linear-gradient(135deg, #cd7f32, #a0522d)'
  },
  30: {
    name: 'blue',
    primary: '#2563eb',
    secondary: '#1d4ed8',
    light: '#3b82f6',
    glow: 'rgba(37, 99, 235, 0.25)',
    gradient: 'linear-gradient(135deg, #2563eb, #1d4ed8)'
  },
  50: {
    name: 'emerald',
    primary: '#059669',
    secondary: '#047857',
    light: '#10b981',
    glow: 'rgba(5, 150, 105, 0.25)',
    gradient: 'linear-gradient(135deg, #059669, #047857)'
  },
  100: {
    name: 'purple',
    primary: '#7c3aed',
    secondary: '#6d28d9',
    light: '#8b5cf6',
    glow: 'rgba(124, 58, 237, 0.25)',
    gradient: 'linear-gradient(135deg, #7c3aed, #6d28d9)'
  },
  120: {
    name: 'orange',
    primary: '#ea580c',
    secondary: '#c2410c',
    light: '#f97316',
    glow: 'rgba(234, 88, 12, 0.25)',
    gradient: 'linear-gradient(135deg, #ea580c, #c2410c)'
  },
  150: {
    name: 'teal',
    primary: '#0d9488',
    secondary: '#0f766e',
    light: '#14b8a6',
    glow: 'rgba(13, 148, 136, 0.25)',
    gradient: 'linear-gradient(135deg, #0d9488, #0f766e)'
  },
  200: {
    name: 'indigo',
    primary: '#4338ca',
    secondary: '#3730a3',
    light: '#6366f1',
    glow: 'rgba(67, 56, 202, 0.25)',
    gradient: 'linear-gradient(135deg, #4338ca, #3730a3)'
  }
};

export default function CertificateBadge({ milestone = 30, size = 120, className = '', isLocked = false }) {
  const theme = milestoneThemes[milestone] || milestoneThemes[30];

  if (isLocked) {
    return (
      <div 
        className={`certificate-badge-container locked ${className}`} 
        style={{ width: size, height: size * 1.2, display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
      >
        <svg viewBox="0 0 100 120" width={size} height={size * 1.2}>
          {/* Locked Badge Gray Shield */}
          <path d="M50 5 L85 22 V55 C85 75 50 95 50 95 C50 95 15 75 15 55 V22 Z" fill="#1e293b" stroke="#475569" strokeWidth="3" />
          <path d="M50 12 L78 27 V52 C78 68 50 85 50 85 C50 85 22 68 22 52 V27 Z" fill="#0f172a" stroke="#334155" strokeWidth="2" />
          
          {/* Lock Icon */}
          <rect x="40" y="48" width="20" height="16" rx="3" fill="#64748b" />
          <path d="M44 48 V42 C44 38 56 38 56 42 V48" fill="none" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
          
          {/* Code symbol */}
          <text x="50" y="36" fill="#475569" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">&lt;/&gt;</text>
          <text x="50" y="76" fill="#64748b" fontSize="12" fontWeight="bold" textAnchor="middle">{milestone}</text>
        </svg>
      </div>
    );
  }

  return (
    <div 
      className={`certificate-badge-container ${className}`} 
      style={{ width: size, height: size * 1.2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <svg viewBox="0 0 100 120" width={size} height={size * 1.2}>
        <defs>
          <linearGradient id={`badge-grad-${milestone}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={theme.light} />
            <stop offset="50%" stopColor={theme.primary} />
            <stop offset="100%" stopColor={theme.secondary} />
          </linearGradient>
          <linearGradient id={`ribbon-grad-${milestone}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={theme.primary} />
            <stop offset="100%" stopColor={theme.secondary} />
          </linearGradient>
          <filter id={`badge-shadow-${milestone}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor={theme.glow} />
          </filter>
        </defs>

        {/* Ribbon Tails */}
        <g fill={`url(#ribbon-grad-${milestone})`}>
          <polygon points="32,75 22,112 36,104 46,112 40,78" />
          <polygon points="68,75 60,78 54,112 64,104 78,112" />
        </g>

        {/* Outer Hexagonal Shield Badge Base */}
        <path 
          d="M50 5 L88 22 V55 C88 78 50 98 50 98 C50 98 12 78 12 55 V22 Z" 
          fill={`url(#badge-grad-${milestone})`} 
          stroke="#ffffff" 
          strokeWidth="2.5"
          filter={`url(#badge-shadow-${milestone})`}
        />

        {/* Inner Shield Ring */}
        <path 
          d="M50 12 L80 27 V52 C80 70 50 86 50 86 C50 86 20 70 20 52 V27 Z" 
          fill="none" 
          stroke="rgba(255, 255, 255, 0.4)" 
          strokeWidth="1.5" 
          strokeDasharray="4 2"
        />

        {/* Laurel Wreath Leaves Accent */}
        <g fill="none" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="1.5" strokeLinecap="round">
          {/* Left Laurel */}
          <path d="M 28,45 C 24,35 32,26 40,28" />
          <path d="M 26,55 C 22,48 26,38 32,42" />
          {/* Right Laurel */}
          <path d="M 72,45 C 76,35 68,26 60,28" />
          <path d="M 74,55 C 78,48 74,38 68,42" />
        </g>

        {/* Code Bracket Symbol </ > */}
        <text 
          x="50" 
          y="35" 
          fill="#ffffff" 
          fontSize="13" 
          fontWeight="bold" 
          textAnchor="middle" 
          fontFamily="monospace"
          letterSpacing="1"
          opacity="0.95"
        >
          &lt;/&gt;
        </text>

        {/* Milestone Number */}
        <text 
          x="50" 
          y="58" 
          fill="#ffffff" 
          fontSize="23" 
          fontWeight="900" 
          textAnchor="middle"
          fontFamily="var(--font-display), 'Inter', sans-serif"
        >
          {milestone}
        </text>

        {/* Star Accent */}
        <path d="M50 64 L51.5 67 L55 67.5 L52.5 70 L53 73.5 L50 72 L47 73.5 L47.5 70 L45 67.5 L48.5 67 Z" fill="#ffffff" opacity="0.9" />

        {/* SOLVED Label */}
        <text 
          x="50" 
          y="80" 
          fill="#ffffff" 
          fontSize="7" 
          fontWeight="800" 
          textAnchor="middle"
          letterSpacing="1.2"
          opacity="0.9"
        >
          SOLVED
        </text>
      </svg>
    </div>
  );
}
