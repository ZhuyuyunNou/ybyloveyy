/**
 * Pre-rendered sprites.
 *
 * `shadowBlur` and per-frame radial gradients are far too expensive to use
 * on hundreds of particles at 60fps, so every soft glow / heart glyph is
 * rasterised once into a small offscreen canvas and then blitted with
 * `drawImage`, which the compositor handles almost for free.
 */

import { heartUnitPoint } from './heart'
import { hexToRgb, lighten, rgba, COLORS } from './palette'
import type { RGB } from './palette'

const SPRITE = 64
const TAU = Math.PI * 2

/** Fraction of a heart sprite's box that the glyph actually covers. */
export const HEART_FILL = 0.84

const glowCache = new Map<string, HTMLCanvasElement>()
const heartCache = new Map<string, HTMLCanvasElement>()

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')
  return [c, ctx]
}

/**
 * A soft radial blob.
 * `sharp` adds a bright white core — used for stars and the heart rim,
 * where a crisp point of light matters.
 */
export function glowSprite(color: string, sharp = false): HTMLCanvasElement {
  const key = `${color}|${sharp ? 1 : 0}`
  const hit = glowCache.get(key)
  if (hit) return hit

  const [c, ctx] = makeCanvas(SPRITE)
  const r = SPRITE / 2
  const rgb = hexToRgb(color)
  const core = lighten(rgb, 0.62)
  const g = ctx.createRadialGradient(r, r, 0, r, r, r)

  if (sharp) {
    g.addColorStop(0, rgba(lighten(rgb, 0.9), 0.98))
    g.addColorStop(0.12, rgba(core, 0.9))
    g.addColorStop(0.3, rgba(rgb, 0.36))
    g.addColorStop(0.62, rgba(rgb, 0.1))
    g.addColorStop(1, rgba(rgb, 0))
  } else {
    g.addColorStop(0, rgba(core, 0.85))
    g.addColorStop(0.26, rgba(rgb, 0.42))
    g.addColorStop(0.58, rgba(rgb, 0.12))
    g.addColorStop(1, rgba(rgb, 0))
  }

  ctx.fillStyle = g
  ctx.fillRect(0, 0, SPRITE, SPRITE)

  glowCache.set(key, c)
  return c
}

/** A filled heart glyph with a soft halo, used for floating heart motes. */
export function heartSprite(color: string = COLORS.pink): HTMLCanvasElement {
  const hit = heartCache.get(color)
  if (hit) return hit

  const [c, ctx] = makeCanvas(SPRITE)
  const rgb: RGB = hexToRgb(color)

  ctx.translate(SPRITE / 2, SPRITE / 2)
  ctx.beginPath()
  const R = (SPRITE / 2) * HEART_FILL
  const steps = 84
  for (let i = 0; i <= steps; i++) {
    const p = heartUnitPoint((i / steps) * TAU)
    const x = p.x * R
    const y = p.y * R
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()

  ctx.shadowColor = rgba(rgb, 0.95)
  ctx.shadowBlur = SPRITE * 0.17
  ctx.fillStyle = rgba(lighten(rgb, 0.35), 0.9)
  ctx.fill()
  ctx.fill()

  heartCache.set(color, c)
  return c
}
