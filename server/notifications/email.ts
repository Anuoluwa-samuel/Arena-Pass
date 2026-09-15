import { env } from "@/server/env"
import { logger } from "@/server/observability/logger"

export interface EmailMessage {
  to: string
  subject: string
  html: string
  text: string
}

export interface EmailChannel {
  send(msg: EmailMessage): Promise<{ providerId?: string }>
}

class ConsoleEmailChannel implements EmailChannel {
  async send(msg: EmailMessage) {
    // Dev convenience: the body carries links (tickets, password resets) that are otherwise unreachable
    // without a real inbox. Never logged in production, where those links are credentials.
    logger.info("email.console", { to: msg.to, subject: msg.subject, ...(env.isProd ? {} : { text: msg.text }) })
    return {}
  }
}

class ResendEmailChannel implements EmailChannel {
  constructor(private readonly apiKey: string) {}
  async send(msg: EmailMessage) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
    })
    if (!res.ok) throw new Error(`Resend responded ${res.status}: ${await res.text()}`)
    const data = (await res.json()) as { id?: string }
    return { providerId: data.id }
  }
}

let cached: EmailChannel | undefined
export function getEmailChannel(): EmailChannel {
  if (cached) return cached
  cached = env.EMAIL_PROVIDER === "resend" && env.RESEND_API_KEY ? new ResendEmailChannel(env.RESEND_API_KEY) : new ConsoleEmailChannel()
  return cached
}
