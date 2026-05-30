// SportBar — LOGIN PIN pad
const { useState } = React;

const PIN_OK = '1234';

function Login() {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState(false);
  const [ok, setOk] = useState(false);

  const press = (d) => {
    if (ok || pin.length >= 4) return;
    const next = pin + d;
    setErr(false);
    setPin(next);
    if (next.length === 4) {
      setTimeout(() => {
        if (next === PIN_OK) { setOk(true); }
        else { setErr(true); navigator.vibrate && navigator.vibrate(60); setTimeout(() => { setErr(false); setPin(''); }, 500); }
      }, 160);
    }
  };
  const del = () => { if (!ok) { setErr(false); setPin(p => p.slice(0, -1)); } };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'del'];

  return (
    <div className="login-screen">
      <div className="login-bg">
        <svg viewBox="0 0 390 760" preserveAspectRatio="xMidYMid slice" fill="none" stroke="#2E7D32" strokeWidth="2">
          <rect x="16" y="30" width="358" height="700" rx="8" />
          <line x1="16" y1="380" x2="374" y2="380" />
          <circle cx="195" cy="380" r="64" />
          <circle cx="195" cy="380" r="6" />
          <rect x="115" y="30" width="160" height="130" />
          <rect x="115" y="600" width="160" height="130" />
          <path d="M115 30 A130 130 0 0 0 275 30" />
          <path d="M115 730 A130 130 0 0 1 275 730" />
        </svg>
      </div>

      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '48px 24px 32px' }}>
        <img src="assets/logo-color.png" style={{ width: 88, height: 88, marginBottom: 18, filter: 'drop-shadow(0 10px 24px rgba(0,0,0,.6))' }} alt="" />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, letterSpacing: '.03em', lineHeight: .92, textAlign: 'center' }}>SPORT BAR</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, marginBottom: 6 }}>Guaiqueríes de Margarita · Café ConBike</div>

        <div style={{ flex: 1 }} />

        {ok ? (
          <div className="slide-enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 40 }}>
            <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'var(--tint-primary)', border: '2px solid var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={42} color="var(--primary-light)" strokeWidth={3} /></div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '.02em' }}>Bienvenido, Carlos</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: err ? 'var(--alert)' : 'var(--text-muted)', marginBottom: 18, height: 18 }}>{err ? 'PIN incorrecto, intenta de nuevo' : 'Ingresa tu PIN de empleado'}</div>
            <div className={'pin-dots' + (err ? ' shake' : '')} style={{ marginBottom: 34 }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={'pin-dot' + (err ? ' err' : pin.length > i ? ' on' : '')} />
              ))}
            </div>
            <div className="pin-grid">
              {keys.map((k, i) => {
                if (k === 'clear') return <button key={i} className="pin-key" style={{ fontSize: 16, fontFamily: 'var(--font-body)', color: 'var(--text-muted)' }} onClick={() => { setPin(''); setErr(false); }}>BORRAR</button>;
                if (k === 'del') return <button key={i} className="pin-key" onClick={del}><Icon name="delete" size={28} color="var(--text-muted)" /></button>;
                return <button key={i} className="pin-key" onClick={() => press(k)}>{k}</button>;
              })}
            </div>
          </>
        )}
        <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 26 }}>PIN demo: 1234</div>
      </div>
    </div>
  );
}

Object.assign(window, { Login });
