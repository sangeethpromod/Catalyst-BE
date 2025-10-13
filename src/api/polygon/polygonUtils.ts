/** Utility helpers for Polygon data transformations (stub). */
export function computeBasicSeriesMetrics(
  series: Array<{ t: string; c: number }>,
) {
  if (!series.length) return { changePct: 0 };
  const start = series[0].c;
  const end = series[series.length - 1].c;
  const changePct = ((end - start) / start) * 100;
  return { changePct };
}
