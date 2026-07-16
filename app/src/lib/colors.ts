/** Curated label palette. `color` on a connection stores a hex value from here
 *  (legacy connections stored names like 'sky' — {@link resolveColor} maps those). */
export const PALETTE = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#ec4899', // pink
  '#f43f5e', // rose
] as const;

const NAMED: Record<string, string> = {
  red: '#ef4444',
  green: '#22c55e',
  blue: '#3b82f6',
  purple: '#a855f7',
  sky: '#0ea5e9',
};

/** Resolve a stored `color` (hex or legacy name) to a concrete hex string. */
export function resolveColor(color?: string): string {
  if (!color) return NAMED.sky;
  if (color.startsWith('#')) return color;
  return NAMED[color] ?? NAMED.sky;
}
