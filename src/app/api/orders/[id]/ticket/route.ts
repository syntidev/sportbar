import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BUSINESS_KEYS } from '@/app/api/config/business/route'

// ── Defaults inline (mirror de DEFAULTS en business/route.ts) ────────────────

const DEFAULTS: Record<string, string> = {
  business_name:     'Sport Bar',
  business_subtitle: 'Guaiqueríes de Margarita',
  business_rif:      '',
  ticket_footer:     'Gracias por su visita',
  ticket_show_bs:    'true',
  ticket_width_mm:   '58',
  event_name:        '',
  event_venue:       '',
}

// ── GET /api/orders/[id]/ticket ───────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const orderId = parseInt(id, 10)
  if (isNaN(orderId)) {
    return new NextResponse('ID inválido', { status: 400 })
  }

  // ── Cargar orden con items ─────────────────────────────────────────────────

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: { product: { select: { name: true } } },
        orderBy: { id: 'asc' },
      },
      user: { select: { name: true, code: true } },
    },
  })

  if (!order) {
    return new NextResponse('Orden no encontrada', { status: 404 })
  }

  // ── Cargar config del negocio ──────────────────────────────────────────────

  const configRows = await prisma.config.findMany({
    where: { key: { in: [...BUSINESS_KEYS] } },
  })
  const cfg = Object.fromEntries(configRows.map((r) => [r.key, r.value]))
  const c = (key: string) => cfg[key] ?? DEFAULTS[key] ?? ''

  const showBs      = c('ticket_show_bs') === 'true'
  const widthMm     = c('ticket_width_mm') || '58'
  const bizName     = c('business_name')
  const bizSub      = c('business_subtitle')
  const bizRif      = c('business_rif')
  const ticketFooter = c('ticket_footer')
  const eventName   = c('event_name')
  const eventVenue  = c('event_venue')

  // ── Formatear datos ────────────────────────────────────────────────────────

  const fecha = new Date(order.created_at).toLocaleString('es-VE', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })

  const totalRef = Number(order.total_usd).toFixed(2)
  const totalBs  = Number(order.total_bs).toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const sep = '--------------------------------'

  // ── HTML del ticket ────────────────────────────────────────────────────────

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Ticket ${order.code}</title>
<style>
  @page {
    margin: 0;
    size: ${widthMm}mm auto;
  }
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    line-height: 1.4;
    color: #000;
    background: #fff;
    width: ${widthMm}mm;
    padding: 4mm 3mm;
  }
  .center  { text-align: center; }
  .right   { text-align: right; }
  .bold    { font-weight: bold; }
  .sep     { border-top: 1px dashed #000; margin: 3mm 0; }
  .biz-name {
    font-size: 14px;
    font-weight: bold;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .biz-sub {
    font-size: 10px;
    text-align: center;
    margin-top: 1mm;
  }
  .biz-rif {
    font-size: 9px;
    text-align: center;
    color: #555;
    margin-top: 0.5mm;
  }
  .ticket-code {
    font-size: 16px;
    font-weight: bold;
    text-align: center;
    letter-spacing: 0.1em;
    margin: 2mm 0 1mm;
  }
  .meta-row {
    display: flex;
    justify-content: space-between;
    font-size: 9.5px;
    margin: 0.5mm 0;
  }
  .meta-label { color: #555; }
  .items-header {
    display: flex;
    justify-content: space-between;
    font-size: 9.5px;
    font-weight: bold;
    margin-bottom: 1mm;
  }
  .item-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 10px;
    margin: 0.8mm 0;
    gap: 2mm;
  }
  .item-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .item-qty {
    font-size: 9px;
    color: #555;
    white-space: nowrap;
    margin-right: 1mm;
  }
  .item-price {
    white-space: nowrap;
    text-align: right;
  }
  .total-block {
    margin-top: 1mm;
  }
  .total-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    font-weight: bold;
    margin: 1mm 0;
  }
  .total-bs {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #333;
    margin: 0.5mm 0;
  }
  .payment-method {
    font-size: 10px;
    text-align: center;
    margin-top: 2mm;
  }
  .footer {
    font-size: 9.5px;
    text-align: center;
    color: #555;
    margin-top: 2mm;
    font-style: italic;
  }
  .event-block {
    text-align: center;
    font-size: 9px;
    color: #555;
    margin: 1mm 0;
  }
  @media print {
    body { width: ${widthMm}mm; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>

  <!-- Cabecera del negocio -->
  <div class="biz-name">${bizName}</div>
  ${bizSub ? `<div class="biz-sub">${bizSub}</div>` : ''}
  ${bizRif ? `<div class="biz-rif">RIF: ${bizRif}</div>` : ''}

  ${eventName ? `
  <div class="sep"></div>
  <div class="event-block">
    <div>&#9917; ${eventName}</div>
    ${eventVenue ? `<div>${eventVenue}</div>` : ''}
  </div>
  ` : ''}

  <div class="sep"></div>

  <!-- Código del ticket -->
  <div class="ticket-code">${order.code}</div>

  <!-- Fecha y hora -->
  <div class="meta-row">
    <span class="meta-label">Fecha:</span>
    <span>${fecha}</span>
  </div>

  <!-- Zona y asiento -->
  <div class="meta-row">
    <span class="meta-label">Zona:</span>
    <span>${order.zone}${order.seat ? ` · ${order.seat}` : ''}</span>
  </div>

  <!-- Cliente -->
  <div class="meta-row">
    <span class="meta-label">Cliente:</span>
    <span>${order.customer_name} ${order.customer_lastname}${order.customer_id ? ` (CI ${order.customer_id})` : ''}</span>
  </div>

  ${order.user ? `
  <div class="meta-row">
    <span class="meta-label">Atendido por:</span>
    <span>${order.user.name}</span>
  </div>
  ` : ''}

  <div class="sep"></div>

  <!-- Items -->
  <div class="items-header">
    <span>DESCRIPCIÓN</span>
    <span>TOTAL</span>
  </div>

  ${order.items.map((item) => `
  <div class="item-row">
    <span class="item-qty">${item.qty}x</span>
    <span class="item-name">${item.product.name}</span>
    <span class="item-price">REF ${Number(item.subtotal).toFixed(2)}</span>
  </div>
  `).join('')}

  <div class="sep"></div>

  <!-- Totales -->
  <div class="total-block">
    <div class="total-row">
      <span>TOTAL</span>
      <span>REF ${totalRef}</span>
    </div>
    ${showBs ? `
    <div class="total-bs">
      <span>En Bolívares:</span>
      <span>Bs. ${totalBs}</span>
    </div>
    ` : ''}
  </div>

  ${order.payment_method ? `
  <div class="sep"></div>
  <div class="payment-method">Pago: ${order.payment_method}</div>
  ` : ''}

  <div class="sep"></div>

  <!-- Pie -->
  <div class="footer">${ticketFooter}</div>

  <!-- Botón de impresión (no se imprime) -->
  <div class="no-print" style="margin-top:12mm;text-align:center;">
    <button onclick="window.print()" style="
      font-family: sans-serif;
      font-size: 13px;
      padding: 8px 24px;
      background: #2E7D32;
      color: #fff;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    ">Imprimir ticket</button>
  </div>

</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
