import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { BUILTIN_THEME_FILES, CANONICAL_THEME_IDS, THEME_STYLES, resolveThemeId } from "./index"
import {
  __resetRegisteredThemes,
  assertContrastFloor,
  getInstalledThemeIds,
  getThemeDefinition,
  registerTheme,
  resolveBrand,
  THEME_DEFINITIONS,
} from "./definitions"
import { THEME_OCCASIONS } from "./occasions"
import { COVER_LAYOUTS } from "../layouts/index-cover"
import { CHAPTER_LAYOUTS } from "../layouts/index-chapter"
import { ENDING_LAYOUTS } from "../layouts/index-ending"
import { MOTIFS } from "../motifs"
import { LAYOUT_REGISTRY, type LayoutDefinition } from "../layouts/registry"
import { hasExactWidthTable, resolveFontFace } from "../render/fonts"
import type { BuiltinThemeDeclaration, Menu, ThemeFile } from "./schema"

// Wide string-indexed views over the four page-type registries: a theme's
// menu face ids are plain strings, so a narrow Record type cannot index them.
const COVER_REGISTRY: Record<string, unknown> = COVER_LAYOUTS
const CHAPTER_REGISTRY: Record<string, unknown> = CHAPTER_LAYOUTS
const ENDING_REGISTRY: Record<string, unknown> = ENDING_LAYOUTS

/**
 * The human-audited board table (S1-B): each theme's three boundary faces.
 * Written by hand, never derived from the declarations it checks, so a menu
 * edit has to be re-审 here instead of passing silently.
 */
const BOARD: Record<string, { cover: string; chapter: string; ending: string }> = {
  consulting: { cover: "gauge-verdict", chapter: "gauge-section", ending: "gauge-next" },
  enterprise: { cover: "ikb-field-cover", chapter: "block-numeral-chapter", ending: "signoff-ending" },
  academic: { cover: "thesis-plate-cover", chapter: "folio-ghost-chapter", ending: "defense-close-ending" },
  insight: { cover: "stat-cover", chapter: "ghost-section-chapter", ending: "close-word-ending" },
  campaign: { cover: "poster-center", chapter: "act-chapter", ending: "pill-cta-ending" },
  classroom: { cover: "chalk-band-cover", chapter: "lesson-box-chapter", ending: "homework-close-ending" },
  ink: { cover: "vertical-title-cover", chapter: "volume-slip-chapter", ending: "seal-close-ending" },
  tech: { cover: "type-rule-cover", chapter: "stroke-index-chapter", ending: "rule-close-ending" },
  runway: { cover: "show-headline", chapter: "show-plate", ending: "show-finale" },
  journal: { cover: "issue-head-cover", chapter: "fascicle-ghost-chapter", ending: "afterword-ending" },
  luxe: { cover: "invitation-plate-cover", chapter: "gilt-ordinal-chapter", ending: "gilt-word-ending" },
  heritage: { cover: "double-frame-cover", chapter: "mirror-volume-chapter", ending: "invite-field-ending" },
  pulse: { cover: "report-open-cover", chapter: "subject-rule-chapter", ending: "care-plan-ending" },
  terra: { cover: "pledge-open-cover", chapter: "field-band-chapter", ending: "scorecard-ending" },
  ember: { cover: "corner-wedge", chapter: "ember-index-chapter", ending: "ask-ending" },
  vermilion: { cover: "red-head-cover", chapter: "seal-numeral-chapter", ending: "deliberation-ending" },
  crayon: { cover: "crayonbox-open", chapter: "crayonbox-sticker", ending: "crayonbox-todo" },
  arena: { cover: "cut-panel-cover", chapter: "round-mark-chapter", ending: "seat-cta-ending" },
  museum: { cover: "poster-center", chapter: "hall-label-chapter", ending: "exit-word-ending" },
  stage: { cover: "poster-center", chapter: "one-word-chapter", ending: "release-close-ending" },
  lecture: { cover: "board-head", chapter: "chalk-rule-chapter", ending: "next-lecture-ending" },
  swiss: { cover: "institutional-block", chapter: "decimal-index-chapter", ending: "resolution-ending" },
  memo: { cover: "memo-head", chapter: "issue-line-chapter", ending: "decision-close-ending" },
  playbill: { cover: "bill-head", chapter: "day-bill-chapter", ending: "ticket-cta-ending" },
}

describe("THEME_DEFINITIONS", () => {
  it("covers all 24 canonical ids with theme tokens and brand", () => {
    for (const id of CANONICAL_THEME_IDS) {
      const def = THEME_DEFINITIONS[id]
      expect(def.id).toBe(id)
      expect(def.style).toBe(THEME_STYLES[id])
      expect(def.brand).toBeDefined()
      expect(Array.isArray(def.tags)).toBe(true)
    }
  })

  it("compiles every built-in from its colocated v2 menu declaration without structural drift", () => {
    expect(Object.keys(BUILTIN_THEME_FILES)).toEqual([...CANONICAL_THEME_IDS])
    for (const id of CANONICAL_THEME_IDS) {
      const file: BuiltinThemeDeclaration = BUILTIN_THEME_FILES[id]
      const def = THEME_DEFINITIONS[id]

      expect(file.version, id).toBe(2)
      expect(file.id, id).toBe(id)
      expect(file.style.id, id).toBe(id)
      expect(def.label, id).toBe(file.label)
      expect(def.style, id).toBe(file.style)
      expect(def.menu, id).toBe(file.menu)
      expect(def.motif, id).toBe(file.motif?.id)
      expect(def.motifParameters, id).toEqual(file.motif?.params)
      // Occasion metadata is wired from the one occasion table, not
      // re-declared per theme file.
      expect(def.occasions, id).toEqual(THEME_OCCASIONS[id].occasions)
      expect(def.identity, id).toBe(THEME_OCCASIONS[id].identity)
      expect(def.tags, id).toEqual(THEME_OCCASIONS[id].occasions)
    }
  })

  it("carries the two legacy branding flags to their owners", () => {
    expect(THEME_DEFINITIONS.enterprise.brand.suppressFooterOnCardContent).toBe(true)
    expect(THEME_DEFINITIONS.ink.brand.suppressFooterRule).toBe(true)
    // ink v3：落款列吞并页脚 meta 文字（`BRANDS.ink` 自己的注释交代了代价）
    expect(THEME_DEFINITIONS.ink.brand.suppressFooterMeta).toBe(true)
    expect(THEME_DEFINITIONS.consulting.brand).toEqual({})
  })

  it("24 主题四页型菜单均非空。motif 可选", () => {
    for (const id of CANONICAL_THEME_IDS) {
      const def = THEME_DEFINITIONS[id]
      expect(def.menu.cover.face, id + ".cover").toBeTruthy()
      expect(def.menu.chapter.face, id + ".chapter").toBeTruthy()
      expect(
        Object.values(def.menu.content).some((entry) => entry !== undefined),
        id + ".content",
      ).toBe(true)
      expect(def.menu.ending.face, id + ".ending").toBeTruthy()
      // motif 是可选的（undefined = 该主题无装饰层，FullSlideSvg 的 Decor 跳过
      // 渲染，安全）——runway/museum/stage 留空，故这里不强制 defined。
    }
  })

  it("清单-注册表一致性锁：菜单四页型 + motif 里的每个 id 都已在对应 layout 注册表注册", () => {
    for (const id of CANONICAL_THEME_IDS) {
      const def = THEME_DEFINITIONS[id]
      expect(COVER_REGISTRY[def.menu.cover.face]).toBeTypeOf("function")
      expect(CHAPTER_REGISTRY[def.menu.chapter.face]).toBeTypeOf("function")
      expect(ENDING_REGISTRY[def.menu.ending.face]).toBeTypeOf("function")
      for (const entry of Object.values(def.menu.content)) {
        if (entry === undefined) continue
        expect(LAYOUT_REGISTRY[entry.face], id + " content face " + entry.face).toBeDefined()
      }
      if (def.motif !== undefined) expect(MOTIFS[def.motif]).toBeTypeOf("function")
    }
  })

  it("every theme locks one cover, one chapter, and one ending face, matching the audited board table", () => {
    for (const id of CANONICAL_THEME_IDS) {
      const menu = BUILTIN_THEME_FILES[id].menu
      const board = BOARD[id]!
      expect(menu.cover.face, id + ".cover").toBe(board.cover)
      expect(menu.chapter.face, id + ".chapter").toBe(board.chapter)
      expect(menu.ending.face, id + ".ending").toBe(board.ending)
    }
  })

  it("每套主题各自的专属脸只出现在自己的菜单里，不外溢", () => {
    const exclusive: Record<string, string> = {
      "gauge-stats": "consulting",
      "gauge-point": "consulting",
      "crayonbox-cards": "crayon",
      "crayonbox-point": "crayon",
      "show-statement": "runway",
      "show-figures": "runway",
      "show-spotlight": "runway",
    }
    for (const [face, owner] of Object.entries(exclusive)) {
      for (const id of CANONICAL_THEME_IDS) {
        const faces = Object.values(BUILTIN_THEME_FILES[id].menu.content).map((entry) => entry!.face)
        if (id === owner) expect(faces, owner + " keeps " + face).toContain(face)
        else expect(faces, id + " must not borrow " + face).not.toContain(face)
      }
    }
  })

  it("未知 id 不再回落 consulting，resolveThemeId 直接报错", () => {
    expect(() => resolveThemeId("nonexistent-theme")).toThrow(/unknown theme "nonexistent-theme"/)
  })
})

describe("resolveBrand", () => {
  it("returns the theme definition brand", () => {
    expect(resolveBrand("ink")).toEqual({ suppressFooterRule: true, suppressFooterMeta: true })
  })
  it("throws for an unknown id instead of borrowing consulting's brand frame", () => {
    expect(() => resolveBrand("nope")).toThrow(/unknown theme "nope"/)
  })
})

// ── registerTheme: one complete v2 file in, one theme definition out ──────

const TEST_MENU: Menu = {
  cover: { face: "poster-center" },
  chapter: { face: "banner-chapter" },
  content: { points: { face: "two-column" } },
  ending: { face: "banner-ending" },
}

/** A structurally valid public v2 theme file. `overrides` lets each test
 *  tweak just the field it exercises. */
function testTheme(overrides: Partial<ThemeFile> = {}): ThemeFile {
  return {
    version: 2,
    id: "acme",
    style: {
      id: "acme",
      colors: {
        bg: "#FFFFFF",
        surface: "#F0F0F0",
        primary: "#112233",
        accent: "#AA00FF",
        text: "#000000",
        muted: "#888888",
        chartPalette: ["#112233", "#AA00FF"],
      },
      fonts: { heading: ["Arial"], body: ["Arial"] },
      defaultBackgrounds: {
        cover: { kind: "color", value: "#FFFFFF" },
        chapter: { kind: "color", value: "#FFFFFF" },
        content: { kind: "color", value: "#FFFFFF" },
        ending: { kind: "color", value: "#FFFFFF" },
      },
    },
    brand: {},
    menu: TEST_MENU,
    ...overrides,
  } as ThemeFile
}

/** The same fixture under another id (style.id must always agree with id). */
function themeNamed(id: string, overrides: Partial<ThemeFile> = {}): ThemeFile {
  const base = testTheme()
  return { ...base, id, style: { ...base.style, id }, ...overrides }
}

describe("registerTheme", () => {
  afterEach(() => {
    __resetRegisteredThemes()
  })

  it("registers a theme, visible to getThemeDefinition and getInstalledThemeIds", () => {
    registerTheme(testTheme())
    expect(getInstalledThemeIds()).toContain("acme")
    expect(getThemeDefinition("acme").menu.cover.face).toBe("poster-center")
    expect(getThemeDefinition("acme").menu).toEqual(TEST_MENU)
  })

  it("rejects a built-in id at the schema gate, before the installed check", () => {
    expect(() => registerTheme(themeNamed("consulting"))).toThrow(/built-in pptwise theme/)
  })

  it("rejects a duplicate already-registered id", () => {
    registerTheme(testTheme())
    expect(() => registerTheme(testTheme())).toThrow(/theme "acme" is already installed/)
  })

  it("rejects anything that is not a complete v2 file, naming the offending path", () => {
    expect(() => registerTheme({})).toThrow(/invalid theme definition/)
    // The retired programmatic shape (layout arrays, no menu) has no way in.
    expect(() =>
      registerTheme({ id: "acme", style: testTheme().style, layouts: { cover: ["poster-center"] } }),
    ).toThrow(/invalid theme definition/)
  })

  it("rejects a menu missing a boundary page type", () => {
    const menu = { ...TEST_MENU } as Record<string, unknown>
    delete menu.ending
    expect(() => registerTheme(testTheme({ menu: menu as unknown as Menu }))).toThrow(/menu\.ending/)
  })

  it("rejects a menu that serves no content kind at all", () => {
    expect(() => registerTheme(testTheme({ menu: { ...TEST_MENU, content: {} } }))).toThrow(
      /at least one content kind/,
    )
  })

  it("rejects an unregistered face id, naming the bad id", () => {
    expect(() => registerTheme(testTheme({ menu: { ...TEST_MENU, cover: { face: "not-a-real-layout" } } }))).toThrow(
      /menu\.cover\.face references unknown layout id "not-a-real-layout"/,
    )
  })

  it("rejects a face that exists but does not apply to that page type", () => {
    expect(() => registerTheme(testTheme({ menu: { ...TEST_MENU, cover: { face: "two-column" } } }))).toThrow(
      /menu\.cover\.face layout "two-column" is not valid for "cover" slides/,
    )
  })

  // ── colors.text/colors.muted contrast floor. Registration-time floor, not
  // the 4.5:1 body-text bar — see `assertContrastFloor` for the 3.0 rationale.
  it("does not throw when colors.text/colors.muted clear the 3.0 floor against every slide type's background", () => {
    expect(() => registerTheme(themeNamed("acme-contrast-ok"))).not.toThrow()
  })

  it("rejects colors.text below the 3.0 contrast floor, naming the token/slideType/ratio/threshold", () => {
    const base = themeNamed("acme-low-text-contrast")
    expect(() =>
      // near-white text on the fixture's white "cover" background -> ~1.09:1.
      registerTheme({ ...base, style: { ...base.style, colors: { ...base.style.colors, text: "#F5F5F5" } } }),
    ).toThrow(/colors\.text.*1\.\d\d:1.*"cover".*3\.0:1/)
  })

  it("rejects colors.muted below the 3.0 contrast floor", () => {
    const base = themeNamed("acme-low-muted-contrast")
    expect(() =>
      registerTheme({ ...base, style: { ...base.style, colors: { ...base.style.colors, muted: "#FAFAFA" } } }),
    ).toThrow(/colors\.muted/)
  })

  it("checks content and ending too, not just cover", () => {
    const base = themeNamed("acme-ending-bad")
    expect(() =>
      registerTheme({
        ...base,
        style: {
          ...base.style,
          // Only "ending" is bad (black, same as the fixture's black text).
          defaultBackgrounds: {
            cover: { kind: "color", value: "#FFFFFF" },
            chapter: { kind: "color", value: "#FFFFFF" },
            content: { kind: "color", value: "#FFFFFF" },
            ending: { kind: "color", value: "#000000" },
          },
        },
      }),
    ).toThrow(/colors\.text.*"ending"/)
  })

  // A first draft checked all four page types and found academic/classroom/
  // consulting measuring as low as 1.00:1 against their own `chapter`
  // background — not a theme bug (nothing renders that raw pairing), a false
  // positive in the check itself. This locks the exclusion.
  it("deliberately excludes chapter from the check — a bad chapter background alone does not throw", () => {
    const base = themeNamed("acme-chapter-bad-bg-is-fine")
    expect(() =>
      registerTheme({
        ...base,
        style: {
          ...base.style,
          defaultBackgrounds: {
            cover: { kind: "color", value: "#FFFFFF" },
            chapter: { kind: "color", value: "#000000" },
            content: { kind: "color", value: "#FFFFFF" },
            ending: { kind: "color", value: "#FFFFFF" },
          },
        },
      }),
    ).not.toThrow()
  })
})

// ── registerTheme: unmeasured-font-width console.warn ─────────────────────
describe("registerTheme: unmeasured-font-width console.warn", () => {
  afterEach(() => {
    __resetRegisteredThemes()
  })

  function withFonts(id: string, heading: string, body: string): ThemeFile {
    const base = themeNamed(id)
    return { ...base, style: { ...base.style, fonts: { heading: [heading], body: [body] } } }
  }

  it("warns for a heading face with no exact width table (SimSun) and stays silent for a body face that has one (Georgia)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    registerTheme(withFonts("acme-warn-heading-only", "SimSun", "Georgia"))
    expect(warnSpy).toHaveBeenCalledTimes(1)
    const message = warnSpy.mock.calls[0]?.[0]
    expect(message).toMatch(/acme-warn-heading-only/)
    expect(message).toMatch(/heading/)
    expect(message).toMatch(/SimSun/)
    expect(message).toMatch(/no exact width table/)
    expect(message).toMatch(/class-average envelope/)
    warnSpy.mockRestore()
  })

  it("warns twice — once per role — when both heading and body resolve to faces without an exact width table", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    registerTheme(withFonts("acme-warn-both", "SimSun", "KaiTi"))
    expect(warnSpy).toHaveBeenCalledTimes(2)
    expect(warnSpy.mock.calls[0]?.[0]).toMatch(/heading/)
    expect(warnSpy.mock.calls[1]?.[0]).toMatch(/body/)
    warnSpy.mockRestore()
  })

  it("stays silent when both heading and body resolve to faces with an exact width table (Georgia/Microsoft YaHei)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    registerTheme(withFonts("acme-no-warn", "Georgia", "Microsoft YaHei"))
    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it("never warns for a registration that ultimately throws (e.g. a bad face id) — warnings only fire once a registration will actually succeed", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const base = withFonts("acme-throws-before-warn", "SimSun", "SimSun")
    expect(() => registerTheme({ ...base, menu: { ...TEST_MENU, cover: { face: "not-a-real-layout" } } })).toThrow(
      /not-a-real-layout/,
    )
    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  // Eight builtins resolve their *heading* to SimSun or KaiTi — deliberate
  // CJK-serif design choices with no exact width table. Every builtin's
  // *body* resolves to a face that has one. This never reaches console.warn
  // because builtins never call registerTheme; the test locks both halves.
  it("regression: heritage/ink/journal/lecture/luxe/memo/museum/runway's heading has no exact table, every builtin's body does — but builtins never call registerTheme, so this never reaches console.warn", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const nonExactHeadingBuiltins = new Set(["heritage", "ink", "journal", "lecture", "luxe", "memo", "museum", "runway"])
    for (const id of CANONICAL_THEME_IDS) {
      const style = THEME_DEFINITIONS[id].style
      const headingFace = resolveFontFace(style.fonts.heading, "heading")
      const bodyFace = resolveFontFace(style.fonts.body, "body")
      expect(hasExactWidthTable(bodyFace), id + " body face " + bodyFace).toBe(true)
      expect(hasExactWidthTable(headingFace), id + " heading face " + headingFace).toBe(
        !nonExactHeadingBuiltins.has(id),
      )
    }
    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})

describe("assertContrastFloor", () => {
  // The 24 builtins never go through `registerTheme` (a THEME_DEFINITIONS /
  // registerTheme cycle would crash at module eval), so this sweeps them
  // through the underlying validation function directly.
  it("all 24 canonical themes clear the 3.0 floor for colors.text and colors.muted on every slide type", () => {
    for (const id of CANONICAL_THEME_IDS) {
      expect(() => assertContrastFloor(id, THEME_DEFINITIONS[id].style)).not.toThrow()
    }
  })
})

describe("getInstalledThemeIds", () => {
  afterEach(() => {
    __resetRegisteredThemes()
  })

  it("starts as exactly the 24 builtins", () => {
    expect(getInstalledThemeIds()).toEqual(CANONICAL_THEME_IDS)
  })

  it("stable order: builtins first, then registration order", () => {
    registerTheme(themeNamed("zzz-first"))
    registerTheme(themeNamed("aaa-second"))
    const ids = getInstalledThemeIds()
    expect(ids.slice(0, CANONICAL_THEME_IDS.length)).toEqual(CANONICAL_THEME_IDS)
    expect(ids.slice(CANONICAL_THEME_IDS.length)).toEqual(["zzz-first", "aaa-second"])
  })
})

describe("getThemeDefinition", () => {
  afterEach(() => {
    __resetRegisteredThemes()
  })

  it("returns the registered definition for a registered id", () => {
    registerTheme(testTheme())
    const def = getThemeDefinition("acme")
    expect(def.id).toBe("acme")
    expect(def.menu).toEqual(TEST_MENU)
    expect(def.menu.cover.face).toBe("poster-center")
    expect(def.menu.chapter.face).toBe("banner-chapter")
    expect(def.menu.content.points?.face).toBe("two-column")
    expect(def.menu.ending.face).toBe("banner-ending")
  })

  it("throws for an unknown id instead of falling back to consulting", () => {
    registerTheme(testTheme())
    expect(() => getThemeDefinition("still-unknown")).toThrow(/unknown theme "still-unknown"/)
  })

  it("matches THEME_DEFINITIONS for a builtin id", () => {
    expect(getThemeDefinition("tech")).toBe(THEME_DEFINITIONS.tech)
  })
})

// ── pinOnly faces: a menu is the board-lock path, so naming one is legal ──

const PIN_ONLY_TEST_ID = "test-pin-only-layout"

describe("a menu may name a pinOnly face", () => {
  beforeEach(() => {
    LAYOUT_REGISTRY[PIN_ONLY_TEST_ID] = {
      id: PIN_ONLY_TEST_ID,
      kind: "standard",
      slideTypes: ["content"],
      slots: [],
      pinOnly: true,
    } satisfies LayoutDefinition
  })
  afterEach(() => {
    delete LAYOUT_REGISTRY[PIN_ONLY_TEST_ID]
    __resetRegisteredThemes()
  })

  it("registers a theme whose content menu points at a pinOnly face (the same road the built-in board locks take)", () => {
    expect(() =>
      registerTheme(themeNamed("acme-pin-only", { menu: { ...TEST_MENU, content: { points: { face: PIN_ONLY_TEST_ID } } } })),
    ).not.toThrow()
    expect(getThemeDefinition("acme-pin-only").menu.content.points?.face).toBe(PIN_ONLY_TEST_ID)
  })
})
