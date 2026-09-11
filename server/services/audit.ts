import "server-only"
import { db, schema, type DbExecutor } from "@/server/db"
import { logger, serializeError } from "@/server/observability/logger"

export interface AuditActor {
  type: "user" | "customer" | "system"
  id?: string | null
  name?: string | null
  ip?: string | null
}

export interface AuditEntry {
  action: string
  description: string
  entityType?: string
  entityId?: string
  arenaId?: string | null
  metadata?: Record<string, unknown>
}

/** Records an administrative action. Never throws — auditing must not break the operation. */
export async function recordAudit(actor: AuditActor, entry: AuditEntry, executor?: DbExecutor) {
  try {
    const ex = executor ?? (await db())
    await ex.insert(schema.auditLogs).values({
      arenaId: entry.arenaId ?? null,
      actorType: actor.type,
      actorId: actor.id ?? null,
      actorName: actor.name ?? null,
      action: entry.action,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      description: entry.description,
      metadata: entry.metadata ?? null,
      ipAddress: actor.ip ?? null,
    })
  } catch (err) {
    logger.error("audit.write_failed", { action: entry.action, error: serializeError(err) })
  }
}

export const SYSTEM_ACTOR: AuditActor = { type: "system", name: "System" }
