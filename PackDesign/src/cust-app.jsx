// SportBar — CUSTOMER app shell: QR landing → menu → cart → confirm → ticket
const { useState, useEffect } = React;

const LS_KEY = 'sportbar_pub_orders';
const loadOrders = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch (e) { return []; } };
const saveOrders = (a) => { try { localStorage.setItem(LS_KEY, JSON.stringify(a)); } catch (e) {} };

// simulated QR-decoded context (zona + asiento del ticket de entrada)
const QR_CTX = { zona: 'NORTE', seat: 'Fila G, Silla 12' };

function Landing({ ctx, onEnter }) {
  return (
    <div className="m-screen landing-vip" style={{ alignItems: 'center' }}>
      {/* court texture — cancha de baloncesto al fondo */}
      <div className="login-bg">
        <svg viewBox="0 0 390 760" preserveAspectRatio="xMidYMid slice" fill="none" stroke="#2E7D32" strokeWidth="1.5">
          <rect x="16" y="30" width="358" height="700" rx="8" />
          <line x1="16" y1="380" x2="374" y2="380" />
          <circle cx="195" cy="380" r="64" />
          <circle cx="195" cy="380" r="6" fill="#2E7D32" fillOpacity=".4" />
          <rect x="120" y="30"  width="150" height="118" />
          <rect x="120" y="612" width="150" height="118" />
          <line x1="120" y1="88"  x2="270" y2="88" />
          <line x1="120" y1="662" x2="270" y2="662" />
        </svg>
      </div>

      {/* contenido central */}
      <div className="landing-body">

        {/* logo sin marco — mix-blend-mode:screen en CSS */}
        <div className="landing-logo-wrap">
          <img
            src="assets/logo-color.png"
            className="float-pulse"
            style={{ width: 118, height: 118 }}
            alt="Sport Bar"
          />
        </div>

        {/* wordmark VIP */}
        <div className="landing-wordmark">SPORT BAR</div>
        <div className="landing-sub">Guaiqueríes · Margarita</div>

        {/* separador dorado */}
        <div className="landing-divider">
          <span />ESTADIO DE BALONCESTO<span />
        </div>

        {/* live status */}
        <div className="landing-live">
          <span className="pulse-dot" />
          PARTIDO EN CURSO · 2do Cuarto
        </div>

        {/* asiento detectado del QR */}
        <div className="landing-seat">
          <Icon name="map-pin" size={15} color="var(--accent)" />
          <span>Asiento: <strong>{ctx.zona} · {ctx.seat}</strong></span>
        </div>
      </div>

      {/* CTA inferior */}
      <div className="landing-footer">
        <button className="btn btn-accent btn-block landing-cta" onClick={onEnter}>
          <Icon name="utensils" size={20} color="#1a1308" strokeWidth={2.4} />
          VER MENÚ
        </button>
        <div className="landing-hint">
          <span className="pulse-dot" style={{ width: 6, height: 6 }} />
          Pedido directo · sin esperar al mesero
          <span className="pulse-dot" style={{ width: 6, height: 6 }} />
        </div>
      </div>
    </div>
  );
}

function CustApp() {
  const [view, setView] = useState('landing'); // landing|menu|confirm|ticket|tickets
  const [cart, setCart] = useState({});
  const [sheet, setSheet] = useState(false);
  const [orders, setOrders] = useState(loadOrders);
  const [lastOrder, setLastOrder] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const toast = (m) => { setToastMsg(m); clearTimeout(window.__ct); window.__ct = setTimeout(() => setToastMsg(null), 1800); };

  const add = (item) => { setCart(c => ({ ...c, [item.id]: { item, qty: (c[item.id]?.qty || 0) + 1 } })); toast(item.name + ' agregado'); };
  const qty = (id, d) => setCart(c => { const n = (c[id]?.qty || 0) + d; if (n <= 0) { const x = { ...c }; delete x[id]; return x; } return { ...c, [id]: { ...c[id], qty: n } }; });
  const items = Object.values(cart);
  const count = items.reduce((s, x) => s + x.qty, 0);
  const total = items.reduce((s, x) => s + x.item.ref * x.qty, 0);

  const generate = (data) => {
    const seq = 230 + orders.length + Math.floor(Math.random() * 40);
    const order = {
      ticket: 'PUB-00' + seq,
      createdAt: new Date().toISOString(),
      zona: data.zona, seat: data.seat, name: data.name, cedula: data.cedula || null, note: data.note || null,
      items: items.map(x => ({ id: x.item.id, name: x.item.name, qty: x.qty, ref: x.item.ref })),
      totalRef: +total.toFixed(2), totalBs: +(total * RATE).toFixed(2), rate: RATE, status: 'enviado',
    };
    const next = [...orders, order];
    setOrders(next); saveOrders(next); setLastOrder(order); setView('ticket');
  };
  const reset = () => { setCart({}); setView('menu'); };
  const clearOrders = () => { setOrders([]); saveOrders([]); };

  return (
    <div className="m-app">
      {view === 'landing' && <Landing key="l" ctx={QR_CTX} onEnter={() => setView('menu')} />}
      {view === 'menu' && <Menu key="m" cart={cart} onAdd={add} total={total} count={count} onOpenCart={() => setSheet(true)} onTickets={() => setView('tickets')} ticketCount={orders.length} seatLabel={QR_CTX.seat} />}
      {view === 'confirm' && <Confirm key="c" ctx={QR_CTX} onBack={() => setView('menu')} onGenerate={generate} />}
      {view === 'ticket' && lastOrder && <Ticket key="t" order={lastOrder} onTrack={reset} onTickets={() => setView('tickets')} />}
      {view === 'tickets' && <MyTickets key="mt" orders={orders} onBack={() => setView(lastOrder ? 'menu' : 'menu')} onClear={clearOrders} />}
      {sheet && view === 'menu' && (
        <CartSheet items={items} total={total} onClose={() => setSheet(false)} onQty={qty} onAdd={add} onConfirm={() => { setSheet(false); setView('confirm'); }} />
      )}
      {toastMsg && <div className="m-toast">{toastMsg}</div>}
    </div>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<CustApp />);
