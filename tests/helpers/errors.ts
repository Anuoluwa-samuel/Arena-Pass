/** Drizzle wraps driver errors; the Postgres constraint name lives on `cause`. */
export function dbErrorText(err: unknown): string {
  const e = err as { message?: string; cause?: { message?: string; code?: string; constraint_name?: string } }
  return [e?.message, e?.cause?.message, e?.cause?.code, e?.cause?.constraint_name].filter(Boolean).join(" | ")
}

export async function expectDbError(promise: Promise<unknown>, pattern: RegExp) {
  let caught: unknown
  try {
    await promise
  } catch (err) {
    caught = err
  }
  if (!caught) throw new Error(`Expected query to fail with ${pattern}`)
  const text = dbErrorText(caught)
  if (!pattern.test(text)) throw new Error(`Expected error matching ${pattern}, got: ${text}`)
}
