/**
 * Half-court basketball SVG background.
 * Measurements scaled at 10px per foot from NBA specs.
 *
 * Court origin: baseline = y 470, basket = (250, 420), midcourt = y 0.
 *
 * Arc sweep conventions (SVG y-axis down):
 *   Clockwise on screen  → sweep-flag 1
 *   Counter-clockwise    → sweep-flag 0
 */
export function CourtBackground() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 500 470"
      preserveAspectRatio="xMidYMid meet"
      style={{
        position:      "fixed",
        inset:         0,
        width:         "100%",
        height:        "100%",
        zIndex:        -1,
        pointerEvents: "none",
        opacity:       0.04,
      }}
    >
      <g
        stroke="var(--color-primary)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {/* ── Court boundary ──────────────────────────────────── */}
        <rect x="1" y="1" width="498" height="468" />

        {/* ── Mid-court line ──────────────────────────────────── */}
        <line x1="0" y1="0" x2="500" y2="0" />

        {/* ── Center circle — bottom half visible inside court ── */}
        {/* center (250,0), r=60; (190,0)→(310,0) via (250,60); CCW → sweep 0 */}
        <path d="M 190 0 A 60 60 0 0 0 310 0" />

        {/* ── Three-point corner lines ─────────────────────────── */}
        <line x1="30"  y1="470" x2="30"  y2="329" />
        <line x1="470" y1="470" x2="470" y2="329" />

        {/* ── Three-point arc ──────────────────────────────────── */}
        {/* center (250,420), r=238; (30,329)→(470,329) via (250,182); CW → sweep 1 */}
        <path d="M 30 329 A 238 238 0 0 1 470 329" />

        {/* ── Key / paint area ─────────────────────────────────── */}
        {/* 16 ft wide (160px) × 19 ft tall (190px); free-throw line at y=270 */}
        <rect x="170" y="270" width="160" height="200" />

        {/* ── Free-throw circle ────────────────────────────────── */}
        {/* center (250,270), r=60 */}
        {/* Upper solid arc: (190,270)→(310,270) via (250,210); CW → sweep 1 */}
        <path d="M 190 270 A 60 60 0 0 1 310 270" />
        {/* Lower dashed arc: (190,270)→(310,270) via (250,330); CCW → sweep 0 */}
        <path d="M 190 270 A 60 60 0 0 0 310 270" strokeDasharray="7 5" />

        {/* ── Backboard ────────────────────────────────────────── */}
        {/* 6 ft wide (60px), centered, 4 ft from baseline (y=430) */}
        <line x1="220" y1="455" x2="280" y2="455" />
        {/* basket connector line */}
        <line x1="250" y1="420" x2="250" y2="455" />

        {/* ── Basket / hoop ─────────────────────────────────────── */}
        <circle cx="250" cy="420" r="9" />

        {/* ── Restricted area arc ──────────────────────────────── */}
        {/* center (250,420), r=40; (210,420)→(290,420) via (250,380); CW → sweep 1 */}
        <path d="M 210 420 A 40 40 0 0 1 290 420" />
      </g>
    </svg>
  )
}
