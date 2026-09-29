import { describe, expect, it } from "vitest"

import { changelogSection, datedHeading, plannedVersion, releaseRunListArgs } from "./release.mts"

const CHANGELOG = `# @liustack/pptwise

## 0.37.1

### Patch Changes

- 87a819b: On Windows, the preview record store retries a replace.

## 0.37.0

### Minor Changes

- 939d2d9: \`pptwise inspect\` shows one page's fill contract.

## 0.3.7

- An old, short line that still says something.
`

describe("changelogSection", () => {
  it("returns the body under a version's heading, up to the next one", () => {
    expect(changelogSection(CHANGELOG, "0.37.1")).toBe(
      "### Patch Changes\n\n- 87a819b: On Windows, the preview record store retries a replace.",
    )
  })

  it("reads a heading that carries a date after the version", () => {
    const dated = CHANGELOG.replace("## 0.37.1", "## 0.37.1 - 2026-09-28")
    expect(changelogSection(dated, "0.37.1")).toContain("retries a replace")
  })

  it("reads the last section in the file", () => {
    expect(changelogSection(CHANGELOG, "0.3.7")).toBe("- An old, short line that still says something.")
  })

  it("matches the dots literally, so 0.3.7 never answers for 0.37.x", () => {
    expect(changelogSection(CHANGELOG, "0.3.71")).toBeUndefined()
    expect(changelogSection(CHANGELOG, "0.371")).toBeUndefined()
  })

  it("has no answer for a version the file never names", () => {
    expect(changelogSection(CHANGELOG, "0.38.0")).toBeUndefined()
  })
})

describe("datedHeading", () => {
  it("dates the bare heading changesets writes", () => {
    const out = datedHeading(CHANGELOG, "0.37.1", "2026-09-28")
    expect(out).toContain("## 0.37.1 - 2026-09-28\n")
    expect(out).toContain("## 0.37.0\n")
  })

  it("leaves a heading that is already dated alone", () => {
    const once = datedHeading(CHANGELOG, "0.37.1", "2026-09-28")
    expect(datedHeading(once, "0.37.1", "2026-09-29")).toBe(once)
  })
})

describe("plannedVersion", () => {
  it("reads the one package's new version from changeset status output", () => {
    const status = { releases: [{ name: "@liustack/pptwise", type: "patch", oldVersion: "0.37.1", newVersion: "0.37.2" }] }
    expect(plannedVersion(status, "@liustack/pptwise")).toBe("0.37.2")
  })

  it("has no plan when no pending changeset releases the package", () => {
    expect(plannedVersion({ releases: [] }, "@liustack/pptwise")).toBeUndefined()
  })
})

describe("releaseRunListArgs", () => {
  it("asks for the run of the tagged commit, not any run the tag name ever had", () => {
    const args = releaseRunListArgs("v0.40.0", "1f13ec9c")
    expect(args).toContain("--commit")
    expect(args[args.indexOf("--commit") + 1]).toBe("1f13ec9c")
    expect(args[args.indexOf("--branch") + 1]).toBe("v0.40.0")
  })
})
