"use client"

import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

/**
 * A div whose `spotlight` glow follows the pointer. Writes CSS variables only
 * (no React state), so hovering never re-renders the card.
 */
export function Spotlight({ className, onPointerMove, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("spotlight", className)}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`)
        e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`)
        onPointerMove?.(e)
      }}
      {...props}
    />
  )
}
