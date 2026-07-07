/** Escala visual com teto no percentil (evita um outlier dominar a cor). */
export function scaleCap(values: number[], percentile = 0.9): number {
  const positive = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (!positive.length) return 1;
  const idx = Math.min(positive.length - 1, Math.ceil(positive.length * percentile) - 1);
  return Math.max(positive[Math.max(0, idx)] ?? 1, 1);
}

export function normalizeValue(value: number, cap: number): number {
  if (value <= 0 || cap <= 0) return 0;
  return Math.min(1, value / cap);
}
