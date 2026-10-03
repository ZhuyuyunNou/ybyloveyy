<script setup lang="ts">
/**
 * The composition 叶博一 ❤️ 余韵.
 *
 * Layout notes
 * ------------
 * The row is a flexbox: [name] [heart slot] [name]. The particle heart
 * lives in a fixed-size slot so it takes part in the layout like a glyph,
 * and the row is translated with GSAP so that the *heart slot* always
 * lands on the exact centre of the viewport — which is also where the
 * opening light seed blooms, so stage one and stage three share a centre.
 *
 * The reveal is a "typewriter that grows out of the middle": each new
 * character appears while the row slides so the characters revealed so
 * far stay centred. That slide is driven by one tween reading live
 * measurements, so a resize mid-reveal stays correct.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import gsap from 'gsap'
import ParticleHeart from './ParticleHeart.vue'

const LEFT = ['叶', '博', '一']
const RIGHT = ['余', '韵']

const rowEl = ref<HTMLElement | null>(null)
const leftEl = ref<HTMLElement | null>(null)
const rightEl = ref<HTMLElement | null>(null)
const slotEl = ref<HTMLElement | null>(null)
const haloEl = ref<HTMLElement | null>(null)
const heartEl = ref<InstanceType<typeof ParticleHeart> | null>(null)

const GLOW_OFF = '0 0 0px rgba(255,120,190,0), 0 0 0px rgba(158,110,255,0)'
const GLOW_ON = '0 0 18px rgba(255,120,190,0.5), 0 0 54px rgba(158,110,255,0.32)'
const GLOW_BREATH = '0 0 30px rgba(255,146,206,0.78), 0 0 86px rgba(164,116,255,0.5)'

const STEP = 0.45
const CHAR_DUR = 0.95
const REVEAL_TOTAL = STEP * (LEFT.length - 1) + CHAR_DUR

type Phase = 'idle' | 'revealing' | 'done'

let vc = 0
let baseLeft = 0
let charW = 0
let xLeft = 0
let xSettled = 0
let phase: Phase = 'idle'

/**
 * Row translation that puts the centre of the first `k` characters on screen
 * centre — then clamped so the row box never crosses the viewport edge. The
 * characters still to come occupy layout while invisible, so on a narrow
 * phone centring 叶博一 would otherwise push 余韵 a couple of pixels off the
 * right edge. The clamp only ever bites in that case.
 */
function xAt(k: number) {
  const x = vc - (baseLeft + (k * charW) / 2)
  const rowW = rowEl.value?.offsetWidth ?? 0
  if (!rowW) return x
  return Math.max(-baseLeft, Math.min(x, window.innerWidth - baseLeft - rowW))
}

/** Piecewise smoothstep between waypoints, used for the reveal slide. */
function piecewise(t: number, times: number[], values: number[]) {
  if (t <= times[0]) return values[0]
  for (let i = 0; i < times.length - 1; i++) {
    if (t <= times[i + 1]) {
      const span = times[i + 1] - times[i]
      const f = span > 0.0001 ? (t - times[i]) / span : 1
      return values[i] + (values[i + 1] - values[i]) * f * f * (3 - 2 * f)
    }
  }
  return values[values.length - 1]
}

function charsOf(root: HTMLElement | null) {
  if (!root) return [] as HTMLElement[]
  return Array.from(root.querySelectorAll<HTMLElement>('.ch'))
}

function allInners() {
  return [...charsOf(leftEl.value), ...charsOf(rightEl.value)].map(
    (el) => el.firstElementChild as HTMLElement,
  )
}

/**
 * Horizontal offset of `el` inside `root`, accumulated through the offset
 * parent chain. Layout-based, so it is immune to the scale/translate
 * transforms the reveal puts on `.ch` — `getBoundingClientRect()` is not,
 * and reading it mid-animation shifts every glyph's gradient slice.
 */
function offsetWithin(el: HTMLElement, root: HTMLElement) {
  let x = 0
  let node: HTMLElement | null = el
  while (node && node !== root) {
    x += node.offsetLeft
    node = node.offsetParent as HTMLElement | null
  }
  return x
}

/**
 * Each character carries the *same* gradient, sized to the whole row and
 * offset to its own position, so the gradient reads as one continuous
 * sweep across 叶博一 ❤️ 余韵 instead of repeating per glyph.
 */
function paintGradient(row: HTMLElement) {
  const width = row.offsetWidth
  if (!width) return
  const inners = row.querySelectorAll<HTMLElement>('.ch-in')
  for (let i = 0; i < inners.length; i++) {
    const el = inners[i]
    el.style.backgroundSize = `${width}px 100%`
    el.style.backgroundPosition = `${-offsetWithin(el, row)}px 0`
  }
}

function measure() {
  const row = rowEl.value
  const left = leftEl.value
  const slot = slotEl.value
  if (!row || !left || !slot) return

  // `.name` and `.heart-slot` never carry transforms, so their client
  // rects are trustworthy once the row itself is back at x = 0.
  gsap.set(row, { x: 0 })
  vc = window.innerWidth / 2
  const leftRect = left.getBoundingClientRect()
  const slotRect = slot.getBoundingClientRect()

  baseLeft = leftRect.left
  charW = leftRect.width / LEFT.length
  xLeft = vc - (leftRect.left + leftRect.width / 2)
  xSettled = vc - (slotRect.left + slotRect.width / 2)

  paintGradient(row)

  if (phase === 'idle') gsap.set(row, { x: xLeft })
  else if (phase === 'done') gsap.set(row, { x: xSettled })
  // while revealing, the running tween re-applies x from the live values
}

let resizeRaf = 0
function onResize() {
  cancelAnimationFrame(resizeRaf)
  resizeRaf = requestAnimationFrame(measure)
}

onMounted(() => {
  measure()
  window.addEventListener('resize', onResize, { passive: true })
  window.addEventListener('orientationchange', onResize, { passive: true })
  // CJK system fonts are synchronous, but a late swap would shift metrics.
  document.fonts?.ready.then(() => measure()).catch(() => {})
})

onBeforeUnmount(() => {
  cancelAnimationFrame(resizeRaf)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('orientationchange', onResize)
})

/** One character: blur-to-sharp body plus a neon glow that ramps in behind it. */
function revealChar(tl: gsap.core.Timeline, el: HTMLElement, at: number) {
  const inner = el.firstElementChild as HTMLElement
  tl.fromTo(
    el,
    { opacity: 0, y: 20, scale: 1.32 },
    { opacity: 1, y: 0, scale: 1, duration: CHAR_DUR, ease: 'power3.out' },
    at,
  )
  tl.fromTo(
    inner,
    { filter: 'blur(18px)', textShadow: GLOW_OFF },
    {
      filter: 'blur(0px)',
      textShadow: GLOW_ON,
      duration: CHAR_DUR * 1.45,
      ease: 'power2.out',
    },
    at,
  )
}

defineExpose({
  /** Stage two: 叶博一, one character at a time, growing out of centre. */
  revealLeft(): gsap.core.Timeline {
    phase = 'revealing'
    const row = rowEl.value
    const chars = charsOf(leftEl.value)
    const tl = gsap.timeline()
    if (!row || chars.length === 0) return tl

    gsap.set(row, { x: xAt(1) })
    revealChar(tl, chars[0], 0)

    // slide waypoints, in seconds: hold, then catch up with each new glyph
    const times = [0, STEP, STEP + 0.6, REVEAL_TOTAL]
    const keys = [1, 1, 2, LEFT.length]
    const prog = { v: 0 }
    tl.to(
      prog,
      {
        v: 1,
        duration: REVEAL_TOTAL,
        ease: 'none',
        onUpdate: () => {
          const k = piecewise(prog.v * REVEAL_TOTAL, times, keys)
          gsap.set(row, { x: xAt(k) })
        },
      },
      0,
    )

    for (let i = 1; i < chars.length; i++) revealChar(tl, chars[i], i * STEP)
    return tl
  },

  /** Stage three: with the heart arriving, the row rebalances around it. */
  settle(): gsap.core.Timeline {
    phase = 'done'
    const row = rowEl.value
    // start from wherever the row physically is, so a resize mid-reveal
    // can never produce a jump
    const fromX = row ? Number(gsap.getProperty(row, 'x')) || 0 : 0
    const prog = { v: 0 }
    const tl = gsap.timeline()
    tl.to(
      prog,
      {
        v: 1,
        duration: 1.7,
        ease: 'power2.inOut',
        onUpdate: () => {
          if (row) gsap.set(row, { x: fromX + (xSettled - fromX) * prog.v })
        },
      },
      0,
    )
    // the ambient halo grows as the composition settles
    const halo = haloEl.value
    if (halo) tl.to(halo, { opacity: 0.5, duration: 1.7, ease: 'power2.out' }, 0)
    return tl
  },

  /** Stage four: 余韵 appears to the right of the heart. */
  revealRight(): gsap.core.Timeline {
    const chars = charsOf(rightEl.value)
    const tl = gsap.timeline()
    for (let i = 0; i < chars.length; i++) revealChar(tl, chars[i], i * STEP)
    return tl
  },

  /** Stage five: a slow shimmer travelling through the title. */
  breath(): gsap.core.Timeline {
    const inners = allInners()
    const tl = gsap.timeline({ repeat: -1, yoyo: true })
    tl.to(
      inners,
      {
        textShadow: GLOW_BREATH,
        duration: 2.2,
        ease: 'sine.inOut',
        stagger: { each: 0.26, from: 'start' },
      },
      0,
    )
    const halo = haloEl.value
    if (halo) tl.to(halo, { opacity: 0.92, duration: 2.8, ease: 'sine.inOut' }, 0)
    return tl
  },

  /** Emphasised heartbeat when the final character lands. */
  pulseHeart() {
    heartEl.value?.pulse(1)
  },

  formHeart(duration?: number): gsap.core.Timeline {
    return heartEl.value?.form(duration) ?? gsap.timeline()
  },

  heartbeat(): gsap.core.Timeline {
    return heartEl.value?.startBeat() ?? gsap.timeline()
  },

  /**
   * Where the heart will finally rest. `settle()` parks the heart slot on
   * the horizontal centre of the viewport, so x is the centre by
   * construction; y comes from the live layout.
   */
  heartCentre() {
    const slot = slotEl.value
    if (!slot) return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const r = slot.getBoundingClientRect()
    return { x: window.innerWidth / 2, y: r.top + r.height / 2 }
  },
})
</script>

<template>
  <div ref="rowEl" class="title-row">
    <div ref="haloEl" class="title-halo" aria-hidden="true"></div>

    <h1 ref="leftEl" class="name">
      <span v-for="(c, i) in LEFT" :key="`l${i}`" class="ch"
        ><span class="ch-in">{{ c }}</span></span
      >
    </h1>

    <div ref="slotEl" class="heart-slot" aria-hidden="true">
      <ParticleHeart ref="heartEl" />
    </div>

    <h1 ref="rightEl" class="name">
      <span v-for="(c, i) in RIGHT" :key="`r${i}`" class="ch"
        ><span class="ch-in">{{ c }}</span></span
      >
    </h1>
  </div>
</template>

<style scoped>
.title-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.3em;
  font-size: var(--title-size);
  font-weight: 300;
  line-height: 1;
  white-space: nowrap;
  will-change: transform;
}

.name {
  display: flex;
  align-items: center;
  font-size: 1em;
  font-weight: inherit;
  line-height: 1.1;
  letter-spacing: 0.14em;
  /* cancel the trailing letter-space so the block reads as optically centred */
  margin-right: -0.14em;
}

.ch {
  display: inline-block;
  opacity: 0;
  will-change: transform, opacity, filter;
}

.ch-in {
  display: inline-block;
  background-image: linear-gradient(
    100deg,
    #ffe3f2 0%,
    #ff9ecd 20%,
    #ff6fb5 40%,
    #c98cff 66%,
    #8f7dff 88%,
    #b39bff 100%
  );
  background-repeat: no-repeat;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}

.heart-slot {
  position: relative;
  flex: 0 0 auto;
  width: 1.06em;
  height: 1.06em;
}

.title-halo {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 16em;
  height: 6.4em;
  transform: translate(-50%, -50%);
  background: radial-gradient(
    ellipse at center,
    rgba(255, 118, 188, 0.22) 0%,
    rgba(168, 112, 255, 0.12) 42%,
    rgba(168, 112, 255, 0) 72%
  );
  filter: blur(18px);
  opacity: 0;
  pointer-events: none;
  z-index: -1;
}
</style>
