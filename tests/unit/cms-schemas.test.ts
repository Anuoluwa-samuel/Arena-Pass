import { describe, it, expect } from "vitest"
import { aboutSchema, homepageSchema, imageUrlSchema } from "@/lib/cms/schemas"

const hero = {
  badge: "Now booking",
  title: "Secure Your Spot.",
  highlight: "Play the Game.",
  description: "Book football sessions with ease.",
  primaryCta: { label: "View Sessions", href: "/sessions" },
  secondaryCta: { label: "Create Account", href: "/signup" },
}
const homepage = (imageUrl: string | null) => ({
  hero: { ...hero, imageUrl },
  howItWorks: { title: "How it works", subtitle: "", steps: [{ title: "Pick", description: "", icon: "star" }] },
  cta: { title: "Ready?", description: "", buttonLabel: "Go", buttonHref: "/sessions" },
  featuredSessionsCount: 3,
})

describe("imageUrlSchema", () => {
  it("accepts media-library uploads (same-site relative paths)", () => {
    expect(imageUrlSchema.parse("/api/media/files/content/2026/09/hero.png")).toBe("/api/media/files/content/2026/09/hero.png")
  })
  it("accepts external http(s) links and null", () => {
    expect(imageUrlSchema.parse("https://cdn.example.com/hero.jpg")).toBe("https://cdn.example.com/hero.jpg")
    expect(imageUrlSchema.parse("http://example.com/a.webp")).toBe("http://example.com/a.webp")
    expect(imageUrlSchema.parse(null)).toBeNull()
  })
  it.each([
    ["javascript: URL", "javascript:alert(1)"],
    ["data: URL", "data:image/png;base64,AAAA"],
    ["protocol-relative", "//evil.example/x.png"],
    ["backslash trick", "/\\evil.example/x.png"],
    ["other protocol", "ftp://example.com/x.png"],
    ["bare words", "not a url"],
    ["empty", ""],
  ])("rejects %s", (_label, value) => {
    expect(imageUrlSchema.safeParse(value).success).toBe(false)
  })
})

describe("CMS page schemas with uploaded images", () => {
  it("homepage hero saves with an uploaded image (regression: was rejected by .url())", () => {
    const result = homepageSchema.safeParse(homepage("/api/media/files/content/hero.png"))
    expect(result.success).toBe(true)
  })
  it("reports the hero image path so the editor can highlight it", () => {
    const result = homepageSchema.safeParse(homepage("javascript:alert(1)"))
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((i) => i.path.join("."))).toContain("hero.imageUrl")
  })
  it("about page saves with an uploaded image", () => {
    const result = aboutSchema.safeParse({ title: "About", description: "", mission: "", vision: "", imageUrl: "/api/media/files/content/team.jpg" })
    expect(result.success).toBe(true)
  })
})
