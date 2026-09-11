"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Calendar, Check, Clock, CreditCard, Lock } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { DURATION, EASE_OUT } from "@/lib/motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Navbar } from "@/components/navbar"
import { Spinner } from "@/components/ui/spinner"
import { Reveal } from "@/components/motion"
import { getSessionById } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

function PaymentForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session")
  const session = sessionId ? getSessionById(sessionId) : null

  const [cardNumber, setCardNumber] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cvc, setCvc] = useState("")
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <h1 className="text-2xl font-bold">Session Not Found</h1>
        <p className="mt-2 text-muted-foreground">
          Please select a session to purchase a ticket.
        </p>
        <Button asChild className="mt-6">
          <Link href="/sessions">Browse Sessions</Link>
        </Button>
      </div>
    )
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ""
    const parts = []

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }

    if (parts.length) {
      return parts.join(" ")
    } else {
      return value
    }
  }

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4)
    }
    return v
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 1600))

    setIsLoading(false)
    setIsSuccess(true)

    // Let the success state register before handing off to the confirmation
    // page — a beat of reward rather than an abrupt cut on the moment the
    // user just paid for.
    await new Promise((resolve) => setTimeout(resolve, 550))
    router.push(`/confirmation?session=${session.id}`)
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Payment Form */}
      <Reveal trigger="mount" delay={0.12} className="order-last lg:order-none">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="size-5" />
              Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Cardholder Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength={19}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry Date</Label>
                  <Input
                    id="expiry"
                    type="text"
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    maxLength={5}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvc">CVC</Label>
                  <Input
                    id="cvc"
                    type="text"
                    placeholder="123"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    maxLength={4}
                    required
                  />
                </div>
              </div>
              <div className="sticky bottom-4 z-10 pt-4 lg:static">
                <Button
                  type="submit"
                  className={cn(
                    "w-full shadow-lg lg:shadow-none",
                    isSuccess && "bg-success hover:bg-success"
                  )}
                  size="lg"
                  disabled={isLoading || isSuccess}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {isSuccess ? (
                      <motion.span
                        key="success"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: DURATION.fast, ease: EASE_OUT }}
                        className="inline-flex items-center gap-2"
                      >
                        <Check className="size-4" />
                        Payment Confirmed
                      </motion.span>
                    ) : isLoading ? (
                      <motion.span
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: DURATION.fast }}
                        className="inline-flex items-center gap-2"
                      >
                        <Spinner className="size-4" />
                        Processing...
                      </motion.span>
                    ) : (
                      <motion.span
                        key="idle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: DURATION.fast }}
                      >
                        {`Pay $${session.price}`}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Lock className="size-3" />
                Secure payment powered by Stripe
              </div>
            </form>
          </CardContent>
        </Card>
      </Reveal>

      {/* Order Summary */}
      <Reveal trigger="mount" className="order-first lg:order-none">
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-secondary/50 p-4">
              <h3 className="font-semibold">Football Session</h3>
              <p className="mt-1 text-sm text-muted-foreground">{session.venue}</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="size-4 text-muted-foreground" />
                <span>{formatDate(session.date)}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="size-4 text-muted-foreground" />
                <span>{session.startTime} – {session.endTime}</span>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ticket Price</span>
                <span>${session.price}.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service Fee</span>
                <span>$0.00</span>
              </div>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span className="text-primary">${session.price}.00</span>
            </div>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  )
}

export default function PaymentPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link 
          href="/sessions" 
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to sessions
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
          <p className="mt-2 text-muted-foreground">
            Complete your purchase to secure your spot
          </p>
        </div>

        <Suspense fallback={
          <div className="flex items-center justify-center py-24">
            <Spinner className="size-8" />
          </div>
        }>
          <PaymentForm />
        </Suspense>
      </main>
    </div>
  )
}
