"use client"

import { useEffect, useState } from "react"
import { ImageIcon, Upload, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { api, errorMessage } from "@/lib/api-client"

interface MediaItem {
  id: string
  url: string
  originalName: string
  altText: string | null
}

/** Pick an image from the media library or upload a new one. Stores the URL (or id when `mode="id"`). */
export function MediaPicker({ value, onChange, mode = "url", folder = "content" }: { value: string | null; onChange: (v: string | null, item?: MediaItem) => void; mode?: "url" | "id"; folder?: string }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  // In url mode the preview IS the value; in id mode it is resolved asynchronously.
  const [resolved, setResolved] = useState<{ id: string; url: string | null } | null>(null)
  const preview = mode === "url" ? value : value ? (resolved?.id === value ? resolved.url : null) : null

  useEffect(() => {
    if (mode !== "id" || !value) return
    let cancelled = false
    api
      .get<MediaItem[]>("/api/admin/media?pageSize=100")
      .then((r) => { if (!cancelled) setResolved({ id: value, url: r.data.find((m) => m.id === value)?.url ?? null }) })
      .catch(() => null)
    return () => { cancelled = true }
  }, [value, mode])

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get<MediaItem[]>("/api/admin/media?pageSize=60")
      setItems(res.data)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const upload = async (file: File) => {
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("folder", folder)
      const res = await api.post<MediaItem>("/api/admin/media", form)
      pick(res.data)
      toast.success("Uploaded")
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  const pick = (item: MediaItem) => {
    setResolved({ id: item.id, url: item.url })
    onChange(mode === "url" ? item.url : item.id, item)
    setOpen(false)
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          <ImageIcon className="size-6 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) void load() }}>
          <DialogTrigger asChild><Button type="button" variant="outline" size="sm">Choose image</Button></DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>Media library</DialogTitle></DialogHeader>
            <div className="flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-secondary">
                {uploading ? <Spinner className="size-4" /> : <Upload className="size-4" />} Upload new
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} disabled={uploading} />
              </label>
              <span className="text-xs text-muted-foreground">JPEG, PNG, WebP, GIF or SVG · up to 5MB</span>
            </div>
            <div className="mt-2 grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4 md:grid-cols-5">
              {loading ? (
                <div className="col-span-full flex justify-center py-12"><Spinner className="size-6" /></div>
              ) : items.length === 0 ? (
                <p className="col-span-full py-12 text-center text-sm text-muted-foreground">No images yet. Upload one to get started.</p>
              ) : (
                items.map((m) => (
                  <button key={m.id} type="button" onClick={() => pick(m)} className="group aspect-square overflow-hidden rounded-lg border border-border bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" title={m.originalName}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.url} alt={m.altText ?? m.originalName} className="size-full object-cover transition-transform group-hover:scale-105" />
                  </button>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
        {value && <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}><X className="mr-1 size-4" />Remove</Button>}
      </div>
    </div>
  )
}
