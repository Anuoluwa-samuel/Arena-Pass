/**
 * Post-auth redirect target from an untrusted `?next=` value. Only same-site
 * paths pass: absolute URLs, protocol-relative `//host`, backslash variants
 * like `/\host`, and control characters (browsers strip tabs and newlines,
 * which turns `/<tab>/host` into `//host`) all fall back.
 */
export function safeNextPath(value: string | null | undefined, fallback = "/account") {
  if (!value || value[0] !== "/" || value[1] === "/" || value[1] === "\\") return fallback
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code < 32 || code === 127 || value[i] === "\\") return fallback
  }
  return value
}
