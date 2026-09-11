import { readFile } from "node:fs/promises"
import { route } from "@/server/http/response"
import { notFound } from "@/server/http/errors"
import { resolveLocalFile } from "@/server/services/media"

/** Serves locally stored uploads. Cloud storage serves files directly instead. */
export const GET = route<{ params: Promise<{ key: string[] }> }>(async (_req, { params }) => {
  const { key } = await params
  const file = await resolveLocalFile(key.join("/"))
  if (!file) throw notFound("File")
  const data = await readFile(file.path)
  return new Response(new Uint8Array(data), { headers: { "Content-Type": file.mimeType, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } })
})
