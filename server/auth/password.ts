import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto"

function scrypt(password: string, salt: Buffer, keylen: number, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) =>
    scryptCb(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key)))
  )
}
const KEY_LENGTH = 64
const PARAMS = { N: 16384, r: 8, p: 1 }

/** scrypt with a per-password salt; format: scrypt$N$r$p$salt$hash (base64). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derived = await scrypt(password, salt, KEY_LENGTH, PARAMS)
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64"), derived.toString("base64")].join("$")
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false
  const [algo, N, r, p, saltB64, hashB64] = stored.split("$")
  if (algo !== "scrypt") return false
  const salt = Buffer.from(saltB64, "base64")
  const expected = Buffer.from(hashB64, "base64")
  const derived = await scrypt(password, salt, expected.length, { N: Number(N), r: Number(r), p: Number(p) })
  return derived.length === expected.length && timingSafeEqual(derived, expected)
}
