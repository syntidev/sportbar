// SportBar — CUSTOMER UI primitives (Icon/Confetti come from ui.jsx)
const { useState } = React;

// emoji rendered as a circular "plate" data-URI — used as the fallback src for
// image-slots, so empty slots already look intentional and a dropped pro photo
// (transparent PNG) just overrides it.
function emojiSrc(emoji, big) {
  const r = 100;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><defs><radialGradient id="g" cx="40%" cy="32%" r="75%"><stop offset="0" stop-color="#3a2a1a"/><stop offset="1" stop-color="#14110d"/></radialGradient></defs>${big ? '' : `<circle cx="100" cy="100" r="${r}" fill="url(#g)"/>`}<text x="100" y="108" font-size="${big ? 150 : 112}" text-anchor="middle" dominant-baseline="middle">${emoji}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

const Heat = ({ level }) => <div className={'heat ' + level}><i /></div>;
function CBadge({ badge }) {
  if (!badge) return null;
  const cls = { hot: 'b-hot', new: 'b-new', cold: 'b-cold', stock: 'b-stock' }[badge.c] || 'b-new';
  return <span className={'cbadge ' + cls}>{badge.t}</span>;
}

// circular floating photo slot (accepts a dropped transparent PNG)
function PhotoSlot({ id, emoji, size, circle = true, bob, plain }) {
  return (
    <image-slot
      id={id}
      shape={circle ? 'circle' : 'rounded'}
      radius="22"
      fit="contain"
      src={emojiSrc(emoji, plain)}
      placeholder="Arrastra foto"
      class={bob ? 'feat-photo bob' : ''}
      style={{ width: size + 'px', height: size + 'px', display: 'block' }}
    />
  );
}

// FEATURED card — floating photo + halo + heat + badge
function FeaturedCard({ item, onAdd, onOpen }) {
  const [pop, setPop] = useState(false);
  const add = (e) => { e.stopPropagation(); setPop(true); navigator.vibrate && navigator.vibrate(12); onAdd(item); setTimeout(() => setPop(false), 340); };
  return (
    <div className="feat-card" onClick={() => onOpen && onOpen(item)}>
      <Heat level={item.demand} />
      <CBadge badge={item.badge} />
      <div className="feat-halo" />
      <div className="feat-photo" style={{ width: 130, height: 130 }}>
        <PhotoSlot id={item.slot} emoji={item.emoji} size={130} bob={item.demand === 'high'} />
      </div>
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

// product list row — tap anywhere to add
function ProdRow({ item, qty, onAdd }) {
  const [pop, setPop] = useState(false);
  const add = (e) => { e.stopPropagation(); setPop(true); navigator.vibrate && navigator.vibrate(10); onAdd(item); setTimeout(() => setPop(false), 340); };
  return (
    <div className={'prod' + (qty ? ' in' : '')} onClick={add}>
      <div className="prod-plate">
        <div className="ph" />
        <div className="em">{item.emoji}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="prod-name">{item.name}{item.licor && <span className="licor-mini">LICOR</span>}</div>
        <div className="prod-desc">{item.desc}</div>
        <div className="prod-meta">
          <span className="prod-price">{fmtRef(item.ref)}</span>
          {item.badge && <CBadgeInline badge={item.badge} />}
          {!item.badge && item.pedidos > 80 && <span className="prod-pop">🔥 {item.pedidos} hoy</span>}
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

Object.assign(window, { emojiSrc, Heat, CBadge, PhotoSlot, FeaturedCard, ProdRow });
