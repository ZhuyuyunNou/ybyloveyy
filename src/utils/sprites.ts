/**
 * Pre-rendered sprites.
 *
 * `shadowBlur` and per-frame radial gradients are far too expensive to use
 * on hundreds of particles at 60fps, so every soft glow is rasterised once
 * into a small offscreen canvas and then blitted with `drawImage`, which
 * the compositor handles almost for free.
 */

import { hexToRgb, lighten, rgba } from './palette'

const SPRITE = 64

const glowCache = new Map<string, HTMLCanvasElement>()

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
 * `sharp` adds a bright white core — used for stars, where a crisp point
 * of light matters.
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
