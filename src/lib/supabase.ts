import { createClient } from '@/utils/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

// Cliente browser — usa @supabase/ssr bajo el capó
// Retorna null si las vars de entorno no están disponibles (build-time safety)
export function getSupabase(): SupabaseClient | null {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) return null
  return createClient() as SupabaseClient
}

// Broadcast orden — bus de eventos Supabase (DB sigue en MySQL)
export async function publishOrderEvent(payload: {
  order_id:  number
  code:      string
  status:    string
  venue_id?: number | null
}): Promise<void> {
  const supabase = createClient()
  await supabase.channel('sportbar-orders').send({
    type:    'broadcast',
    event:   'order_update',
    payload,
  })
}

// Broadcast server-side vía HTTP — sin WebSocket, válido desde Route Handlers
export async function broadcastTurno(payload: {
  is_active:      boolean
  partido_nombre: string
}): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return

  try {
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'apikey':        key,
      },
      body: JSON.stringify({
        messages: [{ topic: 'realtime:turno', event: 'turno_update', payload }],
      }),
      signal: AbortSignal.timeout(5_000),
    })
  } catch {
    // No fatal — el menú muestra el estado correcto en el próximo acceso
  }
}
