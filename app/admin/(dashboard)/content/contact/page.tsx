import { PageHeader } from "@/components/shared/page-header"
import { ContactEditor } from "@/components/admin/cms-forms"
import { requirePermission } from "@/server/auth/rbac"
import { resolveArenaId } from "@/server/http/admin"
import { getPage } from "@/server/services/cms"

export const metadata = { title: "Content · contact" }

export default async function ContactEditorPage() {
  const user = await requirePermission("cms.view")
  const page = await getPage(await resolveArenaId(user), "contact")
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Content" title="Contact information" description="Edit the draft, preview, then publish. Autosave keeps your work safe." />
      <ContactEditor draft={page.draft} meta={{ hasUnpublishedChanges: page.hasUnpublishedChanges, publishedAt: page.publishedAt?.toISOString() ?? null, canManage: user.permissions.includes("cms.manage") }} />
    </div>
  )
}
