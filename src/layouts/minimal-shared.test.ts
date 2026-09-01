// @vitest-environment node
//
// The `statement` / `pull-quote` / `stat-hero` families share one field
// contract (`minimal-shared.ts`), and each of the three used to read
// `sources[0]` from a citation and leave every later source unpainted.
// Nothing declared that limit: the body capacity these faces carry counts
// components, not the entries inside one, and the citation schema puts no
// ceiling on the array. A two-source citation is ordinary IR.

import { describe, expect, it } from "vitest"
import type { Slide } from "@/ir"
import {
  citationSources,
  heroSource,
  pullQuoteAttribution,
  statementAttribution,
  LABEL_JOIN,
} from "./minimal-shared"

function cited(...labels: string[]): Slide {
  return {
    type: "content",
    kind: "fact",
    heading: "The claim",
    components: [{ type: "citation", sources: labels.map((label) => ({ label })) }],
  } as unknown as Slide
}

describe("a citation's sources all reach the line that names them", () => {
  const two = cited("SOURCE_ONE", "SOURCE_TWO")

  it.each([
    ["statement", statementAttribution],
    ["pull-quote", pullQuoteAttribution],
    ["stat-hero", heroSource],
  ])("%s reads every source, joined in the label register", (_face, read) => {
    const line = read(two)
    expect(line).toContain("SOURCE_ONE")
    expect(line).toContain("SOURCE_TWO")
    expect(line).toBe(`SOURCE_ONE${LABEL_JOIN}SOURCE_TWO`)
  })

  it.each([
    ["statement", statementAttribution],
    ["pull-quote", pullQuoteAttribution],
    ["stat-hero", heroSource],
  ])("%s reads a lone source exactly as before", (_face, read) => {
    expect(read(cited("SOURCE_ONE"))).toBe("SOURCE_ONE")
  })

  it("skips a source whose label is blank rather than joining an empty run", () => {
    expect(citationSources(cited("A", "  ", "B").components[0]!)).toBe(`A${LABEL_JOIN}B`)
  })

  it("has nothing to say about a component that is not a citation", () => {
    expect(citationSources({ type: "paragraph", text: "prose" } as never)).toBeUndefined()
  })
})
