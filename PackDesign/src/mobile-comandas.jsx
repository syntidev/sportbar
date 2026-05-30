// SportBar — COMANDAS: tablero de servicio del mesero (sensor de productividad)
const { useState, useEffect } = React;

const mmss2 = (s) => `${Math.floor(s / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;

// thresholds (segundos) para platos LISTOS sin entregar
const WARN_AT = 120, BAD_AT = 240;
const urgency = (s) => s >= BAD_AT ? 'bad' : s >= WARN_AT ? 'warn' : 'ok';

const CMD_SEED = [
  { id: 1, code: 'LOC-117', zone: 'Sur', seat: 'Mesa 4', status: 'listo', start: 268, items: '2× Classic Burger · 1× Nachos Cheddar', total: 17.5 },
  { id: 2, code: 'LOC-131', zone: 'Norte', seat: 'Fila G, S12', status: 'listo', start: 64, items: '1× Doble Smash · 1× Papas Fritas', total: 11.5 },
  { id: 3, code: 'LOC-142', zone: 'Sur', seat: 'Mesa 9', status: 'cocina', start: 142, items: '2× BBQ Bacon · 2× Refresco 2L', total: 25.0 },
  { id: 4, code: 'LOC-145', zone: 'VIP', seat: 'Box 1', status: 'cocina', start: 38, licor: true, items: '2× Cuba Libre · 1× Tequeños (6u)', total: 17.0 },
  { id: 5, code: 'LOC-108', zone: 'Sur', seat: 'Mesa 2', status: 'cobrar', start: 30, items: '1× Crispy Chicken · 1× Cerveza Polar', total: 9.5 },
];

function ComandasM({ onExit, toast }) {
  const Sheet = window.PaymentSheet;
  const [orders, setOrders] = useState(() => CMD_SEED.map(o => ({ ...o, t0: Date.now() })));
  const [now, setNow] = useState(Date.now());
  const [pay, setPay] = useState(null);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const el = (o) => o.start + (now - o.t0) / 1000;

  const listo = orders.filter(o => o.status === 'listo').sort((a, b) => el(b) - el(a));
  const cocina = orders.filter(o => o.status === 'cocina');
  const cobrar = orders.filter(o => o.status === 'cobrar');

  const worst = listo.length ? Math.max(...listo.map(el)) : 0;
  const mood = listo.length === 0 ? 'ok' : urgency(worst);
  const moodMeta = {
    ok:   { label: 'VAS BIEN', icon: 'thumbs-up', coach: listo.length ? 'Buen ritmo — entrega los platos listos sin demora.' : 'Todo entregado. Buen trabajo, mantén el ojo en cocina 🏀' },
    warn: { label: 'APÚRATE', icon: 'alarm-clock', coach: 'Hay platos listos esperando. Llévalos antes de que se enfríen.' },
    bad:  { label: 'ATRASADO', icon: 'flame', coach: '¡Un pedido lleva demasiado listo! Entrégalo ya, se está enfriando.' },
  }[mood];

  const deliver = (id) => { navigator.vibrate && navigator.vibrate(15); setOrders(os => os.map(o => o.id === id ? { ...o, status: 'cobrar', start: 0, t0: Date.now() } : o)); toast('Entregado ✅ — pasa a por cobrar'); };
  const removePaid = (code) => { setOrders(os => os.filter(o => o.code !== code)); };

  return (
    <div className="m-screen">
      <div className="m-head">
        <button className="btn m-back" onClick={onExit}><Icon name="arrow-left" size={20} /></button>
        <h2 className="m-title">Mis comandas</h2>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>Carlos · Mesero</span>
      </div>

      <div className="m-scroll" style={{ padding: '6px 16px 24px' }}>
        {/* SENSOR DE PRODUCTIVIDAD */}
        <div className={'cmd-sensor ' + mood}>
          <div className="cmd-sensor-top">
            <span className={'mood-pill mood-' + mood}><Icon name={moodMeta.icon} size={20} color="currentColor" />{moodMeta.label}</span>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tu ritmo</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: '.02em' }}>{listo.length} x entregar · {cocina.length} en cocina</div>
            </div>
          </div>
          <div className="cmd-coach">{moodMeta.coach}</div>
          <div className="sensor-stats">
            <div className="sensor-stat"><div className="v" style={{ color: 'var(--primary-light)' }}>12</div><div className="k">Entregadas hoy</div></div>
            <div className="sensor-stat"><div className="v" style={{ color: 'var(--accent)' }}>92%</div><div className="k">A tiempo</div></div>
            <div className="sensor-stat"><div className="v">1:48</div><div className="k">Prom. entrega</div></div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, whiteSpace: 'nowrap' }}><span>Meta del descanso</span><span>92 / 100</span></div>
            <div className="ontime-bar"><div className="ontime-fill" style={{ width: '92%' }} /></div>
          </div>
        </div>

        {/* ENTREGAR YA */}
        <div className="cmd-sec-head"><span className="dot" style={{ background: 'var(--accent)' }} />ENTREGAR YA<span className="c">{listo.length}</span></div>
        {listo.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-faint)', padding: '4px 2px 2px' }}>Nada listo por ahora.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
          {listo.map(o => {
            const u = urgency(el(o));
            return (
              <div key={o.id} className={'cmd-card ' + u}>
                <div className="cmd-row1">
                  <span className="cmd-code">{o.code}</span>
                  <span className={'cmd-timer ' + u}><Icon name="hourglass" size={17} color="currentColor" />{mmss2(el(o))}</span>
                </div>
                <div className="cmd-meta"><Icon name="map-pin" size={14} color="var(--text-muted)" />{o.zone} · {o.seat}{o.licor && <span className="licor-mini">LICOR</span>}</div>
                <div className="cmd-items">{o.items}</div>
                <button className="cmd-act cmd-entregar" onClick={() => deliver(o.id)}><Icon name="check" size={19} color="#fff" strokeWidth={2.5} />MARCAR ENTREGADO</button>
              </div>
            );
          })}
        </div>

        {/* EN COCINA */}
        <div className="cmd-sec-head"><span className="dot" style={{ background: 'var(--prep)' }} />EN COCINA<span className="c">{cocina.length}</span></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
          {cocina.map(o => (
            <div key={o.id} className="cmd-card cocina">
              <div className="cmd-row1">
                <span className="cmd-code" style={{ color: '#b39dff' }}>{o.code}</span>
                <span className="cmd-timer cocina"><Icon name="hourglass" size={17} color="currentColor" />{mmss2(el(o))}</span>
              </div>
              <div className="cmd-meta"><Icon name="map-pin" size={14} color="var(--text-muted)" />{o.zone} · {o.seat}{o.licor && <span className="licor-mini">LICOR</span>}</div>
              <div className="cmd-items">{o.items}</div>
              <div className="cmd-act cmd-prep">Preparando<span className="prep-dots"><span></span><span></span><span></span></span></div>
            </div>
          ))}
        </div>

        {/* POR COBRAR */}
        <div className="cmd-sec-head"><span className="dot" style={{ background: 'var(--accent)' }} />POR COBRAR<span className="c">{cobrar.length}</span></div>
        {cobrar.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-faint)', padding: '4px 2px 2px' }}>Sin cuentas pendientes.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
          {cobrar.map(o => (
            <div key={o.id} className="cmd-card cobrar">
              <div className="cmd-row1">
                <span className="cmd-code" style={{ color: 'var(--primary-light)' }}>{o.code}</span>
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--accent)', lineHeight: 1 }}>{fmtRef(o.total)}</span>
              </div>
              <div className="cmd-meta"><Icon name="map-pin" size={14} color="var(--text-muted)" />{o.zone} · {o.seat} · entregado</div>
              <div className="cmd-items">{o.items}</div>
              <button className="cmd-act cmd-cobrar" onClick={() => setPay({ code: o.code, kind: 'loc', total: o.total })}><Icon name="banknote" size={19} color="#000" />COBRAR {fmtRef(o.total)}</button>
            </div>
          ))}
        </div>
      </div>

      {pay && Sheet && <Sheet order={pay} onClose={() => setPay(null)} onPaid={() => { removePaid(pay.code); toast(pay.code + ' cobrado ✅'); setPay(null); }} />}
    </div>
  );
}

Object.assign(window, { ComandasM });
