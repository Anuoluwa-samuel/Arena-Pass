import { Suspense } from "react"
import { PageHeader } from "@/components/shared/page-header"
import { AdministratorsTable } from "@/components/admin/administrators-table"
import { FilterTabs, Pagination, SearchBox } from "@/components/admin/list-toolbar"
import { requirePermission } from "@/server/auth/rbac"
import { listUsers } from "@/server/services/users"
import { ROLE_KEYS, ROLE_LABELS } from "@/lib/domain/constants"

export const metadata = { title: "Administrators" }

export default async function AdministratorsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requirePermission("users.view")
  const sp = await searchParams
  const result = await listUsers({ q: sp.q, roleKey: sp.roleKey, page: Number(sp.page ?? 1), pageSize: 25 })
  return (
    <div className="space-y-6">
      <PageHeader title="Administrators" description="Staff accounts and their roles. Role changes and deactivations take effect immediately." />
      <Suspense>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <FilterTabs param="roleKey" options={[{ value: "all", label: "All roles" }, ...ROLE_KEYS.map((k) => ({ value: k, label: ROLE_LABELS[k] }))]} />
          <SearchBox placeholder="Name or email" className="md:w-72" />
        </div>
      </Suspense>
      <AdministratorsTable
        users={result.items.map((u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, isActive: u.isActive, lastLoginAt: u.lastLoginAt?.toISOString() ?? null, createdAt: u.createdAt.toISOString(), twoFactorEnabled: u.twoFactorEnabled, role: u.role }))}
        me={{ id: user.id, roleKey: user.roleKey }}
        canManage={user.permissions.includes("users.manage")}
      />
      <Suspense><Pagination page={result.meta.page} totalPages={result.meta.totalPages} total={result.meta.total} pageSize={result.meta.pageSize} /></Suspense>
    </div>
  )
}
