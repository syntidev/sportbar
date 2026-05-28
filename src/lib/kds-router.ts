export type KdsDestination = 'cocina' | 'bar' | 'both'

export function getKdsDestination(categories: string[]): KdsDestination {
  const hasFood = categories.some(c => c === 'hamburguesas' || c === 'raciones')
  const hasDrinks = categories.some(c => c === 'bebidas')
  if (hasFood && hasDrinks) return 'both'
  if (hasFood) return 'cocina'
  return 'bar'
}

