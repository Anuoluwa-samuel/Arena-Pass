"use client"

import { motion } from "motion/react"
import { useReducedMotionSafe } from "@/hooks/use-mobile"
import { DURATION, EASE_OUT } from "@/lib/motion"

/**
 * Next.js remounts this per navigation (unlike layout.tsx), so every route
 * arrives with the same short lift out of a soft blur. The filter is removed
 * when the entrance ends: a lingering `filter` would make this wrapper a
 * backdrop root and every glass surface inside would stop blurring.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotionSafe()
  if (reduce) return <>{children}</>
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none", transform: "none" } }}
      transition={{ duration: DURATION.base, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  )
}
