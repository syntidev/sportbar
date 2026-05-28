import { prisma } from './prisma';

const FALLBACK_RATE = 50.0;

export async function getCurrentRate(): Promise<number> {
  try {
    const row = await prisma.dollarRate.findFirst({
      where: { is_active: true },
      orderBy: { effective_from: 'desc' },
      select: { rate: true },
    });
    if (!row) return FALLBACK_RATE;
    const parsed = Number(row.rate);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_RATE;
  } catch {
    return FALLBACK_RATE;
  }
}

export function calcBs(price_usd: number, rate: number): number {
  return Math.round(price_usd * rate * 100) / 100;
}

export function formatRef(amount: number): string {
  return 'REF ' + Number(amount).toFixed(2)
}

export function formatBs(amount: number): string {
  return 'Bs. ' + Number(amount).toLocaleString('es-VE', { minimumFractionDigits: 2 })
}
