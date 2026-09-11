import { chromium } from "@playwright/test"
const [,, ...args] = process.argv
const out = "/private/tmp/claude-501/-Users-mac-Downloads-play-pass-e-ticketing-ui/8c4039de-d0aa-4945-9560-279d4a745a54/scratchpad/shots"
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: args.includes("--mobile") ? 390 : 1360, height: args.includes("--mobile") ? 844 : 900 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
const errors = []
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()) })
page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message))
if (args.includes("--admin")) {
  await page.goto("http://localhost:4000/admin/login", { waitUntil: "networkidle" })
  await page.fill("#email", "admin@arenapass.local"); await page.fill("#password", "ChangeMe123!")
  await page.click("button[type=submit]"); await page.waitForURL(/\/admin(?!\/login)/, { timeout: 60000 })
}
for (const url of args.filter((a) => a.startsWith("/"))) {
  await page.goto("http://localhost:4000" + url, { waitUntil: "networkidle", timeout: 120000 })
  await page.waitForTimeout(1200)
  const name = (url.replace(/[^a-z0-9]+/gi, "_") || "home") + (args.includes("--mobile") ? "_m" : "")
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: !args.includes("--fold") })
  console.log("shot", name, page.url())
}
if (errors.length) console.log("CONSOLE ERRORS:\n" + errors.slice(0, 15).join("\n"))
await browser.close()
