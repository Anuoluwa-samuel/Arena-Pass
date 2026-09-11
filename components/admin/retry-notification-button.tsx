"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { api, errorMessage } from "@/lib/api-client"

export function RetryNotificationButton({ id }: { id: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const retry = async () => {
    setBusy(true)
    try {
      const res = await api.post<{ status: string }>(`/api/admin/notifications/${id}/retry`)
      if (res.data?.status === "SENT") toast.success("Sent")
      else toast.error("Delivery failed again")
      router.refresh()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  return <Button size="sm" variant="outline" onClick={retry} disabled={busy}>{busy ? <Spinner className="size-3.5" /> : "Retry"}</Button>
}
