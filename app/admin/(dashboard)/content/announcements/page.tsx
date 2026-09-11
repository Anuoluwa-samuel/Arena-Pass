import { PageHeader } from "@/components/shared/page-header"
import { AnnouncementsEditor } from "@/components/admin/cms-collections"
import { requirePermission } from "@/server/auth/rbac"
import { resolveArenaId } from "@/server/http/admin"
import { listAnnouncements } from "@/server/services/cms"

export const metadata = { title: "Content · Announcements" }

export default async function AnnouncementsContentPage() {
  const user = await requirePermission("cms.view")
  const { items } = await listAnnouncements(await resolveArenaId(user), { pageSize: 100 })
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Content" title="Announcements" description="Published announcements within their dates appear as a strip at the top of the homepage." />
      <AnnouncementsEditor items={items.map((a) => ({ ...a, isActive: a.status === "PUBLISHED" }))} canManage={user.permissions.includes("cms.manage")} />
    </div>
  )
}
