import { mkdir, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import type { StorageAdapter } from "./index"

export class LocalStorageAdapter implements StorageAdapter {
  readonly name = "local"
  private readonly root: string
  constructor(uploadDir: string, private readonly publicPrefix: string) {
    this.root = path.resolve(/* turbopackIgnore: true */ process.cwd(), uploadDir)
  }

  private resolve(key: string) {
    const safe = key.replace(/\\/g, "/").split("/").filter((p) => p && p !== "." && p !== "..")
    const full = path.join(this.root, ...safe)
    if (!full.startsWith(this.root)) throw new Error("Invalid storage key")
    return full
  }

  async put(key: string, data: Buffer) {
    const full = this.resolve(key)
    await mkdir(path.dirname(full), { recursive: true })
    await writeFile(full, data)
    return { url: `${this.publicPrefix}/${key}` }
  }

  async delete(key: string) {
    try {
      await unlink(this.resolve(key))
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err
    }
  }

  localPath(key: string) {
    try {
      return this.resolve(key)
    } catch {
      return null
    }
  }
}
