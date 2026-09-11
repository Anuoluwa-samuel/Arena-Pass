import "server-only"
import type { Permission } from "@/lib/domain/constants"
import { forbidden, unauthorized } from "@/server/http/errors"
import { getCurrentUser, getCurrentCustomer, type AuthenticatedUser, type AuthenticatedCustomer } from "./session"

export function hasPermission(user: Pick<AuthenticatedUser, "permissions"> | null | undefined, permission: Permission) {
  return !!user && user.permissions.includes(permission)
}

/** Throws UNAUTHORIZED when no admin session exists. */
export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser()
  if (!user) throw unauthorized()
  return user
}

/** Throws UNAUTHORIZED / FORBIDDEN. Every admin route handler starts here. */
export async function requirePermission(...permissions: Permission[]): Promise<AuthenticatedUser> {
  const user = await requireUser()
  for (const p of permissions) {
    if (!user.permissions.includes(p)) throw forbidden()
  }
  return user
}

export async function requireCustomer(): Promise<AuthenticatedCustomer> {
  const customer = await getCurrentCustomer()
  if (!customer) throw unauthorized("Please sign in to continue")
  return customer
}
