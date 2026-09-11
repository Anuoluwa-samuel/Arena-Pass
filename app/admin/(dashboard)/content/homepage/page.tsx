import { PageHeader } from "@/components/shared/page-header"
import { HomepageEditor } from "@/components/admin/cms-forms"
import { requirePermission } from "@/server/auth/rbac"
import { resolveArenaId } from "@/server/http/admin"
import { getPage } from "@/server/services/cms"

export const metadata = { title: "Content · homepage" }

export default async function HomepageEditorPage() {
  const user = await requirePermission("cms.view")
  const page = await getPage(await resolveArenaId(user), "homepage")
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Content" title="Homepage" description="Edit the draft, preview, then publish. Autosave keeps your work safe." />
      <HomepageEditor draft={page.draft} meta={{ hasUnpublishedChanges: page.hasUnpublishedChanges, publishedAt: page.publishedAt?.toISOString() ?? null, canManage: user.permissions.includes("cms.manage") }} />
    </div>
  )
}
