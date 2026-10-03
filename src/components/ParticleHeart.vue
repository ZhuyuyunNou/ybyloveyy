<script setup lang="ts">
/**
 * The heart is not a glyph — it is a few hundred particles that fly in
 * from all over the canvas and settle onto the classic parametric heart
 * curve, then keep a slow, natural lub-dub rhythm.
 *
 * The canvas is deliberately much larger than the title's heart slot and
 * is centred on it, so there is room for the particles to converge from
 * far away without disturbing the text layout.
 */
import { onBeforeUnmount, ref } from 'vue'
import gsap from 'gsap'
import { useCanvasStage } from '../composables/useCanvasStage'
import { heartInterior, heartOutline } from '../utils/heart'
import { glowSprite } from '../utils/sprites'
import { COLORS, HEART_CORE_TINTS, HEART_RIM_TINTS, pick } from '../utils/palette'

interface HP {
  /** target on the heart curve, relative to the canvas centre */
  tx: number
  ty: number
  /** scattered starting point, relative to the canvas centre */
  sx: number
  sy: number
  size: number
  sprite: HTMLCanvasElement
  base: number
  phase: number
  drift: number
  driftSpeed: number
  swirl: number
  rim: boolean
}

const canvasEl = ref<HTMLCanvasElement | null>(null)

const state = {
  /** 0 = scattered, 1 = fully formed */
  progress: 0,
  /** overall opacity of the system */
  alpha: 0,
  /** heartbeat scale */
  beat: 1,
}

let parts: HP[] = []
let radius = 0
let formTl: gsap.core.Timeline | null = null
let beatTl: gsap.core.Timeline | null = null
let pulseTl: gsap.core.Timeline | null = null

function build(w: number, h: number, slot: number) {
  const R = Math.max(7, slot * 0.47)
  const count = Math.round(Math.min(640, Math.max(150, R * 9)))
  const rimCount = Math.round(count * 0.64)
  const rim = heartOutline(rimCount)
  const out: HP[] = []
  const maxR = Math.hypot(w, h) * 0.5

  const add = (x: number, y: number, isRim: boolean) => {
    const a = Math.random() * Math.PI * 2
    const d = maxR * (0.45 + Math.random() * 0.75)
    const tint = pick(isRim ? HEART_RIM_TINTS : HEART_CORE_TINTS)
    out.push({
      tx: x * R,
      ty: y * R,
      sx: Math.cos(a) * d,
      sy: Math.sin(a) * d,
      size: isRim ? 0.8 + Math.random() * 0.65 : 1 + Math.random() * 1.25,
      sprite: glowSprite(tint, isRim || Math.random() < 0.35),
      base: isRim ? 0.62 + Math.random() * 0.38 : 0.3 + Math.random() * 0.28,
      phase: Math.random() * Math.PI * 2,
      drift: isRim ? 0.3 + Math.random() * 0.7 : 0.6 + Math.random() * 1.3,
      driftSpeed: 0.45 + Math.random() * 0.85,
      swirl: (Math.random() - 0.5) * 2.8,
      rim: isRim,
    })
  }

  for (let i = 0; i < rim.length; i++) add(rim[i].x, rim[i].y, true)
  for (let i = rimCount; i < count; i++) {
    const p = heartInterior(Math.random)
    add(p.x, p.y, false)
  }

  parts = out
  radius = R
}

function blit(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  x: number,
  y: number,
  r: number,
  alpha: number,
) {
  if (alpha <= 0.002) return
  ctx.globalAlpha = alpha > 1 ? 1 : alpha
  ctx.drawImage(sprite, x - r, y - r, r * 2, r * 2)
}

function frame(_dt: number, elapsed: number) {
  const ctx = stage.context
  if (!ctx) return
  const { w, h } = stage.stage
  ctx.clearRect(0, 0, w, h)
  if (state.alpha <= 0.002 || parts.length === 0) return

  const cx = w * 0.5
  const cy = h * 0.5
  const beat = state.beat
  const p = state.progress
  // easeInOutCubic — the particles launch, glide, then settle gently
  const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2

  ctx.globalCompositeOperation = 'lighter'

  // soft bloom behind the shape, so the heart reads as a light source
  const glowK = Math.min(0.17, 0.05 + (beat - 1) * 1.15)
  blit(ctx, glowSprite(COLORS.pink), cx, cy, radius * 2.7 * beat, glowK * state.alpha)
  blit(ctx, glowSprite(COLORS.violet), cx, cy, radius * 1.7 * beat, glowK * 0.7 * state.alpha)

  for (let i = 0; i < parts.length; i++) {
    const q = parts[i]

    // swirl: rotate the launch point around the centre, unwinding to zero
    const ang = (1 - e) * q.swirl
    const ca = Math.cos(ang)
    const sa = Math.sin(ang)
    const rx = q.sx * ca - q.sy * sa
    const ry = q.sx * sa + q.sy * ca

    let x = rx + (q.tx - rx) * e
    let y = ry + (q.ty - ry) * e

    // perpetual micro-drift so the shape never looks frozen
    const t = elapsed * q.driftSpeed + q.phase
    x += Math.sin(t) * q.drift
    y += Math.cos(t * 0.83) * q.drift

    x *= beat
    y *= beat

    const tw = 0.72 + 0.28 * Math.sin(elapsed * 1.6 + q.phase * 3)
    let a = state.alpha * q.base * tw
    if (beat > 1.0005) a *= 1 + (beat - 1) * 3.4

    blit(ctx, q.sprite, cx + x, cy + y, q.size * (q.rim ? 4.4 : 6.4), a)
  }

  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}

const stage = useCanvasStage(canvasEl, {
  size: (canvas) => {
    const parent = canvas.parentElement
    const slot = parent ? Math.min(parent.clientWidth, parent.clientHeight) : 0
    const vmin = Math.min(window.innerWidth, window.innerHeight)
    const size = Math.min(620, Math.max(220, slot * 3.6), vmin * 0.85)
    // Keep the layout box in sync with the backing store; the canvas is
    // absolutely positioned so this never feeds back into the resize loop.
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    return { w: size, h: size }
  },
  observe: (canvas) => canvas.parentElement,
  onResize: ({ w, h }) => {
    const parent = canvasEl.value?.parentElement
    const slot = parent ? Math.min(parent.clientWidth, parent.clientHeight) : 0
    build(w, h, slot || w / 3.6)
  },
  onFrame: frame,
})

onBeforeUnmount(() => {
  formTl?.kill()
  beatTl?.kill()
  pulseTl?.kill()
  gsap.killTweensOf(state)
  parts = []
})

/** Stage three onwards: the heart keeps beating, forever. */
function startBeat(): gsap.core.Timeline {
  beatTl?.kill()
  beatTl = gsap
    .timeline({ repeat: -1, repeatDelay: 0.4 })
    .to(state, { beat: 0.985, duration: 0.2, ease: 'sine.inOut' })
    .to(state, { beat: 1.06, duration: 0.15, ease: 'power2.out' })
    .to(state, { beat: 0.995, duration: 0.2, ease: 'power2.inOut' })
    .to(state, { beat: 1.09, duration: 0.17, ease: 'power2.out' })
    .to(state, { beat: 1, duration: 0.5, ease: 'sine.out' })
  return beatTl
}

defineExpose({
  /** Stage three: particles converge onto the heart curve. */
  form(duration = 1.9): gsap.core.Timeline {
    formTl?.kill()
    formTl = gsap
      .timeline()
      .to(state, { alpha: 1, duration: duration * 0.4, ease: 'power1.out' }, 0)
      .to(state, { progress: 1, duration, ease: 'power2.inOut' }, 0)
    return formTl
  },
  startBeat,
  /** One emphasised beat — used when the final character lands. */
  pulse(strength = 1): gsap.core.Timeline {
    if (!beatTl) return startBeat()
    beatTl.pause()
    pulseTl?.kill()
    pulseTl = gsap
      .timeline({ onComplete: () => beatTl?.restart() })
      .to(state, { beat: 1 + 0.14 * strength, duration: 0.19, ease: 'power2.out' })
      .to(state, { beat: 1, duration: 0.62, ease: 'elastic.out(1, 0.45)' })
    return pulseTl
  },
})
</script>

<template>
  <canvas ref="canvasEl" class="heart-canvas" aria-hidden="true"></canvas>
</template>

<style scoped>
.heart-canvas {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}
</style>
