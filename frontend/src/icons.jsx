// Inline SVG icons (stroke-based, inherit color via currentColor).
// Replaces emoji glyphs so the brand renders identically on every OS.

const base = (size) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
});

export function TrophyIcon({ size = 20 }) {
  return (
    <svg {...base(size)}>
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 5H5a2 2 0 0 0 0 4h2" />
      <path d="M17 5h2a2 2 0 0 1 0 4h-2" />
    </svg>
  );
}

export function CrownIcon({ size = 14 }) {
  return (
    <svg {...base(size)} fill="currentColor" strokeWidth="1">
      <path d="M4 18h16l1.6-9-5.1 3.2L12 5.5 7.5 12.2 2.4 9 4 18Z" />
    </svg>
  );
}

export function ChartIcon({ size = 16 }) {
  return (
    <svg {...base(size)}>
      <path d="M6 20v-6" />
      <path d="M12 20V6" />
      <path d="M18 20v-9" />
    </svg>
  );
}

export function ListIcon({ size = 24 }) {
  return (
    <svg {...base(size)}>
      <path d="M9 6h12" />
      <path d="M9 12h12" />
      <path d="M9 18h12" />
      <path d="M4 6h.01" />
      <path d="M4 12h.01" />
      <path d="M4 18h.01" />
    </svg>
  );
}

export function BallIcon({ size = 28 }) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8.2 15.6 11l-1.4 4.4h-4.4L8.4 11 12 8.2Z" fill="currentColor" stroke="none" />
      <path d="M12 3v5.2" />
      <path d="M15.6 11l4.9-1.6" />
      <path d="M14.2 15.4l3 4" />
      <path d="M9.8 15.4l-3 4" />
      <path d="M8.4 11 3.5 9.4" />
    </svg>
  );
}

export function FlagFallbackIcon({ size = 15 }) {
  return (
    <svg {...base(size)}>
      <path d="M5 21V4" />
      <path d="M5 4h12l-2.5 4L17 12H5" />
    </svg>
  );
}
