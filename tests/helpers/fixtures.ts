import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { schema, type Database } from "@/server/db"
import { createSession } from "@/server/services/sessions"
import type { AuditActor } from "@/server/services/audit"

export const testActor: AuditActor & { id: string } = { type: "user", id: randomUUID(), name: "Test Admin" }

export async function getArena(db: Database) {
  return (await db.query.arenas.findFirst({ where: eq(schema.arenas.slug, "main") }))!
}

export async function getAdminUser(db: Database) {
  return (await db.query.users.findFirst())!
}

export async function makeOpenSession(db: Database, overrides: Partial<Parameters<typeof createSession>[0]> = {}) {
  const arena = await getArena(db)
  const admin = await getAdminUser(db)
  const now = Date.now()
  return createSession(
    {
      title: "Friday Night Football",
      venue: "Pitch A",
      startsAt: new Date(now + 6 * 3_600_000),
      endsAt: new Date(now + 8 * 3_600_000),
      bookingOpensAt: new Date(now - 3_600_000),
      bookingDeadline: new Date(now + 5 * 3_600_000),
      teamsCount: 8,
      playersPerTeam: 4,
      ticketPriceMajor: 5000,
      publish: true,
      ...overrides,
    },
    { arenaId: arena.id, actor: { type: "user", id: admin.id, name: admin.name } }
  )
}

export function customer(i: number) {
  return { name: `Player ${i}`, email: `player${i}@example.com`, phone: "" }
}
