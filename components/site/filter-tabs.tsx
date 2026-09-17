"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { useReducedMotionSafe } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

/** Pill tabs whose active highlight slides between options. Filters stay plain links (URL-driven). */
export function FilterTabs({ items, active }: { items: Array<{ key: string; label: string; href: string; count: number }>; active: string }) {
  const reduce = useReducedMotionSafe()
  return (
    <div className="glass inline-flex flex-wrap gap-1 rounded-2xl p-1">
      {items.map((item) => {
        const isActive = item.key === active
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn("relative inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-300", isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {isActive &&
              (reduce ? (
                <span className="absolute inset-0 -z-10 rounded-xl bg-primary" />
              ) : (
                <motion.span layoutId="filter-tab-pill" className="absolute inset-0 -z-10 rounded-xl bg-primary shadow-[0_8px_24px_-10px_var(--primary)]" transition={{ type: "spring", stiffness: 380, damping: 32 }} />
              ))}
            {item.label}
            <span className={cn("rounded-full px-1.5 text-xs tabular-nums", isActive ? "bg-primary-foreground/20" : "bg-foreground/[0.08]")}>{item.count}</span>
          </Link>
        )
      })}
    </div>
  )
}
