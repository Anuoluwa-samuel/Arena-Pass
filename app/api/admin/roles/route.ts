import { ok } from "@/server/http/response"
import { adminRoute } from "@/server/http/admin"
import { listRolesWithPermissions } from "@/server/services/users"
import { PERMISSIONS } from "@/lib/domain/constants"

export const GET = adminRoute(["users.view"], async () => ok({ roles: await listRolesWithPermissions(), permissions: PERMISSIONS }))
