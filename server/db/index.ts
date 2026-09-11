import "server-only"
import { getDb, rowsOf, type Database, type DbExecutor, type Transaction } from "./client"
import { runMigrations } from "./migrate"
import { ensureBaseline } from "./baseline"
import * as schema from "./schema"

const globalForBoot = globalThis as unknown as { __arenaPassReady?: Promise<Database> }

/**
 * The single entry point services use. Guarantees migrations have run and
 * the baseline rows (roles, default arena, settings) exist before any query.
 */
export function db(): Promise<Database> {
  if (!globalForBoot.__arenaPassReady) {
    globalForBoot.__arenaPassReady = (async () => {
      const database = await getDb()
      await runMigrations(database)
      await ensureBaseline(database)
      return database
    })()
  }
  return globalForBoot.__arenaPassReady
}

/** Test helper: reset the boot promise after swapping the database. */
export function __resetDbBootForTests() {
  globalForBoot.__arenaPassReady = undefined
}

export { schema, rowsOf }
export type { Database, DbExecutor, Transaction }
