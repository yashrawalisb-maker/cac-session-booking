/**
 * Line-art campus skyline, in the style of the CAC event-brand illustrations —
 * simple architectural outlines with mint accent fills and scattered dot/dash detail.
 * Decorative only; not a literal rendering of any specific building.
 */
export function SkylineIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* scattered dots / dashed arc */}
      <circle cx="60" cy="30" r="3" fill="currentColor" opacity="0.35" />
      <circle cx="420" cy="55" r="3" fill="currentColor" opacity="0.35" />
      <circle cx="440" cy="140" r="2.5" fill="currentColor" opacity="0.3" />
      <path
        d="M400 20 A 60 60 0 0 1 460 90"
        stroke="currentColor"
        strokeOpacity="0.3"
        strokeWidth="1.5"
        strokeDasharray="3 6"
        fill="none"
      />

      {/* low building with curved roof, left */}
      <path
        d="M10 190 V150 H55 V128 C55 118 65 110 80 110 C95 110 110 116 110 128 V150 H150 V190"
        stroke="white"
        strokeWidth="2"
        fill="none"
      />
      <rect x="65" y="150" width="12" height="18" fill="var(--brand-mint)" opacity="0.85" />
      <rect x="85" y="150" width="12" height="18" fill="var(--brand-mint)" opacity="0.85" />

      {/* tall tower, center-left */}
      <path d="M150 190 V95 H160 V70 H190 V95 H200 V190" stroke="white" strokeWidth="2" fill="none" />
      <rect x="163" y="105" width="10" height="14" fill="var(--brand-mint)" opacity="0.85" />

      {/* mid building with slanted glass front, right of center */}
      <path
        d="M215 190 V140 L260 105 H340 L360 125 V190"
        stroke="white"
        strokeWidth="2"
        fill="none"
      />
      <path d="M260 105 L260 190" stroke="white" strokeWidth="1.4" opacity="0.6" />
      <path d="M300 118 L300 190" stroke="white" strokeWidth="1.4" opacity="0.6" />
      <rect x="270" y="150" width="10" height="14" fill="var(--brand-mint)" opacity="0.85" />
      <rect x="310" y="150" width="10" height="14" fill="var(--brand-mint)" opacity="0.85" />

      {/* small tree accents */}
      <circle cx="30" cy="178" r="9" fill="var(--brand-mint)" opacity="0.75" />
      <circle cx="24" cy="185" r="6" fill="var(--brand-mint)" opacity="0.6" />
      <circle cx="380" cy="175" r="8" fill="var(--brand-mint)" opacity="0.7" />

      {/* far tower silhouette, right */}
      <path d="M375 190 V60 H395 V190" stroke="white" strokeWidth="2" fill="none" opacity="0.8" />
      <path d="M405 190 V80 H430 V190" stroke="white" strokeWidth="2" fill="none" opacity="0.6" />

      {/* ground line */}
      <line x1="0" y1="190" x2="480" y2="190" stroke="white" strokeWidth="1.5" opacity="0.5" />
    </svg>
  );
}
