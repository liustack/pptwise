import { describe, expect, it } from "vitest"
import { findOverflowVocabulary } from "./overflow-vocabulary"

describe("findOverflowVocabulary", () => {
  it("hits leftover plus-count with more", () => {
    expect(findOverflowVocabulary("+3 more")).toEqual({
      pattern: "OVERFLOW_MARKER",
      match: "+3 more",
    })
  })

  it("hits leftover plus-count with 项", () => {
    expect(findOverflowVocabulary("+40 项")).toEqual({
      pattern: "OVERFLOW_MARKER",
      match: "+40 项",
    })
  })

  it("hits remainder-count 另有 2 项", () => {
    expect(findOverflowVocabulary("另有 2 项")).toEqual({
      pattern: "OVERFLOW_MARKER_ZH",
      match: "另有 2 项",
    })
  })

  it("hits unicode ellipsis and standalone ...", () => {
    expect(findOverflowVocabulary("cut short…")).toEqual({
      pattern: "OVERFLOW_ELLIPSIS",
      match: "…",
    })
    expect(findOverflowVocabulary("cut short...")).toEqual({
      pattern: "OVERFLOW_ELLIPSIS",
      match: "...",
    })
  })

  it("does not hit plus-pp, minus-pp, a total with 项, or a decimal unit", () => {
    expect(findOverflowVocabulary("+4 pp")).toBeUndefined()
    expect(findOverflowVocabulary("-12 pp")).toBeUndefined()
    expect(findOverflowVocabulary("540 项")).toBeUndefined()
    expect(findOverflowVocabulary("5.4 克")).toBeUndefined()
  })

  it("does not hit spread-like four dots", () => {
    expect(findOverflowVocabulary("....")).toBeUndefined()
  })
})
