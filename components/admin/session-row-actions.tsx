"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Ban, Eye, EyeOff, MoreVertical, Pencil, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { api, errorMessage } from "@/lib/api-client"

type Dialog = "cancel" | "delete" | null

export function SessionRowActions({ session, canManage, variant = "menu" }: { session: { id: string; title: string; status: string; bookedCount: number }; canManage: boolean; variant?: "menu" | "buttons" }) {
  const router = useRouter()
  const [dialog, setDialog] = useState<Dialog>(null)
  if (!canManage) return null

  const run = async (path: string, ok: string, body?: unknown) => {
    try {
      const res = await api.post(`/api/admin/sessions/${session.id}/${path}`, body)
      toast.success(res.message ?? ok)
      router.refresh()
    } catch (err) {
      toast.error(errorMessage(err))
      throw err
    }
  }
  const remove = async () => {
    try {
      await api.delete(`/api/admin/sessions/${session.id}`)
      toast.success("Session deleted")
      router.push("/admin/sessions")
      router.refresh()
    } catch (err) {
      toast.error(errorMessage(err))
      throw err
    }
  }

  const editable = session.status !== "CANCELLED" && session.status !== "COMPLETED"
  const items = (
    <>
      <DropdownMenuItem asChild><Link href={`/admin/sessions/${session.id}`}><Eye className="mr-2 size-4" />View</Link></DropdownMenuItem>
      {editable && <DropdownMenuItem asChild><Link href={`/admin/sessions/${session.id}/edit`}><Pencil className="mr-2 size-4" />Edit</Link></DropdownMenuItem>}
      {session.status === "DRAFT" && <DropdownMenuItem onSelect={() => run("publish", "Published")}><Upload className="mr-2 size-4" />Publish</DropdownMenuItem>}
      {session.status === "PUBLISHED" && session.bookedCount === 0 && <DropdownMenuItem onSelect={() => run("unpublish", "Unpublished")}><EyeOff className="mr-2 size-4" />Unpublish</DropdownMenuItem>}
      {editable && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDialog("cancel")} className="text-destructive focus:text-destructive"><Ban className="mr-2 size-4" />Cancel session</DropdownMenuItem>
        </>
      )}
      {session.bookedCount === 0 && <DropdownMenuItem onSelect={() => setDialog("delete")} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 size-4" />Delete</DropdownMenuItem>}
    </>
  )

  return (
    <>
      {variant === "menu" ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm"><MoreVertical className="size-4" /><span className="sr-only">Actions</span></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">{items}</DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex flex-wrap gap-2">
          {editable && <Button variant="outline" asChild><Link href={`/admin/sessions/${session.id}/edit`}><Pencil className="mr-2 size-4" />Edit</Link></Button>}
          {session.status === "DRAFT" && <Button onClick={() => run("publish", "Published")}><Upload className="mr-2 size-4" />Publish</Button>}
          {session.status === "PUBLISHED" && session.bookedCount === 0 && <Button variant="outline" onClick={() => run("unpublish", "Unpublished")}><EyeOff className="mr-2 size-4" />Unpublish</Button>}
          {editable && <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDialog("cancel")}><Ban className="mr-2 size-4" />Cancel session</Button>}
          {session.bookedCount === 0 && <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDialog("delete")}><Trash2 className="mr-2 size-4" />Delete</Button>}
        </div>
      )}
      <ConfirmDialog open={dialog === "cancel"} onOpenChange={(o) => !o && setDialog(null)} title={`Cancel "${session.title}"?`} description="Pending reservations are released and confirmed tickets are cancelled. Refunds are issued from the Payments page. This cannot be undone." confirmLabel="Cancel session" destructive reasonLabel="Reason (shown to customers)" onConfirm={(reason) => run("cancel", "Session cancelled", { reason })} />
      <ConfirmDialog open={dialog === "delete"} onOpenChange={(o) => !o && setDialog(null)} title={`Delete "${session.title}"?`} description="The session will be removed from every list. Only sessions with no bookings can be deleted." confirmLabel="Delete" destructive onConfirm={remove} />
    </>
  )
}
