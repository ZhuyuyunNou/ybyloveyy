<script setup lang="ts">
/**
 * The ambient layer: drifting stars, soft motes, the finale's rising
 * particles, click explosions and the cursor halo — all in one canvas,
 * one requestAnimationFrame loop, one pass of `drawImage` blits.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import gsap from 'gsap'
import { useCanvasStage } from '../composables/useCanvasStage'
import { useMouseParticles } from '../composables/useMouseParticles'
import type { BurstRequest } from '../composables/useMouseParticles'
import { glowSprite, heartSprite, HEART_FILL } from '../utils/sprites'
import { BURST_TINTS, COLORS, MOTE_TINTS, RISE_TINTS, pick } from '../utils/palette'

const KIND_STAR = 0
const KIND_MOTE = 1
const KIND_RISE = 2
const KIND_SPARK = 3

interface P {
  kind: number
  x: number
  y: number
  vx: number
  vy: number
  /** velocity the particle relaxes back to once the cursor stops pushing */
  bx: number
  by: number
  r: number
  base: number
  phase: number
  freq: number
  depth: number
  tint: string
  sprite: HTMLCanvasElement
  heart: boolean
  rot: number
  rotV: number
  life: number
  maxLife: number
  span: number
  alive: boolean
}

const canvasEl = ref<HTMLCanvasElement | null>(null)
const field = useMouseParticles()

/**
 * Intro dials, all driven by the master timeline in App.vue.
 *  fade  — whole layer opacity, 0 while the page is still pitch black
 *  energy— how bright the ambient motes burn
 *  rise  — how many of the finale's rising particles are alive
 */
const state = { fade: 0, energy: 0.5, rise: 0 }
let ambientTween: gsap.core.Tween | null = null
let boostTl: gsap.core.Timeline | null = null

const stars: P[] = []
const motes: P[] = []
const risers: P[] = []
const sparks: P[] = []
let sparkCursor = 0

/**
 * Blob footprint, relative to a desktop. A sprite that reads as a speck on
 * a 1080p monitor reads as a lump on a handset, so the soft blobs shrink a
 * little on small screens. 1 on anything desktop-sized.
 */
let scaleK = 1

/** How many risers apart the floating hearts are, so the finale stays a
    scattering of hearts instead of a confetti of them. */
let heartEvery = 11

const PUSH_R = 152
const PUSH_R2 = PUSH_R * PUSH_R

function blank(): P {
  return {
    kind: KIND_MOTE,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    bx: 0,
    by: 0,
    r: 2,
    base: 0.4,
    phase: 0,
    freq: 1,
    depth: 1,
    tint: COLORS.violet,
    sprite: glowSprite(COLORS.violet),
    heart: false,
    rot: 0,
    rotV: 0,
    life: 0,
    maxLife: 1,
    span: 1,
    alive: true,
  }
}

/* ------------------------------------------------------------------ pools */

function build(w: number, h: number) {
  // Scale the particle budget with the viewport so phones stay smooth.
  // Area, not width: a phone has roughly a sixth of a desktop's pixels, and
  // a width-only cut still leaves the same sprites crowding a sixth of the
  // space. Floored so a phone keeps enough of a starfield to read as one.
  const q = Math.max(0.3, Math.min(1, (w * h) / (1440 * 900)))
  scaleK = Math.min(1, Math.max(0.68, Math.min(w, h) / 820))
  heartEvery = w < 560 ? 22 : w < 900 ? 15 : 11

  stars.length = 0
  const starCount = Math.round(150 * q) + 40
  for (let i = 0; i < starCount; i++) {
    const p = blank()
    const tint = Math.random() < 0.22 ? pick(MOTE_TINTS) : COLORS.ice
    p.kind = KIND_STAR
    p.x = Math.random() * w
    p.y = Math.random() * h
    p.bx = (Math.random() - 0.5) * 3.4
    p.by = (Math.random() - 0.5) * 2.6
    p.vx = p.bx
    p.vy = p.by
    p.r = 0.6 + Math.random() * 1.5
    p.base = 0.18 + Math.random() * 0.5
    p.phase = Math.random() * Math.PI * 2
    p.freq = 0.4 + Math.random() * 1.3
    p.depth = 0.35 + Math.random() * 0.9
    p.tint = tint
    p.sprite = glowSprite(tint, true)
    stars.push(p)
  }

  motes.length = 0
  const moteCount = Math.round(70 * q) + 20
  for (let i = 0; i < moteCount; i++) {
    const p = blank()
    const tint = pick(MOTE_TINTS)
    p.kind = KIND_MOTE
    p.x = Math.random() * w
    p.y = Math.random() * h
    p.bx = (Math.random() - 0.5) * 9
    p.by = -4 - Math.random() * 11
    p.vx = p.bx
    p.vy = p.by
    p.r = 3 + Math.random() * 9
    p.base = 0.07 + Math.random() * 0.14
    p.phase = Math.random() * Math.PI * 2
    p.freq = 0.25 + Math.random() * 0.6
    p.tint = tint
    p.sprite = glowSprite(tint)
    motes.push(p)
  }

  risers.length = 0
  const riseCount = Math.round(240 * q) + 60
  for (let i = 0; i < riseCount; i++) {
    const p = blank()
    const tint = pick(RISE_TINTS)
    p.kind = KIND_RISE
    p.heart = i % heartEvery === 0
    p.x = Math.random() * w
    p.y = h + 30
    p.by = -(14 + Math.random() * 34)
    p.bx = 0
    p.vy = p.by
    p.vx = 0
    p.r = 1.4 + Math.random() * 3.4
    p.base = 0.24 + Math.random() * 0.4
    p.phase = Math.random() * Math.PI * 2
    p.freq = 0.4 + Math.random() * 0.9
    p.depth = 0.5 + Math.random() * 0.9
    p.tint = tint
    p.sprite = p.heart ? heartSprite(tint) : glowSprite(tint, true)
    p.span = 60 + Math.random() * 90
    p.rot = (Math.random() - 0.5) * 0.6
    p.rotV = (Math.random() - 0.5) * 0.7
    p.alive = false
    risers.push(p)
  }

  sparks.length = 0
  const sparkCount = Math.round(420 * q) + 120
  for (let i = 0; i < sparkCount; i++) sparks.push({ ...blank(), kind: KIND_SPARK, alive: false })
  sparkCursor = 0
}

/** Free slot, or — when the pool is exhausted — the spark closest to death. */
function takeSpark(): P {
  const n = sparks.length
  for (let i = 0; i < n; i++) {
    const idx = (sparkCursor + i) % n
    if (!sparks[idx].alive) {
      sparkCursor = (idx + 1) % n
      return sparks[idx]
    }
  }
  let best = 0
  let bestLife = Infinity
  for (let i = 0; i < n; i++) {
    if (sparks[i].life < bestLife) {
      bestLife = sparks[i].life
      best = i
    }
  }
  return sparks[best]
}

function spawnBurst(req: BurstRequest) {
  if (sparks.length === 0) return
  for (let i = 0; i < req.count; i++) {
    const p = takeSpark()
    const a = Math.random() * Math.PI * 2
    const speed = req.speed * (0.22 + Math.random() * 1.05)
    p.x = req.x
    p.y = req.y
    p.vx = Math.cos(a) * speed
    p.vy = Math.sin(a) * speed
    p.r = req.size * (0.45 + Math.random() * 1.15)
    p.base = 0.9
    p.tint = pick(BURST_TINTS)
    p.heart = Math.random() < 0.055
    p.sprite = p.heart ? heartSprite(p.tint) : glowSprite(p.tint, Math.random() < 0.55)
    p.rot = Math.random() * Math.PI * 2
    p.rotV = (Math.random() - 0.5) * 7
    p.maxLife = req.life * (0.55 + Math.random() * 0.65)
    p.life = p.maxLife
    p.alive = true
  }
}

/* --------------------------------------------------------------- physics */

function pointerForce(p: P, dt: number, strength: number) {
  const dx = p.x - field.pointer.x
  const dy = p.y - field.pointer.y
  const d2 = dx * dx + dy * dy
  if (d2 > PUSH_R2) return
  const d = Math.sqrt(d2)
  if (d < 0.001) return
  const falloff = 1 - d / PUSH_R
  const accel = falloff * falloff * strength
  const nx = dx / d
  const ny = dy / d
  // radial push + a touch of swirl, so the field feels fluid
  p.vx += (nx - ny * 0.55) * accel * dt
  p.vy += (ny + nx * 0.55) * accel * dt
}

function wrap(p: P, w: number, h: number, m: number) {
  if (p.x < -m) p.x = w + m
  else if (p.x > w + m) p.x = -m
  if (p.y < -m) p.y = h + m
  else if (p.y > h + m) p.y = -m
}

function blit(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  x: number,
  y: number,
  radius: number,
  alpha: number,
) {
  if (alpha <= 0.002) return
  ctx.globalAlpha = alpha > 1 ? 1 : alpha
  ctx.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2)
}

/* ----------------------------------------------------------------- frame */

function frame(dt: number, elapsed: number) {
  const ctx = stage.context
  if (!ctx) return
  const { w, h } = stage.stage
  ctx.clearRect(0, 0, w, h)

  field.sampleVelocity()
  while (field.bursts.length) {
    const req = field.bursts.shift()
    if (req) spawnBurst(req)
  }

  const energy = state.energy
  const fade = state.fade
  const px = field.pointer.x
  const py = field.pointer.y
  const hasPointer = field.pointer.active && field.pointer.inside
  const relax = 1 - Math.pow(0.94, dt * 60)
  const starRelax = 1 - Math.pow(0.985, dt * 60)
  const drag = Math.pow(0.9, dt * 60)

  ctx.globalCompositeOperation = 'lighter'

  /* --- stars: slow drift, twinkle, faint parallax --------------------- */
  for (let i = 0; i < stars.length; i++) {
    const p = stars[i]
    p.vx += (p.bx - p.vx) * starRelax
    p.vy += (p.by - p.vy) * starRelax
    p.x += p.vx * dt
    p.y += p.vy * dt
    wrap(p, w, h, 24)

    const tw = 0.55 + 0.45 * Math.sin(elapsed * p.freq + p.phase)
    const ox = hasPointer ? (px - w * 0.5) * 0.008 * p.depth : 0
    const oy = hasPointer ? (py - h * 0.5) * 0.008 * p.depth : 0
    blit(ctx, p.sprite, p.x + ox, p.y + oy, p.r * 4.6, p.base * tw * fade)
  }

  /* --- ambient motes -------------------------------------------------- */
  const moteAlpha = (0.6 + 0.4 * energy) * fade
  for (let i = 0; i < motes.length; i++) {
    const p = motes[i]
    if (hasPointer) pointerForce(p, dt, 520)
    p.vx += (p.bx - p.vx) * relax
    p.vy += (p.by - p.vy) * relax
    p.x += p.vx * dt
    p.y += p.vy * dt
    wrap(p, w, h, 60)

    const tw = 0.6 + 0.4 * Math.sin(elapsed * p.freq + p.phase)
    blit(ctx, p.sprite, p.x, p.y, p.r * scaleK, p.base * tw * moteAlpha)
  }

  /* --- rising particles (stage five) ---------------------------------- */
  const active = Math.round(risers.length * state.rise)
  for (let i = 0; i < risers.length; i++) {
    const p = risers[i]
    if (i >= active) {
      p.alive = false
      continue
    }
    if (!p.alive) {
      // Seed new risers anywhere on screen so the surge looks organic
      // instead of a single wave leaving the floor.
      p.alive = true
      p.x = Math.random() * w
      p.y = h + 20 + Math.random() * 120
      if (state.rise > 0.6 && Math.random() < 0.75) p.y = Math.random() * h
      p.vy = p.by
      p.vx = 0
    }

    if (hasPointer) pointerForce(p, dt, 380)
    p.vy += (p.by - p.vy) * relax
    p.x += p.vx * dt + Math.sin(elapsed * p.freq + p.phase) * p.span * dt
    p.y += p.vy * dt
    p.rot += p.rotV * dt

    if (p.y < -40 || p.x < -80 || p.x > w + 80) {
      p.alive = false
      continue
    }

    const f = (h + 140 - p.y) / (h + 180)
    const vis = Math.sin(Math.PI * Math.min(1, Math.max(0, f)))
    const alpha = p.base * Math.pow(vis, 0.8) * (0.55 + 0.45 * energy) * fade
    if (p.heart) {
      const size = p.r * 6 * scaleK
      const s = size / HEART_FILL
      ctx.globalAlpha = alpha > 1 ? 1 : alpha
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.drawImage(p.sprite, -s / 2, -s / 2, s, s)
      ctx.restore()
    } else {
      blit(ctx, p.sprite, p.x, p.y, p.r * 4 * scaleK, alpha)
    }
  }

  /* --- click explosions ----------------------------------------------- */
  for (let i = 0; i < sparks.length; i++) {
    const p = sparks[i]
    if (!p.alive) continue
    p.life -= dt
    if (p.life <= 0) {
      p.alive = false
      continue
    }
    p.vx *= drag
    p.vy *= drag
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.rot += p.rotV * dt

    const k = p.life / p.maxLife
    const alpha = Math.pow(k, 0.75) * p.base
    const size = p.r * (0.4 + 0.6 * k)
    if (p.heart) {
      const s = (size * 7) / HEART_FILL
      ctx.globalAlpha = alpha > 1 ? 1 : alpha
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.drawImage(p.sprite, -s / 2, -s / 2, s, s)
      ctx.restore()
    } else {
      blit(ctx, p.sprite, p.x, p.y, size * 4.5, alpha)
    }
  }

  /* --- cursor halo ---------------------------------------------------- */
  if (hasPointer) {
    const lead = 0.9
    const cx = px + field.pointer.vx * lead
    const cy = py + field.pointer.vy * lead
    blit(ctx, glowSprite(COLORS.violet), cx, cy, 190, 0.075)
    blit(ctx, glowSprite(COLORS.rose), cx, cy, 74, 0.055)
    blit(ctx, glowSprite(COLORS.blush, true), cx, cy, 16, 0.16)
  }

  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}

/* ------------------------------------------------------------ lifecycle */

const stage = useCanvasStage(canvasEl, {
  onResize: ({ w, h }) => {
    build(w, h)
  },
  onFrame: frame,
})

onMounted(() => {
  field.install()
  // A slow shimmer so the ambient layer never reads as a frozen texture.
  ambientTween = gsap.to(state, {
    energy: 0.68,
    duration: 5.5,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  })
})

onBeforeUnmount(() => {
  field.uninstall()
  ambientTween?.kill()
  ambientTween = null
  boostTl?.kill()
  boostTl = null
  gsap.killTweensOf(state)
  stars.length = 0
  motes.length = 0
  risers.length = 0
  sparks.length = 0
})

/* --------------------------------------------------------------- public */

defineExpose({
  /** Stage one: the world fades up out of the black. */
  reveal() {
    return gsap.to(state, { fade: 1, duration: 2.4, ease: 'power2.inOut' })
  },
  /** Radial explosion. Used by the intro and by clicks. */
  burst(x: number, y: number, count = 34, speed = 118, life = 1.05, size = 1.5) {
    field.requestBurst({ x, y, count, speed, life, size })
  },
  /** Stage five: the scene visibly comes alive. */
  boost() {
    ambientTween?.kill()
    ambientTween = null
    boostTl?.kill()
    boostTl = gsap
      .timeline()
      .to(state, { rise: 1, duration: 3.4, ease: 'power2.out' }, 0)
      .to(state, { energy: 1, duration: 2.6, ease: 'power2.out' }, 0)
    return boostTl
  },
})
</script>

<template>
  <canvas ref="canvasEl" class="bg-canvas" aria-hidden="true"></canvas>
</template>

<style scoped>
.bg-canvas {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}
</style>
