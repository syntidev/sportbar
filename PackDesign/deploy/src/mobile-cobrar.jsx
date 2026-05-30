// SportBar — COBRAR (mobile) + payment sheet, and the navigable app root
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

function PaymentSheet({ order, onClose, onPaid }) {
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
                <button key={m.id} className={'method-btn' + (method === m.id ? ' sel' : '')} onClick={() => { setMethod(m.id); navigator.vibrate && navigator.vibrate(8); }}>
                  <Icon name={m.icon} size={26} color={method === m.id ? 'var(--primary-light)' : 'var(--text)'} />
                  <span className="ml">{m.label}</span>
                </button>
              ))}
            </div>
            <button className="btn btn-primary btn-block" style={{ marginTop: 16, opacity: method ? 1 : .4 }} disabled={!method} onClick={() => { setDone(true); navigator.vibrate && navigator.vibrate(20); }}>CONFIRMAR COBRO</button>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '14px 0 6px' }}>
            <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'var(--tint-primary)', border: '2px solid var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}><Icon name="check" size={42} color="var(--primary-light)" strokeWidth={3} /></div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: '.02em' }}>Pago registrado</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>{order.code} · {fmtRef(order.total)}</div>
            <button className="btn btn-primary btn-block" onClick={onPaid}>LISTO</button>
          </div>
        )}
      </div>
    </>
  );
}

function CobrarM({ onExit, toast }) {
  const [orders, setOrders] = useState(PAY_ORDERS);
  const [active, setActive] = useState(null);
  const pending = orders.reduce((s, o) => s + o.total, 0);
  const remove = (code, msg) => { setOrders(os => os.filter(o => o.code !== code)); toast(msg); };
  return (
    <div className="m-screen">
      <div className="m-head">
        <button className="btn m-back" onClick={onExit}><Icon name="arrow-left" size={20} /></button>
        <h2 className="m-title">Cobrar</h2>
        <span style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Por cobrar</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--accent)' }}>{fmtRef(pending)}</span>
        </span>
      </div>
      <div style={{ padding: '0 16px 6px', fontSize: 12, color: 'var(--text-muted)', flex: 'none' }}>Tasa BCV: {RATE.toFixed(2)} Bs/REF</div>
      <div className="m-scroll" style={{ padding: '6px 16px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {orders.map(o => (
          <div key={o.code} className={'pay-card ' + o.kind}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="pay-code" style={{ color: o.kind === 'loc' ? 'var(--primary-light)' : 'var(--accent)' }}>{o.code}</span>
                  {o.credit && <span className="credit-tag">CRÉDITO</span>}
                </div>
                <div className="pay-meta">{o.zone} · {o.seat}{o.staff ? ' · ' + o.staff : ''}</div>
              </div>
              <div style={{ textAlign: 'right' }}><div className="pay-total">{fmtRef(o.total)}</div><div className="pay-bs">{fmtBs(o.total)}</div></div>
            </div>
            <div className="pay-items">{o.items}</div>
            <div className="pay-actions">
              <button className="pbtn pbtn-cobrar" onClick={() => setActive(o)}><Icon name="banknote" size={18} color="#fff" />COBRAR</button>
              <button className="pbtn pbtn-fiar" onClick={() => remove(o.code, o.code + ' enviado a crédito')}><Icon name="clock" size={16} color="var(--accent)" />FIAR</button>
              <button className="pbtn pbtn-anular" onClick={() => remove(o.code, o.code + ' anulado')}><Icon name="trash-2" size={16} color="var(--alert)" />ANULAR</button>
            </div>
          </div>
        ))}
        {orders.length === 0 && <div className="empty-state"><Icon name="check-check" size={40} color="var(--primary-light)" /><div className="es-big">Todo cobrado</div><div style={{ fontSize: 13, marginTop: 4 }}>No quedan cuentas pendientes</div></div>}
      </div>
      {active && <PaymentSheet order={active} onClose={() => setActive(null)} onPaid={() => { remove(active.code, active.code + ' cobrado ✅'); setActive(null); }} />}
    </div>
  );
}

/* ============== APP ROOT ============== */
function MobileApp() {
  const [view, setView] = useState('login'); // login|home|nueva|sent|cobrar|comandas
  const [code, setCode] = useState('LOC-0117');
  const [toastMsg, setToastMsg] = useState(null);
  const toast = (m) => { setToastMsg(m); clearTimeout(window.__t); window.__t = setTimeout(() => setToastMsg(null), 2200); };

  return (
    <div className="m-app">
      {view === 'login' && <LoginM key="login" onDone={() => setView('home')} />}
      {view === 'home' && <HomeM key="home" onNew={() => setView('nueva')} onCobrar={() => setView('cobrar')} onComandas={() => setView('comandas')} toast={toast} />}
      {view === 'nueva' && <NuevaM key="nueva" onExit={() => setView('home')} onSend={() => { setCode('LOC-0' + (110 + Math.floor(Math.random() * 80))); setView('sent'); }} />}
      {view === 'sent' && <SentM key="sent" code={code} onDone={() => setView('nueva')} onHome={() => setView('home')} />}
      {view === 'comandas' && <ComandasM key="comandas" onExit={() => setView('home')} toast={toast} />}
      {view === 'cobrar' && <CobrarM key="cobrar" onExit={() => setView('home')} toast={toast} />}
      {toastMsg && <div className="m-toast">{toastMsg}</div>}
    </div>
  );
}
Object.assign(window, { PaymentSheet, METHODS, CobrarM });
ReactDOM.createRoot(document.getElementById('root')).render(<MobileApp />);
