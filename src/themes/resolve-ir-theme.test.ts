import { afterEach, describe, expect, it } from "vitest"
import { __resetRegisteredThemes, THEME_DEFINITIONS } from "./definitions"
import { registerTestTheme } from "./test-fixtures"
import { resolveBoundTheme, resolveBoundThemeResult, resolveIrTheme } from "./resolve-ir-theme"

afterEach(() => {
  __resetRegisteredThemes()
})

const ir = (id: string) => ({ theme: { id } })

describe("resolveIrTheme", () => {
  it("hands back the supplied definition, untouched, when it answers to the bound id", () => {
    const recolored = {
      ...THEME_DEFINITIONS.brief,
      style: { ...THEME_DEFINITIONS.brief.style, colors: { ...THEME_DEFINITIONS.brief.style.colors, primary: "#123456" } },
    }
    expect(resolveIrTheme(ir("brief"), recolored)).toBe(recolored)
    expect(resolveIrTheme(ir("brief"), recolored).style.colors.primary).toBe("#123456")
  })

  it("refuses a definition bound to a different id rather than drawing the wrong theme", () => {
    expect(() => resolveIrTheme(ir("brief"), THEME_DEFINITIONS.ledger)).toThrow(
      /deck binds theme "brief" but the supplied theme definition is "ledger"/,
    )
  })

  it("looks a built-in id up when no definition is supplied", () => {
    expect(resolveIrTheme(ir("ledger"))).toBe(THEME_DEFINITIONS.ledger)
  })

  it("sees a theme installed through the SDK seam", () => {
    const id = registerTestTheme("resolve-ir-theme-registered", "ledger")
    expect(resolveIrTheme(ir(id)).id).toBe(id)
  })

  it("rejects an id that names no installed theme, listing what is installed", () => {
    expect(() => resolveBoundTheme("nonesuch")).toThrow(/unknown theme "nonesuch"\. Themes available: almanac/)
  })
})

describe("resolveBoundThemeResult", () => {
  it("reports a mismatch as data, naming the definition that was passed", () => {
    expect(resolveBoundThemeResult("brief", THEME_DEFINITIONS.ledger)).toEqual({
      ok: false,
      reason: "mismatch",
      suppliedId: "ledger",
    })
  })

  it("reports an unknown id as data, with the installed list a validator can print", () => {
    const result = resolveBoundThemeResult("nonesuch")
    expect(result.ok).toBe(false)
    if (result.ok || result.reason !== "unknown") throw new Error("expected an unknown-id result")
    expect(result.installed).toContain("brief")
  })
})
