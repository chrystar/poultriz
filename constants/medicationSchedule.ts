export type MedicationEntry = {
    minDay: number;
    maxDay: number;
    label: string;
  };
  
  export const MEDICATION_SCHEDULE: MedicationEntry[] = [
    { minDay: 1, maxDay: 1, label: 'Glucose' },
    { minDay: 2, maxDay: 5, label: 'Antibiotic + Vitamin' },
    { minDay: 6, maxDay: 6, label: 'Vaccine' },
    { minDay: 7, maxDay: 9, label: 'Coccidiostat' },
    { minDay: 10, maxDay: 10, label: 'Vitamin' },
    { minDay: 11, maxDay: 11, label: 'Vaccine' },
    { minDay: 12, maxDay: 12, label: 'Vitamin' },
    { minDay: 13, maxDay: 16, label: 'Antibiotics' },
    { minDay: 17, maxDay: 19, label: 'Coccidiostat' },
    { minDay: 20, maxDay: 20, label: 'Vitamin' },
    { minDay: 21, maxDay: 21, label: 'Vaccine' },
    { minDay: 22, maxDay: 27, label: 'Antibiotics' },
    { minDay: 28, maxDay: 28, label: 'Vaccine' },
    { minDay: 29, maxDay: 29, label: 'Vitamin' },
    { minDay: 30, maxDay: 34, label: 'Acidifier' },
    { minDay: 35, maxDay: 39, label: 'Coccidiostat' },
    { minDay: 40, maxDay: 40, label: 'Dewormer' },
    { minDay: 41, maxDay: 46, label: 'Vitamin' },
    { minDay: 47, maxDay: 50, label: 'Acidifier' },
  ];
  
  export function getMedicationForDay(day: number): string {
    if (day < 1) return '';
    const match = MEDICATION_SCHEDULE.find((e) => day >= e.minDay && day <= e.maxDay);
    return match ? match.label : 'Symptomatic Treatment';
  }
  
  export function getDayRangeLabel(day: number): string {
    if (day < 1) return '';
    const match = MEDICATION_SCHEDULE.find((e) => day >= e.minDay && day <= e.maxDay);
    if (!match) return `Day ${day}+`;
    return match.minDay === match.maxDay ? `Day ${match.minDay}` : `Day ${match.minDay}-${match.maxDay}`;
  }