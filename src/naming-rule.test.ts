import { describe, expect, it } from "vitest"
import { KIND_STORIES } from "@/ir/kind-stories"
import { KIND_VALUES } from "@/ir/narrative-values"
import { THEME_DEFINITIONS } from "@/themes/definitions"
import { findIndustryWords, INDUSTRY_WORDS } from "./design-story"

/**
 * A name names a voice or a genre, never an industry.
 *
 * A name that squats on an industry sells the theme short twice over: it
 * tells every other industry the theme is not for them, and it hides what
 * the theme actually offers, which is a way of speaking. The report voice
 * that opens with its conclusion serves a hospital board as well as it
 * serves a bank. `Brief` says that. `Business Consulting` says the opposite.
 *
 * The rule covers a theme's id, its display label, and its story name. It
 * does not cover positioning, audience, or occasions: naming the industries
 * a voice happens to suit is exactly what those fields are for.
 *
 * Twelve built-ins still break the rule in their id or label. They are listed
 * below and the list only shrinks — a theme that breaks the rule without a
 * line here fails, and a listed theme that has been fixed fails too, so the
 * rename batch cannot land half-done and leave the list lying about it.
 */
const RENAME_PENDING: readonly string[] = [
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
    findIndustryWords(name.text).map((word) => `${theme.id} ${name.field} "${name.text}" says "${word}"`),
  )
}

describe("a name names a voice, never an industry", () => {
  it("holds for every theme id, label, and story name outside the rename list", () => {
    const broken = themeNamings()
      .filter((theme) => !RENAME_PENDING.includes(theme.id))
      .flatMap((theme) => offences(theme))
    expect(broken, "rename these, or add the theme to RENAME_PENDING").toEqual([])
  })

  it("keeps the rename list shrinking", () => {
    const ids = new Set(themeNamings().map((theme) => theme.id))
    expect(RENAME_PENDING.filter((id) => !ids.has(id)), "RENAME_PENDING names a theme that is gone").toEqual([])

    const fixed = themeNamings()
      .filter((theme) => RENAME_PENDING.includes(theme.id) && offences(theme).length === 0)
      .map((theme) => theme.id)
    expect(fixed, "these themes are clean now — take them out of RENAME_PENDING").toEqual([])
  })

  it("reports what the rename batch still owes", () => {
    const report = themeNamings()
      .filter((theme) => RENAME_PENDING.includes(theme.id))
      .flatMap((theme) => offences(theme))
    console.info(`${RENAME_PENDING.length} themes await a rename:\n${report.join("\n")}`)
    expect(report.length).toBeGreaterThan(0)
  })

  it("holds for every story name a theme already carries", () => {
    const broken = themeNamings().flatMap((theme) =>
      theme.names
        .filter((name) => name.field === "story.name")
        .flatMap((name) => findIndustryWords(name.text).map((word) => `${theme.id} ${name.text} says "${word}"`)),
    )
    expect(broken, "a story name is new copy — it has no excuse for an industry word").toEqual([])
  })

  it("holds for every content kind", () => {
    const broken = KIND_VALUES.flatMap((kind) =>
      [kind, KIND_STORIES[kind].name].flatMap((text) =>
        findIndustryWords(text).map((word) => `kind ${kind} "${text}" says "${word}"`),
      ),
    )
    expect(broken).toEqual([])
  })
})

describe("findIndustryWords", () => {
  it("matches whole words only", () => {
    expect(findIndustryWords("Technology")).toEqual(["technology"])
    expect(findIndustryWords("Architect")).toEqual([])
    expect(findIndustryWords("Heritage")).toEqual([])
  })

  it("reads an id's separators as spaces", () => {
    expect(findIndustryWords("real-estate")).toEqual(["real estate"])
    expect(findIndustryWords("life_science")).toEqual(["life science"])
  })

  it("keeps its hyphenated entries matchable", () => {
    expect(findIndustryWords("E-Commerce")).toContain("e-commerce")
  })

  it("reads Chinese without word boundaries", () => {
    expect(findIndustryWords("医疗汇报")).toEqual(["医疗"])
  })

  it("leaves genres, venues, and crafts alone", () => {
    for (const name of ["Runway", "Museum", "Playbill", "Ledger", "Clinic", "Almanac", "Bulletin", "Terminal"]) {
      expect(findIndustryWords(name), `${name} names a genre, not an industry`).toEqual([])
    }
  })

  it("lists every industry word in lower case, so the list reads as one thing", () => {
    expect(INDUSTRY_WORDS.filter((word) => word !== word.toLowerCase())).toEqual([])
  })
})
