import { PageHeader } from "@/components/shared/page-header"
import { AboutEditor } from "@/components/admin/cms-forms"
import { requirePermission } from "@/server/auth/rbac"
import { resolveArenaId } from "@/server/http/admin"
import { getPage } from "@/server/services/cms"

export const metadata = { title: "Content · about" }

export default async function AboutEditorPage() {
  const user = await requirePermission("cms.view")
  const page = await getPage(await resolveArenaId(user), "about")
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Content" title="About page" description="Edit the draft, preview, then publish. Autosave keeps your work safe." />
      <AboutEditor draft={page.draft} meta={{ hasUnpublishedChanges: page.hasUnpublishedChanges, publishedAt: page.publishedAt?.toISOString() ?? null, canManage: user.permissions.includes("cms.manage") }} />
    </div>
  )
}
