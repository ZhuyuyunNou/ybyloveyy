/**
 * Colour tokens shared by the canvas layers and the CSS layer.
 * Everything is tuned around a pink / violet / indigo axis so the
 * particle systems and the typography always feel like one palette.
 */

export type RGB = readonly [number, number, number]

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  const n = parseInt(
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h,
    16,
  )
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Blend a colour toward white by `amount` (0..1). */
export function lighten(rgb: RGB, amount: number): RGB {
  return [
    Math.round(rgb[0] + (255 - rgb[0]) * amount),
    Math.round(rgb[1] + (255 - rgb[1]) * amount),
    Math.round(rgb[2] + (255 - rgb[2]) * amount),
  ]
}

export function rgba(rgb: RGB, alpha: number): string {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`
}

export const COLORS = {
  pink: '#ff6fb5',
  rose: '#ffa6d2',
  blush: '#ffd9ec',
  violet: '#a97bff',
  indigo: '#6f5bff',
  ice: '#dbe7ff',
  white: '#ffffff',
} as const

/** Tints used for burst particles — pink, violet, blue-violet. */
export const BURST_TINTS: readonly string[] = [
  COLORS.pink,
  COLORS.rose,
  COLORS.violet,
  COLORS.indigo,
  COLORS.blush,
]

/** Tints used for the ambient background motes (cooler, dimmer). */
export const MOTE_TINTS: readonly string[] = [
  COLORS.violet,
  COLORS.indigo,
  COLORS.pink,
  COLORS.ice,
]

/** Tints used for the rising particles of the finale. */
export const RISE_TINTS: readonly string[] = [
  COLORS.pink,
  COLORS.rose,
  COLORS.violet,
  COLORS.indigo,
]

/** Tints for the heart particle system, rim first then interior. */
export const HEART_RIM_TINTS: readonly string[] = [
  COLORS.blush,
  COLORS.rose,
  COLORS.pink,
]

export const HEART_CORE_TINTS: readonly string[] = [
  COLORS.pink,
  COLORS.violet,
  COLORS.indigo,
]

export function pick(list: readonly string[], r = Math.random()): string {
  return list[Math.min(list.length - 1, (r * list.length) | 0)]
}
