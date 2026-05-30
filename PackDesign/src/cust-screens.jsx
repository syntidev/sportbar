// SportBar — CUSTOMER screens: Menu, CartSheet, Confirm, Ticket, MyTickets
const { useState, useRef, useEffect } = React;

// ---------- MENU ----------
function Menu({ cart, onAdd, onOpenCart, total, count, onTickets, ticketCount, seatLabel }) {
  const [active, setActive] = useState('destacados');
  const scrollRef = useRef(null);
  const secRefs = useRef({});
  const hero = CMENU.destacados.items[0];
  const featured = CMENU.destacados.items.slice(1);

  const go = (key) => {
    setActive(key);
    const el = secRefs.current[key];
    if (el && scrollRef.current) scrollRef.current.scrollTo({ top: el.offsetTop - 10, behavior: 'smooth' });
  };
  const onScroll = () => {
    const top = scrollRef.current.scrollTop + 80;
    let cur = CCAT_ORDER[0];
    for (const k of CCAT_ORDER) { if (secRefs.current[k] && secRefs.current[k].offsetTop <= top) cur = k; }
    setActive(cur);
  };

  return (
    <div className="m-screen">
      {/* sticky header */}
      <div className="cust-head">
        <img className="logo" src="assets/logo-color.png" alt="" />
        <div className="wm">SPORT BAR</div>
        <button className="cust-tickets-btn btn" onClick={onTickets} title="Mis pedidos">
          <Icon name="receipt" size={19} />
          {ticketCount > 0 && <span className="nb">{ticketCount}</span>}
        </button>
        <div className="cust-loc"><Icon name="map-pin" size={13} color="var(--accent)" />{seatLabel}</div>
      </div>

      {/* tabs */}
      <div className="cust-tabs">
        {CCAT_ORDER.map(k => (
          <button key={k} className={'cust-tab' + (active === k ? ' active' : '')} onClick={() => go(k)}>
            <span>{CMENU[k].emoji}</span>{CMENU[k].label}
          </button>
        ))}
      </div>

      <div className="m-scroll" ref={scrollRef} onScroll={onScroll} style={{ paddingBottom: 110 }}>
        {/* HERO */}
        <div ref={el => secRefs.current.destacados = el}>
          <div className="hero">
            <div className="hero-halo" />
            <div className="hero-wm">{hero.name.split(' ')[0].toUpperCase()}</div>
            <div className="hero-top">
              <div className="hero-price">{fmtRef(hero.ref)}<span className="sub">{fmtBs(hero.ref)}</span></div>
              <span className="social-pill"><Icon name="flame" size={13} color="var(--accent)" />{hero.pedidos} pedidos hoy</span>
            </div>
            <div className="hero-photo">
              <div className="hero-plate-wrap" style={{ width: 240, height: 200 }}>
                <PhotoSlot id={hero.slot} emoji={hero.emoji} size={236} circle={false} plain />
              </div>
            </div>
            <div className="hero-info">
              <div className="hero-name">{hero.name}</div>
              <div className="hero-desc">{hero.desc}</div>
              <button className="hero-cta" onClick={() => { navigator.vibrate && navigator.vibrate(14); onAdd(hero); }}>
                <Icon name="plus" size={22} color="#1a1308" strokeWidth={2.6} />AGREGAR AL PEDIDO
              </button>
            </div>
          </div>
        </div>

        {/* FEATURED RAIL */}
        <div className="sec-head"><span className="e">⭐</span><span className="t">Destacados</span></div>
        <div className="feat-rail">
          {featured.map(it => <FeaturedCard key={it.id} item={it} onAdd={onAdd} onOpen={onAdd} />)}
        </div>

        {/* CATEGORY LISTS */}
        {['hamburguesas', 'raciones', 'bebidas'].map(k => (
          <div key={k} ref={el => secRefs.current[k] = el}>
            <div className="sec-head"><span className="e">{CMENU[k].emoji}</span><span className="t">{CMENU[k].label}</span><span className="n">{CMENU[k].items.length} opciones</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 16px' }}>
              {CMENU[k].items.map(it => <ProdRow key={it.id} item={it} qty={cart[it.id]?.qty || 0} onAdd={onAdd} />)}
            </div>
          </div>
        ))}
        <div style={{ height: 8 }} />
      </div>

      {count > 0 && (
        <button className="cart-fab btn" onClick={onOpenCart}>
          <Icon name="shopping-bag" size={22} color="#1a1308" />
          <span className="lbl">VER PEDIDO</span>
          <span className="ct">{count}</span>
          <span className="tot">{fmtRef(total)}</span>
        </button>
      )}
    </div>
  );
}

// ---------- CART SHEET (with upsell) ----------
function CartSheet({ items, onClose, onQty, onAdd, total, onConfirm }) {
  const inCart = new Set(items.map(x => x.item.id));
  const upsell = CUPSELL.map(id => { for (const k of CCAT_ORDER) { const f = CMENU[k].items.find(i => i.id === id); if (f) return f; } return null; }).filter(Boolean).filter(i => !inCart.has(i.id));
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet">
        <div className="handle" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: '.02em' }}>Tu pedido</h2>
          <button className="btn" onClick={onClose} style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--surface-2)', color: 'var(--text-muted)' }}><Icon name="x" size={20} /></button>
        </div>
        <div style={{ overflowY: 'auto', flex: '0 1 auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
          {items.map(({ item, qty }) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 46, height: 46, borderRadius: 'var(--r-sm)', background: 'radial-gradient(circle at 38% 32%,#38291a,#15110d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flex: 'none' }}>{item.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{item.name}</div>
                <div style={{ fontSize: 13, color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>{fmtRef(item.ref * qty)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 999, padding: 4 }}>
                <button className="btn" onClick={() => onQty(item.id, -1)} style={{ width: 34, height: 34, borderRadius: '50%', background: 'transparent', border: '1px solid var(--alert)', color: 'var(--alert)', fontSize: 22 }}>−</button>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 21, minWidth: 18, textAlign: 'center' }}>{qty}</span>
                <button className="btn" onClick={() => onQty(item.id, 1)} style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--accent)', color: '#000', fontSize: 22 }}>+</button>
              </div>
            </div>
          ))}
        </div>

        {upsell.length > 0 && (
          <div style={{ flex: 'none', marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>¿Le sumas algo? 👇</div>
            <div className="upsell">
              {upsell.map(it => (
                <div key={it.id} className="up-chip" onClick={() => { navigator.vibrate && navigator.vibrate(8); onAdd(it); }}>
                  <span className="ue">{it.emoji}</span>
                  <div><div className="un">{it.name}</div><div className="ur">{fmtRef(it.ref)}</div></div>
                  <span className="uadd">+</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, flex: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Total</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 38, color: 'var(--accent)', lineHeight: 1 }}>{fmtRef(total)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            <span>Tasa BCV: {RATE.toFixed(2)} Bs/REF</span><span>{fmtBs(total)}</span>
          </div>
          <button className="btn btn-accent btn-block" onClick={onConfirm} style={{ marginTop: 14 }}>CONFIRMAR PEDIDO</button>
        </div>
      </div>
    </>
  );
}

// ---------- CONFIRM (QR pre-filled) ----------
function Confirm({ ctx, onBack, onGenerate }) {
  const [zona, setZona] = useState(ctx.zona);
  const [seat, setSeat] = useState(ctx.seat);
  const [name, setName] = useState('');
  const [cedula, setCedula] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const isVIP = zona === 'VIP';
  const valid = zona && seat.trim() && name.trim() && (!isVIP || cedula.trim());
  const fmtCedula = (v) => { const d = v.replace(/\D/g, '').slice(0, 8); return d ? 'V-' + d : ''; };
  const submit = () => { setLoading(true); navigator.vibrate && navigator.vibrate(20); setTimeout(() => onGenerate({ zona, seat, name, cedula, note }), 1300); };

  return (
    <div className="m-screen">
      <div className="m-head">
        <button className="btn m-back" onClick={onBack}><Icon name="arrow-left" size={20} /></button>
        <h2 className="m-title">Confirmar</h2>
      </div>
      <div className="m-scroll" style={{ padding: '4px 16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--tint-primary)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-md)', padding: '11px 13px' }}>
          <Icon name="qr-code" size={22} color="var(--primary-light)" />
          <div style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.35 }}>Detectamos tu ubicación por el QR. <b>Confírmala</b> y listo.</div>
        </div>
        <div>
          <label className="flabel">Zona</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {['NORTE', 'SUR', 'VIP', 'EXTERNA'].map(z => <button key={z} className={'btn zone-btn' + (zona === z ? ' sel' : '')} onClick={() => { setZona(z); navigator.vibrate && navigator.vibrate(10); }}>{z}</button>)}
          </div>
        </div>
        <div><label className="flabel">Asiento / Mesa <span style={{ color: 'var(--text-faint)' }}>· de tu ticket de entrada</span></label><input className="field" placeholder="Ej: Fila G, Silla 12" value={seat} onChange={e => setSeat(e.target.value)} /></div>
        <div><label className="flabel">Nombre</label><input className="field" placeholder="¿A nombre de quién?" value={name} onChange={e => setName(e.target.value)} /></div>
        {isVIP && <div className="slide-enter"><label className="flabel">Cédula <span style={{ color: 'var(--accent)' }}>· requerida VIP</span></label><input className="field" placeholder="V-XXXXXXXX" value={cedula} onChange={e => setCedula(fmtCedula(e.target.value))} inputMode="numeric" /></div>}
        <div><label className="flabel">Nota <span style={{ color: 'var(--text-faint)' }}>· opcional</span></label><input className="field" placeholder="Ej: sin cebolla" value={note} onChange={e => setNote(e.target.value)} /></div>
      </div>
      <div className="m-foot">
        <button className="btn btn-accent btn-block" disabled={!valid || loading} onClick={submit} style={{ opacity: valid && !loading ? 1 : .4 }}>
          {loading ? <><span className="spinner" />Generando ticket…</> : 'GENERAR TICKET'}
        </button>
      </div>
    </div>
  );
}

// ---------- TICKET (saved to phone as JSON) ----------
function Ticket({ order, onTrack, onTickets }) {
  const [confetti, setConfetti] = useState(true);
  const [showJson, setShowJson] = useState(false);
  useEffect(() => { const t = setTimeout(() => setConfetti(false), 2600); return () => clearTimeout(t); }, []);
  const json = JSON.stringify({ ticket: order.ticket, creado: order.createdAt, zona: order.zona, asiento: order.seat, items: order.items.map(i => ({ id: i.id, n: i.name, x: i.qty })), total_ref: order.totalRef, total_bs: order.totalBs, estado: order.status }, null, 2);
  return (
    <div className="m-screen" style={{ alignItems: 'center', justifyContent: 'flex-start' }}>
      <div className="m-scroll" style={{ width: '100%', padding: '24px 22px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <Confetti run={confetti} />
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--tint-primary)', border: '2px solid var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}><Icon name="check" size={44} color="var(--primary-light)" strokeWidth={3} /></div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Tu código de ticket</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 60, color: 'var(--accent)', letterSpacing: '.04em', lineHeight: 1, margin: '2px 0 8px' }}>{order.ticket}</div>
        <div className="ticket-saved"><Icon name="smartphone" size={14} color="var(--primary-light)" />Guardado en tu teléfono</div>

        <div className="ticket-card" style={{ marginTop: 16 }}>
          <div className="ticket-row"><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Zona / Asiento</span><span style={{ fontSize: 14 }}>{order.zona} · {order.seat}</span></div>
          <div className="ticket-row"><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Artículos</span><span style={{ fontSize: 14 }}>{order.items.reduce((s, i) => s + i.qty, 0)} productos</span></div>
          <div className="ticket-row"><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total</span><span style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--accent)' }}>{fmtRef(order.totalRef)}</span></div>
        </div>

        <div style={{ fontSize: 15, marginTop: 16 }}>Tu pedido está en camino 🏀</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, color: 'var(--text-muted)', fontSize: 13 }}><Icon name="clock" size={15} />Listo en ~8 min · te avisamos</div>

        <button className="btn" onClick={() => setShowJson(s => !s)} style={{ marginTop: 18, height: 40, padding: '0 14px', borderRadius: 999, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12, gap: 7 }}>
          <Icon name="braces" size={15} color="var(--primary-light)" />{showJson ? 'Ocultar' : 'Ver'} registro local (JSON)
        </button>
        {showJson && <pre className="json-peek" style={{ marginTop: 10 }}>{json}</pre>}

        <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 20 }}>
          <button className="btn" onClick={onTickets} style={{ flex: 1, height: 52, borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--border-strong)', color: 'var(--text)', fontSize: 17 }}>MIS PEDIDOS</button>
          <button className="btn" onClick={onTrack} style={{ flex: 1, height: 52, borderRadius: 'var(--r-md)', background: 'var(--primary)', color: '#fff', fontSize: 17, boxShadow: 'var(--glow-primary)' }}>SEGUIR PIDIENDO</button>
        </div>
      </div>
    </div>
  );
}

// ---------- MY TICKETS (reads localStorage) ----------
function MyTickets({ orders, onBack, onClear }) {
  return (
    <div className="m-screen">
      <div className="m-head">
        <button className="btn m-back" onClick={onBack}><Icon name="arrow-left" size={20} /></button>
        <h2 className="m-title">Mis pedidos</h2>
        {orders.length > 0 && <button className="btn" onClick={onClear} style={{ marginLeft: 'auto', height: 36, padding: '0 12px', borderRadius: 999, background: 'transparent', border: '1px solid rgba(198,40,40,.4)', color: 'var(--alert)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12 }}>Borrar</button>}
      </div>
      <div className="m-scroll" style={{ padding: '6px 16px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Guardados en este teléfono · {orders.length} {orders.length === 1 ? 'registro' : 'registros'}</div>
        {orders.slice().reverse().map(o => (
          <div key={o.ticket} className="mt-card">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mt-code">{o.ticket}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{o.zona} · {o.seat} · {o.items.reduce((s, i) => s + i.qty, 0)} prod.</div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 1 }}>{new Date(o.createdAt).toLocaleString('es-VE')}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--accent)' }}>{fmtRef(o.totalRef)}</div>
              <div style={{ fontSize: 10, color: 'var(--primary-light)' }}>● {o.status}</div>
            </div>
          </div>
        ))}
        {orders.length === 0 && <div className="empty-state"><Icon name="receipt" size={40} color="var(--text-faint)" /><div className="es-big">Sin pedidos aún</div><div style={{ fontSize: 13, marginTop: 4 }}>Tus tickets se guardarán aquí</div></div>}
      </div>
    </div>
  );
}

Object.assign(window, { Menu, CartSheet, Confirm, Ticket, MyTickets });
