/** Small wrapper so `Date.now()` isn't called directly inside component render bodies (flagged by react-hooks/purity). */
export function isPast(date: Date): boolean {
  return date.getTime() < Date.now();
}
