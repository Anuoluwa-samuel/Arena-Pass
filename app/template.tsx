"use client"

import { Reveal } from "@/components/motion"

/**
 * Next.js remounts this per navigation (unlike layout.tsx, which persists),
 * so every route gets the same brief, deliberate arrival instead of a hard
 * cut — the thing that makes the app read as one continuous experience
 * rather than a stack of disconnected pages. Kept short (see DURATION.base
 * in lib/motion.ts) so it never reads as a loading screen.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <Reveal trigger="mount" y={6}>
      {children}
    </Reveal>
  )
}
