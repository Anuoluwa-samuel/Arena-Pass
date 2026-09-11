import "server-only"
import { env } from "@/server/env"
import type { PaymentProvider } from "./provider"
import { MockPaymentProvider } from "./mock"
import { PaystackProvider } from "./paystack"

let cached: PaymentProvider | undefined

export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached
  switch (env.PAYMENT_PROVIDER) {
    case "paystack":
      cached = new PaystackProvider(env.PAYSTACK_SECRET_KEY!)
      break
    default:
      cached = new MockPaymentProvider(env.APP_URL)
  }
  return cached
}

export function __setPaymentProviderForTests(p: PaymentProvider | undefined) {
  cached = p
}

export type { PaymentProvider } from "./provider"
