// SportBar — KDS COCINA: landscape board, cards in columns by status
const { useState, useEffect, useRef, useCallback } = React;

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
let KSEQ = 235;

const kseed = () => ([
  { id: 1, code: 'LOC-117', kind: 'LOC', zone: 'Sur', seat: 'Mesa 4', staff: 'Carlos', start: 168, status: 'prep', items: [{ q: 2, n: 'Classic Burger' }, { q: 1, n: 'Nachos Cheddar' }] },
  { id: 2, code: 'PUB-231', kind: 'PUB', zone: 'VIP', seat: 'Box 2', staff: null, start: 96, status: 'prep', items: [{ q: 1, n: 'Doble Smash' }, { q: 2, n: 'Cerveza Polar' }, { q: 1, n: 'Papas Fritas' }] },
  { id: 3, code: 'PUB-234', kind: 'PUB', zone: 'Norte', seat: 'Fila G, S12', staff: null, start: 58, status: 'nuevo', items: [{ q: 1, n: 'Crispy Chicken' }, { q: 1, n: 'Refresco 2L' }] },
  { id: 4, code: 'LOC-119', kind: 'LOC', zone: 'VIP', seat: 'Box 1', staff: 'Ana', start: 22, status: 'nuevo', licor: true, items: [{ q: 2, n: 'Cuba Libre' }, { q: 1, n: 'Tequeños (6u)' }] },
  { id: 5, code: 'PUB-235', kind: 'PUB', zone: 'Externa', seat: 'Barra 3', staff: null, start: 9, status: 'nuevo', items: [{ q: 3, n: 'Alitas BBQ (8u)' }] },
  { id: 6, code: 'PUB-228', kind: 'PUB', zone: 'Norte', seat: 'Fila B, S4', staff: null, start: 372, status: 'prep', items: [{ q: 2, n: 'BBQ Bacon' }, { q: 2, n: 'Papas Fritas' }, { q: 1, n: 'Refresco 2L' }] },
]);

function kchime() {
  try { const a = new (window.AudioContext || window.webkitAudioContext)(); const o = a.createOscillator(); const g = a.createGain(); o.connect(g); g.connect(a.destination); o.type = 'sine'; o.frequency.value = 880; g.gain.setValueAtTime(.12, a.currentTime); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + .35); o.start(); o.stop(a.currentTime + .35); } catch (e) {}
}

function KOrderCard({ o, now, onBump }) {
  const elapsed = o.start + (now - o.t0) / 1000;
  const critical = elapsed > 300 && o.status !== 'done';
  const colState = critical ? 'crit' : o.status;
  const cls = o.licor && !critical ? 's-licor' : 's-' + (colState === 'crit' ? 'crit' : o.status);
  const pulseCls = o.status === 'nuevo' && !critical ? ' pulse' : '';
  const bumpLabel = o.status === 'nuevo' ? 'TOMAR PEDIDO' : 'MARCAR LISTO';
  const bumpIcon = o.status === 'nuevo' ? 'hand' : 'check';
  return (
    <div className={`ocard ${cls}${pulseCls}${o.bumping ? ' bumping' : ''}`}>
      <div className="ohead">
        <span className="ocode" style={{ color: critical ? '#ff6b6b' : (o.kind === 'LOC' ? 'var(--primary-light)' : 'var(--accent)') }}>{o.code}</span>
        <span className="otimer">{mmss(elapsed)}</span>
      </div>
      <div className="ozone">
        <Icon name="map-pin" size={15} color="var(--text-muted)" />{o.zone} · {o.seat}
        {o.staff && <span className="ostaff">{o.staff}</span>}
      </div>
      {o.licor && <div style={{ padding: '6px 15px 0' }}><span className="licor-tag">LICOR · SOLO MATRIZ</span></div>}
      <div className="oitems">
        {o.items.map((it, i) => <div className="oitem" key={i}><span className="oqty">{it.q}×</span>{it.n}</div>)}
      </div>
      <button className="obump" onClick={() => onBump(o.id)}><Icon name={bumpIcon} size={22} color="#fff" strokeWidth={2.5} />{bumpLabel}</button>
    </div>
  );
}

function KdsBoard() {
  const [orders, setOrders] = useState(() => kseed().map(o => ({ ...o, t0: Date.now() })));
  const [now, setNow] = useState(Date.now());
  const [clock, setClock] = useState('');

  useEffect(() => {
    const setC = () => setClock(new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: false }));
    setC();
    const t = setInterval(() => { setNow(Date.now()); setC(); }, 1000);
    return () => clearInterval(t);
  }, []);

  const bump = useCallback((id) => {
    setOrders(os => os.map(o => {
      if (o.id !== id) return o;
      if (o.status === 'nuevo') return { ...o, status: 'prep', start: 0, t0: Date.now() };
      return { ...o, bumping: true };
    }));
    setTimeout(() => setOrders(os => os.filter(o => !(o.id === id && o.bumping))), 420);
  }, []);

  const addOrder = () => {
    KSEQ += 1;
    const v = [{ kind: 'PUB', zone: 'Norte', seat: 'Fila ' + 'ABCDEFGH'[Math.floor(Math.random() * 8)] + ', S' + (1 + Math.floor(Math.random() * 20)), staff: null },
               { kind: 'LOC', zone: 'Sur', seat: 'Mesa ' + (1 + Math.floor(Math.random() * 12)), staff: ['Carlos', 'Ana', 'Luis'][Math.floor(Math.random() * 3)] }][Math.floor(Math.random() * 2)];
    const pool = ['Doble Smash', 'Classic Burger', 'Papas Fritas', 'Tequeños (6u)', 'Cerveza Polar', 'Alitas BBQ (8u)', 'Refresco 2L', 'Nachos Cheddar'];
    const items = Array.from({ length: 1 + Math.floor(Math.random() * 3) }).map(() => ({ q: 1 + Math.floor(Math.random() * 2), n: pool[Math.floor(Math.random() * pool.length)] }));
    kchime();
    setOrders(os => [{ id: Date.now(), code: v.kind + '-' + KSEQ, ...v, start: 0, t0: Date.now(), status: 'nuevo', items }, ...os]);
  };

  const stateOf = (o) => {
    const elapsed = o.start + (now - o.t0) / 1000;
    if (elapsed > 300 && o.status !== 'done') return 'crit';
    return o.status;
  };
  const cols = [
    { key: 'nuevo', label: 'NUEVO', cls: 'nuevo', dot: 'var(--accent)' },
    { key: 'prep', label: 'EN PREP', cls: 'prep', dot: 'var(--prep)' },
    { key: 'crit', label: 'CRÍTICO', cls: 'crit', dot: 'var(--alert)' },
  ];

  return (
    <div className="kds">
      <div className="kds-top">
        <img src="assets/logo-color.png" alt="" />
        <div><div className="kds-title">COCINA · SPORT BAR</div><div className="kds-sub">Guaiqueríes · Margarita · 2do Cuarto</div></div>
        <div style={{ marginLeft: 28 }}>
          <button className="btn" onClick={addOrder} style={{ height: 40, padding: '0 16px', borderRadius: 999, background: 'var(--accent)', color: '#000', fontSize: 16, letterSpacing: '.03em' }}><Icon name="plus" size={18} color="#000" strokeWidth={2.5} />SIMULAR</button>
        </div>
        <div className="kds-clock"><span className="kds-status-pill">● PARTIDO EN CURSO</span>{clock}</div>
      </div>
      <div className="kds-cols">
        {cols.map(c => {
          const list = orders.filter(o => stateOf(o) === c.key);
          return (
            <div key={c.key} className="kcol">
              <div className={'kcol-head ' + c.cls}>
                <span className="dot" style={{ background: c.dot }} />{c.label}
                <span className="kn">{list.length}</span>
              </div>
              <div className="kcol-body">
                {list.map(o => <KOrderCard key={o.id} o={o} now={now} onBump={bump} />)}
                {list.length === 0 && <div style={{ color: 'var(--text-faint)', fontSize: 13, padding: '8px 2px' }}>Sin pedidos</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { KdsBoard });
