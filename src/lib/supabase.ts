import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (typeof window === 'undefined') return null
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  _client = createClient(url, key)
  return _client
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
