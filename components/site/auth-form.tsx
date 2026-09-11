"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Reveal } from "@/components/motion"
import { api, ApiError, errorMessage, fieldErrors } from "@/lib/api-client"

export function AuthForm({ mode, siteName }: { mode: "login" | "signup"; siteName: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get("next") && params.get("next")!.startsWith("/") ? params.get("next")! : "/account/tickets"
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    try {
      if (mode === "login") await api.post("/api/auth/customer/login", { email, password })
      else await api.post("/api/auth/customer/signup", { name, email, phone, password })
      router.push(next)
      router.refresh()
    } catch (err) {
      setLoading(false)
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR") setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Reveal trigger="mount" y={8}>
          <Link href="/" className="mb-8 flex items-center justify-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary"><span className="text-sm font-black text-primary-foreground">AP</span></div>
            <span className="text-2xl font-bold">{siteName}</span>
          </Link>
        </Reveal>
        <Reveal trigger="mount" delay={0.08}>
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{mode === "login" ? "Welcome back" : "Create an account"}</CardTitle>
              <CardDescription>{mode === "login" ? "Sign in to see your tickets" : "Keep all your tickets in one place"}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Okafor" autoComplete="name" required minLength={2} />
                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone <span className="text-muted-foreground">(optional)</span></Label>
                    <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 800 000 0000" autoComplete="tel" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input id="password" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "login" ? "Enter your password" : "At least 8 characters"} autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "signup" ? 8 : 1} className="pr-10" />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
                      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <><Spinner className="size-4" />{mode === "login" ? "Signing in…" : "Creating account…"}</> : mode === "login" ? "Sign in" : "Create account"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="justify-center">
              <p className="text-sm text-muted-foreground">
                {mode === "login" ? (
                  <>Don&apos;t have an account? <Link href={`/signup${next !== "/account/tickets" ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-primary hover:underline">Sign up</Link></>
                ) : (
                  <>Already have an account? <Link href="/login" className="text-primary hover:underline">Sign in</Link></>
                )}
              </p>
            </CardFooter>
          </Card>
        </Reveal>
      </div>
    </div>
  )
}
