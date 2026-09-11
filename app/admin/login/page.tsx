import { Suspense } from "react"
import { redirect } from "next/navigation"
import { AdminLoginForm } from "@/components/admin/admin-login-form"
import { getCurrentUser } from "@/server/auth/session"

export const dynamic = "force-dynamic"
export const metadata = { title: "Admin sign in" }

export default async function AdminLoginPage() {
  if (await getCurrentUser()) redirect("/admin")
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  )
}
