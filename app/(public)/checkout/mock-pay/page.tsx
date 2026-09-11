import { notFound } from "next/navigation"
import { env } from "@/server/env"
import { db, schema } from "@/server/db"
import { eq } from "drizzle-orm"
import { MockPayPanel } from "@/components/site/mock-pay-panel"

export const dynamic = "force-dynamic"
export const metadata = { title: "Test payment" }

/** Stand-in for the provider's hosted page. Only exists when PAYMENT_PROVIDER=mock. */
export default async function MockPayPage({ searchParams }: { searchParams: Promise<{ reference?: string; callback?: string }> }) {
  if (env.PAYMENT_PROVIDER !== "mock") notFound()
  const { reference, callback } = await searchParams
  if (!reference || !callback) notFound()
  const database = await db()
  const payment = await database.query.payments.findFirst({ where: eq(schema.payments.reference, reference) })
  if (!payment) notFound()
  const callbackUrl = new URL(callback, env.APP_URL)
  if (callbackUrl.origin !== new URL(env.APP_URL).origin) notFound()
  return <MockPayPanel reference={reference} amount={payment.amount} currency={payment.currency} callbackUrl={callbackUrl.toString()} status={payment.status} />
}
