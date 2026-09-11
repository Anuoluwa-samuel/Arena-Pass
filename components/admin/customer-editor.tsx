"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Spinner } from "@/components/ui/spinner"
import { api, errorMessage } from "@/lib/api-client"

export function CustomerEditor({ customer, canManage }: { customer: { id: string; name: string; phone: string; isActive: boolean }; canManage: boolean }) {
  const router = useRouter()
  const [name, setName] = useState(customer.name)
  const [phone, setPhone] = useState(customer.phone)
  const [isActive, setIsActive] = useState(customer.isActive)
  const [busy, setBusy] = useState(false)
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api.patch(`/api/admin/customers/${customer.id}`, { name, phone: phone || null, isActive })
      toast.success("Customer updated")
      router.refresh()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="c-name">Name</Label><Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} disabled={!canManage} required minLength={2} /></div>
          <div className="space-y-1.5"><Label htmlFor="c-phone">Phone</Label><Input id="c-phone" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!canManage} /></div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div><p className="text-sm font-medium">Account active</p><p className="text-xs text-muted-foreground">Disabled customers cannot sign in or book.</p></div>
            <Switch checked={isActive} onCheckedChange={setIsActive} disabled={!canManage} />
          </div>
          {canManage && <Button type="submit" disabled={busy}>{busy ? <Spinner className="size-4" /> : "Save changes"}</Button>}
        </form>
      </CardContent>
    </Card>
  )
}
