import { Navbar } from "@/components/navbar"
import { SessionCard } from "@/components/session-card"
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion"
import { mockSessions } from "@/lib/mock-data"

export default function SessionsPage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <Reveal trigger="mount" className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Upcoming Sessions
          </h1>
          <p className="mt-2 text-muted-foreground">
            Find and book your next football session
          </p>
        </Reveal>

        <StaggerGroup
          trigger="mount"
          delayChildren={0.1}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {mockSessions.map((session) => (
            <StaggerItem key={session.id}>
              <SessionCard session={session} />
            </StaggerItem>
          ))}
        </StaggerGroup>

        {mockSessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="rounded-full bg-secondary p-4">
              <svg
                className="size-12 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold">No sessions available</h3>
            <p className="mt-2 text-muted-foreground">
              Check back later for upcoming football sessions.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
