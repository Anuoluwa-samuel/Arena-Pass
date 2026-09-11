"use client"

import type { ReactNode } from "react"
import { motion, useReducedMotion, type Variants } from "motion/react"
import { DURATION, EASE_OUT, fadeUpItem, staggerContainer } from "@/lib/motion"

type Trigger = "mount" | "scroll"

interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
  once?: boolean
  /** "scroll" (default) reveals on viewport entry; "mount" reveals immediately — use for above-the-fold content. */
  trigger?: Trigger
}

/**
 * Single-element fade/translate reveal. Use for standalone blocks (section
 * headings, cards, imagery) that don't need child-by-child stagger.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 16,
  once = true,
  trigger = "scroll",
}: RevealProps) {
  const reduce = useReducedMotion()

  if (reduce) {
    return <div className={className}>{children}</div>
  }

  const transition = { duration: DURATION.base, ease: EASE_OUT, delay }

  if (trigger === "mount") {
    return (
      <motion.div
        className={className}
        initial={{ opacity: 0, y }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-80px" }}
      transition={transition}
    >
      {children}
    </motion.div>
  )
}

interface StaggerGroupProps {
  children: ReactNode
  className?: string
  stagger?: number
  delayChildren?: number
  once?: boolean
  trigger?: Trigger
}

/**
 * Container that staggers its StaggerItem children in on mount or scroll.
 * Pairs with <StaggerItem>.
 */
export function StaggerGroup({
  children,
  className,
  stagger,
  delayChildren = 0,
  once = true,
  trigger = "scroll",
}: StaggerGroupProps) {
  const reduce = useReducedMotion()

  if (reduce) {
    return <div className={className}>{children}</div>
  }

  const variants = staggerContainer(stagger, delayChildren)

  if (trigger === "mount") {
    return (
      <motion.div className={className} initial="hidden" animate="show" variants={variants}>
        {children}
      </motion.div>
    )
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-80px" }}
      variants={variants}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className,
  variants = fadeUpItem,
}: {
  children: ReactNode
  className?: string
  variants?: Variants
}) {
  const reduce = useReducedMotion()

  if (reduce) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  )
}
