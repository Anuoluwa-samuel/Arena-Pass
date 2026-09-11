import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"
import { migrate } from "drizzle-orm/pglite/migrator"
import path from "node:path"
import * as schema from "@/server/db/schema"
import { __setDbForTests, type Database } from "@/server/db/client"
import { __resetDbBootForTests, db as bootDb } from "@/server/db"

/** Fresh in-memory Postgres with all migrations applied, registered as the app db. */
export async function createTestDb() {
  const client = new PGlite()
  const db = drizzle(client, { schema })
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "server/db/migrations") })
  __setDbForTests(db as unknown as Database)
  __resetDbBootForTests()
  await bootDb() // applies baseline rows (roles, arena, cms) exactly like production boot
  return { db: db as unknown as Database, client }
}
