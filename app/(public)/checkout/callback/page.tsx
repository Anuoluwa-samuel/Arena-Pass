import { Suspense } from "react"
import { Spinner } from "@/components/ui/spinner"
import { PaymentCallback } from "@/components/site/payment-callback"

export const metadata = { title: "Confirming payment" }

export default function CallbackPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-12">
      <Suspense fallback={<div className="flex w-full justify-center"><Spinner className="size-8" /></div>}>
        <PaymentCallback />
      </Suspense>
    </main>
  )
}
