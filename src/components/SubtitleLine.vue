<script setup lang="ts">
/**
 * Stage six. Deliberately quiet: a hairline that draws itself and one
 * small line of text, kept well below the title in weight and contrast
 * so it never competes with 叶博一 ❤️ 余韵.
 */
import { ref } from 'vue'
import gsap from 'gsap'

const ruleEl = ref<HTMLElement | null>(null)
const textEl = ref<HTMLElement | null>(null)
const innerEl = ref<HTMLElement | null>(null)

defineExpose({
  reveal(): gsap.core.Timeline {
    const tl = gsap.timeline()
    const rule = ruleEl.value
    const text = textEl.value
    const inner = innerEl.value
    if (!rule || !text || !inner) return tl

    tl.fromTo(
      rule,
      { scaleX: 0, opacity: 0 },
      { scaleX: 1, opacity: 1, duration: 1.6, ease: 'power3.inOut' },
      0,
    )
    tl.fromTo(
      text,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 1.5, ease: 'power3.out' },
      0.35,
    )
    tl.fromTo(
      inner,
      { filter: 'blur(13px)' },
      { filter: 'blur(0px)', duration: 1.9, ease: 'power2.out' },
      0.35,
    )
    return tl
  },
})
</script>

<template>
  <div class="sub">
    <span ref="ruleEl" class="sub-rule" aria-hidden="true"></span>
    <p ref="textEl" class="sub-text">
      <span ref="innerEl" class="sub-inner">在无数个平行世界里，我依然会走向你。</span>
    </p>
  </div>
</template>

<style scoped>
.sub {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(10px, 1.5vh, 20px);
}

.sub-rule {
  display: block;
  width: clamp(56px, 8vw, 104px);
  height: 1px;
  background: linear-gradient(
    90deg,
    rgba(255, 150, 205, 0) 0%,
    rgba(255, 150, 205, 0.6) 50%,
    rgba(255, 150, 205, 0) 100%
  );
  transform: scaleX(0);
  opacity: 0;
  will-change: transform, opacity;
}

.sub-text {
  font-size: var(--subtitle-size);
  font-weight: 300;
  letter-spacing: 0.24em;
  /* letter-spacing appends space after the last glyph; nudge it back so
     the line is optically centred rather than half a space to the left */
  text-indent: 0.24em;
  line-height: 1.7;
  white-space: nowrap;
  opacity: 0;
  will-change: transform, opacity;
  text-shadow: 0 0 24px rgba(160, 110, 255, 0.35);
}

.sub-inner {
  background-image: linear-gradient(
    92deg,
    rgba(255, 232, 245, 0.92) 0%,
    rgba(226, 206, 255, 0.86) 55%,
    rgba(198, 180, 255, 0.9) 100%
  );
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  will-change: filter;
}

@media (max-width: 430px) {
  .sub-text {
    letter-spacing: 0.13em;
    text-indent: 0.13em;
    line-height: 1.8;
  }
}
</style>
