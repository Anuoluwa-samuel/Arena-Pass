"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { motion, useReducedMotion } from "motion/react"

/**
 * Subtle magnetic-hover wrapper — nudges its child a few pixels toward the
 * cursor. Reserved for a single primary action (the hero CTA); applying
 * this everywhere would turn a refined touch into a gimmick. Desktop with a
 * fine pointer only — never activates on touch, and bails entirely under
 * prefers-reduced-motion.
 */
export function Magnetic({ children, strength = 12 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [enabled, setEnabled] = useState(false)
  const reduce = useReducedMotion()

  useEffect(() => {
    setEnabled(window.matchMedia("(hover: hover) and (pointer: fine)").matches)
  }, [])

  if (reduce || !enabled) {
    return <>{children}</>
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = ((e.clientX - rect.left - rect.width / 2) / rect.width) * strength
    const y = ((e.clientY - rect.top - rect.height / 2) / rect.height) * strength
    setOffset({ x, y })
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setOffset({ x: 0, y: 0 })}
      animate={{ x: offset.x, y: offset.y }}
      transition={{ type: "spring", stiffness: 200, damping: 14, mass: 0.4 }}
      className="inline-block will-change-transform"
    >
      {children}
    </motion.div>
  )
}
