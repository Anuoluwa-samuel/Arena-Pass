import { test, expect } from "@playwright/test"

/** Admin journey: sign in → create session with custom capacity → publish → see it on the public site. */
test("admin creates, configures and publishes a session", async ({ page }) => {
  await page.goto("/admin/login")
  await page.fill("#email", "admin@arenapass.local")
  await page.fill("#password", "ChangeMe123!")
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByText("Today's sales")).toBeVisible()

  await page.goto("/admin/sessions/new")
  const title = `E2E Session ${Date.now()}`
  const start = new Date(Date.now() + 3 * 86_400_000)
  start.setHours(18, 0, 0, 0)
  const local = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
  await page.fill("#title", title)
  await page.fill("#venue", "E2E Pitch")
  await page.fill("#startsAt", local(start))
  await page.fill("#endsAt", local(new Date(start.getTime() + 2 * 3_600_000)))
  await page.fill("#bookingOpensAt", local(new Date(Date.now() - 60_000)))
  await page.fill("#bookingDeadline", local(new Date(start.getTime() - 3_600_000)))
  await page.fill("#teamsCount", "6")
  await page.fill("#playersPerTeam", "3")
  await expect(page.locator("p", { hasText: "players" }).filter({ hasText: /^18\s/ })).toBeVisible() // computed capacity
  await page.fill("#price", "2500")
  await page.getByRole("button", { name: "Publish session" }).click()

  await expect(page).toHaveURL(/\/admin\/sessions\/[0-9a-f-]+$/)
  await expect(page.getByRole("heading", { name: title })).toBeVisible()
  await expect(page.getByText("0/18")).toBeVisible()

  await page.goto("/sessions")
  await expect(page.getByText(title)).toBeVisible()
  await expect(page.getByText("6 teams × 3 players")).toBeVisible()
})

test("staff role cannot open finance pages", async ({ page }) => {
  await page.goto("/admin/login")
  await page.fill("#email", "sam.staff@arenapass.local")
  await page.fill("#password", "ChangeMe123!")
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole("link", { name: "Payments" })).toHaveCount(0)
  const res = await page.request.get("/api/admin/payments")
  expect(res.status()).toBe(403)
  const body = await res.json()
  expect(body.code).toBe("FORBIDDEN")
})
