interface RenewalRecord {
  tax_year?: number | string | null;
  update_renewal?: string | null;
}

function toValidYear(v: unknown): number | null {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function yearOf(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.getFullYear();
}

// Next Annual Renewal = max(existing record year) + 1,
// else start year itself. Renders as start month/day in that year.
export function getNextRenewalDate(
  startDate?: string | null,
  records?: RenewalRecord[] | null,
): Date | null {
  if (!startDate) return null;
  const s = new Date(startDate);
  if (isNaN(s.getTime())) return null;

  const month = s.getMonth();
  const day = s.getDate();
  const startYear = s.getFullYear();

  const years: number[] = [];
  for (const r of records ?? []) {
    const y =
      toValidYear(r?.tax_year) ?? yearOf(r?.update_renewal ?? null);
    if (y !== null) years.push(y);
  }

  const nextYear = years.length ? Math.max(...years) + 1 : startYear;

  let dt = new Date(nextYear, month, day);
  if (dt.getMonth() !== month) {
    dt = new Date(nextYear, month, 28);
  }
  dt.setHours(0, 0, 0, 0);
  return dt;
}
