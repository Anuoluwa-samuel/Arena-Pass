"use client"

import { useState } from "react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  destructive?: boolean
  /** When set, a reason textarea is shown and passed to onConfirm. */
  reasonLabel?: string
  onConfirm: (reason: string) => Promise<void> | void
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = "Confirm", destructive, reasonLabel, onConfirm }: Props) {
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const confirm = async () => {
    setBusy(true)
    try {
      await onConfirm(reason)
      onOpenChange(false)
      setReason("")
    } finally {
      setBusy(false)
    }
  }
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {reasonLabel && (
          <div className="space-y-2">
            <Label htmlFor="confirm-reason">{reasonLabel}</Label>
            <Textarea id="confirm-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Add a short note for the audit log" />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => { e.preventDefault(); void confirm() }} disabled={busy || (!!reasonLabel && reason.trim().length < 3)} className={cn(destructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}>
            {busy ? <Spinner className="size-4" /> : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
