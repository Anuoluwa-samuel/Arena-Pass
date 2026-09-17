import { describe, it, expect, vi, afterEach } from "vitest"
import { createHmac } from "node:crypto"
import { PaystackProvider } from "@/server/payments/paystack"

/*
 * Response bodies follow Paystack's documented API shapes
 * (https://paystack.com/docs/api/transaction/), trimmed to the fields the
 * adapter reads plus a few it must ignore.
 */
const SECRET = "sk_test_0123456789abcdef"
const provider = new PaystackProvider(SECRET)

function mockFetch(status: number, body: unknown) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }))
}
afterEach(() => vi.restoreAllMocks())

describe("initialize", () => {
  it("posts amount in minor units with the secret key and maps the authorization URL", async () => {
    const fetchSpy = mockFetch(200, {
      status: true,
      message: "Authorization URL created",
      data: { authorization_url: "https://checkout.paystack.com/0peioxfhpn", access_code: "0peioxfhpn", reference: "AP-REF-1" },
    })
    const out = await provider.initialize({ reference: "AP-REF-1", amount: 250_000, currency: "NGN", email: "ada@example.com", callbackUrl: "https://arena.example/checkout/callback?reference=AP-REF-1", metadata: { bookingId: "b1" } })

    expect(out).toEqual({ authorizationUrl: "https://checkout.paystack.com/0peioxfhpn", providerReference: "AP-REF-1" })
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://api.paystack.co/transaction/initialize")
    expect(init.method).toBe("POST")
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${SECRET}`)
    expect(JSON.parse(init.body as string)).toMatchObject({ email: "ada@example.com", amount: 250_000, currency: "NGN", reference: "AP-REF-1", callback_url: "https://arena.example/checkout/callback?reference=AP-REF-1" })
  })

  it("turns a Paystack error into PAYMENT_PROVIDER_ERROR with Paystack's message", async () => {
    mockFetch(401, { status: false, message: "Invalid key" })
    await expect(provider.initialize({ reference: "r", amount: 1, currency: "NGN", email: "a@b.co", callbackUrl: "https://x" })).rejects.toMatchObject({ code: "PAYMENT_PROVIDER_ERROR", message: "Invalid key" })
  })

  it("treats a 200 with status:false as an error", async () => {
    mockFetch(200, { status: false, message: "Duplicate Transaction Reference" })
    await expect(provider.initialize({ reference: "r", amount: 1, currency: "NGN", email: "a@b.co", callbackUrl: "https://x" })).rejects.toMatchObject({ code: "PAYMENT_PROVIDER_ERROR" })
  })

  it("survives a non-JSON body (e.g. a gateway error page)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("<html>502 Bad Gateway</html>", { status: 502 }))
    await expect(provider.initialize({ reference: "r", amount: 1, currency: "NGN", email: "a@b.co", callbackUrl: "https://x" })).rejects.toMatchObject({ code: "PAYMENT_PROVIDER_ERROR" })
  })
})

describe("verify", () => {
  const txn = (status: string, extra: Record<string, unknown> = {}) => ({
    status: true,
    message: "Verification successful",
    data: { id: 4099260516, domain: "test", status, reference: "AP-REF-1", amount: 250_000, currency: "NGN", channel: "card", gateway_response: status === "success" ? "Successful" : "Declined", paid_at: "2026-09-17T10:00:00.000Z", ...extra },
  })

  it("maps success with amount, currency, channel and transaction id", async () => {
    const fetchSpy = mockFetch(200, txn("success"))
    const out = await provider.verify("AP-REF-1")
    expect(out).toMatchObject({ status: "success", amount: 250_000, currency: "NGN", channel: "card", providerTransactionId: "4099260516" })
    expect(out.failureReason).toBeUndefined()
    expect(fetchSpy.mock.calls[0][0]).toBe("https://api.paystack.co/transaction/verify/AP-REF-1")
  })

  it.each(["failed", "abandoned", "reversed"])("maps %s to failed with the gateway response", async (status) => {
    mockFetch(200, txn(status))
    expect(await provider.verify("AP-REF-1")).toMatchObject({ status: "failed", failureReason: "Declined" })
  })

  it.each(["ongoing", "pending", "processing", "queued"])("maps %s to pending", async (status) => {
    mockFetch(200, txn(status))
    expect((await provider.verify("AP-REF-1")).status).toBe("pending")
  })

  it("URL-encodes the reference", async () => {
    const fetchSpy = mockFetch(200, txn("success"))
    await provider.verify("AP/REF 1")
    expect(fetchSpy.mock.calls[0][0]).toBe("https://api.paystack.co/transaction/verify/AP%2FREF%201")
  })

  it("errors when the reference is unknown", async () => {
    mockFetch(400, { status: false, message: "Transaction reference not found" })
    await expect(provider.verify("nope")).rejects.toMatchObject({ code: "PAYMENT_PROVIDER_ERROR", message: "Transaction reference not found" })
  })
})

describe("refund", () => {
  it("creates a refund against the transaction and reports queued refunds as pending", async () => {
    const fetchSpy = mockFetch(200, { status: true, message: "Refund has been queued for processing", data: { id: 3018284, transaction: { id: 4099260516, reference: "AP-REF-1" }, deducted_amount: 0, currency: "NGN", status: "pending", merchant_note: "Session full" } })
    const out = await provider.refund({ providerTransactionId: "4099260516", amount: 250_000, reason: "Session full" })
    expect(out).toMatchObject({ providerReference: "3018284", status: "pending" })
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://api.paystack.co/refund")
    expect(JSON.parse(init.body as string)).toEqual({ transaction: "4099260516", amount: 250_000, merchant_note: "Session full" })
  })

  it("reports processed refunds as success", async () => {
    mockFetch(200, { status: true, message: "ok", data: { id: 1, status: "processed" } })
    expect((await provider.refund({ providerTransactionId: "1", amount: 1, reason: "x" })).status).toBe("success")
  })
})

describe("webhook", () => {
  const sign = (body: string, secret = SECRET) => createHmac("sha512", secret).update(body).digest("hex")
  const headers = (signature?: string) => new Headers(signature ? { "x-paystack-signature": signature } : {})

  it("accepts a signed charge.success and returns its reference", async () => {
    const body = JSON.stringify({ event: "charge.success", data: { id: 4099260516, reference: "AP-REF-1", status: "success", amount: 250_000 } })
    expect(await provider.parseWebhook(body, headers(sign(body)))).toMatchObject({ type: "charge.success", reference: "AP-REF-1" })
  })

  it("accepts a signed non-charge event with no reference to act on (so it can be acknowledged)", async () => {
    const body = JSON.stringify({ event: "refund.processed", data: { status: "processed", transaction_reference: "AP-REF-1" } })
    const event = await provider.parseWebhook(body, headers(sign(body)))
    expect(event).not.toBeNull()
    expect(event).toMatchObject({ type: "refund.processed" })
    expect(event!.reference).toBeUndefined()
  })

  it("rejects a missing, wrong or truncated signature", async () => {
    const body = JSON.stringify({ event: "charge.success", data: { reference: "AP-REF-1" } })
    expect(await provider.parseWebhook(body, headers())).toBeNull()
    expect(await provider.parseWebhook(body, headers(sign(body, "sk_test_someone_else")))).toBeNull()
    expect(await provider.parseWebhook(body, headers(sign(body).slice(0, 40)))).toBeNull()
  })

  it("rejects a body altered after signing", async () => {
    const body = JSON.stringify({ event: "charge.success", data: { reference: "AP-REF-1", amount: 100 } })
    const tampered = body.replace('"amount":100', '"amount":999999')
    expect(await provider.parseWebhook(tampered, headers(sign(body)))).toBeNull()
  })

  it("returns null for a signed but malformed body instead of throwing", async () => {
    const body = "{not json"
    expect(await provider.parseWebhook(body, headers(sign(body)))).toBeNull()
  })
})
