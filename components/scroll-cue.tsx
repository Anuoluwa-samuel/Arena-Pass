"use client"

import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "motion/react"
import { ChevronDown } from "lucide-react"
import { DURATION } from "@/lib/motion"

/**
 * Decorative "there's more below" affordance for the hero. Fades in once
 * the hero has settled, fades out the moment the user actually scrolls —
 * it should never linger and get in the way.
 */
export function ScrollCue() {
  const [visible, setVisible] = useState(true)
  const reduce = useReducedMotion()

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY < 40)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: DURATION.base, delay: reduce ? 0 : 1 }}
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, 6, 0] }}
        transition={reduce ? undefined : { duration: 1.8, ease: "easeInOut", repeat: Infinity }}
        className="text-muted-foreground/60"
      >
        <ChevronDown className="size-5" />
      </motion.div>
    </motion.div>
  )
}
