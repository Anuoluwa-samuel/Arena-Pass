"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Ban, ExternalLink, MoreVertical } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { api, errorMessage } from "@/lib/api-client"

export function TicketRowActions({ ticket, canManage }: { ticket: { id: string; ticketNumber: string; status: string }; canManage: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const cancel = async (reason: string) => {
    try {
      await api.post(`/api/admin/tickets/${ticket.id}/cancel`, { reason })
      toast.success("Ticket cancelled")
      router.refresh()
    } catch (err) {
      toast.error(errorMessage(err))
      throw err
    }
  }
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm"><MoreVertical className="size-4" /><span className="sr-only">Actions</span></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild><Link href={`/tickets/${ticket.ticketNumber}`} target="_blank"><ExternalLink className="mr-2 size-4" />Open ticket</Link></DropdownMenuItem>
          {canManage && ticket.status === "CONFIRMED" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setOpen(true)} className="text-destructive focus:text-destructive"><Ban className="mr-2 size-4" />Cancel (no refund)</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog open={open} onOpenChange={setOpen} title={`Cancel ${ticket.ticketNumber}?`} description="The slot is released and the ticket can no longer be used for entry. To return the money, use Refund on the Payments page instead." confirmLabel="Cancel ticket" destructive reasonLabel="Reason" onConfirm={cancel} />
    </>
  )
}
