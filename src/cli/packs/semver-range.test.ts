// @vitest-environment node
import { describe, expect, it } from "vitest"
import { satisfiesRange } from "./semver-range"

/** [version, range, expected]. The expectations follow npm's `semver.satisfies`
 *  with its default options (no loose mode, no includePrerelease). */
const CASES: readonly (readonly [string, string, boolean])[] = [
  // the shape the pack catalog uses
  ["0.37.0", ">=0.37.0 <1.0.0", true],
  ["0.37.1", ">=0.37.0 <1.0.0", true],
  ["0.36.9", ">=0.37.0 <1.0.0", false],
  ["1.0.0", ">=0.37.0 <1.0.0", false],
  ["0.99.99", ">=0.37.0 <1.0.0", true],

  // primitives
  ["1.2.3", "1.2.3", true],
  ["1.2.3", "=1.2.3", true],
  ["1.2.3", "v1.2.3", true],
  ["1.2.4", "1.2.3", false],
  ["1.2.3", ">1.2.2", true],
  ["1.2.3", ">1.2.3", false],
  ["1.2.3", "<1.2.4", true],
  ["1.2.3", "<1.2.3", false],
  ["1.2.3", "<=1.2.3", true],
  ["1.2.3", ">=1.2.3", true],
  ["1.2.3", ">= 1.2.3", true],
  ["1.2.3", "1.2.3+build.7", true],
  ["1.2.3+build.9", "1.2.3", true],

  // x-ranges and partials
  ["1.2.3", "", true],
  ["1.2.3", "*", true],
  ["1.2.3", "x", true],
  ["1.2.3", "1", true],
  ["2.0.0", "1", false],
  ["1.9.9", "1.x", true],
  ["1.2.9", "1.2.x", true],
  ["1.3.0", "1.2.x", false],
  ["1.2.9", "1.2", true],
  ["1.3.0", "1.2", false],
  ["1.3.0", ">1.2", true],
  ["1.2.9", ">1.2", false],
  ["2.0.0", ">1", true],
  ["1.9.9", ">1", false],
  ["1.2.0", ">=1.2", true],
  ["1.1.9", ">=1.2", false],
  ["1.1.9", "<1.2", true],
  ["1.2.0", "<1.2", false],
  ["1.2.9", "<=1.2", true],
  ["1.3.0", "<=1.2", false],
  ["1.2.3", "<*", false],
  ["1.2.3", ">*", false],
  ["1.2.3", ">=*", true],
  ["1.2.3", "=1.2", true],

  // tilde
  ["1.2.3", "~1.2.3", true],
  ["1.2.9", "~1.2.3", true],
  ["1.3.0", "~1.2.3", false],
  ["1.2.2", "~1.2.3", false],
  ["1.2.0", "~1.2", true],
  ["1.3.0", "~1.2", false],
  ["1.9.0", "~1", true],
  ["2.0.0", "~1", false],
  ["0.2.5", "~0.2.3", true],
  ["0.3.0", "~0.2.3", false],
  ["1.2.9", "~>1.2.3", true],
  ["1.2.3", "~ 1.2.3", true],

  // caret
  ["1.9.9", "^1.2.3", true],
  ["2.0.0", "^1.2.3", false],
  ["1.2.2", "^1.2.3", false],
  ["0.2.9", "^0.2.3", true],
  ["0.3.0", "^0.2.3", false],
  ["0.0.3", "^0.0.3", true],
  ["0.0.4", "^0.0.3", false],
  ["1.9.0", "^1.2.x", true],
  ["1.1.0", "^1.2.x", false],
  ["0.0.9", "^0.0.x", true],
  ["0.1.0", "^0.0.x", false],
  ["0.0.9", "^0.0", true],
  ["0.1.0", "^0.0", false],
  ["1.5.0", "^1.x", true],
  ["0.9.0", "^0.x", true],
  ["1.0.0", "^0.x", false],
  ["0.2.5", "^0.2", true],
  ["0.3.0", "^0.2", false],
  ["1.2.3", "^*", true],

  // hyphen ranges
  ["1.2.3", "1.2.3 - 2.3.4", true],
  ["2.3.4", "1.2.3 - 2.3.4", true],
  ["2.3.5", "1.2.3 - 2.3.4", false],
  ["1.2.2", "1.2.3 - 2.3.4", false],
  ["1.2.0", "1.2 - 2.3.4", true],
  ["2.3.9", "1.2.3 - 2.3", true],
  ["2.4.0", "1.2.3 - 2.3", false],
  ["2.9.9", "1.2.3 - 2", true],
  ["3.0.0", "1.2.3 - 2", false],
  ["0.0.1", "* - 2", true],

  // unions
  ["1.2.3", "<1.0.0 || >=1.2.0", true],
  ["0.5.0", "<1.0.0 || >=1.2.0", true],
  ["1.1.0", "<1.0.0 || >=1.2.0", false],
  ["2.0.0", "1.x || 2.x", true],
  ["3.0.0", "1.x||2.x", false],

  // prereleases are excluded unless a comparator on the same tuple opts in
  ["1.2.3-beta.2", ">=1.2.3-beta.1 <2.0.0", true],
  ["1.2.4-beta.1", ">=1.2.3-beta.1 <2.0.0", false],
  ["1.5.0-rc.1", "^1.2.3", false],
  ["1.2.3-alpha", "^1.2.3-alpha", true],
  ["1.2.3-beta", "^1.2.3-alpha", true],
  ["1.2.3-0", "*", false],
  ["1.2.3-alpha.10", ">1.2.3-alpha.9", true],
  ["1.2.3-alpha.beta", ">1.2.3-alpha.1", true],
  ["1.2.3-alpha", ">1.2.3-alpha.1", false],
  ["1.2.3", ">1.2.3-alpha.1", true],
  ["1.2.3-rc.1", "~1.2.3-beta.2", true],
  ["1.2.3-beta.2", "1.2.3-beta.2", true],
  ["1.2.3-beta.2", "1.2.3", false],
  ["2.0.0-0", "<2.0.0", false],
  ["1.2.3-beta", "1.2.3-alpha - 1.2.3", true],
]

describe("satisfiesRange", () => {
  it.each(CASES)("%s in %j is %s", (version, range, expected) => {
    expect(satisfiesRange(version, range)).toBe(expected)
  })

  it("refuses a range it cannot read instead of guessing", () => {
    for (const range of [">=a.b.c", "1.2.3.4", ">=01.2.3", "1.2.3 -", "~", "^", ">=1.2.3 <", "1.2.3 - 2.3.4 - 5", "=>1.2.3", "!1.2.3"]) {
      expect(() => satisfiesRange("1.2.3", range), range).toThrow(/invalid semver range/)
    }
  })

  it("refuses a version it cannot read", () => {
    for (const version of ["", "1.2", "1.2.x", "01.2.3", "v1", "latest"]) {
      expect(() => satisfiesRange(version, "*"), version).toThrow(/invalid version/)
    }
  })
})
