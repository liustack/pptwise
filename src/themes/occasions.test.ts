import { describe, expect, it } from "vitest"
import { BUILTIN_THEME_IDS } from "../ir"
import {
  IDENTITY_STRENGTHS,
  OCCASION_VOCAB,
  THEME_OCCASIONS,
  type IdentityStrength,
  type Occasion,
} from "./occasions"

const VOCAB_KEYS = Object.keys(OCCASION_VOCAB) as Occasion[]

describe("OCCASION_VOCAB", () => {
  it("is a controlled list of 15-25 occasion words, each with a one-line English gloss", () => {
    expect(VOCAB_KEYS.length).toBeGreaterThanOrEqual(15)
    expect(VOCAB_KEYS.length).toBeLessThanOrEqual(25)
    for (const key of VOCAB_KEYS) {
      expect(key).toMatch(/^[a-z]+$/)
      const gloss = OCCASION_VOCAB[key]
      expect(typeof gloss).toBe("string")
      expect(gloss.trim().length).toBeGreaterThan(0)
      expect(gloss.includes("\n")).toBe(false)
    }
  })
})

describe("THEME_OCCASIONS", () => {
  it("covers every builtin theme and no extra ids", () => {
    expect(Object.keys(THEME_OCCASIONS).sort()).toEqual([...BUILTIN_THEME_IDS].sort())
  })

  it("fills each builtin with 1-4 vocab occasions and an identity band", () => {
    const used = new Set<string>()
    for (const id of BUILTIN_THEME_IDS) {
      const entry = THEME_OCCASIONS[id]
      expect(entry, id).toBeDefined()
      expect(IDENTITY_STRENGTHS.includes(entry.identity), `${id}.identity`).toBe(true)
      expect(entry.occasions.length, `${id}.occasions`).toBeGreaterThanOrEqual(1)
      expect(entry.occasions.length, `${id}.occasions`).toBeLessThanOrEqual(4)
      expect(new Set(entry.occasions).size, `${id} duplicate occasions`).toBe(entry.occasions.length)
      for (const word of entry.occasions) {
        expect(VOCAB_KEYS, `${id} occasion ${word}`).toContain(word)
        used.add(word)
      }
    }
    expect([...used].sort()).toEqual([...VOCAB_KEYS].sort())
  })

  it("pins the brief's identity-band examples", () => {
    const low = ["swiss", "enterprise", "memo", "vermilion"] as const
    const medium = ["consulting", "academic", "insight"] as const
    const high = ["runway", "stage", "crayon", "arena", "playbill", "ink", "museum"] as const
    for (const id of low) expect(THEME_OCCASIONS[id].identity).toBe("low")
    for (const id of medium) expect(THEME_OCCASIONS[id].identity).toBe("medium")
    for (const id of high) expect(THEME_OCCASIONS[id].identity).toBe("high")
  })

  it("pins unique occasion owners from the 24-theme catalog", () => {
    expect(THEME_OCCASIONS.insight.occasions).toEqual(["finance"])
    expect(THEME_OCCASIONS.pulse.occasions).toEqual(["health"])
    expect(THEME_OCCASIONS.terra.occasions).toEqual(["sustainability"])
    expect(THEME_OCCASIONS.ember.occasions).toEqual(["startup"])
    expect(THEME_OCCASIONS.runway.occasions).toEqual(["fashion"])
    expect(THEME_OCCASIONS.journal.occasions).toEqual(["editorial"])
    expect(THEME_OCCASIONS.tech.occasions).toEqual(["tech"])
    expect(THEME_OCCASIONS.stage.occasions).toEqual(["keynote"])
    expect(THEME_OCCASIONS.vermilion.occasions).toContain("government")
    expect(THEME_OCCASIONS.crayon.occasions).toContain("kids")
    expect(THEME_OCCASIONS.museum.occasions).toContain("museum")
  })
})

describe("IDENTITY_STRENGTHS", () => {
  it("is the low/medium/high band", () => {
    const bands: readonly IdentityStrength[] = ["low", "medium", "high"]
    expect(IDENTITY_STRENGTHS).toEqual(bands)
  })
})
