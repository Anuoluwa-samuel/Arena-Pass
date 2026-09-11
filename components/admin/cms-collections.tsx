"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { CmsIcon } from "@/components/site/cms-icon"
import { ToneBadge } from "@/components/shared/status-badge"
import { CollectionEditor } from "./collection-editor"
import { Field } from "./cms-page-editor"
import { IconSelect } from "./cms-forms"
import { MediaPicker } from "./media-picker"
import { formatDateTime, toDatetimeLocalValue } from "@/lib/format"

type Base = { id: string; sortOrder?: number }

export function ServicesEditor({ items, canManage }: { items: Array<Base & { title: string; description: string; icon: string | null; imageMediaId: string | null; isPublished: boolean }>; canManage: boolean }) {
  return (
    <CollectionEditor
      title="Services" singular="Service" endpoint="/api/admin/cms/services" items={items} canManage={canManage} reorderable emptyHint="Describe what the arena offers — pitch quality, changing rooms, referees."
      toForm={(i) => ({ title: i?.title ?? "", description: i?.description ?? "", icon: i?.icon ?? "star", imageMediaId: i?.imageMediaId ?? null, isPublished: i?.isPublished ?? true })}
      renderRow={(i) => (
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10"><CmsIcon name={i.icon} className="size-4 text-primary" /></span>
          <div className="min-w-0"><p className="font-medium">{i.title}</p><p className="truncate text-sm text-muted-foreground">{i.description}</p></div>
        </div>
      )}
      renderForm={(f, set, e) => (
        <>
          <Field label="Title" error={e.title}><Input value={f.title} onChange={(ev) => set({ ...f, title: ev.target.value })} required /></Field>
          <Field label="Description" error={e.description}><Textarea rows={3} value={f.description} onChange={(ev) => set({ ...f, description: ev.target.value })} required /></Field>
          <Field label="Icon"><IconSelect value={f.icon} onChange={(icon) => set({ ...f, icon })} /></Field>
          <Field label="Image" hint="Optional"><MediaPicker mode="id" value={f.imageMediaId} onChange={(id) => set({ ...f, imageMediaId: id })} /></Field>
          <PublishedSwitch checked={f.isPublished} onChange={(v) => set({ ...f, isPublished: v })} />
        </>
      )}
    />
  )
}

export function FaqsEditor({ items, canManage }: { items: Array<Base & { question: string; answer: string; isPublished: boolean }>; canManage: boolean }) {
  return (
    <CollectionEditor
      title="FAQs" singular="FAQ" endpoint="/api/admin/cms/faqs" items={items} canManage={canManage} reorderable emptyHint="Answer the questions customers ask most: refunds, what to bring, how teams work."
      toForm={(i) => ({ question: i?.question ?? "", answer: i?.answer ?? "", isPublished: i?.isPublished ?? true })}
      renderRow={(i) => <div className="min-w-0"><p className="font-medium">{i.question}</p><p className="line-clamp-2 text-sm text-muted-foreground">{i.answer}</p></div>}
      renderForm={(f, set, e) => (
        <>
          <Field label="Question" error={e.question}><Input value={f.question} onChange={(ev) => set({ ...f, question: ev.target.value })} required /></Field>
          <Field label="Answer" error={e.answer}><Textarea rows={5} value={f.answer} onChange={(ev) => set({ ...f, answer: ev.target.value })} required /></Field>
          <PublishedSwitch checked={f.isPublished} onChange={(v) => set({ ...f, isPublished: v })} />
        </>
      )}
    />
  )
}

export function AnnouncementsEditor({ items, canManage }: { items: Array<Base & { title: string; content: string; status: "DRAFT" | "PUBLISHED" | "ARCHIVED"; publishAt: Date | string | null; expiresAt: Date | string | null; imageMediaId: string | null }>; canManage: boolean }) {
  const tone = { DRAFT: "muted", PUBLISHED: "success", ARCHIVED: "neutral" } as const
  return (
    <CollectionEditor
      title="Announcements" singular="Announcement" endpoint="/api/admin/cms/announcements" items={items} canManage={canManage} emptyHint="Share news — new session times, holiday closures, tournaments."
      publishField="isActive"
      toForm={(i) => ({ title: i?.title ?? "", content: i?.content ?? "", status: i?.status ?? "DRAFT", publishAt: toDatetimeLocalValue(i?.publishAt ?? null), expiresAt: toDatetimeLocalValue(i?.expiresAt ?? null), imageMediaId: i?.imageMediaId ?? null })}
      toPayload={(f) => ({ ...f, publishAt: f.publishAt ? new Date(f.publishAt).toISOString() : null, expiresAt: f.expiresAt ? new Date(f.expiresAt).toISOString() : null })}
      renderRow={(i) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2"><p className="font-medium">{i.title}</p><ToneBadge tone={tone[i.status]}>{i.status}</ToneBadge></div>
          <p className="line-clamp-2 text-sm text-muted-foreground">{i.content}</p>
          <p className="mt-1 text-xs text-muted-foreground">{i.publishAt ? `From ${formatDateTime(i.publishAt)}` : "No start date"}{i.expiresAt ? ` · until ${formatDateTime(i.expiresAt)}` : ""}</p>
        </div>
      )}
      renderForm={(f, set, e) => (
        <>
          <Field label="Title" error={e.title}><Input value={f.title} onChange={(ev) => set({ ...f, title: ev.target.value })} required /></Field>
          <Field label="Content" error={e.content}><Textarea rows={5} value={f.content} onChange={(ev) => set({ ...f, content: ev.target.value })} required /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Publish from" hint="Optional"><Input type="datetime-local" value={f.publishAt} onChange={(ev) => set({ ...f, publishAt: ev.target.value })} /></Field>
            <Field label="Expires" hint="Optional"><Input type="datetime-local" value={f.expiresAt} onChange={(ev) => set({ ...f, expiresAt: ev.target.value })} /></Field>
          </div>
          <Field label="Status">
            <Select value={f.status} onValueChange={(v) => set({ ...f, status: v as typeof f.status })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="DRAFT">Draft</SelectItem><SelectItem value="PUBLISHED">Published</SelectItem><SelectItem value="ARCHIVED">Archived</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label="Image" hint="Optional"><MediaPicker mode="id" value={f.imageMediaId} onChange={(id) => set({ ...f, imageMediaId: id })} /></Field>
        </>
      )}
    />
  )
}

export function BannersEditor({ items, canManage }: { items: Array<Base & { title: string; subtitle: string | null; linkUrl: string | null; linkLabel: string | null; imageMediaId: string | null; isActive: boolean; startsAt: Date | string | null; endsAt: Date | string | null }>; canManage: boolean }) {
  return (
    <CollectionEditor
      title="Banners" singular="Banner" endpoint="/api/admin/cms/banners" items={items} canManage={canManage} reorderable publishField="isActive" emptyHint="Promotional strips shown on the homepage — offers, tournaments, sponsors."
      toForm={(i) => ({ title: i?.title ?? "", subtitle: i?.subtitle ?? "", linkUrl: i?.linkUrl ?? "", linkLabel: i?.linkLabel ?? "", imageMediaId: i?.imageMediaId ?? null, isActive: i?.isActive ?? true, startsAt: toDatetimeLocalValue(i?.startsAt ?? null), endsAt: toDatetimeLocalValue(i?.endsAt ?? null) })}
      toPayload={(f) => ({ ...f, startsAt: f.startsAt ? new Date(f.startsAt).toISOString() : null, endsAt: f.endsAt ? new Date(f.endsAt).toISOString() : null })}
      renderRow={(i) => <div className="min-w-0"><p className="font-medium">{i.title}</p>{i.subtitle && <p className="truncate text-sm text-muted-foreground">{i.subtitle}</p>}{i.linkUrl && <p className="text-xs text-muted-foreground">{i.linkLabel || "Link"} → {i.linkUrl}</p>}</div>}
      renderForm={(f, set, e) => (
        <>
          <Field label="Title" error={e.title}><Input value={f.title} onChange={(ev) => set({ ...f, title: ev.target.value })} required /></Field>
          <Field label="Subtitle" hint="Optional"><Input value={f.subtitle} onChange={(ev) => set({ ...f, subtitle: ev.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Button label"><Input value={f.linkLabel} onChange={(ev) => set({ ...f, linkLabel: ev.target.value })} /></Field>
            <Field label="Button link"><Input value={f.linkUrl} onChange={(ev) => set({ ...f, linkUrl: ev.target.value })} placeholder="/sessions" /></Field>
            <Field label="Show from" hint="Optional"><Input type="datetime-local" value={f.startsAt} onChange={(ev) => set({ ...f, startsAt: ev.target.value })} /></Field>
            <Field label="Show until" hint="Optional"><Input type="datetime-local" value={f.endsAt} onChange={(ev) => set({ ...f, endsAt: ev.target.value })} /></Field>
          </div>
          <Field label="Background image" hint="Optional"><MediaPicker mode="id" value={f.imageMediaId} onChange={(id) => set({ ...f, imageMediaId: id })} /></Field>
          <PublishedSwitch label="Active" checked={f.isActive} onChange={(v) => set({ ...f, isActive: v })} />
        </>
      )}
    />
  )
}

function PublishedSwitch({ checked, onChange, label = "Published" }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-3">
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
