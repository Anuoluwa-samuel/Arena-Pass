import Link from "next/link"
import { CalendarX2 } from "lucide-react"
import { SessionCard } from "@/components/session-card"
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { getDefaultArena } from "@/server/services/arenas"
import { listSessions } from "@/server/services/sessions"
import { toPublicSession } from "@/server/serializers"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"
export const metadata = { title: "Sessions" }

const FILTERS = [
  { key: "all", label: "All" },
  { key: "open", label: "Open now" },
  { key: "soon", label: "Opening soon" },
] as const

export default async function SessionsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter = "all" } = await searchParams
  const arena = await getDefaultArena()
  const result = await listSessions({ arenaId: arena.id, publicOnly: true, pageSize: 60 })
  const all = result.items.map(toPublicSession)
  const sessions = all.filter((s) => (filter === "open" ? s.status === "OPEN_FOR_BOOKING" : filter === "soon" ? s.status === "PUBLISHED" : true))

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <Reveal trigger="mount">
        <PageHeader eyebrow={arena.name} title="Upcoming sessions" description="Every session is 8 teams of 4. Pick one, grab a slot, and we'll see you on the pitch." />
      </Reveal>

      <div className="mt-8 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = f.key === "all" ? all.length : all.filter((s) => (f.key === "open" ? s.status === "OPEN_FOR_BOOKING" : s.status === "PUBLISHED")).length
          return (
            <Link
              key={f.key}
              href={f.key === "all" ? "/sessions" : `/sessions?filter=${f.key}`}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                filter === f.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {f.label}
              <span className="rounded-full bg-secondary px-1.5 text-xs text-secondary-foreground">{count}</span>
            </Link>
          )
        })}
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={CalendarX2}
          title={filter === "all" ? "No sessions scheduled yet" : "Nothing here right now"}
          description={filter === "all" ? "Check back soon — new sessions are added every week." : "Try another filter or check back later."}
          action={filter !== "all" ? <Button variant="outline" asChild><Link href="/sessions">Show all sessions</Link></Button> : undefined}
        />
      ) : (
        <StaggerGroup trigger="mount" delayChildren={0.1} className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <StaggerItem key={session.id}>
              <SessionCard session={session} />
            </StaggerItem>
          ))}
        </StaggerGroup>
      )}
    </main>
  )
}
