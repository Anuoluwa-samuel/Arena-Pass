import { PageHeader } from "@/components/shared/page-header"
import { ServicesEditor } from "@/components/admin/cms-collections"
import { ServicesHeadingEditor } from "@/components/admin/services-heading-editor"
import { requirePermission } from "@/server/auth/rbac"
import { resolveArenaId } from "@/server/http/admin"
import { getPage, listServices } from "@/server/services/cms"

export const metadata = { title: "Content · Services" }

export default async function ServicesContentPage() {
  const user = await requirePermission("cms.view")
  const arenaId = await resolveArenaId(user)
  const [page, items] = await Promise.all([getPage(arenaId, "services"), listServices(arenaId)])
  const canManage = user.permissions.includes("cms.manage")
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Content" title="Services" description="The section heading is a draft/publish page; the list below goes live as soon as you save." />
      <ServicesHeadingEditor draft={page.draft} meta={{ hasUnpublishedChanges: page.hasUnpublishedChanges, publishedAt: page.publishedAt?.toISOString() ?? null, canManage }} />
      <ServicesEditor items={items} canManage={canManage} />
    </div>
  )
}
