<script setup lang="ts">
/**
 * The heart at the centre of the title.
 *
 * A single flat vector shape rather than a particle system: one solid rose
 * fill, one soft bloom behind it, and a lub-dub that fires when the cursor
 * arrives (desktop) or a finger taps (touch).
 *
 * The path is sampled from the same parametric curve the rest of the piece
 * is built on, so the silhouette stays exact at any size.
 */
import { onBeforeUnmount, ref } from 'vue'
import gsap from 'gsap'
import { heartSvgPath } from '../utils/heart'

/** Solid rose with a hint of magenta — one flat colour, no gradient. */
const HEART_COLOR = '#f2497f'
/** Resting opacity of the halo: a glow, not a second light source. */
const BLOOM_REST = 0.5

const HEART_PATH = heartSvgPath(32)

const hitEl = ref<HTMLElement | null>(null)
const svgEl = ref<SVGSVGElement | null>(null)
const bloomEl = ref<HTMLElement | null>(null)

let beatTl: gsap.core.Timeline | null = null
let restTl: gsap.core.Timeline | null = null
let restPaused = false
let hoverLoop = 0

/**
 * The idle lub-dub. Paused while a pronounced beat plays so the two are
 * never fighting over `scale`.
 */
function restingBeat(): gsap.core.Timeline {
  restTl?.kill()
  restPaused = false
  const svg = svgEl.value
  if (!svg) return gsap.timeline()
  restTl = gsap
    .timeline({ repeat: -1, repeatDelay: 1.6 })
    .to(svg, { scale: 1.045, duration: 0.26, ease: 'power2.out' })
    .to(svg, { scale: 1, duration: 0.9, ease: 'sine.inOut' })
  return restTl
}

function pauseRest() {
  if (!restPaused && restTl?.isActive()) {
    restTl.pause()
    restPaused = true
  }
}

function resumeRest() {
  if (restPaused) {
    restTl?.resume()
    restPaused = false
  }
}

/**
 * One pronounced beat: shrink → snap open → fall back → a smaller second
 * swell → settle. Killed and rebuilt rather than queued, so hammering the
 * heart re-triggers cleanly instead of stacking up.
 */
function beat(): gsap.core.Timeline {
  beatTl?.kill()
  pauseRest()

  const svg = svgEl.value
  const bloom = bloomEl.value
  const tl = gsap.timeline({ onComplete: resumeRest })
  beatTl = tl
  if (!svg) return tl

  // The halo swells a little wider than the shape, so the glow leads the fill.
  const glow = (s: number) => 1 + (s - 1) * 1.6

  const step = (s: number, duration: number, ease: string, at: number) => {
    tl.to(svg, { scale: s, duration, ease }, at)
    if (bloom)
      tl.to(
        bloom,
        { scale: glow(s), opacity: BLOOM_REST + (s - 1) * 1.9, duration, ease },
        at,
      )
  }

  step(0.9, 0.13, 'power2.in', 0)
  step(1.17, 0.19, 'power3.out', 0.13)
  step(0.98, 0.15, 'sine.inOut', 0.32)
  step(1.06, 0.17, 'power2.out', 0.47)
  step(1, 0.55, 'elastic.out(1, 0.55)', 0.64)

  return tl
}

function stopHoverLoop() {
  if (hoverLoop) {
    clearInterval(hoverLoop)
    hoverLoop = 0
  }
}

function onPointerEnter(e: PointerEvent) {
  // A touch also fires pointerenter as part of the tap, and pointerdown
  // already covers that — only a real cursor gets the hover behaviour.
  if (e.pointerType !== 'mouse') return
  beat()
  // One beat on arrival, then an unhurried pulse for as long as it stays.
  stopHoverLoop()
  hoverLoop = window.setInterval(beat, 1900)
}

function onPointerLeave() {
  stopHoverLoop()
}

function onPointerDown(e: PointerEvent) {
  e.preventDefault()
  beat()
}

onBeforeUnmount(() => {
  stopHoverLoop()
  beatTl?.kill()
  restTl?.kill()
})

defineExpose({
  restingBeat,
  beat,
  /** The heart easing into the composition. */
  show(duration = 0.9): gsap.core.Timeline {
    const hit = hitEl.value
    const svg = svgEl.value
    const bloom = bloomEl.value
    const tl = gsap.timeline()
    if (hit) tl.to(hit, { opacity: 1, duration: duration * 0.7, ease: 'power1.out' }, 0)
    if (bloom) tl.to(bloom, { opacity: BLOOM_REST, duration, ease: 'power2.out' }, 0)
    if (svg)
      tl.fromTo(
        svg,
        { scale: 0.7 },
        { scale: 1, duration, ease: 'back.out(1.7)', transformOrigin: '50% 50%' },
        0,
      )
    return tl
  },
})
</script>

<template>
  <div
    ref="hitEl"
    class="heart"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
    @pointerdown="onPointerDown"
  >
    <span ref="bloomEl" class="heart-bloom" aria-hidden="true"></span>
    <svg ref="svgEl" class="heart-svg" viewBox="0 0 32 32" aria-hidden="true">
      <path :d="HEART_PATH" :fill="HEART_COLOR" />
    </svg>
  </div>
</template>

<style scoped>
/* Sized to the title's heart slot, and the whole box is the hit target —
   corners included, which on a phone is the difference between a reliable
   tap and a fiddly one. */
.heart {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 100%;
  height: 100%;
  transform: translate(-50%, -50%);
  opacity: 0;
  cursor: pointer;
  pointer-events: auto;
  -webkit-tap-highlight-color: transparent;
}

/* The halo: centred with negative insets so GSAP owns `transform` alone. */
.heart-bloom {
  position: absolute;
  inset: -100%;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(242, 73, 127, 0.24) 0%,
    rgba(168, 112, 255, 0.11) 42%,
    rgba(168, 112, 255, 0) 70%
  );
  opacity: 0;
  pointer-events: none;
  will-change: transform, opacity;
}

.heart-svg {
  display: block;
  width: 104%;
  height: 104%;
  margin: -2%;
  overflow: visible;
  pointer-events: none;
  /* A glow, not a gradient fill: the shape itself is one flat colour. */
  filter: drop-shadow(0 0 9px rgba(242, 73, 127, 0.6))
    drop-shadow(0 0 26px rgba(178, 102, 255, 0.4));
  transform-origin: 50% 50%;
  will-change: transform;
}
</style>
