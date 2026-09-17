import { Fragment, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Endless ticker. The item list renders twice and the track slides by half its
 * width, so the loop is seamless. Hover pauses it; the duplicate is hidden from
 * assistive tech so each item is announced once.
 */
export function Marquee({ items, className, duration = 40 }: { items: ReactNode[]; className?: string; duration?: number }) {
  const row = (hidden: boolean) => (
    <div className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((item, i) => (
        <Fragment key={i}>
          <span className="whitespace-nowrap px-6">{item}</span>
          <span className="text-primary" aria-hidden="true">✦</span>
        </Fragment>
      ))}
    </div>
  )
  return (
    <div className={cn("group/marquee marquee-mask overflow-hidden", className)}>
      <div className="animate-marquee flex w-max" style={{ ["--marquee-duration" as string]: `${duration}s` }}>
        {row(false)}
        {row(true)}
      </div>
    </div>
  )
}
