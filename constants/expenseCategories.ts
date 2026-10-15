export const EXPENSE_CATEGORIES = [
  'Medicine & Vaccines',
  'Labour',
  'Utilities',
  'Transport',
  'Equipment',
  'Other',
] as const;

export const CATEGORY_ICONS: Record<string, string> = {
  Feed: 'leaf',
  'Medicine & Vaccines': 'medkit',
  Labour: 'people',
  Utilities: 'flash',
  Transport: 'car',
  Equipment: 'construct',
  Other: 'pricetag',
};

function categoryKey(category: string) {
  return category.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function normalizeExpenseCategory(category: unknown) {
  if (typeof category !== 'string' || !category.trim()) return 'Other';

  const key = categoryKey(category);
  if (key === 'feed') return 'Feed';

  const match = [...EXPENSE_CATEGORIES].find((option) => categoryKey(option) === key);
  return match ?? 'Other';
}
