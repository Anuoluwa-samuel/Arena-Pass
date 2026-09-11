import { PageHeader } from "@/components/shared/page-header"
import { FaqsEditor } from "@/components/admin/cms-collections"
import { requirePermission } from "@/server/auth/rbac"
import { resolveArenaId } from "@/server/http/admin"
import { listFaqs } from "@/server/services/cms"

export const metadata = { title: "Content · FAQs" }

export default async function FaqsContentPage() {
  const user = await requirePermission("cms.view")
  const items = await listFaqs(await resolveArenaId(user))
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Content" title="FAQs" description="Reorder with the arrows; hidden FAQs stay saved but are not shown on the site." />
      <FaqsEditor items={items} canManage={user.permissions.includes("cms.manage")} />
    </div>
  )
}
