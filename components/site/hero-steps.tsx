"use client"

import { useEffect, useState } from "react"
import { ChevronRight } from "lucide-react"
import { motion } from "motion/react"
import { useReducedMotionSafe } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

/** Hero side list that lights up one step at a time, like a scoreboard ticking over. */
export function HeroSteps({ steps }: { steps: string[] }) {
  const reduce = useReducedMotionSafe()
  const [active, setActive] = useState(0)
  useEffect(() => {
    if (reduce || steps.length < 2) return
    const id = window.setInterval(() => setActive((i) => (i + 1) % steps.length), 2600)
    return () => window.clearInterval(id)
  }, [reduce, steps.length])

  return (
    <ol className="space-y-2.5">
      {steps.map((step, i) => (
        <li key={step} className={cn("label-mono flex items-center gap-2 text-sm transition-colors duration-500", i === active ? "text-primary" : "text-foreground/80")}>
          <span className="text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
          {step}
          {i === active && (
            <motion.span layoutId="hero-step-caret" transition={{ type: "spring", stiffness: 300, damping: 28 }} aria-hidden="true">
              <ChevronRight className="size-4" />
            </motion.span>
          )}
        </li>
      ))}
    </ol>
  )
}
