/**
 * Payment provider abstraction. The booking/payment services only ever talk
 * to this interface; Paystack, Flutterwave, Stripe etc. are adapters.
 * Amounts are integer minor units. Card data never touches our servers —
 * every provider redirects/embeds its own hosted payment page.
 */
export interface InitializeParams {
  reference: string
  amount: number
  currency: string
  email: string
  callbackUrl: string
  metadata?: Record<string, unknown>
}

export interface InitializeResult {
  authorizationUrl: string
  providerReference?: string
}

export type VerifyStatus = "success" | "failed" | "pending"

export interface VerifyResult {
  status: VerifyStatus
  amount: number
  currency: string
  providerTransactionId?: string
  channel?: string
  failureReason?: string
  raw?: unknown
}

export interface WebhookEvent {
  type: string
  /** Transaction reference for charge events; absent for events we don't act on (refunds, transfers…). */
  reference?: string
  raw: unknown
}

export interface RefundResult {
  providerReference?: string
  status: "success" | "pending" | "failed"
  raw?: unknown
}

export interface PaymentProvider {
  readonly name: string
  initialize(params: InitializeParams): Promise<InitializeResult>
  verify(reference: string): Promise<VerifyResult>
  /** Returns null only when the signature is missing or invalid; a valid event we don't use still returns an event. */
  parseWebhook(rawBody: string, headers: Headers): Promise<WebhookEvent | null>
  refund(params: { providerTransactionId: string; amount: number; reason: string }): Promise<RefundResult>
}
