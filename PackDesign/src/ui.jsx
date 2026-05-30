// SportBar — shared UI primitives
const { useState, useEffect, useRef, useCallback } = React;

// Lucide icon wrapper — renders <i data-lucide> then asks lucide to swap in the SVG
function Icon({ name, size = 24, color, style, strokeWidth = 1.75 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && window.lucide) {
      ref.current.innerHTML = '';
      const i = document.createElement('i');
      i.setAttribute('data-lucide', name);
      ref.current.appendChild(i);
      window.lucide.createIcons({ attrs: { width: size, height: size, 'stroke-width': strokeWidth }, nameAttr: 'data-lucide' });
    }
  }, [name, size, strokeWidth]);
  return <span ref={ref} style={{ display: 'inline-flex', color, lineHeight: 0, ...style }} />;
}

function StatusBar() {
  return (
    <div className="statusbar">
      <span>9:41</span>
      <div className="r">
        <Icon name="signal" size={15} />
        <Icon name="wifi" size={15} />
        <Icon name="battery-full" size={18} />
      </div>
    </div>
  );
}

function Confetti({ run }) {
  if (!run) return null;
  const colors = ['#2E7D32', '#4CAF50', '#F5A623', '#f0f5f0', '#C62828'];
  return <>{Array.from({ length: 36 }).map((_, i) => (
    <span key={i} className="confetti" style={{ left: Math.random() * 100 + '%', background: colors[i % colors.length], animationDuration: (1.6 + Math.random() * 1.4) + 's', animationDelay: Math.random() * 0.3 + 's' }} />
  ))}</>;
}

// faint basketball court line texture (SVG ~4% opacity)
function CourtTex() {
  return (
    <svg className="court-tex" viewBox="0 0 390 760" preserveAspectRatio="xMidYMid slice" fill="none" stroke="#2E7D32" strokeWidth="2">
      <rect x="16" y="30" width="358" height="700" rx="8" />
      <line x1="16" y1="380" x2="374" y2="380" />
      <circle cx="195" cy="380" r="64" />
      <circle cx="195" cy="380" r="6" />
      <rect x="120" y="30" width="150" height="120" />
      <rect x="120" y="610" width="150" height="120" />
    </svg>
  );
}

// Phone bezel wrapper used by the canvas artboards
function Phone({ children }) {
  return (
    <div className="phone"><div className="phone-screen">
      <StatusBar />
      {children}
    </div></div>
  );
}

Object.assign(window, { Icon, StatusBar, Confetti, CourtTex, Phone });
