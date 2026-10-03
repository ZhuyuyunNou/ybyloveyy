/**
 * The pointer "field" shared by the canvas layers.
 *
 * A single set of listeners feeds every consumer through this module-level
 * state, so no matter how many components react to the cursor there is only
 * ever one `pointermove` subscription. Everything in here is plain mutable
 * data — it is read inside requestAnimationFrame and must never be reactive.
 */

export interface PointerField {
  /** current position, CSS px */
  x: number
  y: number
  /** previous position, used to derive velocity */
  px: number
  py: number
  vx: number
  vy: number
  /** true once the pointer has produced at least one sample */
  active: boolean
  /** pointer is over the document */
  inside: boolean
  /** primary button held down */
  down: boolean
}

export interface BurstRequest {
  x: number
  y: number
  count: number
  /** initial radial speed, px/s */
  speed: number
  /** seconds before the last spark dies */
  life: number
  /** base particle radius, CSS px */
  size: number
}

const pointer: PointerField = {
  x: -9999,
  y: -9999,
  px: -9999,
  py: -9999,
  vx: 0,
  vy: 0,
  active: false,
  inside: false,
  down: false,
}

/** Pending explosions; the canvas layer drains this every frame. */
const bursts: BurstRequest[] = []

let refs = 0

function onPointerMove(e: PointerEvent) {
  const x = e.clientX
  const y = e.clientY
  if (!pointer.active) {
    pointer.active = true
    pointer.px = x
    pointer.py = y
  }
  pointer.x = x
  pointer.y = y
  pointer.inside = true
}

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0 && e.pointerType === 'mouse') return
  const x = e.clientX
  const y = e.clientY
  // A tap should also light up the field around the finger.
  pointer.x = x
  pointer.y = y
  pointer.px = x
  pointer.py = y
  pointer.vx = 0
  pointer.vy = 0
  pointer.active = true
  pointer.inside = true
  pointer.down = true
  bursts.push({
    x,
    y,
    count: 34,
    speed: 118,
    life: 1.05,
    size: 1.5,
  })
}

function onPointerUp() {
  pointer.down = false
}

function onPointerLeave() {
  pointer.inside = false
  pointer.down = false
}

function onBlur() {
  pointer.inside = false
  pointer.down = false
}

function install() {
  if (refs++ > 0) return
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('pointerdown', onPointerDown, { passive: true })
  window.addEventListener('pointerup', onPointerUp, { passive: true })
  window.addEventListener('pointercancel', onPointerUp, { passive: true })
  document.addEventListener('pointerleave', onPointerLeave, { passive: true })
  window.addEventListener('blur', onBlur)
}

function uninstall() {
  if (--refs > 0) return
  refs = 0
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerdown', onPointerDown)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
  document.removeEventListener('pointerleave', onPointerLeave)
  window.removeEventListener('blur', onBlur)
  bursts.length = 0
}

/**
 * Advance the velocity estimate. Called once per rendered frame so the
 * value is always expressed in px/frame regardless of pointer event rate.
 */
function sampleVelocity() {
  if (!pointer.active) return
  pointer.vx = pointer.x - pointer.px
  pointer.vy = pointer.y - pointer.py
  pointer.px = pointer.x
  pointer.py = pointer.y
}

/** Push an explosion into the queue (also used by the intro sequence). */
function requestBurst(req: Partial<BurstRequest> & { x: number; y: number }) {
  bursts.push({
    count: 34,
    speed: 118,
    life: 1.05,
    size: 1.5,
    ...req,
  })
  // Guard against a stuck consumer / runaway script.
  if (bursts.length > 64) bursts.splice(0, bursts.length - 64)
}

export function useMouseParticles() {
  return {
    pointer,
    bursts,
    install,
    uninstall,
    sampleVelocity,
    requestBurst,
  }
}
