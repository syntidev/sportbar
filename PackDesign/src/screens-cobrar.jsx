// SportBar — COBRAR (cuentas por cobrar) + payment sheet
const { useState } = React;

const PAY_ORDERS = [
  { code: 'LOC-117', kind: 'loc', zone: 'Sur', seat: 'Mesa 4', staff: 'Carlos', items: '2× Classic Burger · 1× Nachos Cheddar', total: 17.5, credit: false },
  { code: 'PUB-231', kind: 'pub', zone: 'VIP', seat: 'Box 2', staff: null, items: '1× Doble Smash · 2× Cerveza Polar · 1× Papas Fritas', total: 17.5, credit: false },
  { code: 'LOC-119', kind: 'loc', zone: 'VIP', seat: 'Box 1', staff: 'Ana', items: '2× Cuba Libre · 1× Tequeños (6u)', total: 17.0, credit: true },
];

const METHODS = [
  { id: 'efectivo', label: 'EFECTIVO Bs', icon: 'banknote' },
  { id: 'divisas', label: 'DIVISAS $', icon: 'dollar-sign' },
  { id: 'pago-movil', label: 'PAGO MÓVIL', icon: 'smartphone' },
  { id: 'punto', label: 'PUNTO DE VENTA', icon: 'credit-card' },
  { id: 'zelle', label: 'ZELLE', icon: 'send' },
  { id: 'transferencia', label: 'TRANSFERENCIA', icon: 'building-2' },
];

function PaymentSheet({ order, onClose }) {
  const [method, setMethod] = useState(null);
  const [done, setDone] = useState(false);
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet">
        <div className="handle" />
        {!done ? (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '.03em' }}>Cobrar {order.code}</div>
              <button className="btn" onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, background: 'var(--surface-2)', color: 'var(--text-muted)' }}><Icon name="x" size={18} /></button>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: 'var(--accent)', lineHeight: 1 }}>{fmtRef(order.total)}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtBs(order.total)}</span>
            </div>
            <div className="flabel">Método de pago</div>
            <div className="method-grid">
              {METHODS.map(m => (
                <button key={m.id} className={'method-btn' + (method === m.id ? ' sel' : '')} onClick={() => setMethod(m.id)}>
                  <Icon name={m.icon} size={26} color={method === m.id ? 'var(--primary-light)' : 'var(--text)'} />
                  <span className="ml">{m.label}</span>
                </button>
              ))}
            </div>
            <button className="btn btn-primary btn-block" style={{ marginTop: 16, opacity: method ? 1 : .4 }} disabled={!method} onClick={() => setDone(true)}>CONFIRMAR COBRO</button>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '14px 0 6px' }}>
            <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'var(--tint-primary)', border: '2px solid var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}><Icon name="check" size={42} color="var(--primary-light)" strokeWidth={3} /></div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: '.02em' }}>Pago registrado</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>{order.code} · {fmtRef(order.total)}</div>
            <button className="btn btn-primary btn-block" onClick={onClose}>LISTO</button>
          </div>
        )}
      </div>
    </>
  );
}

function Cobrar() {
  const [active, setActive] = useState(null);
  const pending = PAY_ORDERS.reduce((s, o) => s + o.total, 0);
  return (
    <div className="screen">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px 4px', flex: 'none' }}>
        <button className="btn" style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--surface-2)', color: 'var(--text)' }}><Icon name="arrow-left" size={20} /></button>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: '.02em' }}>Cobrar</h2>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>Por cobrar <b style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--accent)', marginLeft: 4 }}>{fmtRef(pending)}</b></span>
      </div>
      <div style={{ padding: '0 16px 6px', fontSize: 12, color: 'var(--text-muted)', flex: 'none' }}>Tasa BCV: {RATE.toFixed(2)} Bs/REF</div>
      <div className="scroll" style={{ padding: '6px 16px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {PAY_ORDERS.map(o => (
          <div key={o.code} className={'pay-card ' + o.kind}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="pay-code" style={{ color: o.kind === 'loc' ? 'var(--primary-light)' : 'var(--accent)' }}>{o.code}</span>
                  {o.credit && <span className="credit-tag">CRÉDITO</span>}
                </div>
                <div className="pay-meta">{o.zone} · {o.seat}{o.staff ? ' · ' + o.staff : ''}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="pay-total">{fmtRef(o.total)}</div>
                <div className="pay-bs">{fmtBs(o.total)}</div>
              </div>
            </div>
            <div className="pay-items">{o.items}</div>
            <div className="pay-actions">
              <button className="pbtn pbtn-cobrar" onClick={() => setActive(o)}><Icon name="banknote" size={18} color="#fff" />COBRAR</button>
              <button className="pbtn pbtn-fiar"><Icon name="clock" size={16} color="var(--accent)" />FIAR</button>
              <button className="pbtn pbtn-anular"><Icon name="trash-2" size={16} color="var(--alert)" />ANULAR</button>
            </div>
          </div>
        ))}
      </div>
      {active && <PaymentSheet order={active} onClose={() => setActive(null)} />}
    </div>
  );
}

Object.assign(window, { Cobrar });
