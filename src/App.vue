<script setup lang="ts">
/**
 * 叶博一 ❤️ 余韵
 *
 * One master GSAP timeline drives the whole piece. Each layer owns its
 * own animation and hands App a tween/timeline to schedule, so there is a
 * single source of truth for pacing and nothing runs on a stray timer.
 *
 *   1  darkness → a seed of light → the world fades up
 *   2  叶博一, character by character, out of the blur
 *   3  a beat of silence, then the particle heart gathers and starts beating
 *   4  余韵 joins on the right of the heart
 *   5  the scene fills with rising light, the title starts to breathe
 *   6  the quiet line underneath
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import gsap from 'gsap'
import BackgroundParticles from './components/BackgroundParticles.vue'
import LightSeed from './components/LightSeed.vue'
import LoveTitle from './components/LoveTitle.vue'
import SubtitleLine from './components/SubtitleLine.vue'

const bgRef = ref<InstanceType<typeof BackgroundParticles> | null>(null)
const seedRef = ref<InstanceType<typeof LightSeed> | null>(null)
const titleRef = ref<InstanceType<typeof LoveTitle> | null>(null)
const subRef = ref<InstanceType<typeof SubtitleLine> | null>(null)
const washEl = ref<HTMLElement | null>(null)
const auroraEl = ref<HTMLElement | null>(null)

let master: gsap.core.Timeline | null = null

onMounted(() => {
  const bg = bgRef.value
  const seed = seedRef.value
  const title = titleRef.value
  const sub = subRef.value
  if (!bg || !seed || !title || !sub) return

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
  master = tl

  /* ── 1 ── the light point, and the particles it throws outward -------- */
  // The room is genuinely black at t = 0; the ambience is lit by the seed
  // rather than being there from the start.
  if (washEl.value)
    tl.to(washEl.value, { opacity: 1, duration: 2.8, ease: 'power2.inOut' }, 0)
  if (auroraEl.value)
    tl.to(auroraEl.value, { opacity: 1, duration: 4.4, ease: 'power2.inOut' }, 0.5)
  tl.add(seed.reveal(), 0)
  tl.add(bg.reveal(), 0)
  tl.call(
    () => {
      const c = title.heartCentre()
      bg.burst(c.x, c.y, 84, 92, 2.2, 1.7)
    },
    undefined,
    0.7,
  )

  /* ── 2 ── 叶博一 ----------------------------------------------------- */
  tl.add(title.revealLeft(), 2.5)
  tl.to({}, { duration: 1.05 }) // the pause before the heart

  /* ── 3 ── the heart gathers, then starts beating --------------------- */
  tl.add(title.settle(), '>')
  tl.add(title.showHeart(1.1), '<')
  tl.call(
    () => {
      title.heartbeat()
    },
    undefined,
    '>-0.55',
  )

  /* ── 4 ── 余韵 ------------------------------------------------------- */
  tl.add(title.revealRight(), '>-0.35')
  tl.call(() => title.pulseHeart(), undefined, '>')

  /* ── 5 ── the world comes alive -------------------------------------- */
  tl.call(
    () => {
      bg.boost()
    },
    undefined,
    '<0.2',
  )
  tl.add(title.breath(), '<')

  /* ── 6 ── the quiet line --------------------------------------------- */
  tl.add(sub.reveal(), '>-0.5')
})

onBeforeUnmount(() => {
  master?.kill()
  master = null
})
</script>

<template>
  <div class="scene">
    <div ref="washEl" class="wash" aria-hidden="true"></div>

    <div ref="auroraEl" class="aurora-layer" aria-hidden="true">
      <span class="aurora a1"></span>
      <span class="aurora a2"></span>
      <span class="aurora a3"></span>
    </div>

    <BackgroundParticles ref="bgRef" />
    <LightSeed ref="seedRef" />

    <main class="stage">
      <div class="stage-inner">
        <LoveTitle ref="titleRef" />
        <div class="subtitle-anchor">
          <SubtitleLine ref="subRef" />
        </div>
      </div>
    </main>

    <div class="vignette" aria-hidden="true"></div>
    <div class="grain" aria-hidden="true"></div>
  </div>
</template>

<style scoped>
.scene {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  /* The floor of the piece: pitch black, and the only thing on screen
     before the seed lights up. */
  background: #03010a;
}

/* ------------------------------------------------------------ ambience */

/* The ambient wash, lit by the seed rather than present from the start. */
.wash {
  position: absolute;
  inset: 0;
  z-index: 0;
  opacity: 0;
  background: radial-gradient(
    ellipse 118% 88% at 50% 42%,
    #150c2e 0%,
    #0a0518 44%,
    #03010a 80%
  );
}

.aurora-layer {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  opacity: 0;
}

.aurora {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  mix-blend-mode: screen;
  /* Kept deliberately faint: the brief is a clean dark gradient with a
     whisper of glow, not a coloured light show. */
  opacity: 0.3;
  will-change: transform;
}

.a1 {
  width: 72vmax;
  height: 72vmax;
  left: -20vmax;
  top: -24vmax;
  background: radial-gradient(
    circle,
    rgba(126, 86, 255, 0.4) 0%,
    rgba(126, 86, 255, 0) 66%
  );
  animation: drift1 46s ease-in-out infinite alternate;
}

.a2 {
  width: 58vmax;
  height: 58vmax;
  right: -18vmax;
  top: 4vmax;
  background: radial-gradient(
    circle,
    rgba(255, 90, 172, 0.28) 0%,
    rgba(255, 90, 172, 0) 66%
  );
  animation: drift2 54s ease-in-out infinite alternate;
}

.a3 {
  width: 64vmax;
  height: 64vmax;
  left: 16vmax;
  bottom: -30vmax;
  background: radial-gradient(
    circle,
    rgba(96, 96, 255, 0.32) 0%,
    rgba(96, 96, 255, 0) 68%
  );
  animation: drift3 62s ease-in-out infinite alternate;
}

@keyframes drift1 {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    transform: translate3d(6vmax, 5vmax, 0) scale(1.16);
  }
}

@keyframes drift2 {
  from {
    transform: translate3d(0, 0, 0) scale(1.1);
  }
  to {
    transform: translate3d(-7vmax, 6vmax, 0) scale(0.94);
  }
}

@keyframes drift3 {
  from {
    transform: translate3d(0, 0, 0) scale(0.95);
  }
  to {
    transform: translate3d(5vmax, -6vmax, 0) scale(1.18);
  }
}

/* --------------------------------------------------------------- stage */

.stage {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4vw;
}

.stage-inner {
  position: relative;
}

/* Anchored to the viewport, not to the row, so the row can slide
   horizontally without dragging the subtitle with it. */
.subtitle-anchor {
  position: absolute;
  top: calc(100% + clamp(16px, 3vh, 40px));
  left: 50%;
  width: 100vw;
  margin-left: -50vw;
  display: flex;
  justify-content: center;
}

/* ------------------------------------------------------------ finish */

.vignette {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  background: radial-gradient(
    ellipse 76% 64% at 50% 48%,
    rgba(0, 0, 0, 0) 42%,
    rgba(3, 0, 10, 0.42) 76%,
    rgba(3, 0, 10, 0.74) 100%
  );
}

/* A whisper of film grain keeps the large flat gradients from banding. */
.grain {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)'/%3E%3C/svg%3E");
}
</style>
