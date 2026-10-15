export const SALE_TYPES = ['Live birds', 'Eggs', 'Manure', 'Other'] as const;

export function normalizeSaleType(value: unknown) {
  if (typeof value !== 'string') return 'Other';

  const normalized = value.trim().toLowerCase();
  if (normalized === 'live bird' || normalized === 'live birds' || normalized === 'birds') return 'Live birds';
  if (normalized === 'egg' || normalized === 'eggs') return 'Eggs';
  if (normalized === 'manure') return 'Manure';
  return SALE_TYPES.includes(value.trim() as (typeof SALE_TYPES)[number]) ? value.trim() : 'Other';
}
