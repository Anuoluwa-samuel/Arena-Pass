import { ok } from "@/server/http/response"
import { adminRoute } from "@/server/http/admin"
import { dispatch } from "@/server/services/notifications"

export const POST = adminRoute("notifications.manage", async (_req, { params }) => {
  const { id } = await params
  return ok(await dispatch(id), { message: "Retried" })
})
