"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { ToneBadge } from "@/components/shared/status-badge"
import { api, ApiError, errorMessage, fieldErrors } from "@/lib/api-client"

export interface CollectionItem {
  id: string
  isPublished?: boolean
  isActive?: boolean
  sortOrder?: number
}

interface Props<T extends CollectionItem, F> {
  title: string
  singular: string
  endpoint: string
  items: T[]
  canManage: boolean
  reorderable?: boolean
  emptyHint: string
  toForm: (item: T | null) => F
  renderRow: (item: T) => React.ReactNode
  renderForm: (form: F, set: (next: F) => void, errors: Record<string, string>) => React.ReactNode
  toPayload?: (form: F) => unknown
  publishField?: "isPublished" | "isActive"
}

/**
 * Generic CRUD + reorder + publish toggle for simple CMS collections
 * (services, FAQs, banners, announcements). Non-technical admins get a
 * dialog form, up/down ordering and one-click publish/unpublish.
 */
export function CollectionEditor<T extends CollectionItem, F>({ title, singular, endpoint, items, canManage, reorderable, emptyHint, toForm, renderRow, renderForm, toPayload, publishField = "isPublished" }: Props<T, F>) {
  const router = useRouter()
  const [editing, setEditing] = useState<T | null | undefined>(undefined) // undefined = closed, null = new
  const [form, setForm] = useState<F>(toForm(null))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState<T | null>(null)
  const [order, setOrder] = useState<T[]>(items)

  const open = (item: T | null) => {
    setEditing(item)
    setForm(toForm(item))
    setErrors({})
  }

  const save = async () => {
    setBusy(true)
    setErrors({})
    try {
      const payload = toPayload ? toPayload(form) : form
      if (editing) await api.patch(`${endpoint}/${editing.id}`, payload)
      else await api.post(endpoint, payload)
      toast.success(editing ? `${singular} updated` : `${singular} added`)
      setEditing(undefined)
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR") setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!deleting) return
    try {
      await api.delete(`${endpoint}/${deleting.id}`)
      toast.success(`${singular} deleted`)
      setOrder((o) => o.filter((i) => i.id !== deleting.id))
      router.refresh()
    } catch (err) {
      toast.error(errorMessage(err))
      throw err
    }
  }

  const toggle = async (item: T) => {
    const current = item[publishField] as boolean | undefined
    try {
      await api.patch(`${endpoint}/${item.id}`, { [publishField]: !current })
      router.refresh()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...order]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setOrder(next)
    try {
      await api.post(`${endpoint}/reorder`, { ids: next.map((i) => i.id) })
      router.refresh()
    } catch (err) {
      toast.error(errorMessage(err))
      setOrder(items)
    }
  }

  const list = reorderable ? order : items

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title} <span className="text-sm font-normal text-muted-foreground">({items.length})</span></h2>
        {canManage && <Button onClick={() => open(null)}><Plus className="mr-2 size-4" />Add {singular.toLowerCase()}</Button>}
      </div>
      {list.length === 0 ? (
        <EmptyState title={`No ${title.toLowerCase()} yet`} description={emptyHint} action={canManage ? <Button onClick={() => open(null)}>Add {singular.toLowerCase()}</Button> : undefined} />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {list.map((item, i) => {
            const live = item[publishField] as boolean | undefined
            return (
              <li key={item.id} className="flex items-start gap-3 p-4">
                {reorderable && canManage && (
                  <div className="flex flex-col">
                    <Button variant="ghost" size="icon-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"><ArrowUp className="size-4" /></Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="Move down"><ArrowDown className="size-4" /></Button>
                  </div>
                )}
                <div className="min-w-0 flex-1">{renderRow(item)}</div>
                <div className="flex shrink-0 items-center gap-1">
                  {live !== undefined && (canManage ? (
                    <Button variant="ghost" size="sm" onClick={() => toggle(item)} title={live ? "Unpublish" : "Publish"}>
                      {live ? <><Eye className="mr-1.5 size-4 text-primary" />Live</> : <><EyeOff className="mr-1.5 size-4" />Hidden</>}
                    </Button>
                  ) : (
                    <ToneBadge tone={live ? "success" : "muted"}>{live ? "Live" : "Hidden"}</ToneBadge>
                  ))}
                  {canManage && (
                    <>
                      <Button variant="ghost" size="icon-sm" onClick={() => open(item)} aria-label="Edit"><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => setDeleting(item)} aria-label="Delete"><Trash2 className="size-4" /></Button>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Dialog open={editing !== undefined} onOpenChange={(o) => !o && setEditing(undefined)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing ? `Edit ${singular.toLowerCase()}` : `New ${singular.toLowerCase()}`}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); void save() }} className="space-y-4">
            {renderForm(form, setForm, errors)}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(undefined)}>Cancel</Button>
              <Button type="submit" disabled={busy}>{busy ? <Spinner className="size-4" /> : editing ? "Save changes" : `Add ${singular.toLowerCase()}`}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title={`Delete this ${singular.toLowerCase()}?`} description="This removes it from the public site immediately." confirmLabel="Delete" destructive onConfirm={remove} />
    </div>
  )
}
