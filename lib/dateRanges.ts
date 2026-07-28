// SPEC.md 5.2 — "gyorsgombok (aktuális hónap, negyedév, év)". Ugyanezt a
// logikát a dashboard (5.4 pont) szűrői is újrahasznosítják majd, ezért
// külön lib-ben él, nem az oldal komponensben.

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface DateRange {
  from: string;
  to: string;
}

export function currentMonthRange(now = new Date()): DateRange {
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: toDateInputValue(from), to: toDateInputValue(to) };
}

export function currentQuarterRange(now = new Date()): DateRange {
  const quarter = Math.floor(now.getMonth() / 3);
  const from = new Date(now.getFullYear(), quarter * 3, 1);
  const to = new Date(now.getFullYear(), quarter * 3 + 3, 0);
  return { from: toDateInputValue(from), to: toDateInputValue(to) };
}

export function currentYearRange(now = new Date()): DateRange {
  const from = new Date(now.getFullYear(), 0, 1);
  const to = new Date(now.getFullYear(), 11, 31);
  return { from: toDateInputValue(from), to: toDateInputValue(to) };
}
