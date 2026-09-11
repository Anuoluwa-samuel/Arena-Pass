"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Reveal } from "@/components/motion"
import { api, errorMessage } from "@/lib/api-client"

export function AdminLoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get("next")?.startsWith("/admin") ? params.get("next")! : "/admin"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post("/api/auth/login", { email, password })
      router.push(next)
      router.refresh()
    } catch (err) {
      setLoading(false)
      toast.error(errorMessage(err))
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Reveal trigger="mount" y={8} className="mb-8 flex items-center justify-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary"><span className="text-sm font-black text-primary-foreground">AP</span></div>
          <span className="text-2xl font-bold">Arena Pass</span>
        </Reveal>
        <Reveal trigger="mount" delay={0.08}>
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10"><ShieldCheck className="size-5 text-primary" /></div>
              <CardTitle className="text-2xl">Admin sign in</CardTitle>
              <CardDescription>Restricted to arena staff and administrators</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input id="password" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required className="pr-10" />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
                      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? <><Spinner className="size-4" />Signing in…</> : "Sign in"}</Button>
              </form>
              <p className="mt-6 text-center text-xs text-muted-foreground"><Link href="/" className="hover:text-foreground">← Back to the public site</Link></p>
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </div>
  )
}
