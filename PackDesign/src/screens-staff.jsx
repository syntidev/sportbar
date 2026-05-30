// SportBar — staff screens: HOME, NUEVA ORDEN step 1 (categorías), step 4 (datos)
const { useState } = React;

// ---------------- 1 · HOME ----------------
function StaffHome() {
  const stats = [
    { v: '5', k: 'Pendientes', c: 'var(--accent)' },
    { v: '2', k: 'Crédito', c: 'var(--text)' },
    { v: '18', k: 'Cobrados', c: 'var(--primary-light)' },
    { v: '240', k: 'Total REF', c: 'var(--accent)' },
  ];
  return (
    <div className="screen">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px 10px', flex: 'none', position: 'relative', zIndex: 1 }}>
        <img src="assets/logo-color.png" style={{ width: 38, height: 38 }} alt="" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Bienvenido</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: '.02em', lineHeight: 1 }}>CARLOS · MESERO</div>
        </div>
        <span className="pulse-dot" />
      </div>

      <div className="scroll" style={{ padding: '6px 16px 20px', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', zIndex: 1 }}>
        <div className="action-card" style={{ background: 'var(--primary)', animationDelay: '0s' }}>
          <span className="ac-icon"><Icon name="utensils-crossed" size={40} color="#fff" /></span>
          <div><div className="ac-title">NUEVA ORDEN</div><div className="ac-sub">Tomar pedido en mesa</div></div>
          <Icon name="chevron-right" size={26} color="rgba(255,255,255,.6)" style={{ marginLeft: 'auto' }} />
        </div>
        <div className="action-card" style={{ background: '#16202e', border: '1px solid rgba(255,255,255,.06)', animationDelay: '.08s' }}>
          <span className="ac-icon"><Icon name="clipboard-list" size={40} color="#fff" /></span>
          <div><div className="ac-title">COMANDAS</div><div className="ac-sub">Pedidos en cocina</div></div>
          <span className="ac-badge" style={{ background: 'var(--alert)' }}>7</span>
        </div>
        <div className="action-card" style={{ background: '#241a12', border: '1px solid var(--accent)', animationDelay: '.16s' }}>
          <span className="ac-icon"><Icon name="credit-card" size={40} color="var(--accent)" /></span>
          <div><div className="ac-title" style={{ color: 'var(--accent)' }}>COBRAR</div><div className="ac-sub">Cuentas por cobrar</div></div>
          <span className="ac-badge" style={{ background: 'var(--accent)', color: '#000' }}>3</span>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          {stats.map(s => (
            <div key={s.k} className="stat-chip"><div className="stat-v" style={{ color: s.c }}>{s.v}</div><div className="stat-k">{s.k}</div></div>
          ))}
        </div>
      </div>
    </div>
  );
}

const CAT_META = {
  hamburguesas: { icon: 'beef', label: 'Hamburguesas' },
  raciones: { icon: 'drumstick', label: 'Raciones' },
  bebidas: { icon: 'beer', label: 'Bebidas' },
};

// ---------------- 2 · NUEVA ORDEN · paso 1 (categorías) ----------------
function NuevaStep1() {
  const [sel, setSel] = useState(null);
  return (
    <div className="screen">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px 4px', flex: 'none' }}>
        <button className="btn" style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--surface-2)', color: 'var(--text)' }}><Icon name="arrow-left" size={20} /></button>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>Nueva orden</h2>
      </div>
      <div className="progress">
        <div className="progress-track"><div className="progress-fill" style={{ width: '25%' }} /></div>
        <span className="progress-label">Paso 1 de 4</span>
      </div>
      <div style={{ padding: '4px 16px 8px', fontSize: 13, color: 'var(--text-muted)', flex: 'none' }}>¿Qué va a pedir el cliente?</div>
      <div className="scroll" style={{ padding: '4px 16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Object.entries(CAT_META).map(([k, m]) => (
          <div key={k} className="cat-card" onClick={() => setSel(k)} style={sel === k ? { borderColor: 'var(--primary-light)', boxShadow: 'var(--glow-primary)', background: 'var(--surface-2)' } : null}>
            <Icon name={m.icon} size={40} color="var(--primary-light)" />
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '.02em', lineHeight: 1 }}>{m.label}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{MENU[k].items.length} productos</div>
            </div>
            <Icon name="chevron-right" size={26} color="var(--text-faint)" style={{ marginLeft: 'auto' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- 3 · NUEVA ORDEN · paso 4 (datos del cliente) ----------------
function NuevaStep4() {
  const [zona, setZona] = useState('SUR');
  const [seat, setSeat] = useState('Mesa 4');
  const [name, setName] = useState('');
  const ready = zona && seat.trim() && name.trim() && (zona !== 'VIP' || true);
  return (
    <div className="screen">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px 4px', flex: 'none' }}>
        <button className="btn" style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--surface-2)', color: 'var(--text)' }}><Icon name="arrow-left" size={20} /></button>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>Datos del cliente</h2>
      </div>
      <div className="progress">
        <div className="progress-track"><div className="progress-fill" style={{ width: '100%' }} /></div>
        <span className="progress-label">Paso 4 de 4</span>
      </div>
      <div className="scroll" style={{ padding: '8px 16px 20px', display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
        <div>
          <label className="flabel">Zona</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {['NORTE', 'SUR', 'VIP', 'EXTERNA'].map(z => (
              <button key={z} className={'btn zone-btn' + (zona === z ? ' sel' : '')} onClick={() => setZona(z)}>{z}</button>
            ))}
          </div>
        </div>
        <div><label className="flabel">Asiento / Mesa</label><input className="field" placeholder="Ej: Fila G, Silla 12" value={seat} onChange={e => setSeat(e.target.value)} /></div>
        <div><label className="flabel">Nombre</label><input className="field" placeholder="Nombre del cliente" value={name} onChange={e => setName(e.target.value)} /></div>
        {zona === 'VIP' && (
          <div className="slide-enter"><label className="flabel">Cédula <span style={{ color: 'var(--accent)' }}>· requerida VIP</span></label><input className="field" placeholder="V-XXXXXXXX" inputMode="numeric" /></div>
        )}
      </div>
      <div style={{ padding: '10px 16px 18px', borderTop: '1px solid var(--border)', flex: 'none' }}>
        <button className="btn btn-accent btn-block" style={{ opacity: ready ? 1 : .4 }}>ENVIAR COMANDA</button>
      </div>
    </div>
  );
}

Object.assign(window, { StaffHome, NuevaStep1, NuevaStep4 });
