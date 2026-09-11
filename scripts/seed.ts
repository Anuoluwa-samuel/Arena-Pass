/**
 * Development seed. Creates sample sessions in every lifecycle state and
 * pushes real bookings through the real payment pipeline (mock provider),
 * so counters, slots, tickets and ledgers are all consistent. Idempotent:
 * skips if the marker session already exists. Never runs in production.
 */
import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { db, schema } from "@/server/db"
import { getDefaultArena } from "@/server/services/arenas"
import { createSession, cancelSession } from "@/server/services/sessions"
import { createBooking } from "@/server/services/bookings"
import { initializePayment, verifyPayment } from "@/server/services/payments"
import { setMockOutcome } from "@/server/payments/mock"
import { validateTicket, buildQrPayload } from "@/server/services/tickets"
import { createFaq, createService, createAnnouncement, createBanner } from "@/server/services/cms"
import { createUser } from "@/server/services/users"
import { SYSTEM_ACTOR } from "@/server/services/audit"

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to seed a production database")
    process.exit(1)
  }

  const database = await db()
  const arena = await getDefaultArena()
  const admin = (await database.query.users.findFirst())!
  const actor = { type: "user" as const, id: admin.id, name: admin.name }

  const marker = await database.query.sessions.findFirst({ where: eq(schema.sessions.title, "Friday Night Football") })
  if (marker) {
    console.log("Seed data already present — nothing to do.")
    process.exit(0)
  }

  const H = 3_600_000
  const now = Date.now()
  const at = (hoursFromNow: number, hour?: number) => {
    const d = new Date(now + hoursFromNow * H)
    if (hour !== undefined) d.setHours(hour, 0, 0, 0)
    return d
  }

  async function seedSession(input: Parameters<typeof createSession>[0]) {
    return createSession(input, { arenaId: arena.id, actor })
  }

  async function sell(sessionId: string, count: number, offset: number) {
    const tickets = []
    for (let i = 0; i < count; i++) {
      const n = offset + i
      const { booking } = await createBooking(
        { sessionId, customer: { name: NAMES[n % NAMES.length] + (n >= NAMES.length ? ` ${Math.floor(n / NAMES.length) + 1}` : ""), email: `player${n}@example.com`, phone: `+23480000${String(n).padStart(4, "0")}` }, idempotencyKey: randomUUID() },
        { actor: { type: "customer" } }
      )
      const { payment } = await initializePayment(booking.id)
      await setMockOutcome(payment.reference, "success")
      const outcome = await verifyPayment(payment.reference)
      if (outcome.status === "PAID") tickets.push(outcome.ticket)
    }
    return tickets
  }

  const NAMES = ["Ada Okafor", "Tunde Bakare", "Chiamaka Eze", "Emeka Obi", "Yusuf Bello", "Ngozi Umeh", "Seyi Adeyemi", "Kemi Alabi", "Ibrahim Musa", "Funke Ojo", "Tobi Lawal", "Amara Nwosu", "Dayo Fashola", "Zainab Sule", "Kunle Adebayo", "Ifeoma Chukwu", "Bola Ahmed", "Chidi Okeke", "Halima Yakubu", "Femi Oyelaran"]

  // 1. Open now, healthy sales
  const friday = await seedSession({ title: "Friday Night Football", venue: "Main Pitch", startsAt: at(30, 19), endsAt: at(30, 21), bookingOpensAt: at(-24), bookingDeadline: at(29), teamsCount: 8, playersPerTeam: 4, ticketPriceMajor: 5000, publish: true, description: "Our flagship Friday session under the floodlights. Eight teams, four-a-side, rotating fixtures all evening." })
  await sell(friday.id, 21, 0)

  // 2. Open now, almost full
  const saturday = await seedSession({ title: "Saturday Morning Kick-Off", venue: "Pitch B", startsAt: at(54, 9), endsAt: at(54, 11), bookingOpensAt: at(-48), bookingDeadline: at(52), teamsCount: 8, playersPerTeam: 4, ticketPriceMajor: 4000, publish: true, description: "Early kick-off for the early risers. Coffee at the clubhouse afterwards." })
  await sell(saturday.id, 30, 30)

  // 3. Sold out
  const sunday = await seedSession({ title: "Sunday League Showdown", venue: "Main Pitch", startsAt: at(78, 16), endsAt: at(78, 18), bookingOpensAt: at(-72), bookingDeadline: at(76), teamsCount: 8, playersPerTeam: 4, ticketPriceMajor: 6000, publish: true })
  await sell(sunday.id, 32, 70)

  // 4. Booking opens later
  await seedSession({ title: "Midweek Six-Team Special", venue: "Pitch B", startsAt: at(120, 18), endsAt: at(120, 20), bookingOpensAt: at(48), bookingDeadline: at(118), teamsCount: 6, playersPerTeam: 4, ticketPriceMajor: 3500, publish: true, description: "A shorter format with six teams — more minutes on the ball for everyone." })

  // 5. Completed with attendance
  const past = await seedSession({ title: "Last Week's Friday Football", venue: "Main Pitch", startsAt: at(-150, 19), endsAt: at(-150, 21), bookingOpensAt: at(-300), bookingDeadline: at(-151), teamsCount: 8, playersPerTeam: 4, ticketPriceMajor: 5000, publish: true })
  // Temporarily shift the window so the seed can book, then restore the real (past) times.
  await database.update(schema.sessions).set({ bookingOpensAt: at(-1), bookingDeadline: at(5), startsAt: at(6), endsAt: at(8) }).where(eq(schema.sessions.id, past.id))
  const pastTickets = await sell(past.id, 28, 110)
  // Admit most players (while the session is still "live" for validation), then move it into the past.
  for (const t of pastTickets.slice(0, 24)) await validateTicket(buildQrPayload(t.qrToken), { mode: "admit", actor })
  await database.update(schema.sessions).set({ startsAt: at(-150, 19), endsAt: at(-150, 21), bookingOpensAt: at(-300), bookingDeadline: at(-151), status: "COMPLETED" }).where(eq(schema.sessions.id, past.id))
  await database.update(schema.tickets).set({ purchasedAt: at(-170) }).where(eq(schema.tickets.sessionId, past.id))

  // 6. Draft and cancelled
  await seedSession({ title: "Corporate Cup Qualifier", venue: "Main Pitch", startsAt: at(200, 17), endsAt: at(200, 19), bookingOpensAt: at(100), bookingDeadline: at(198), teamsCount: 8, playersPerTeam: 4, ticketPriceMajor: 7500, publish: false })
  const cancelled = await seedSession({ title: "Rained-Off Thursday", venue: "Pitch B", startsAt: at(10, 18), endsAt: at(10, 20), bookingOpensAt: at(-20), bookingDeadline: at(9), teamsCount: 8, playersPerTeam: 4, ticketPriceMajor: 4000, publish: true })
  await cancelSession(cancelled.id, "Pitch waterlogged after heavy rain", { actor })

  // Spread purchase dates so the dashboard chart has shape.
  const allTickets = await database.query.tickets.findMany()
  for (const [i, t] of allTickets.entries()) {
    if (t.sessionId === past.id) continue
    await database.update(schema.tickets).set({ purchasedAt: new Date(now - ((i * 7) % 14) * 86_400_000 - (i % 5) * H) }).where(eq(schema.tickets.id, t.id))
  }

  // CMS content
  for (const [q, a] of [
    ["How many players are in a session?", "Every standard session has 8 teams of 4 players — 32 players in total. Some special sessions use fewer teams; the session page always shows the exact structure."],
    ["What happens if a session sells out?", "You can join the waitlist from the session page. If a slot frees up we will email you straight away."],
    ["Can I get a refund?", "Refunds are issued automatically when a session is cancelled. For other cases contact us at least 24 hours before kick-off."],
    ["Do I need to print my ticket?", "No. Show the QR code on your digital ticket at the entrance and our staff will scan you in."],
    ["How are teams decided?", "Teams are assigned automatically as players book, keeping all teams balanced. You can pick a preferred team when you book if it still has space."],
  ]) {
    await createFaq(arena.id, { question: q, answer: a, isPublished: true }, { actor })
  }
  for (const s of [
    { title: "Organised 4-a-side sessions", description: "Balanced teams, rotating fixtures and a referee at every session.", icon: "trophy" },
    { title: "Floodlit all-weather pitch", description: "Play year-round on a FIFA-quality artificial surface.", icon: "sun" },
    { title: "Instant digital tickets", description: "Book in seconds, pay securely and get a QR ticket straight to your inbox.", icon: "ticket" },
    { title: "Changing rooms and showers", description: "Clean facilities so you can go straight from the pitch to your evening.", icon: "droplets" },
  ]) {
    await createService(arena.id, { ...s, isPublished: true }, { actor })
  }
  await createAnnouncement(arena.id, { title: "New Saturday morning sessions", content: "By popular demand we now run a 9am Saturday session. Early-bird pricing applies for the first month.", status: "PUBLISHED", publishAt: at(-48), expiresAt: at(24 * 30) }, { actor })
  await createBanner(arena.id, { title: "Bring a friend, save ₦1,000", subtitle: "Book two slots in the same session and get a discount at the desk.", linkUrl: "/sessions", linkLabel: "Find a session", isActive: true }, { actor })

  // Additional admin accounts, one per role
  for (const [roleKey, name] of [["ADMIN", "Grace Admin"], ["MANAGER", "Musa Manager"], ["FINANCE", "Folake Finance"], ["STAFF", "Sam Staff"], ["TICKET_AGENT", "Tola Agent"]] as const) {
    await createUser({ name, email: `${name.split(" ")[0].toLowerCase()}.${roleKey.toLowerCase().replace("_", "")}@arenapass.local`, roleKey, password: "ChangeMe123!", isActive: true, arenaId: arena.id }, { actor: SYSTEM_ACTOR, actorRole: "SUPER_ADMIN" })
  }

  console.log("Seed complete.")
  console.log("Admin login: admin@arenapass.local / ChangeMe123!")
  process.exit(0)

}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
