// SportBar menu data + formatting helpers
window.RATE = 50.0; // Bs per REF (Tasa BCV)
window.MENU = {
  hamburguesas: { label: 'Hamburguesas', emoji: '🍔', items: [
    { id: 'h1', name: 'Doble Smash', desc: 'Cheddar · brioche · salsa de la casa', ref: 8.0, emoji: '🍔', hot: true },
    { id: 'h2', name: 'Classic Burger', desc: 'Res 100% · lechuga · tomate', ref: 6.0, emoji: '🍔' },
    { id: 'h3', name: 'Crispy Chicken', desc: 'Pollo crocante · alioli', ref: 6.5, emoji: '🍔' },
    { id: 'h4', name: 'BBQ Bacon', desc: 'Tocineta · cebolla crujiente', ref: 8.5, emoji: '🍔' },
  ]},
  raciones: { label: 'Raciones', emoji: '🍟', items: [
    { id: 'r1', name: 'Tequeños (6u)', desc: 'Masa crujiente · queso de mano', ref: 5.0, emoji: '🥟', hot: true },
    { id: 'r2', name: 'Papas Fritas', desc: 'Corte grueso · sal marina', ref: 3.5, emoji: '🍟' },
    { id: 'r3', name: 'Alitas BBQ (8u)', desc: 'Salsa BBQ · ranch', ref: 7.0, emoji: '🍗' },
    { id: 'r4', name: 'Nachos Cheddar', desc: 'Tortilla · queso fundido · jalapeño', ref: 5.5, emoji: '🧀' },
  ]},
  bebidas: { label: 'Bebidas', emoji: '🍺', items: [
    { id: 'b1', name: 'Cerveza Polar', desc: 'Bien fría · 222ml', ref: 3.0, emoji: '🍺' },
    { id: 'b2', name: 'Refresco 2L', desc: 'Coca-Cola · Pepsi · 7up', ref: 4.0, emoji: '🥤' },
    { id: 'b3', name: 'Agua Mineral', desc: '600ml · con o sin gas', ref: 1.5, emoji: '💧' },
    { id: 'b4', name: 'Cuba Libre', desc: 'Ron · cola · limón', ref: 6.0, emoji: '🥃', licor: true },
  ]},
};
window.CAT_META = {
  hamburguesas: { icon: 'beef', label: 'Hamburguesas', emoji: '🍔' },
  raciones: { icon: 'drumstick', label: 'Raciones', emoji: '🍟' },
  bebidas: { icon: 'beer', label: 'Bebidas', emoji: '🍺' },
};
window.ALL_ITEMS = Object.entries(window.MENU).flatMap(([cat, m]) => m.items.map(it => ({ ...it, cat })));
window.fmtRef = (n) => 'REF ' + n.toFixed(2);
window.fmtBs = (n) => (n * window.RATE).toLocaleString('es-VE', { minimumFractionDigits: 2 }) + ' Bs';
