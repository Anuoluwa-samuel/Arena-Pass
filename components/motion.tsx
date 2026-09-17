"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { animate, motion, useInView, useScroll, useTransform, type Variants } from "motion/react"
import { useReducedMotionSafe } from "@/hooks/use-mobile"
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
  const reduce = useReducedMotionSafe()

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
  const reduce = useReducedMotionSafe()

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
  const reduce = useReducedMotionSafe()

  if (reduce) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  )
}

type HeadingTag = "h1" | "h2" | "h3" | "p" | "span"

/**
 * Headline that resolves word by word out of a blur, the way stadium lights
 * come up. The full text stays in the DOM as normal text (words are spans with
 * real spaces between them), so headings keep their accessible name and the
 * text is selectable. `highlight` renders after `text` in the brand gradient.
 */
export function BlurText({
  text,
  highlight,
  as = "h2",
  className,
  highlightClassName = "text-gradient-primary",
  trigger = "scroll",
  delay = 0,
  stagger = 0.06,
}: {
  text: string
  highlight?: string
  as?: HeadingTag
  className?: string
  highlightClassName?: string
  trigger?: Trigger
  delay?: number
  stagger?: number
}) {
  const reduce = useReducedMotionSafe()
  const Tag = as
  const words = text.split(/\s+/).filter(Boolean)
  const accent = highlight ? highlight.split(/\s+/).filter(Boolean) : []

  if (reduce) {
    return (
      <Tag className={className}>
        {text}
        {highlight && <> <span className={highlightClassName}>{highlight}</span></>}
      </Tag>
    )
  }

  const MotionTag = motion[as]
  const word = (w: string, i: number, extra?: string) => (
    <motion.span
      key={`${w}-${i}`}
      className={`inline-block will-change-[filter,transform,opacity] ${extra ?? ""}`}
      variants={{
        hidden: { opacity: 0, filter: "blur(12px)", y: "0.3em" },
        show: { opacity: 1, filter: "blur(0px)", y: 0, transition: { duration: DURATION.slow, ease: EASE_OUT } },
      }}
    >
      {w}
    </motion.span>
  )
  const nodes: ReactNode[] = []
  words.forEach((w, i) => { nodes.push(word(w, i)); nodes.push(" ") })
  accent.forEach((w, i) => { nodes.push(word(w, words.length + i, highlightClassName)); if (i < accent.length - 1) nodes.push(" ") })

  const container = { hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } }
  return trigger === "mount" ? (
    <MotionTag className={className} initial="hidden" animate="show" variants={container}>
      {nodes}
    </MotionTag>
  ) : (
    <MotionTag className={className} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} variants={container}>
      {nodes}
    </MotionTag>
  )
}

/**
 * Number that counts up when it scrolls into view. The server renders the real
 * value, so it is correct without JavaScript and for screen readers; the count
 * only replaces the visible digits once the element is about to be seen.
 */
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString(), duration = 1.6, className }: { value: number; format?: (n: number) => string; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "-40px" })
  const reduce = useReducedMotionSafe()

  useEffect(() => {
    const el = ref.current
    if (!el || reduce || !inView) return
    const controls = animate(0, value, { duration, ease: EASE_OUT, onUpdate: (n) => { el.textContent = format(n) } })
    return () => controls.stop()
    // format is a render-time helper; re-running on its identity would restart the count.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduce, value, duration])

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  )
}

/** Drifts its child vertically as the page scrolls past it. Decorative content only. */
export function Parallax({ children, className, distance = 80 }: { children: ReactNode; className?: string; distance?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotionSafe()
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance])
  return (
    <motion.div ref={ref} className={className} style={reduce ? undefined : { y }}>
      {children}
    </motion.div>
  )
}
