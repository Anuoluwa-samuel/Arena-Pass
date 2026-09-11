import "server-only"
import { and, eq, isNull } from "drizzle-orm"
import { db, schema } from "@/server/db"
import { notFound } from "@/server/http/errors"

/** The platform is multi-arena; today every public page resolves the default arena. */
export async function getDefaultArena() {
  const database = await db()
  const arena =
    (await database.query.arenas.findFirst({ where: and(eq(schema.arenas.slug, "main"), isNull(schema.arenas.deletedAt)) })) ??
    (await database.query.arenas.findFirst({ where: and(eq(schema.arenas.isActive, true), isNull(schema.arenas.deletedAt)) }))
  if (!arena) throw notFound("Arena")
  return arena
}

export async function listArenas() {
  const database = await db()
  return database.query.arenas.findMany({ where: isNull(schema.arenas.deletedAt), orderBy: (a, { asc }) => [asc(a.name)] })
}

export async function getArenaById(id: string) {
  const database = await db()
  const arena = await database.query.arenas.findFirst({ where: and(eq(schema.arenas.id, id), isNull(schema.arenas.deletedAt)) })
  if (!arena) throw notFound("Arena")
  return arena
}
