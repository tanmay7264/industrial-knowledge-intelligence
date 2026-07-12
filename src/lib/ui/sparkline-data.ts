/** Deterministic pseudo-random sparkline points from a numeric seed. */
export function sparklineFromSeed(seed: number, points = 12): number[] {
  let s = Math.abs(Math.floor(seed)) || 1;
  const out: number[] = [];
  for (let i = 0; i < points; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    out.push(0.2 + (s % 1000) / 1000 * 0.8);
  }
  return out;
}
