"use client"

import { motion, useScroll, useSpring } from "motion/react"
import { useReducedMotionSafe } from "@/hooks/use-mobile"

/** Thin brand-green reading-progress line pinned to the top of the viewport. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 })
  const reduce = useReducedMotionSafe()
  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-primary via-[var(--streak-core)] to-primary"
      style={{ scaleX: reduce ? scrollYProgress : scaleX }}
    />
  )
}
