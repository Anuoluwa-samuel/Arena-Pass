"use client"

import { usePathname } from "next/navigation"

/**
 * Picks the footer for the current route. The landing page closes with the full
 * footer; every other page gets the slim bar.
 *
 * Both footers are passed in already rendered so they stay server components —
 * this switch is the only thing that ships to the browser. A layout cannot read
 * the pathname on the server, hence the client hook.
 */
export function PublicFooter({ full, slim }: { full: React.ReactNode; slim: React.ReactNode }) {
  const pathname = usePathname()
  return <>{pathname === "/" ? full : slim}</>
}
