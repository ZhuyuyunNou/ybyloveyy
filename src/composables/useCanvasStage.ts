import { onBeforeUnmount, onMounted } from 'vue'
import type { Ref } from 'vue'

export interface StageSize {
  /** CSS pixels */
  w: number
  h: number
  /** device pixel ratio actually used for the backing store */
  dpr: number
}

export interface CanvasStageOptions {
  /**
   * CSS-pixel size the canvas should occupy. Defaults to the canvas' own
   * layout box; pass a getter when the size is derived from an ancestor
   * (the particle heart derives its canvas from the title's heart slot).
   */
  size?: (canvas: HTMLCanvasElement) => { w: number; h: number }
  /** Element whose resizing should trigger a re-measure. Defaults to the canvas. */
  observe?: (canvas: HTMLCanvasElement) => Element | null | undefined
  /** Runs right after the backing store changed, before the next frame. */
  onResize?: (stage: StageSize) => void
  /** Runs once per animation frame. `dt` is clamped to avoid tab-switch spikes. */
  onFrame: (dt: number, elapsed: number) => void
}

/** Cap the backing store: a 3x DPR phone would otherwise shade 9x the pixels. */
const MAX_DPR = 2

/**
 * Wires a canvas to a requestAnimationFrame loop with correct
 * devicePixelRatio handling, resize observation and full teardown.
 */
export function useCanvasStage(
  canvasRef: Ref<HTMLCanvasElement | null>,
  options: CanvasStageOptions,
) {
  let ctx: CanvasRenderingContext2D | null = null
  let raf = 0
  let last = 0
  let elapsed = 0
  let running = false

  const stage: StageSize = { w: 0, h: 0, dpr: 1 }

  function measure(canvas: HTMLCanvasElement) {
    const box = options.size
      ? options.size(canvas)
      : { w: canvas.clientWidth, h: canvas.clientHeight }
    const w = Math.max(1, Math.round(box.w))
    const h = Math.max(1, Math.round(box.h))
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)

    stage.w = w
    stage.h = h
    stage.dpr = dpr

    const bw = Math.round(w * dpr)
    const bh = Math.round(h * dpr)
    if (canvas.width !== bw) canvas.width = bw
    if (canvas.height !== bh) canvas.height = bh

    if (!ctx) return
    // Draw in CSS pixels; the transform carries the DPR scale.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    options.onResize?.(stage)
  }

  function frame(now: number) {
    if (!running) return
    raf = requestAnimationFrame(frame)
    const dt = last === 0 ? 1 / 60 : Math.min(0.05, (now - last) / 1000)
    last = now
    elapsed += dt
    options.onFrame(dt, elapsed)
  }

  function start() {
    if (running) return
    running = true
    last = 0
    raf = requestAnimationFrame(frame)
  }

  function stop() {
    running = false
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  }

  function onVisibility() {
    if (document.hidden) stop()
    else start()
  }

  let observer: ResizeObserver | null = null
  let retimer = 0

  function remeasure() {
    const canvas = canvasRef.value
    if (canvas) measure(canvas)
  }

  function onOrientation() {
    // Viewport metrics settle a beat after the event fires.
    window.clearTimeout(retimer)
    retimer = window.setTimeout(remeasure, 180)
  }

  onMounted(() => {
    const canvas = canvasRef.value
    if (!canvas) return
    ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    measure(canvas)

    const target = options.observe?.(canvas) ?? canvas
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(remeasure)
      observer.observe(target)
    }
    window.addEventListener('resize', remeasure, { passive: true })
    window.addEventListener('orientationchange', onOrientation)
    document.addEventListener('visibilitychange', onVisibility)

    start()
  })

  onBeforeUnmount(() => {
    stop()
    window.clearTimeout(retimer)
    observer?.disconnect()
    observer = null
    window.removeEventListener('resize', remeasure)
    window.removeEventListener('orientationchange', onOrientation)
    document.removeEventListener('visibilitychange', onVisibility)
    ctx = null
  })

  return {
    get context() {
      return ctx
    },
    get stage() {
      return stage
    },
    /** Force a re-measure (e.g. after the typography settled). */
    resize() {
      const canvas = canvasRef.value
      if (canvas) measure(canvas)
    },
  }
}
