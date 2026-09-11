import { PageHeader } from "@/components/shared/page-header"
import { BannersEditor } from "@/components/admin/cms-collections"
import { requirePermission } from "@/server/auth/rbac"
import { resolveArenaId } from "@/server/http/admin"
import { listBanners } from "@/server/services/cms"

export const metadata = { title: "Content · Banners" }

export default async function BannersContentPage() {
  const user = await requirePermission("cms.view")
  const rows = await listBanners(await resolveArenaId(user))
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Content" title="Banners" description="The first active banner is shown on the homepage. Schedule them with start and end dates." />
      <BannersEditor items={rows.map((r) => r.banner)} canManage={user.permissions.includes("cms.manage")} />
    </div>
  )
}
