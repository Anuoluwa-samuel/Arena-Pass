import "server-only"
import { env } from "@/server/env"
import { LocalStorageAdapter } from "./local"

/**
 * Object storage abstraction. Local disk for development and single-server
 * deployments; an S3-compatible adapter implements the same interface for
 * cloud deployments (files are never stored in the database).
 */
export interface StorageAdapter {
  readonly name: string
  put(key: string, data: Buffer, contentType: string): Promise<{ url: string }>
  delete(key: string): Promise<void>
  /** Absolute filesystem path or null when not locally served. */
  localPath(key: string): string | null
}

let cached: StorageAdapter | undefined
export function getStorage(): StorageAdapter {
  if (cached) return cached
  cached = new LocalStorageAdapter(env.UPLOAD_DIR, "/api/media/files")
  return cached
}
