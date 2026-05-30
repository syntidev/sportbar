// SportBar POS — assemble the 6 screens onto a pannable design canvas
function CanvasApp() {
  return (
    <DesignCanvas>
      <DCSection id="staff" title="Staff App · Mesero (LOC)" subtitle="One-handed phone POS · Venezuelan Spanish · dark stadium theme">
        <DCArtboard id="login" label="LOGIN · PIN" width={410} height={864}>
          <Phone><Login /></Phone>
        </DCArtboard>
        <DCArtboard id="home" label="HOME" width={410} height={864}>
          <Phone><StaffHome /></Phone>
        </DCArtboard>
        <DCArtboard id="step1" label="NUEVA ORDEN · Paso 1 · Categorías" width={410} height={864}>
          <Phone><NuevaStep1 /></Phone>
        </DCArtboard>
        <DCArtboard id="step4" label="NUEVA ORDEN · Paso 4 · Datos" width={410} height={864}>
          <Phone><NuevaStep4 /></Phone>
        </DCArtboard>
        <DCArtboard id="cobrar" label="COBRAR · Cuentas + Modal de pago" width={410} height={864}>
          <Phone><Cobrar /></Phone>
        </DCArtboard>
      </DCSection>

      <DCSection id="kds" title="Kitchen & Bar Display · KDS" subtitle="Tablet landscape · readable from 2m · live timers, columns by status">
        <DCArtboard id="cocina" label="KDS COCINA" width={1282} height={802}>
          <KdsBoard />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<CanvasApp />);
