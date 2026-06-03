// SportBar — CUSTOMER UI primitives  (Icon / Confetti come from ui.jsx)
// VIP Edition: steam effects, frost effects, temperature detection, fixed PNG hero
const { useState } = React;

// ── temperature detection from item emoji ──────────────────────────────────
const HOT_SET  = new Set(['🍔','🌮','🍕','🍗','🥩','🍟','🥓','🌯','🥙','🧆','🫕','🥘']);
const COLD_SET = new Set(['🍺','🥤','🧃','🍸','🍹','🧊','🥛','🫗','🍦','🧋','🧉','🍶','🧉']);
const isHot  = (item) => HOT_SET.has(item.emoji);
const isCold = (item) => COLD_SET.has(item.emoji);

// ── emoji → SVG data-URI ───────────────────────────────────────────────────
// big=true → transparent background (for hero, no dark circle behind)
function emojiSrc(emoji, big) {
  const r = 100;
  const circle = `<circle cx="100" cy="100" r="${r}" fill="url(#g)"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <defs><radialGradient id="g" cx="40%" cy="32%" r="75%">
      <stop offset="0" stop-color="#3a2a1a"/>
      <stop offset="1" stop-color="#14110d"/>
    </radialGradient></defs>
    ${big ? '' : circle}
    <text x="100" y="108" font-size="${big ? 150 : 112}" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// ── STEAM EFFECT ── continuous white wisps rising from hot food ────────────
function SteamEffect({ count = 5 }) {
  return (
    <div className="steam-wrap" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="steam-particle" style={{ '--si': i }} />
      ))}
    </div>
  );
}

// ── FROST EFFECT ── ice crystals orbiting cold drinks ─────────────────────
function FrostEffect({ count = 6 }) {
  return (
    <div className="frost-wrap" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="frost-flake" style={{ '--fi': i }}>❄</span>
      ))}
      <div className="frost-shimmer" />
    </div>
  );
}

// ── heat bar ──────────────────────────────────────────────────────────────
const Heat = ({ level }) => <div className={'heat ' + level}><i /></div>;

// ── badge overlay ─────────────────────────────────────────────────────────
function CBadge({ badge }) {
  if (!badge) return null;
  const cls = { hot: 'b-hot', new: 'b-new', cold: 'b-cold', stock: 'b-stock' }[badge.c] || 'b-new';
  return <span className={'cbadge ' + cls}>{badge.t}</span>;
}

// ── PHOTO SLOT ─────────────────────────────────────────────────────────────
// plain=true  →  hero mode: bare <img> so transparent PNG renders clean.
//                No image-slot wrapper = no black background.
// plain=false →  featured/list mode: keeps image-slot circle as before.
function PhotoSlot({ id, emoji, size, circle = true, bob, plain }) {
  if (plain) {
    return (
      <img
        className="hero-img"
        src={emojiSrc(emoji, true)}
        alt=""
        width={size}
        height={size}
      />
    );
  }
  return (
    <image-slot
      id={id}
      shape={circle ? 'circle' : 'rounded'}
      radius="22"
      fit="contain"
      src={emojiSrc(emoji, false)}
      placeholder="Arrastra foto"
      class={bob ? 'feat-photo bob' : 'feat-photo'}
      style={{ width: size + 'px', height: size + 'px', display: 'block' }}
    />
  );
}

// ── FEATURED CARD ─────────────────────────────────────────────────────────
// Temperature theming: hot → warm orange glow / cold → ice blue tint
// Steam effect anchored above the floating photo (absolute pos within card)
function FeaturedCard({ item, onAdd, onOpen }) {
  const [pop, setPop] = useState(false);
  const hot  = isHot(item);
  const cold = isCold(item);

  const add = (e) => {
    e.stopPropagation();
    setPop(true);
    navigator.vibrate && navigator.vibrate(12);
    onAdd(item);
    setTimeout(() => setPop(false), 340);
  };

  return (
    <div
      className={'feat-card' + (cold ? ' feat-cold' : hot ? ' feat-hot' : '')}
      onClick={() => onOpen && onOpen(item)}
    >
      <Heat level={item.demand} />
      <CBadge badge={item.badge} />
      <div className="feat-halo" />

      {/* temperature particle anchor — sits in the flow but effect overflows */}
      {hot && (
        <div className="feat-temp-anchor">
          <SteamEffect count={3} />
        </div>
      )}
      {cold && (
        <div className="feat-frost-anchor">
          <FrostEffect count={4} />
        </div>
      )}

      <image-slot
        id={item.slot}
        shape="circle"
        radius="65"
        fit="contain"
        src={emojiSrc(item.emoji, false)}
        placeholder="Arrastra foto"
        class={item.demand === 'high' ? 'feat-photo bob' : 'feat-photo'}
        style={{ width: '130px', height: '130px', display: 'block' }}
      />

      <div className="feat-name">{item.name}</div>
      <div className="feat-desc">{item.desc}</div>
      <div className="feat-foot">
        <div>
          <div className="feat-price">{fmtRef(item.ref)}</div>
          <div className="feat-bs">{fmtBs(item.ref)}</div>
        </div>
        <button className={'feat-add btn' + (pop ? ' pop' : '')} onClick={add}>+</button>
      </div>
    </div>
  );
}

// ── PRODUCT ROW ───────────────────────────────────────────────────────────
// Temperature dot on the plate corner + cold glow inside emoji circle
function ProdRow({ item, qty, onAdd }) {
  const [pop, setPop] = useState(false);
  const hot  = isHot(item);
  const cold = isCold(item);

  const add = (e) => {
    e.stopPropagation();
    setPop(true);
    navigator.vibrate && navigator.vibrate(10);
    onAdd(item);
    setTimeout(() => setPop(false), 340);
  };

  return (
    <div
      className={'prod' + (qty ? ' in' : '') + (cold ? ' prod-cold' : '')}
      onClick={add}
    >
      <div className="prod-plate">
        <div
          className="ph"
          style={cold ? {
            background: 'radial-gradient(circle at 50% 45%, rgba(80,180,255,0.30), transparent 68%)'
          } : {}}
        />
        <div
          className="em"
          style={cold ? {
            boxShadow: 'inset 0 0 14px rgba(80,180,255,0.25), 0 0 16px rgba(80,180,255,0.16)'
          } : {}}
        >
          {item.emoji}
        </div>
        {hot  && (
          <span className="prod-temp prod-temp-hot" title="Caliente">♨</span>
        )}
        {cold && (
          <span className="prod-temp prod-temp-cold" title="Frío">❄</span>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="prod-name">
          {item.name}
          {item.licor && <span className="licor-mini">LICOR</span>}
        </div>
        <div className="prod-desc">{item.desc}</div>
        <div className="prod-meta">
          <span className="prod-price">{fmtRef(item.ref)}</span>
          {item.badge && <CBadgeInline badge={item.badge} />}
          {!item.badge && item.pedidos > 80 && (
            <span className="prod-pop">🔥 {item.pedidos} hoy</span>
          )}
        </div>
      </div>

      {qty > 0 && <span className="prod-q">×{qty}</span>}
      <button className={'prod-add btn' + (pop ? ' pop' : '')}>+</button>
    </div>
  );
}

function CBadgeInline({ badge }) {
  const c = { hot: '#ff7a7a', new: '#84e088', cold: '#84baff', stock: 'var(--accent)' }[badge.c] || '#84e088';
  return <span className="prod-pop" style={{ color: c, fontWeight: 700 }}>{badge.t}</span>;
}

Object.assign(window, {
  emojiSrc, isHot, isCold,
  SteamEffect, FrostEffect,
  Heat, CBadge, PhotoSlot,
  FeaturedCard, ProdRow,
});
