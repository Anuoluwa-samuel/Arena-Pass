import { getDb } from "@/server/db/client"
import { runMigrations } from "@/server/db/migrate"
import { ensureBaseline } from "@/server/db/baseline"

async function main() {
  const database = await getDb()
  await runMigrations(database)
  await ensureBaseline(database)
  console.log("Migrations applied and baseline ensured.")
  process.exit(0)

}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
