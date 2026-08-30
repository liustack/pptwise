import { describe, it, expect } from "vitest"
import { parsePptxIR } from "../ir"
import { resolveStyle, THEME_STYLES } from "./index"
import { validateIr } from "../api"

describe("IR theme.style overlay is rejected", () => {
  it("theme.style is an extra key", () => {
    const r = parsePptxIR({
      version: "5",
      filename: "t.pptx",
      theme: { id: "consulting", style: { colors: { text: "#fff" } } },
      slides: [{ type: "cover", heading: "Hello Tokens" }],
    })
    expect(r.success).toBe(false)
  })

  it("validateIr rejects the overlay as an unknown key", () => {
    const v = validateIr({
      version: "5",
      filename: "t.pptx",
      theme: { id: "consulting", style: { colors: { text: "#fff" } } },
      slides: [{ type: "cover", heading: "Hello Tokens" }],
    })
    expect(v.ok).toBe(false)
    expect(v.errors.some((e) => e.message.includes('Unrecognized key: "style"'))).toBe(true)
  })

  it("resolveStyle returns builtin tokens and takes only the theme id", () => {
    expect(resolveStyle.length).toBe(1)
    expect(resolveStyle("consulting")).toBe(THEME_STYLES.consulting)
  })
})
