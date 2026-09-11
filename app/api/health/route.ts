import { route, ok } from "@/server/http/response"
import { db } from "@/server/db"
import { sql } from "drizzle-orm"

export const dynamic = "force-dynamic"

export const GET = route(async () => {
  const database = await db()
  await database.execute(sql`select 1`)
  return ok({ status: "ok", time: new Date().toISOString() })
})
