import { createHmac, timingSafeEqual } from "node:crypto"
import type { InitializeParams, PaymentProvider, VerifyResult } from "./provider"
import { AppError } from "@/server/http/errors"
import { logger } from "@/server/observability/logger"

const API = "https://api.paystack.co"

interface PaystackResponse<T> {
  status: boolean
  message: string
  data: T
}

export class PaystackProvider implements PaymentProvider {
  readonly name = "paystack"
  constructor(private readonly secretKey: string) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.secretKey}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    })
    const body = (await res.json().catch(() => null)) as PaystackResponse<T> | null
    if (!res.ok || !body?.status) {
      logger.error("paystack.error", { path, status: res.status, message: body?.message })
      throw new AppError("PAYMENT_PROVIDER_ERROR", body?.message ?? "Payment provider is unavailable")
    }
    return body.data
  }

  async initialize(params: InitializeParams) {
    const data = await this.request<{ authorization_url: string; access_code: string; reference: string }>("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: params.email,
        amount: params.amount,
        currency: params.currency,
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: params.metadata,
      }),
    })
    return { authorizationUrl: data.authorization_url, providerReference: data.reference }
  }

  async verify(reference: string): Promise<VerifyResult> {
    const data = await this.request<{
      id: number
      status: string
      amount: number
      currency: string
      channel?: string
      gateway_response?: string
    }>(`/transaction/verify/${encodeURIComponent(reference)}`)
    const status: VerifyResult["status"] = data.status === "success" ? "success" : data.status === "failed" || data.status === "abandoned" || data.status === "reversed" ? "failed" : "pending"
    return {
      status,
      amount: data.amount,
      currency: data.currency,
      providerTransactionId: String(data.id),
      channel: data.channel,
      failureReason: status === "failed" ? data.gateway_response : undefined,
      raw: data,
    }
  }

  async parseWebhook(rawBody: string, headers: Headers) {
    const signature = headers.get("x-paystack-signature")
    if (!signature) return null
    const expected = createHmac("sha512", this.secretKey).update(rawBody).digest("hex")
    const a = Buffer.from(signature)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    let event: { event?: string; data?: { reference?: string } }
    try {
      event = JSON.parse(rawBody)
    } catch {
      return null
    }
    // Only charge events carry a transaction reference we verify; everything else is acknowledged and ignored.
    const reference = event.event?.startsWith("charge.") ? event.data?.reference : undefined
    return { type: event.event ?? "unknown", reference, raw: event }
  }

  async refund(params: { providerTransactionId: string; amount: number; reason: string }) {
    const data = await this.request<{ id: number; status: string }>("/refund", {
      method: "POST",
      body: JSON.stringify({ transaction: params.providerTransactionId, amount: params.amount, merchant_note: params.reason }),
    })
    return { providerReference: String(data.id), status: data.status === "processed" ? ("success" as const) : ("pending" as const), raw: data }
  }
}
