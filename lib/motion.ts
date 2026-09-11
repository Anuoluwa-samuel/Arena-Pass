import type { Variants } from "motion/react"

/**
 * Shared motion tokens — keep every animation in the app drawing from this
 * one palette of easing/duration/stagger values so motion reads as one
 * consistent system rather than a pile of one-off tweaks.
 */

// Expo-out: fast start, long soft settle — the "cinematic" easing used
// throughout (entrances, reveals, panel open/close).
export const EASE_OUT = [0.16, 1, 0.3, 1] as const

export const DURATION = {
  fast: 0.18, // micro-interactions: icon swaps, active-link indicator
  base: 0.5, // standard entrances/reveals
  slow: 0.8, // large, cinematic moments (hero, confirmation ticket)
} as const

export const STAGGER = 0.08

export const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: EASE_OUT },
  },
}

export const fadeItem: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: DURATION.base, ease: EASE_OUT },
  },
}

export const scaleInItem: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION.base, ease: EASE_OUT },
  },
}

export function staggerContainer(
  stagger: number = STAGGER,
  delayChildren = 0
): Variants {
  return {
    hidden: {},
    show: {
      transition: { staggerChildren: stagger, delayChildren },
    },
  }
}
