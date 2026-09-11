"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { api, errorMessage } from "@/lib/api-client"

export function RefundButton({ paymentId, reference, amount }: { paymentId: string; reference: string; amount: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const refund = async (reason: string) => {
    try {
      await api.post(`/api/admin/payments/${paymentId}/refund`, { reason })
      toast.success(`Refund of ${amount} issued`)
      router.refresh()
    } catch (err) {
      toast.error(errorMessage(err))
      throw err
    }
  }
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}><RotateCcw className="mr-1.5 size-3.5" />Refund</Button>
      <ConfirmDialog open={open} onOpenChange={setOpen} title={`Refund ${amount}?`} description={`Payment ${reference} will be refunded through the provider, the ticket marked refunded, and the slot released.`} confirmLabel="Issue refund" destructive reasonLabel="Reason" onConfirm={refund} />
    </>
  )
}
