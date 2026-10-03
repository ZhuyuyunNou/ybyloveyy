<script setup lang="ts">
/**
 * Stage one. The first thing that exists: a single faint point in the
 * dark that swells into the ambient light the rest of the scene sits in.
 */
import { ref } from 'vue'
import gsap from 'gsap'

const coreEl = ref<HTMLElement | null>(null)
const haloEl = ref<HTMLElement | null>(null)

defineExpose({
  reveal(): gsap.core.Timeline {
    const tl = gsap.timeline()
    const core = coreEl.value
    const halo = haloEl.value
    if (!core || !halo) return tl

    // the point itself
    tl.fromTo(
      core,
      { opacity: 0, scale: 0.04 },
      { opacity: 1, scale: 1, duration: 1.5, ease: 'power2.out' },
      0,
    )
    // the room lights up around it
    tl.fromTo(
      halo,
      { opacity: 0, scale: 0.22 },
      { opacity: 1, scale: 1, duration: 1.9, ease: 'power2.out' },
      0.5,
    )
    // the sharp point dissolves into the halo — its job is done once the
    // title starts arriving, and it must not sit behind 叶博一 as a blob
    tl.to(core, { opacity: 0, scale: 1.9, duration: 1, ease: 'power2.in' }, 1.7)
    tl.to(halo, { opacity: 0.62, duration: 1.6, ease: 'sine.inOut' }, 2.1)

    return tl
  },
})
</script>

<template>
  <div class="seed" aria-hidden="true">
    <span ref="haloEl" class="seed-halo"></span>
    <span ref="coreEl" class="seed-core"></span>
  </div>
</template>

<style scoped>
.seed {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0;
  height: 0;
  pointer-events: none;
  z-index: 2;
}

.seed-core {
  position: absolute;
  left: -7px;
  top: -7px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    #ffffff 0%,
    #ffe8f6 24%,
    rgba(255, 124, 196, 0.85) 50%,
    rgba(255, 124, 196, 0) 78%
  );
  box-shadow:
    0 0 18px rgba(255, 152, 212, 0.9),
    0 0 56px rgba(168, 116, 255, 0.55);
  opacity: 0;
  will-change: transform, opacity;
}

.seed-halo {
  position: absolute;
  left: -46vmin;
  top: -46vmin;
  width: 92vmin;
  height: 92vmin;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 140, 200, 0.17) 0%,
    rgba(176, 120, 255, 0.11) 34%,
    rgba(118, 92, 255, 0.045) 56%,
    rgba(0, 0, 0, 0) 72%
  );
  opacity: 0;
  will-change: transform, opacity;
}
</style>
