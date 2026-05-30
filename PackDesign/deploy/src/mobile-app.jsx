// SportBar — full-screen navigable mobile POS app (express selling flow)
const { useState, useEffect, useRef, useMemo } = React;

const PIN_OK = '1234';

/* ============== LOGIN ============== */
function LoginM({ onDone }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState(false);
  const press = (d) => {
    if (pin.length >= 4) return;
    const next = pin + d; setErr(false); setPin(next);
    if (next.length === 4) setTimeout(() => {
      if (next === PIN_OK) { navigator.vibrate && navigator.vibrate(20); onDone(); }
      else { setErr(true); navigator.vibrate && navigator.vibrate(60); setTimeout(() => { setErr(false); setPin(''); }, 500); }
    }, 150);
  };
  const keys = ['1','2','3','4','5','6','7','8','9','clear','0','del'];
  return (
    <div className="m-screen" style={{ alignItems: 'center' }}>
      <div className="login-bg">
        <svg viewBox="0 0 390 760" preserveAspectRatio="xMidYMid slice" fill="none" stroke="#2E7D32" strokeWidth="2">
          <rect x="16" y="30" width="358" height="700" rx="8" /><line x1="16" y1="380" x2="374" y2="380" />
          <circle cx="195" cy="380" r="64" /><circle cx="195" cy="380" r="6" />
          <rect x="115" y="30" width="160" height="130" /><rect x="115" y="600" width="160" height="130" />
          <path d="M115 30 A130 130 0 0 0 275 30" /><path d="M115 730 A130 130 0 0 1 275 730" />
        </svg>
      </div>
      <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '40px 24px 22px', overflow: 'hidden auto' }}>
        <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <img src="assets/logo-color.png" style={{ width: 88, height: 88, marginBottom: 14, filter: 'drop-shadow(0 10px 24px rgba(0,0,0,.6))' }} alt="" />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 46, letterSpacing: '.03em', lineHeight: .92 }}>SPORT BAR</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Guaiqueríes de Margarita · Café ConBike</div>
        </div>
        <div style={{ flex: 'none', marginTop: 'auto', paddingTop: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <div style={{ fontSize: 13, color: err ? 'var(--alert)' : 'var(--text-muted)', marginBottom: 16, height: 18 }}>{err ? 'PIN incorrecto, intenta de nuevo' : 'Ingresa tu PIN de empleado'}</div>
          <div className={'pin-dots' + (err ? ' shake' : '')} style={{ marginBottom: 28 }}>
            {[0,1,2,3].map(i => <div key={i} className={'pin-dot' + (err ? ' err' : pin.length > i ? ' on' : '')} />)}
          </div>
          <div className="pin-grid">
            {keys.map((k, i) => {
              if (k === 'clear') return <button key={i} className="pin-key" style={{ fontSize: 15, fontFamily: 'var(--font-body)', color: 'var(--text-muted)' }} onClick={() => { setPin(''); setErr(false); }}>BORRAR</button>;
              if (k === 'del') return <button key={i} className="pin-key" onClick={() => { setErr(false); setPin(p => p.slice(0, -1)); }}><Icon name="delete" size={28} color="var(--text-muted)" /></button>;
              return <button key={i} className="pin-key" onClick={() => press(k)}>{k}</button>;
            })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 20 }}>PIN demo: 1234</div>
        </div>
      </div>
    </div>
  );
}

/* ============== HOME ============== */
function HomeM({ onNew, onCobrar, onComandas, toast }) {
  const stats = [
    { v: '5', k: 'Pendientes', c: 'var(--accent)' },
    { v: '2', k: 'Crédito', c: 'var(--text)' },
    { v: '18', k: 'Cobrados', c: 'var(--primary-light)' },
    { v: '240', k: 'Total REF', c: 'var(--accent)' },
  ];
  return (
    <div className="m-screen">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 16px 10px', flex: 'none' }}>
        <img src="assets/logo-color.png" style={{ width: 40, height: 40 }} alt="" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Bienvenido</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 25, letterSpacing: '.02em', lineHeight: 1 }}>CARLOS · MESERO</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary-light)', background: 'var(--tint-primary)', border: '1px solid var(--border-strong)', borderRadius: 999, padding: '6px 11px' }}>● 2do CUARTO</span>
      </div>
      <div className="m-scroll" style={{ padding: '6px 16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="action-card" style={{ background: 'var(--primary)' }} onClick={onNew}>
          <span className="ac-icon"><Icon name="utensils-crossed" size={40} color="#fff" /></span>
          <div><div className="ac-title">NUEVA ORDEN</div><div className="ac-sub">Tomar pedido en mesa</div></div>
          <Icon name="chevron-right" size={26} color="rgba(255,255,255,.6)" style={{ marginLeft: 'auto' }} />
        </div>
        <div className="action-card" style={{ background: '#16202e', border: '1px solid rgba(255,255,255,.06)' }} onClick={onComandas}>
          <span className="ac-icon"><Icon name="clipboard-list" size={40} color="#fff" /></span>
          <div><div className="ac-title">COMANDAS</div><div className="ac-sub">Tu tablero de servicio</div></div>
          <span className="ac-badge" style={{ background: 'var(--alert)' }}>2</span>
        </div>
        <div className="action-card" style={{ background: '#241a12', border: '1px solid var(--accent)' }} onClick={onCobrar}>
          <span className="ac-icon"><Icon name="credit-card" size={40} color="var(--accent)" /></span>
          <div><div className="ac-title" style={{ color: 'var(--accent)' }}>COBRAR</div><div className="ac-sub">Cuentas por cobrar</div></div>
          <span className="ac-badge" style={{ background: 'var(--accent)', color: '#000' }}>3</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          {stats.map(s => <div key={s.k} className="stat-chip"><div className="stat-v" style={{ color: s.c }}>{s.v}</div><div className="stat-k">{s.k}</div></div>)}
        </div>
      </div>
    </div>
  );
}

/* ============== PRODUCT ROW ============== */
function Row({ item, qty, onAdd }) {
  const [pop, setPop] = useState(false);
  const add = (e) => { e.stopPropagation(); setPop(true); navigator.vibrate && navigator.vibrate(10); onAdd(item); setTimeout(() => setPop(false), 340); };
  return (
    <div className={'list-row' + (qty ? ' in' : '')} onClick={add}>
      <div className="lr-emoji">{item.emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="lr-name">{item.name}
          {item.licor && <span className="licor-mini">LICOR</span>}
          {item.hot && <span className="hot-mini">🔥</span>}
        </div>
        <div className="lr-desc">{item.desc}</div>
        <div className="lr-price">{fmtRef(item.ref)}</div>
      </div>
      {qty > 0 && <span className="qbadge">×{qty}</span>}
      <button className={'btn lr-add' + (pop ? ' pop' : '')}>+</button>
    </div>
  );
}

/* ============== NUEVA ORDEN (wizard) ============== */
function NuevaM({ onExit, onSend }) {
  const [step, setStep] = useState(1);
  const [cat, setCat] = useState('hamburguesas');
  const [q, setQ] = useState('');
  const [focus, setFocus] = useState(false);
  const [cart, setCart] = useState({});
  const [zona, setZona] = useState(null);
  const [seat, setSeat] = useState('');
  const [name, setName] = useState('');
  const [sending, setSending] = useState(false);
  const searchRef = useRef(null);

  const add = (it) => setCart(c => ({ ...c, [it.id]: { item: it, qty: (c[it.id]?.qty || 0) + 1 } }));
  const chgQty = (id, d) => setCart(c => { const n = (c[id]?.qty || 0) + d; if (n <= 0) { const x = { ...c }; delete x[id]; return x; } return { ...c, [id]: { ...c[id], qty: n } }; });
  const items = Object.values(cart);
  const count = items.reduce((s, x) => s + x.qty, 0);
  const total = items.reduce((s, x) => s + x.item.ref * x.qty, 0);
  const back = () => step === 1 ? onExit() : setStep(step - 1);

  const query = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (query) return ALL_ITEMS.filter(it => (it.name + ' ' + it.desc).toLowerCase().includes(query));
    return MENU[cat].items;
  }, [query, cat]);

  const ready = zona && seat.trim() && name.trim();

  return (
    <div className="m-screen">
      <div className="m-head">
        <button className="btn m-back" onClick={back}><Icon name="arrow-left" size={20} /></button>
        <h2 className="m-title">{step === 4 ? 'Datos del cliente' : step === 3 ? 'Revisar comanda' : 'Nueva orden'}</h2>
        {count > 0 && step < 3 && <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--accent)' }}>{fmtRef(total)}</span>}
      </div>
      <div className="progress">
        <div className="progress-track"><div className="progress-fill" style={{ width: (step / 4 * 100) + '%' }} /></div>
        <span className="progress-label">Paso {step} de 4</span>
      </div>

      {/* STEP 1 — categories */}
      {step === 1 && (
        <div className="m-scroll" style={{ padding: '6px 16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>¿Qué va a pedir el cliente?</div>
          {Object.entries(CAT_META).map(([k, m]) => (
            <div key={k} className="cat-card" onClick={() => { setCat(k); setQ(''); setStep(2); }}>
              <Icon name={m.icon} size={40} color="var(--primary-light)" />
              <div><div style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '.02em', lineHeight: 1 }}>{m.label}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{MENU[k].items.length} productos</div></div>
              <Icon name="chevron-right" size={26} color="var(--text-faint)" style={{ marginLeft: 'auto' }} />
            </div>
          ))}
          <button className="btn" onClick={() => { setStep(2); setTimeout(() => searchRef.current && searchRef.current.focus(), 350); }} style={{ marginTop: 4, height: 52, borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px dashed var(--border-strong)', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15, gap: 8 }}>
            <Icon name="search" size={20} color="var(--primary-light)" /> Buscar en todo el menú
          </button>
        </div>
      )}

      {/* STEP 2 — products + SEARCH */}
      {step === 2 && (
        <>
          <div className="search-wrap">
            <div className={'search-box' + (focus ? ' focus' : '')}>
              <Icon name="search" size={20} color={focus || query ? 'var(--primary-light)' : 'var(--text-faint)'} />
              <input ref={searchRef} value={q} onChange={e => setQ(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} placeholder="Buscar producto…" inputMode="search" />
              {q && <button className="btn search-clear" onClick={() => setQ('')}><Icon name="x" size={16} /></button>}
            </div>
          </div>
          {!query && (
            <div className="tabs">
              {Object.entries(CAT_META).map(([k, m]) => <button key={k} className={'tab' + (cat === k ? ' active' : '')} onClick={() => setCat(k)}>{m.emoji} {m.label}</button>)}
            </div>
          )}
          {query && <div style={{ padding: '0 16px 8px', fontSize: 12, color: 'var(--text-muted)' }}>{results.length} resultado{results.length === 1 ? '' : 's'} para “{q.trim()}”</div>}
          <div className="m-scroll" style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {results.map(it => <Row key={it.id} item={it} qty={cart[it.id]?.qty || 0} onAdd={add} />)}
            {results.length === 0 && (
              <div className="empty-state"><Icon name="search-x" size={40} color="var(--text-faint)" /><div className="es-big">Sin resultados</div><div style={{ fontSize: 13, marginTop: 4 }}>Prueba con otro nombre</div></div>
            )}
          </div>
          {count > 0 && (
            <div className="minibar">
              <Icon name="shopping-bag" size={20} color="var(--primary-light)" />
              <span className="ct">{count}</span>
              <span className="mb-total">{fmtRef(total)}</span>
              <button className="btn" onClick={() => setStep(3)} style={{ height: 46, padding: '0 20px', borderRadius: 999, background: 'var(--primary)', color: '#fff', fontFamily: 'var(--font-display)', fontSize: 19, letterSpacing: '.03em', boxShadow: 'var(--glow-primary)' }}>REVISAR</button>
            </div>
          )}
        </>
      )}

      {/* STEP 3 — review */}
      {step === 3 && (
        <>
          <div className="m-scroll" style={{ padding: '8px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map(({ item, qty: qn }) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="lr-emoji" style={{ width: 48, height: 48, fontSize: 24 }}>{item.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 15, fontWeight: 600 }}>{item.name}</div><div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--accent)' }}>{fmtRef(item.ref * qn)}</div></div>
                <div className="stepper">
                  <button className="btn st-minus" onClick={() => chgQty(item.id, -1)}>−</button>
                  <span className="st-q">{qn}</span>
                  <button className="btn st-plus" onClick={() => chgQty(item.id, 1)}>+</button>
                </div>
              </div>
            ))}
            {items.length === 0 && <div className="empty-state"><div className="es-big">Comanda vacía</div></div>}
          </div>
          <div className="m-foot">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Total</span><span style={{ fontFamily: 'var(--font-display)', fontSize: 34, color: 'var(--accent)', lineHeight: 1 }}>{fmtRef(total)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}><span>Tasa BCV: {RATE.toFixed(2)} Bs/REF</span><span>{fmtBs(total)}</span></div>
            <button className="btn btn-primary btn-block" disabled={!items.length} style={{ marginTop: 12, opacity: items.length ? 1 : .4 }} onClick={() => setStep(4)}>CONTINUAR</button>
          </div>
        </>
      )}

      {/* STEP 4 — customer data */}
      {step === 4 && (
        <>
          <div className="m-scroll" style={{ padding: '8px 16px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label className="flabel">Zona</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {['NORTE','SUR','VIP','EXTERNA'].map(z => <button key={z} className={'btn zone-btn' + (zona === z ? ' sel' : '')} onClick={() => { setZona(z); navigator.vibrate && navigator.vibrate(10); }}>{z}</button>)}
              </div>
            </div>
            <div><label className="flabel">Asiento / Mesa</label><input className="field" placeholder="Ej: Fila G, Silla 12" value={seat} onChange={e => setSeat(e.target.value)} /></div>
            <div><label className="flabel">Nombre</label><input className="field" placeholder="Nombre del cliente" value={name} onChange={e => setName(e.target.value)} /></div>
            {zona === 'VIP' && <div className="slide-enter"><label className="flabel">Cédula <span style={{ color: 'var(--accent)' }}>· requerida VIP</span></label><input className="field" placeholder="V-XXXXXXXX" inputMode="numeric" /></div>}
          </div>
          <div className="m-foot">
            <button className="btn btn-accent btn-block" disabled={!ready || sending} style={{ opacity: ready && !sending ? 1 : .4 }} onClick={() => { setSending(true); navigator.vibrate && navigator.vibrate(20); setTimeout(onSend, 1100); }}>
              {sending ? <><span className="spinner" />Enviando…</> : 'ENVIAR COMANDA'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ============== SENT ============== */
function SentM({ code, onDone, onHome }) {
  const [conf, setConf] = useState(true);
  useEffect(() => { const t = setTimeout(() => setConf(false), 2400); return () => clearTimeout(t); }, []);
  return (
    <div className="m-screen" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 26 }}>
      <Confetti run={conf} />
      <div style={{ width: 86, height: 86, borderRadius: '50%', background: 'var(--tint-primary)', border: '2px solid var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}><Icon name="check" size={48} color="var(--primary-light)" strokeWidth={3} /></div>
      <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Comanda enviada a cocina 🏀</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 62, color: 'var(--primary-light)', letterSpacing: '.04em', lineHeight: 1, margin: '4px 0 4px' }}>{code}</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 22 }}>Tu pedido está en camino</div>
      <button className="btn btn-primary btn-block" style={{ maxWidth: 340 }} onClick={onDone}>NUEVA ORDEN</button>
      <button className="btn" onClick={onHome} style={{ width: '100%', maxWidth: 340, height: 50, marginTop: 10, borderRadius: 'var(--r-md)', background: 'transparent', border: '1px solid var(--border-strong)', color: 'var(--text-muted)', fontSize: 16 }}>VOLVER AL INICIO</button>
    </div>
  );
}

Object.assign(window, { LoginM, HomeM, NuevaM, SentM });
