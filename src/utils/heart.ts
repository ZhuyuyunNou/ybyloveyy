/**
 * Heart geometry built from the classic parametric curve
 *
 *   x = 16 sin³(t)
 *   y = 13 cos(t) − 5 cos(2t) − 2 cos(3t) − cos(4t)
 *
 * Everything is normalised so the shape lives inside the unit circle
 * around the origin, which lets callers scale it with a single radius.
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
 * `count` points spread along the outline with roughly equal arc length,
 * so the rim does not clump at the cusp the way a naive uniform-t does.
 */
export function heartOutline(count: number): Pt[] {
  const steps = 2048
  const px = new Float64Array(steps + 1)
  const py = new Float64Array(steps + 1)
  const cum = new Float64Array(steps + 1)

  let prev = heartUnitPoint(0)
  px[0] = prev.x
  py[0] = prev.y
  let total = 0
  for (let i = 1; i <= steps; i++) {
    const p = heartUnitPoint((i / steps) * TAU)
    total += Math.hypot(p.x - prev.x, p.y - prev.y)
    px[i] = p.x
    py[i] = p.y
    cum[i] = total
    prev = p
  }

  const out: Pt[] = new Array(count)
  let j = 0
  for (let k = 0; k < count; k++) {
    const target = (k / count) * total
    while (j < steps - 1 && cum[j + 1] < target) j++
    const span = cum[j + 1] - cum[j]
    const f = span > 1e-9 ? (target - cum[j]) / span : 0
    out[k] = {
      x: px[j] + (px[j + 1] - px[j]) * f,
      y: py[j] + (py[j + 1] - py[j]) * f,
    }
  }
  return out
}

/* A closed polygon of the outline, used for point-in-shape tests. */
const POLY_N = 192
const POLY: Pt[] = new Array(POLY_N)
let polyMinY = Infinity
let polyMaxY = -Infinity
for (let i = 0; i < POLY_N; i++) {
  const p = heartUnitPoint((i / POLY_N) * TAU)
  POLY[i] = p
  if (p.y < polyMinY) polyMinY = p.y
  if (p.y > polyMaxY) polyMaxY = p.y
}

/** Ray casting against the outline polygon. */
function insideHeart(x: number, y: number): boolean {
  let hit = false
  for (let i = 0, j = POLY_N - 1; i < POLY_N; j = i++) {
    const xi = POLY[i].x
    const yi = POLY[i].y
    const xj = POLY[j].x
    const yj = POLY[j].y
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

/**
 * A point inside the heart.
 *
 * Shrinking the curve toward the origin is the cheap way to do this, but
 * every shrunk copy funnels its cusp into the same spot and paints a
 * vertical streak down the middle. Rejection sampling inside the bounding
 * box gives an even fill instead; the acceptance bias keeps the middle a
 * little sparser than the edges so the shape still reads as a shell.
 */
export function heartInterior(rand: () => number): Pt {
  for (let i = 0; i < 24; i++) {
    const x = rand() * 2 - 1
    const y = polyMinY + rand() * (polyMaxY - polyMinY)
    if (!insideHeart(x, y)) continue
    if (rand() < 0.35 + 0.65 * Math.hypot(x, y)) return { x, y }
  }
  // Extremely unlikely fallback — a point on the curve is still on-shape.
  return heartUnitPoint(rand() * TAU)
}
