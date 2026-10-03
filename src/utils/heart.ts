/**
 * Heart geometry built from the classic parametric curve
 *
 *   x = 16 sin³(t)
 *   y = 13 cos(t) − 5 cos(2t) − 2 cos(3t) − cos(4t)
 *
 * Everything is normalised so the shape lives inside the unit circle
 * around the origin, which lets a caller scale it with a single radius.
 * The centrepiece heart is an SVG path sampled from this, so the shape
 * stays mathematically exact at any size.
 */

export interface Pt {
  x: number
  y: number
}

const TAU = Math.PI * 2

/** Raw curve, already flipped so +y points down (canvas convention). */
function raw(t: number): Pt {
  const s = Math.sin(t)
  const x = 16 * s * s * s
  const y =
    13 * Math.cos(t) -
    5 * Math.cos(2 * t) -
    2 * Math.cos(3 * t) -
    Math.cos(4 * t)
  return { x, y: -y }
}

/* Measure the bounding box once, at module load, so the shape can be
   centred on the origin and scaled to fit the unit circle. */
const BOUNDS_STEPS = 1440
let loX = Infinity
let hiX = -Infinity
let loY = Infinity
let hiY = -Infinity
for (let i = 0; i < BOUNDS_STEPS; i++) {
  const p = raw((i / BOUNDS_STEPS) * TAU)
  if (p.x < loX) loX = p.x
  if (p.x > hiX) hiX = p.x
  if (p.y < loY) loY = p.y
  if (p.y > hiY) hiY = p.y
}
const midX = (loX + hiX) / 2
const midY = (loY + hiY) / 2
const NORM = 1 / Math.max((hiX - loX) / 2, (hiY - loY) / 2)

/** Point on the curve at parameter `t`, normalised to the unit circle. */
export function heartUnitPoint(t: number): Pt {
  const p = raw(t)
  return { x: (p.x - midX) * NORM, y: (p.y - midY) * NORM }
}

/**
 * The curve as an SVG path, drawn into a `size` × `size` box. Sampling is
 * uniform in `t`, which naturally clusters points at the cusp where the
 * curvature is highest — exactly where a polygon needs them.
 */
export function heartSvgPath(size = 32, steps = 160): string {
  const r = size / 2
  let d = ''
  for (let i = 0; i < steps; i++) {
    const p = heartUnitPoint((i / steps) * TAU)
    const x = (r + p.x * r).toFixed(2)
    const y = (r + p.y * r).toFixed(2)
    d += `${i === 0 ? 'M' : 'L'}${x} ${y}`
  }
  return `${d}Z`
}
