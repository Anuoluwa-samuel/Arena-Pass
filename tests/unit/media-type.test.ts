import { describe, it, expect } from "vitest"
import { detectImageType } from "@/server/services/media"

const bytes = (...parts: Array<number[] | string>) =>
  Buffer.concat(parts.map((p) => (typeof p === "string" ? Buffer.from(p, "latin1") : Buffer.from(p))))

describe("upload type sniffing", () => {
  it("recognises the raster formats by their bytes", () => {
    expect(detectImageType(bytes([0xff, 0xd8, 0xff, 0xe0], "rest"))).toBe("image/jpeg")
    expect(detectImageType(bytes([0x89], "PNG\r\n\x1a\n", "rest"))).toBe("image/png")
    expect(detectImageType(bytes("GIF89a", "rest"))).toBe("image/gif")
    expect(detectImageType(bytes("RIFF", [0, 0, 0, 0], "WEBPVP8 "))).toBe("image/webp")
  })

  it("refuses SVG, which can carry script, however it is dressed up", () => {
    expect(detectImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'))).toBeNull()
    expect(detectImageType(Buffer.from('<?xml version="1.0"?><svg><foreignObject/></svg>'))).toBeNull()
  })

  it("does not take any RIFF file for a WebP", () => {
    expect(detectImageType(bytes("RIFF", [0, 0, 0, 0], "WAVEfmt "))).toBeNull()
    expect(detectImageType(bytes("RIFF", [0, 0, 0, 0], "AVI LIST"))).toBeNull()
  })

  it("refuses a PNG signature cut short", () => {
    expect(detectImageType(bytes([0x89], "PNG"))).toBeNull()
  })
})
