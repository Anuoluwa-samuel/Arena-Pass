"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { CmsPageEditor, Field } from "./cms-page-editor"
import type { ServicesPageContent } from "@/lib/cms/schemas"

export function ServicesHeadingEditor({ draft, meta }: { draft: ServicesPageContent; meta: { hasUnpublishedChanges: boolean; publishedAt: string | null; canManage: boolean } }) {
  return (
    <CmsPageEditor slug="services" initialDraft={draft} previewHref="/about" {...meta}>
      {(d, set, e) => (
        <Card>
          <CardHeader><CardTitle className="text-base">Section heading</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" error={e.title}><Input value={d.title} onChange={(ev) => set({ ...d, title: ev.target.value })} /></Field>
            <Field label="Subtitle" error={e.subtitle}><Input value={d.subtitle} onChange={(ev) => set({ ...d, subtitle: ev.target.value })} /></Field>
          </CardContent>
        </Card>
      )}
    </CmsPageEditor>
  )
}
