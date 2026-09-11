import { Suspense } from "react"
import { redirect } from "next/navigation"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminHeader } from "@/components/admin/admin-header"
import { getCurrentUser } from "@/server/auth/session"
import { getSettings } from "@/server/services/settings"

export const dynamic = "force-dynamic"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect("/admin/login")
  const settings = await getSettings(user.arenaId)
  return (
    <SidebarProvider>
      <Suspense>
        <AdminSidebar permissions={user.permissions} siteName={settings.siteName} />
      </Suspense>
      <SidebarInset className="min-w-0">
        <AdminHeader user={{ name: user.name, email: user.email, roleName: user.roleName }} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
