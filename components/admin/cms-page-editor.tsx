"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, Save, Undo2, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ToneBadge } from "@/components/shared/status-badge"
import { api, ApiError, errorMessage, fieldErrors } from "@/lib/api-client"
import { formatRelative } from "@/lib/format"

interface Props<T> {
  slug: string
  initialDraft: T
  hasUnpublishedChanges: boolean
  publishedAt: string | null
  previewHref: string
  canManage: boolean
  children: (draft: T, setDraft: (next: T) => void, errors: Record<string, string>) => React.ReactNode
}

/**
 * Draft / publish shell shared by every structured CMS page. Autosaves the
 * draft a moment after the admin stops typing, publishes explicitly.
 */
export function CmsPageEditor<T>({ slug, initialDraft, hasUnpublishedChanges, publishedAt, previewHref, canManage, children }: Props<T>) {
  const router = useRouter()
  const [draft, setDraftState] = useState<T>(initialDraft)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [unpublished, setUnpublished] = useState(hasUnpublishedChanges)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setDraft = (next: T) => {
    setDraftState(next)
    setDirty(true)
  }

  const saveDraft = async (silent = false) => {
    setSaving(true)
    setErrors({})
    try {
      await api.put(`/api/admin/cms/pages/${slug}`, draft)
      setDirty(false)
      setUnpublished(true)
      setLastSaved(new Date())
      if (!silent) toast.success("Draft saved")
      return true
    } catch (err) {
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR") setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
      return false
    } finally {
      setSaving(false)
    }
  }

  // Autosave 1.5s after the last edit.
  useEffect(() => {
    if (!dirty || !canManage) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void saveDraft(true), 1500)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, dirty])

  const publish = async () => {
    setPublishing(true)
    try {
      if (dirty && !(await saveDraft(true))) return
      await api.post(`/api/admin/cms/pages/${slug}`, { action: "publish" })
      setUnpublished(false)
      toast.success("Published — live on the site now")
      router.refresh()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPublishing(false)
    }
  }

  const discard = async () => {
    try {
      const res = await api.post<{ draft: T }>(`/api/admin/cms/pages/${slug}`, { action: "discard" })
      setDraftState(res.data.draft)
      setDirty(false)
      setUnpublished(false)
      toast.success("Draft discarded")
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <div className="mr-auto flex items-center gap-2 text-sm">
          {unpublished || dirty ? <ToneBadge tone="warning">Unpublished changes</ToneBadge> : <ToneBadge tone="success">Live</ToneBadge>}
          <span className="text-xs text-muted-foreground">
            {saving ? "Saving…" : lastSaved ? `Draft saved ${formatRelative(lastSaved)}` : publishedAt ? `Published ${formatRelative(publishedAt)}` : "Never published"}
          </span>
        </div>
        <Button variant="ghost" size="sm" asChild><a href={previewHref} target="_blank" rel="noreferrer"><Eye className="mr-1.5 size-4" />View live</a></Button>
        {canManage && (
          <>
            {(unpublished || dirty) && <Button variant="ghost" size="sm" onClick={discard}><Undo2 className="mr-1.5 size-4" />Discard</Button>}
            <Button variant="outline" size="sm" onClick={() => saveDraft()} disabled={saving || !dirty}><Save className="mr-1.5 size-4" />Save draft</Button>
            <Button size="sm" onClick={publish} disabled={publishing || (!unpublished && !dirty)}>{publishing ? <Spinner className="size-4" /> : <><Upload className="mr-1.5 size-4" />Publish</>}</Button>
          </>
        )}
      </div>
      <fieldset disabled={!canManage} className="space-y-6">{children(draft, setDraft, errors)}</fieldset>
    </div>
  )
}

export function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={"block space-y-1.5 " + (className ?? "")}>
      <span className="flex items-baseline justify-between gap-2 text-sm font-medium">{label}{hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}</span>
      {children}
      {error && <span className="block text-xs text-destructive">{error}</span>}
    </label>
  )
}
