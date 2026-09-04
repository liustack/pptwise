import { describe, expect, it } from "vitest"
import { KIND_STORIES } from "@/ir/kind-stories"
import { KIND_VALUES } from "@/ir/narrative-values"
import { THEME_DEFINITIONS } from "@/themes/definitions"
import { StructuralThemeFileSchema, ThemeFileSchema } from "@/themes/schema"
import { themeFileFromPreset } from "@/cli/theme-resolve"
import { FORBIDDEN_NAME_WORDS, findForbiddenNameWords } from "./design-story"
import { LEGACY_THEME_NAMES } from "./themes/legacy-names"

/**
 * A name names a voice or a genre, never a vertical, a function, an
 * audience, or an organization type.
 *
 * A name that answers "who is this for" sells the object short twice over:
 * it tells everyone else the object is not for them, and it hides what the
 * object actually offers, which is a way of speaking. The report voice that
 * opens with its conclusion serves a hospital board as well as a bank.
 * `Brief` says that. `Business Consulting` says the opposite.
 *
 * The rule covers a theme's id, its display label, and its story name. It
 * does not cover positioning, audience, or occasions: naming the customers a
 * voice happens to suit is exactly what those fields are for.
 *
 * Thirteen built-ins predate the rule. Their licence is the frozen baseline
 * in `themes/legacy-names.ts`, and this test is what makes it a ratchet
 * rather than a list anybody can grow: a broken name that is not already in
 * the baseline fails, and a baseline name that has been fixed fails until
 * its line is deleted. Neither failure can be answered by adding a line,
 * because the baseline is asserted to hold nothing but the names it was
 * frozen with.
 */
const FROZEN_BASELINE_IDS: readonly string[] = [
  "academic",
  "arena",
  "campaign",
  "classroom",
  "consulting",
  "crayon",
  "ember",
  "enterprise",
  "insight",
  "pulse",
  "runway",
  "tech",
  "terra",
]

interface ThemeNaming {
  readonly id: string
  /** Every piece of text the rule applies to, labelled for the failure message. */
  readonly names: readonly { readonly field: string; readonly text: string }[]
}

function themeNamings(): readonly ThemeNaming[] {
  return Object.values(THEME_DEFINITIONS).map((theme) => ({
    id: theme.id,
    names: [
      { field: "id", text: theme.id },
      ...(theme.label === undefined ? [] : [{ field: "label", text: theme.label }]),
      ...(theme.story === undefined ? [] : [{ field: "story.name", text: theme.story.name }]),
    ],
  }))
}

function offences(theme: ThemeNaming): readonly string[] {
  return theme.names.flatMap((name) =>
    findForbiddenNameWords(name.text).map((word) => `${theme.id} ${name.field} "${name.text}" says "${word}"`),
  )
}

describe("a name names a voice, never a vertical", () => {
  it("has a baseline that only shrinks", () => {
    // The licence cannot be widened by editing it: the ids it may contain
    // were fixed when the rule landed, so a new name has nowhere to hide.
    expect(LEGACY_THEME_NAMES.map((name) => name.id)).toEqual(FROZEN_BASELINE_IDS.filter((id) =>
      LEGACY_THEME_NAMES.some((name) => name.id === id),
    ))
    expect(LEGACY_THEME_NAMES.every((name) => FROZEN_BASELINE_IDS.includes(name.id))).toBe(true)
  })

  it("holds for every theme id, label, and story name outside the baseline", () => {
    const licenced = new Set(LEGACY_THEME_NAMES.map((name) => name.id))
    const broken = themeNamings()
      .filter((theme) => !licenced.has(theme.id))
      .flatMap((theme) => offences(theme))
    expect(broken, "rename these — the legacy baseline is frozen and cannot take a new line").toEqual([])
  })

  it("drops a baseline entry as soon as its theme is renamed", () => {
    const byId = new Map(themeNamings().map((theme) => [theme.id, theme]))
    const gone = LEGACY_THEME_NAMES.filter((name) => !byId.has(name.id)).map((name) => name.id)
    expect(gone, "the baseline names a theme that no longer exists").toEqual([])

    const fixed = LEGACY_THEME_NAMES.filter((name) => offences(byId.get(name.id)!).length === 0).map(
      (name) => name.id,
    )
    expect(fixed, "these themes are clean now — delete their lines from the baseline").toEqual([])
  })

  it("licences the exact legacy label, not anything that resembles it", () => {
    // The exemption is what lets `theme new --from consulting` copy the old
    // label forward. It must not become cover for a new name built out of
    // the same word.
    expect(() =>
      ThemeFileSchema.parse({ ...themeFileFromPreset("swiss", { id: "acme" }), label: "Fashion Weekly" }),
    ).toThrow(/fashion/)
    expect(() => themeFileFromPreset("runway", { id: "acme-runway" })).not.toThrow()
  })

  it("refuses a new theme file whose id, label, or story name breaks the rule", () => {
    const base = themeFileFromPreset("swiss", { id: "acme" })
    expect(() => ThemeFileSchema.parse({ ...base, id: "healthcare", style: { ...base.style, id: "healthcare" } })).toThrow(
      /healthcare/,
    )
    expect(() => ThemeFileSchema.parse({ ...base, label: "Wealth Management" })).toThrow(/wealth management/)
    expect(() =>
      ThemeFileSchema.parse({ ...base, story: { ...base.story!, name: "Fintech" } }),
    ).toThrow(/fintech/)
  })

  it("scans an id word by word, exactly as it scans a label", () => {
    // A vertical with a style word bolted on either side is the most common
    // custom id there is, and it is still a name that answers who the theme
    // is for. Nothing about the shape of the string earns an exception.
    const base = themeFileFromPreset("swiss", { id: "acme" })
    const withId = (id: string) => ({ ...base, id, style: { ...base.style, id } })
    for (const id of ["healthcare", "fintech-dark", "dark-fintech", "acme-healthcare-deck"]) {
      expect(() => ThemeFileSchema.parse(withId(id)), id).toThrow(
        /never a vertical, a function, an audience, or an organization type/,
      )
    }
    expect(() => ThemeFileSchema.parse({ ...base, label: "A Classroom Deck" })).toThrow(/classroom/)
  })

  it("keeps the corpus's composed ids out of the public contract entirely", () => {
    // The review corpus composes an id out of a source theme, a page type,
    // and the internal name of the drawing under test. That id is a handle,
    // and it installs through the private structural entry — the public
    // contract still refuses it, which is the point.
    const base = themeFileFromPreset("swiss", { id: "acme" })
    const composed = "matrix-classroom-cover-fashion-masthead"
    const file = { ...base, id: composed, style: { ...base.style, id: composed } }
    expect(() => ThemeFileSchema.parse(file)).toThrow(/classroom/)
    expect(() => StructuralThemeFileSchema.parse(file)).not.toThrow()
  })

  it("still holds the structural entry to everything but the naming rule", () => {
    const base = themeFileFromPreset("swiss", { id: "acme" })
    expect(() => StructuralThemeFileSchema.parse({ ...base, id: "other" })).toThrow(/style\.id/)
    expect(() => StructuralThemeFileSchema.parse({ ...base, version: 3 })).toThrow()
    expect(() => StructuralThemeFileSchema.parse({ ...base, surprise: true })).toThrow()
  })

  it("reports what the rename batch still owes", () => {
    const report = themeNamings()
      .filter((theme) => LEGACY_THEME_NAMES.some((name) => name.id === theme.id))
      .flatMap((theme) => offences(theme))
    console.info(`${LEGACY_THEME_NAMES.length} themes await a rename:\n${report.join("\n")}`)
    expect(report.length).toBeGreaterThan(0)
  })

  it("holds for every story name a theme already carries", () => {
    const broken = themeNamings().flatMap((theme) =>
      theme.names
        .filter((name) => name.field === "story.name")
        .flatMap((name) => findForbiddenNameWords(name.text).map((word) => `${theme.id} ${name.text} says "${word}"`)),
    )
    expect(broken, "a story name is new copy — it has no excuse and no baseline").toEqual([])
  })

  it("holds for every content kind", () => {
    const broken = KIND_VALUES.flatMap((kind) =>
      [kind, KIND_STORIES[kind].name].flatMap((text) =>
        findForbiddenNameWords(text).map((word) => `kind ${kind} "${text}" says "${word}"`),
      ),
    )
    expect(broken).toEqual([])
  })
})

describe("findForbiddenNameWords", () => {
  it("matches whole words only", () => {
    expect(findForbiddenNameWords("Technology")).toEqual(["technology"])
    expect(findForbiddenNameWords("Architect")).toEqual([])
    expect(findForbiddenNameWords("Heritage")).toEqual([])
  })

  it("normalizes separators, however they are written", () => {
    expect(findForbiddenNameWords("real-estate")).toEqual(["real estate"])
    expect(findForbiddenNameWords("real--estate")).toEqual(["real estate"])
    expect(findForbiddenNameWords("life_science")).toEqual(["life science"])
    expect(findForbiddenNameWords("e_commerce")).toEqual(["ecommerce"])
    expect(findForbiddenNameWords("E-Commerce")).toEqual(["ecommerce"])
  })

  it("normalizes word forms instead of listing them", () => {
    expect(findForbiddenNameWords("Technologies")).toEqual(["technology"])
    expect(findForbiddenNameWords("Financials")).toEqual(["financial"])
    expect(findForbiddenNameWords("life sciences")).toEqual(["life science"])
    expect(findForbiddenNameWords("Consultancies")).toEqual(["consultancy"])
    expect(findForbiddenNameWords("Pharmaceuticals")).toEqual(["pharmaceutical"])
  })

  it("reads an ampersand as the word it stands for", () => {
    expect(findForbiddenNameWords("Oil & Gas Review")).toEqual(["oil and gas"])
    expect(findForbiddenNameWords("Food & Beverage Report")).toEqual(["food and beverage"])
  })

  it("reads a compound however it is spaced, without listing each spelling", () => {
    for (const name of ["Non-Profit Brief", "non profit", "Nonprofit"]) {
      expect(findForbiddenNameWords(name), name).toEqual(["nonprofit"])
    }
    for (const name of ["Cyber-Security Ledger", "cyber security"]) {
      expect(findForbiddenNameWords(name), name).toEqual(["cybersecurity"])
    }
  })

  it("carries the spellings normalization cannot derive", () => {
    expect(findForbiddenNameWords("Defence Review")).toEqual(["defence"])
    expect(findForbiddenNameWords("Telecommunications Brief")).toEqual(["telecommunication"])
  })

  it("does not invent a match by joining tokens", () => {
    // Squashing the tokens is what reads `non profit` as `nonprofit`. Both
    // ends must land on a token boundary or it would also read `tech` out of
    // `fintech`, which is a different and wrong statement.
    expect(findForbiddenNameWords("fintech-dark")).toEqual(["fintech"])
    expect(findForbiddenNameWords("Multimedia")).toEqual([])
  })

  it("covers the verticals a next theme would reach for", () => {
    for (const name of ["Energy Brief", "Aerospace Review", "Gaming Weekly", "Wealth Management"]) {
      expect(findForbiddenNameWords(name).length, name).toBeGreaterThan(0)
    }
  })

  it("reads Chinese without word boundaries", () => {
    expect(findForbiddenNameWords("医疗汇报")).toEqual(["医疗"])
    expect(findForbiddenNameWords("生命科学周刊")).toEqual(["生命科学"])
    // Both 房地产 and 地产 are listed, and a name that says the longer one
    // says the shorter one too. Reporting both is the honest answer.
    expect(findForbiddenNameWords("房地产年报")).toContain("房地产")
    expect(findForbiddenNameWords("地产周刊")).toEqual(["地产"])
  })

  it("leaves genres, venues, and crafts alone", () => {
    for (const name of ["Runway", "Museum", "Playbill", "Ledger", "Clinic", "Almanac", "Bulletin", "Terminal", "Luxe"]) {
      expect(findForbiddenNameWords(name), `${name} names a genre, not a customer`).toEqual([])
    }
  })

  it("lists every forbidden word in lower case, so the list reads as one thing", () => {
    expect(FORBIDDEN_NAME_WORDS.filter((word) => word !== word.toLowerCase())).toEqual([])
  })
})
