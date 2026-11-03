const peso = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(cents: number): string {
  return peso.format((Number.isFinite(cents) ? cents : 0) / 100);
}

/** Turns what the user typed (like "1,250.50") into centavos. */
export function toCents(input: string): number | null {
  const clean = input.replace(/[^0-9.]/g, '');
  if (!clean || clean === '.') return null;
  const value = Number(clean);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

/** Keeps only numbers and one dot, with at most 2 decimals. */
export function cleanMoneyInput(input: string): string {
  let out = input.replace(/[^0-9.]/g, '');
  const dot = out.indexOf('.');
  if (dot !== -1) {
    out = out.slice(0, dot + 1) + out.slice(dot + 1).replace(/\./g, '').slice(0, 2);
  }
  return out.slice(0, 12);
}

export function centsToInput(cents: number): string {
  const text = (cents / 100).toFixed(2);
  return text.endsWith('.00') ? text.slice(0, -3) : text;
}

/** Splits evenly and rounds up to the next centavo, so the lender is never short. */
export function splitEvenly(totalCents: number, people: number): number {
  if (people <= 0 || totalCents <= 0) return 0;
  return Math.ceil(totalCents / people);
}
