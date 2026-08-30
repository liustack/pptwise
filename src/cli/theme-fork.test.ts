// @vitest-environment node
import { describe, expect, it } from "vitest"
import { installNodePlatform } from "@/platform/node"
import { deriveMuted } from "../themes/extract/brand-extract"
import { forkTheme } from "./theme-fork"
import { materializeBuiltinTheme, menusEqual } from "./theme-resolve"

installNodePlatform()

describe("forkTheme", () => {
  const source = materializeBuiltinTheme("consulting", { id: "acme", label: "Acme" })

  it("keeps the menu byte-identical", () => {
    const forked = forkTheme(source, { primary: "#0B5FFF" }, { id: "acme-blue", label: "Acme Blue" })
    expect(menusEqual(source.menu, forked.menu)).toBe(true)
    expect(forked.menu).toEqual(source.menu)
  })

  it("rederives muted with deriveMuted", () => {
    const forked = forkTheme(
      source,
      { primary: "#0B5FFF", bg: "#F7F6F2", text: "#1C1E23", surface: "#FFFFFF" },
      { id: "acme-blue" },
    )
    expect(forked.style.colors.muted).toBe(
      deriveMuted(forked.style.colors.text, forked.style.colors.bg, forked.style.colors.surface),
    )
  })

  it("consulting chapter bg follows the new primary", () => {
    expect(source.style.defaultBackgrounds.chapter).toEqual({
      kind: "color",
      value: source.style.colors.primary,
    })
    const forked = forkTheme(source, { primary: "#0B5FFF" }, { id: "acme-blue" })
    expect(forked.style.defaultBackgrounds.chapter).toEqual({ kind: "color", value: "#0B5FFF" })
    expect(forked.style.colors.primary).toBe("#0B5FFF")
  })

  it("writes version 2 with no base", () => {
    const forked = forkTheme(source, { primary: "#0B5FFF" }, { id: "acme-blue" })
    expect(forked.version).toBe(2)
    expect(forked).not.toHaveProperty("base")
    expect(forked.style.id).toBe("acme-blue")
    expect(forked.id).toBe("acme-blue")
  })

  it("throws when the rederived tokens fail the contrast floor", () => {
    expect(() =>
      forkTheme(
        source,
        { primary: "#FFFFFF", bg: "#FFFFFF", text: "#F0F0F0", surface: "#FFFFFF" },
        { id: "acme-wash" },
      ),
    ).toThrow(/contrast ratio/)
  })
})
