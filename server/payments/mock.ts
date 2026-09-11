import { eq } from "drizzle-orm"
import type { InitializeParams, PaymentProvider, VerifyResult } from "./provider"
import { db, schema } from "@/server/db"

/**
 * Development/test provider. Instead of a hosted card page it redirects to
 * our own /checkout/mock-pay screen where the tester chooses an outcome; the
 * outcome is stored on the payment row and `verify` reads it back, so the
 * rest of the pipeline (verification, confirmation, ticket issue) runs
 * exactly as it would with a real provider. Refused in production by env.ts.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock"
  constructor(private readonly appUrl: string) {}

  async initialize(params: InitializeParams) {
    const url = new URL("/checkout/mock-pay", this.appUrl)
    url.searchParams.set("reference", params.reference)
    url.searchParams.set("callback", params.callbackUrl)
    return { authorizationUrl: url.toString() }
  }

  async verify(reference: string): Promise<VerifyResult> {
    const database = await db()
    const payment = await database.query.payments.findFirst({ where: eq(schema.payments.reference, reference) })
    const outcome = (payment?.providerPayload as { mockOutcome?: string } | null)?.mockOutcome
    return {
      status: outcome === "success" ? "success" : outcome === "failed" ? "failed" : "pending",
      amount: payment?.amount ?? 0,
      currency: payment?.currency ?? "NGN",
      providerTransactionId: payment ? `mock_${payment.id}` : undefined,
      channel: "mock",
      failureReason: outcome === "failed" ? "Declined by tester" : undefined,
    }
  }

  async parseWebhook() {
    return null
  }

  async refund() {
    return { status: "success" as const, providerReference: `mock_refund_${Date.now()}` }
  }
}

/** Test/dev helper: records the tester's chosen outcome for a reference. */
export async function setMockOutcome(reference: string, outcome: "success" | "failed") {
  const database = await db()
  const [row] = await database
    .update(schema.payments)
    .set({ providerPayload: { mockOutcome: outcome }, updatedAt: new Date() })
    .where(eq(schema.payments.reference, reference))
    .returning()
  return row ?? null
}
