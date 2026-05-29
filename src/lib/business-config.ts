export const BUSINESS_KEYS = [
  'business_name',
  'business_subtitle',
  'business_rif',
  'business_phone',
  'business_address',
  'business_city',
  'business_logo_url',
  'ticket_footer',
  'ticket_show_bs',
  'ticket_width_mm',
  'event_name',
  'event_venue',
] as const

export type BusinessKey = (typeof BUSINESS_KEYS)[number]

export const BUSINESS_DEFAULTS: Record<BusinessKey, string> = {
  business_name:     'Sport Bar',
  business_subtitle: 'Guaiqueríes de Margarita',
  business_rif:      '',
  business_phone:    '',
  business_address:  '',
  business_city:     'Margarita, Venezuela',
  business_logo_url: '',
  ticket_footer:     'Gracias por su visita',
  ticket_show_bs:    'true',
  ticket_width_mm:   '58',
  event_name:        '',
  event_venue:       '',
}
