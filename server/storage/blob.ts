import { del, put } from "@vercel/blob"
import type { StorageAdapter } from "./index"

/**
 * Vercel Blob (public store). Serverless hosts have no persistent disk, so
 * uploads live here and are served straight from the Blob CDN URL, which is
 * what gets stored on the media row. Keys already contain a random UUID, so
 * Blob's own random suffix is off and the key is the pathname.
 */
export class BlobStorageAdapter implements StorageAdapter {
  readonly name = "blob"
  constructor(private readonly token: string) {}

  async put(key: string, data: Buffer, contentType: string) {
    const blob = await put(key, data, {
      access: "public",
      contentType,
      token: this.token,
      addRandomSuffix: false,
      // Keys are never reused (UUID filenames), so the file can be cached for a year.
      cacheControlMaxAge: 31_536_000,
    })
    return { url: blob.url }
  }

  async delete(key: string) {
    await del(key, { token: this.token })
  }

  localPath() {
    return null
  }
}
