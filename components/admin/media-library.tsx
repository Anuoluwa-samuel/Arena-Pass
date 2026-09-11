"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Copy, ImageIcon, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { api, errorMessage } from "@/lib/api-client"
import { formatDateTime } from "@/lib/format"

interface Item { id: string; url: string; originalName: string; altText: string | null; folder: string; mimeType: string; sizeBytes: number; width: number | null; height: number | null; createdAt: string }

export function MediaLibrary({ items, canManage }: { items: Item[]; canManage: boolean }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [folder, setFolder] = useState("general")
  const [selected, setSelected] = useState<Item | null>(null)
  const [alt, setAlt] = useState("")
  const [deleting, setDeleting] = useState<Item | null>(null)
  const [dragging, setDragging] = useState(false)

  const upload = async (files: FileList | File[]) => {
    setUploading(true)
    let okCount = 0
    for (const file of Array.from(files)) {
      try {
        const form = new FormData()
        form.append("file", file)
        form.append("folder", folder)
        await api.post("/api/admin/media", form)
        okCount++
      } catch (err) {
        toast.error(`${file.name}: ${errorMessage(err)}`)
      }
    }
    setUploading(false)
    if (okCount) toast.success(`${okCount} file${okCount === 1 ? "" : "s"} uploaded`)
    router.refresh()
  }

  const saveAlt = async () => {
    if (!selected) return
    try {
      await api.patch(`/api/admin/media/${selected.id}`, { altText: alt })
      toast.success("Saved")
      setSelected(null)
      router.refresh()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const remove = async () => {
    if (!deleting) return
    try {
      await api.delete(`/api/admin/media/${deleting.id}`)
      toast.success("Deleted")
      setSelected(null)
      router.refresh()
    } catch (err) {
      toast.error(errorMessage(err))
      throw err
    }
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) void upload(e.dataTransfer.files) }}
          className={"flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors " + (dragging ? "border-primary bg-primary/5" : "border-border")}
        >
          <Upload className="size-6 text-muted-foreground" />
          <p className="text-sm">Drag images here, or</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? <Spinner className="size-4" /> : "Choose files"}</Button>
            <div className="flex items-center gap-2 text-sm"><Label htmlFor="folder" className="text-muted-foreground">Folder</Label><Input id="folder" value={folder} onChange={(e) => setFolder(e.target.value)} className="h-9 w-32" /></div>
          </div>
          <p className="text-xs text-muted-foreground">JPEG, PNG, WebP, GIF, SVG · up to 5MB each</p>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && upload(e.target.files)} />
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState icon={ImageIcon} title="No images yet" description="Upload images to use them in the homepage hero, banners, services and announcements." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {items.map((m) => (
            <button key={m.id} type="button" onClick={() => { setSelected(m); setAlt(m.altText ?? "") }} className="group overflow-hidden rounded-lg border border-border bg-card text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <div className="aspect-square bg-secondary">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt={m.altText ?? m.originalName} className="size-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
              </div>
              <div className="p-2"><p className="truncate text-xs font-medium">{m.originalName}</p><p className="text-[11px] text-muted-foreground">{m.folder} · {(m.sizeBytes / 1024).toFixed(0)} KB</p></div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader><DialogTitle className="truncate">{selected.originalName}</DialogTitle></DialogHeader>
              <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
                <div className="overflow-hidden rounded-lg bg-secondary">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selected.url} alt={selected.altText ?? ""} className="max-h-80 w-full object-contain" />
                </div>
                <div className="space-y-3 text-sm">
                  <p className="text-muted-foreground">{selected.mimeType} · {(selected.sizeBytes / 1024).toFixed(0)} KB{selected.width ? ` · ${selected.width}×${selected.height}` : ""}</p>
                  <p className="text-muted-foreground">Uploaded {formatDateTime(selected.createdAt)} · folder {selected.folder}</p>
                  <div className="space-y-1.5">
                    <Label htmlFor="alt">Alt text</Label>
                    <Input id="alt" value={alt} onChange={(e) => setAlt(e.target.value)} disabled={!canManage} placeholder="Describe the image for screen readers" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={selected.url} className="font-mono text-xs" />
                    <Button type="button" variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(new URL(selected.url, window.location.origin).toString()); toast.success("URL copied") }} aria-label="Copy URL"><Copy className="size-4" /></Button>
                  </div>
                  {canManage && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button type="button" onClick={saveAlt}>Save</Button>
                      <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleting(selected)}><Trash2 className="mr-2 size-4" />Delete</Button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title="Delete this image?" description="Anything still using it on the site will show a broken image until you pick a replacement." confirmLabel="Delete" destructive onConfirm={remove} />
    </div>
  )
}
