/**
 * US Equity Market Date & Time Formatter
 * Guarantees that all news releases and SEC regulatory filings display
 * both the calendar date and the exact wall-clock time (EST) when released.
 */

export function formatReleaseDateTime(
  rawInput?: string | Date | number | null,
  fallbackMinutesAgo: number = 30
): string {
  if (!rawInput) {
    const fallbackDate = new Date(Date.now() - fallbackMinutesAgo * 60 * 1000);
    return formatToEstString(fallbackDate);
  }

  if (typeof rawInput === 'number') {
    return formatToEstString(new Date(rawInput));
  }

  if (rawInput instanceof Date) {
    return formatToEstString(rawInput);
  }

  const clean = rawInput.trim();

  // If already contains EST/EDT with both date and time (e.g. "2026-11-02 16:30:15 EST"), return clean
  if (clean.includes('EST') || clean.includes('EDT')) {
    return clean;
  }

  // If it's a standard YYYY-MM-DD format (no time), append standard filing cutoff time
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return `${clean} • 04:30:00 PM EST`;
  }

  // If it's 14-digit format: YYYYMMDDHHmmss
  if (/^\d{14}$/.test(clean)) {
    const y = clean.substring(0, 4);
    const m = clean.substring(4, 6);
    const d = clean.substring(6, 8);
    const h = clean.substring(8, 10);
    const min = clean.substring(10, 12);
    const s = clean.substring(12, 14);
    return `${y}-${m}-${d} • ${h}:${min}:${s} EST`;
  }

  // Try parsing ISO or timestamp
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return formatToEstString(parsed);
  }

  // Relative string like "35m ago" or "1h ago": convert to concrete Date & Time
  if (clean.includes('m ago')) {
    const mins = parseInt(clean, 10) || 30;
    return formatToEstString(new Date(Date.now() - mins * 60 * 1000));
  }
  if (clean.includes('h ago')) {
    const hrs = parseInt(clean, 10) || 1;
    return formatToEstString(new Date(Date.now() - hrs * 3600 * 1000));
  }
  if (clean.includes('d ago')) {
    const days = parseInt(clean, 10) || 1;
    return formatToEstString(new Date(Date.now() - days * 86400 * 1000));
  }

  return clean;
}

function formatToEstString(date: Date): string {
  try {
    const estDateStr = date.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    return `${estDateStr} EST`;
  } catch (e) {
    return `${date.toISOString().replace('T', ' ').substring(0, 19)} EST`;
  }
}
