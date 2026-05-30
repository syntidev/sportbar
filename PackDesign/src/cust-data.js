// SportBar — CUSTOMER (PUB) menu data. Richer than the staff menu: demand,
// scarcity badges, social-proof counts, hero flag. Appetite-first.
window.RATE = 50.0;
window.fmtRef = (n) => 'REF ' + n.toFixed(2);
window.fmtBs = (n) => (n * window.RATE).toLocaleString('es-VE', { minimumFractionDigits: 2 }) + ' Bs';

window.CMENU = {
  destacados: { label: 'Destacados', emoji: '⭐', items: [
    { id: 'h1', name: 'Doble Smash', desc: 'Doble carne smasheada, cheddar fundido, brioche y salsa de la casa.', ref: 8.0, emoji: '🍔', demand: 'high', badge: { t: '🔥 Más pedido', c: 'hot' }, pedidos: 142, hero: true, slot: 'cf-hero' },
    { id: 'r1', name: 'Tequeños (6u)', desc: 'Masa crujiente, queso de mano fundido. El clásico que nunca falla.', ref: 5.0, emoji: '🥟', demand: 'high', badge: { t: '✨ Nuevo', c: 'new' }, pedidos: 98, slot: 'cf-1' },
    { id: 'b1', name: 'Cerveza Polar', desc: 'Bien fría, directo de la nevera. 222 ml.', ref: 3.0, emoji: '🍺', demand: 'med', badge: { t: '❄️ La más fría', c: 'cold' }, pedidos: 210, slot: 'cf-2' },
    { id: 'r3', name: 'Alitas BBQ (8u)', desc: 'Bañadas en BBQ ahumada, con ranch para mojar.', ref: 7.0, emoji: '🍗', demand: 'high', badge: { t: 'Solo quedan 3', c: 'stock' }, pedidos: 76, slot: 'cf-3' },
  ]},
  hamburguesas: { label: 'Hamburguesas', emoji: '🍔', items: [
    { id: 'h1', name: 'Doble Smash', desc: 'Doble carne, cheddar, brioche, salsa de la casa', ref: 8.0, emoji: '🍔', demand: 'high', badge: { t: '🔥 Más pedido', c: 'hot' }, pedidos: 142 },
    { id: 'h2', name: 'Classic Burger', desc: 'Res 100%, lechuga, tomate, cebolla', ref: 6.0, emoji: '🍔', demand: 'med', pedidos: 64 },
    { id: 'h3', name: 'Crispy Chicken', desc: 'Pollo crocante, alioli, encurtidos', ref: 6.5, emoji: '🍔', demand: 'low', pedidos: 38 },
    { id: 'h4', name: 'BBQ Bacon', desc: 'Tocineta, cebolla crujiente, salsa BBQ', ref: 8.5, emoji: '🍔', demand: 'med', badge: { t: 'Solo quedan 3', c: 'stock' }, pedidos: 51 },
  ]},
  raciones: { label: 'Raciones', emoji: '🍟', items: [
    { id: 'r1', name: 'Tequeños (6u)', desc: 'Masa crujiente, queso de mano', ref: 5.0, emoji: '🥟', demand: 'high', badge: { t: '✨ Nuevo', c: 'new' }, pedidos: 98 },
    { id: 'r2', name: 'Papas Fritas', desc: 'Corte grueso, sal marina', ref: 3.5, emoji: '🍟', demand: 'med', pedidos: 120 },
    { id: 'r3', name: 'Alitas BBQ (8u)', desc: 'Salsa BBQ ahumada, ranch', ref: 7.0, emoji: '🍗', demand: 'high', pedidos: 76 },
    { id: 'r4', name: 'Nachos Cheddar', desc: 'Tortilla, queso fundido, jalapeño', ref: 5.5, emoji: '🧀', demand: 'low', pedidos: 33 },
  ]},
  bebidas: { label: 'Bebidas', emoji: '🍺', items: [
    { id: 'b1', name: 'Cerveza Polar', desc: 'Bien fría, 222 ml', ref: 3.0, emoji: '🍺', demand: 'med', badge: { t: '❄️ La más fría', c: 'cold' }, pedidos: 210 },
    { id: 'b2', name: 'Refresco 2L', desc: 'Coca-Cola, Pepsi, 7up', ref: 4.0, emoji: '🥤', demand: 'med', pedidos: 88 },
    { id: 'b3', name: 'Agua Mineral', desc: '600 ml, con o sin gas', ref: 1.5, emoji: '💧', demand: 'low', pedidos: 41 },
    { id: 'b4', name: 'Cuba Libre', desc: 'Ron, cola, limón', ref: 6.0, emoji: '🥃', demand: 'med', licor: true, pedidos: 57 },
  ]},
};
window.CCAT_ORDER = ['destacados', 'hamburguesas', 'raciones', 'bebidas'];
// upsell suggestions shown in the cart (cross-sell / "que pida todo")
window.CUPSELL = ['r2', 'b1', 'r1'];
