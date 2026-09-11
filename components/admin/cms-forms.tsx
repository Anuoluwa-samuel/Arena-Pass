"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"
import { CMS_ICON_NAMES, CmsIcon } from "@/components/site/cms-icon"
import { CmsPageEditor, Field } from "./cms-page-editor"
import { MediaPicker } from "./media-picker"
import type { AboutContent, ContactContent, HomepageContent } from "@/lib/cms/schemas"

type Meta = { hasUnpublishedChanges: boolean; publishedAt: string | null; canManage: boolean }

export function HomepageEditor({ draft, meta }: { draft: HomepageContent; meta: Meta }) {
  return (
    <CmsPageEditor slug="homepage" initialDraft={draft} previewHref="/" {...meta}>
      {(d, set, errors) => (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Hero</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Badge" hint="Small pill above the title" error={errors["hero.badge"]}><Input value={d.hero.badge} onChange={(e) => set({ ...d, hero: { ...d.hero, badge: e.target.value } })} /></Field>
              <div />
              <Field label="Title" error={errors["hero.title"]}><Input value={d.hero.title} onChange={(e) => set({ ...d, hero: { ...d.hero, title: e.target.value } })} /></Field>
              <Field label="Highlighted line" hint="Rendered in green" error={errors["hero.highlight"]}><Input value={d.hero.highlight} onChange={(e) => set({ ...d, hero: { ...d.hero, highlight: e.target.value } })} /></Field>
              <Field label="Description" className="sm:col-span-2" error={errors["hero.description"]}><Textarea rows={3} value={d.hero.description} onChange={(e) => set({ ...d, hero: { ...d.hero, description: e.target.value } })} /></Field>
              <Field label="Primary button label"><Input value={d.hero.primaryCta.label} onChange={(e) => set({ ...d, hero: { ...d.hero, primaryCta: { ...d.hero.primaryCta, label: e.target.value } } })} /></Field>
              <Field label="Primary button link"><Input value={d.hero.primaryCta.href} onChange={(e) => set({ ...d, hero: { ...d.hero, primaryCta: { ...d.hero.primaryCta, href: e.target.value } } })} /></Field>
              <Field label="Secondary button label"><Input value={d.hero.secondaryCta.label} onChange={(e) => set({ ...d, hero: { ...d.hero, secondaryCta: { ...d.hero.secondaryCta, label: e.target.value } } })} /></Field>
              <Field label="Secondary button link"><Input value={d.hero.secondaryCta.href} onChange={(e) => set({ ...d, hero: { ...d.hero, secondaryCta: { ...d.hero.secondaryCta, href: e.target.value } } })} /></Field>
              <Field label="Hero image" hint="Optional" className="sm:col-span-2"><MediaPicker value={d.hero.imageUrl} onChange={(url) => set({ ...d, hero: { ...d.hero, imageUrl: url } })} /></Field>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Featured sessions</CardTitle></CardHeader>
            <CardContent>
              <Field label="How many upcoming sessions to feature" hint="0 hides the section"><Input type="number" min={0} max={12} value={d.featuredSessionsCount} onChange={(e) => set({ ...d, featuredSessionsCount: Number(e.target.value) })} className="w-32" /></Field>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">How it works</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Title"><Input value={d.howItWorks.title} onChange={(e) => set({ ...d, howItWorks: { ...d.howItWorks, title: e.target.value } })} /></Field>
                <Field label="Subtitle"><Input value={d.howItWorks.subtitle} onChange={(e) => set({ ...d, howItWorks: { ...d.howItWorks, subtitle: e.target.value } })} /></Field>
              </div>
              <div className="space-y-3">
                {d.howItWorks.steps.map((step, i) => (
                  <div key={i} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[120px_1fr_2fr_auto]">
                    <IconSelect value={step.icon} onChange={(icon) => set({ ...d, howItWorks: { ...d.howItWorks, steps: d.howItWorks.steps.map((s, j) => (j === i ? { ...s, icon } : s)) } })} />
                    <Input value={step.title} placeholder="Step title" onChange={(e) => set({ ...d, howItWorks: { ...d.howItWorks, steps: d.howItWorks.steps.map((s, j) => (j === i ? { ...s, title: e.target.value } : s)) } })} />
                    <Input value={step.description} placeholder="Description" onChange={(e) => set({ ...d, howItWorks: { ...d.howItWorks, steps: d.howItWorks.steps.map((s, j) => (j === i ? { ...s, description: e.target.value } : s)) } })} />
                    <Button type="button" variant="ghost" size="icon-sm" disabled={d.howItWorks.steps.length <= 1} onClick={() => set({ ...d, howItWorks: { ...d.howItWorks, steps: d.howItWorks.steps.filter((_, j) => j !== i) } })} aria-label="Remove step"><Trash2 className="size-4" /></Button>
                  </div>
                ))}
                {d.howItWorks.steps.length < 6 && <Button type="button" variant="outline" size="sm" onClick={() => set({ ...d, howItWorks: { ...d.howItWorks, steps: [...d.howItWorks.steps, { title: "", description: "", icon: "star" }] } })}><Plus className="mr-1.5 size-4" />Add step</Button>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Call to action</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Title"><Input value={d.cta.title} onChange={(e) => set({ ...d, cta: { ...d.cta, title: e.target.value } })} /></Field>
              <Field label="Description"><Input value={d.cta.description} onChange={(e) => set({ ...d, cta: { ...d.cta, description: e.target.value } })} /></Field>
              <Field label="Button label"><Input value={d.cta.buttonLabel} onChange={(e) => set({ ...d, cta: { ...d.cta, buttonLabel: e.target.value } })} /></Field>
              <Field label="Button link"><Input value={d.cta.buttonHref} onChange={(e) => set({ ...d, cta: { ...d.cta, buttonHref: e.target.value } })} /></Field>
            </CardContent>
          </Card>
        </>
      )}
    </CmsPageEditor>
  )
}

export function AboutEditor({ draft, meta }: { draft: AboutContent; meta: Meta }) {
  return (
    <CmsPageEditor slug="about" initialDraft={draft} previewHref="/about" {...meta}>
      {(d, set, errors) => (
        <Card>
          <CardHeader><CardTitle className="text-base">About page</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Title" error={errors.title}><Input value={d.title} onChange={(e) => set({ ...d, title: e.target.value })} /></Field>
            <Field label="Description" hint="Paragraphs are preserved" error={errors.description}><Textarea rows={8} value={d.description} onChange={(e) => set({ ...d, description: e.target.value })} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mission" error={errors.mission}><Textarea rows={3} value={d.mission} onChange={(e) => set({ ...d, mission: e.target.value })} /></Field>
              <Field label="Vision" error={errors.vision}><Textarea rows={3} value={d.vision} onChange={(e) => set({ ...d, vision: e.target.value })} /></Field>
            </div>
            <Field label="Image" hint="Optional"><MediaPicker value={d.imageUrl} onChange={(url) => set({ ...d, imageUrl: url })} /></Field>
          </CardContent>
        </Card>
      )}
    </CmsPageEditor>
  )
}

export function ContactEditor({ draft, meta }: { draft: ContactContent; meta: Meta }) {
  return (
    <CmsPageEditor slug="contact" initialDraft={draft} previewHref="/contact" {...meta}>
      {(d, set, errors) => (
        <Card>
          <CardHeader><CardTitle className="text-base">Contact information</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" error={errors.email}><Input type="email" value={d.email} onChange={(e) => set({ ...d, email: e.target.value })} /></Field>
            <Field label="Phone" error={errors.phone}><Input value={d.phone} onChange={(e) => set({ ...d, phone: e.target.value })} /></Field>
            <Field label="WhatsApp number" error={errors.whatsapp}><Input value={d.whatsapp} onChange={(e) => set({ ...d, whatsapp: e.target.value })} /></Field>
            <Field label="Address" error={errors.address}><Input value={d.address} onChange={(e) => set({ ...d, address: e.target.value })} /></Field>
            <Field label="Instagram" hint="@handle or URL"><Input value={d.instagram} onChange={(e) => set({ ...d, instagram: e.target.value })} /></Field>
            <Field label="X / Twitter" hint="@handle or URL"><Input value={d.twitter} onChange={(e) => set({ ...d, twitter: e.target.value })} /></Field>
            <Field label="Google Maps embed URL" hint="Optional" className="sm:col-span-2"><Input value={d.mapUrl} onChange={(e) => set({ ...d, mapUrl: e.target.value })} placeholder="https://www.google.com/maps/embed?pb=…" /></Field>
          </CardContent>
        </Card>
      )}
    </CmsPageEditor>
  )
}

export function IconSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        {CMS_ICON_NAMES.map((n) => (
          <SelectItem key={n} value={n}><span className="inline-flex items-center gap-2"><CmsIcon name={n} className="size-4" />{n}</span></SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
