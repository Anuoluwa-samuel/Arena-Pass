"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck, ShieldOff } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Spinner } from "@/components/ui/spinner"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { api, errorMessage } from "@/lib/api-client"

export function CustomerEditor({
  customer,
  canManage,
}: {
  customer: { id: string; name: string; phone: string; isActive: boolean; twoFactorEnabled: boolean }
  canManage: boolean
}) {
  const router = useRouter()
  const [name, setName] = useState(customer.name)
  const [phone, setPhone] = useState(customer.phone)
  const [isActive, setIsActive] = useState(customer.isActive)
  const [busy, setBusy] = useState(false)
  const [resetting2fa, setResetting2fa] = useState(false)
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
  const resetTwoFactor = async () => {
    try {
      await api.delete(`/api/admin/customers/${customer.id}/two-factor`)
      toast.success(`${customer.name} can now sign in with their password and set it up again`)
      router.refresh()
    } catch (err) {
      toast.error(errorMessage(err))
      throw err
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

        <div className="mt-6 border-t border-border pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-medium">
                {customer.twoFactorEnabled ? <ShieldCheck className="size-4 text-primary" /> : <ShieldOff className="size-4 text-muted-foreground" />}
                Two-step verification
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {customer.twoFactorEnabled
                  ? "On. Reset it only if they have lost their authenticator app and every recovery code, and you have confirmed who they are."
                  : "Off. They can turn it on themselves from their profile."}
              </p>
            </div>
            {canManage && customer.twoFactorEnabled && (
              <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => setResetting2fa(true)}>
                Reset
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      <ConfirmDialog
        open={resetting2fa}
        onOpenChange={setResetting2fa}
        title={`Reset two-factor authentication for ${customer.name}?`}
        description="Do this only when they have lost both their authenticator app and their recovery codes, and you have confirmed who they are by some other means. Their password alone will sign them in afterwards, until they set it up again. Every active session is signed out and the reset is recorded in the audit log."
        confirmLabel="Reset"
        destructive
        onConfirm={resetTwoFactor}
      />
    </Card>
  )
}
