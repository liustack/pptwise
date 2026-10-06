// @vitest-environment node
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { CANONICAL_THEME_IDS } from "./themes"

/**
 * Every place the docs say how many themes ship, held to the registry.
 *
 * The count is written out in prose in a dozen files, in two languages, and a
 * new theme used to leave most of them a number behind: nothing failed, so
 * nothing told the author where they were. Each line below names a sentence
 * that states the count; a sentence that goes missing fails too, so a
 * rewording has to come back here rather than drop out of the check.
 */
const CLAIMS: ReadonlyArray<readonly [file: string, sentence: RegExp]> = [
  ["AGENTS.md", /The (\d+) built-ins are factory presets/],
  ["README.md", /Start from (\d+) factory themes/],
  ["README.zh-CN.md", /可以从 (\d+) 个出厂主题起步/],
  ["docs/architecture.md", /Public v2 schema, (\d+) presets/],
  ["docs/cli.md", /List the (\d+) factory presets/],
  ["docs/cli.zh-CN.md", /列出 (\d+) 个出厂预设/],
  ["docs/themes.md", /List the (\d+) preset starting points/],
  ["docs/themes.md", /4\. The (\d+) factory presets\./],
  ["docs/themes.zh-CN.md", /列出 (\d+) 个起点/],
  ["docs/themes.zh-CN.md", /4\. (\d+) 个出厂预设。/],
  ["docs/testing.md", /It contains all (\d+) ids/],
  ["docs/testing.md", /full (\d+)-theme Latin/],
  ["docs/contrast-system.md", /verified across all (\d+) themes/],
  ["skills/pptwise/SKILL.md", /4\. The (\d+) factory presets\./],
  ["skills/pptwise/SKILL.zh-CN.md", /4\. (\d+) 个出厂预设。/],
]

describe("the docs' theme count", () => {
  it.each(CLAIMS)("%s states the registry's count (%s)", (file, sentence) => {
    const text = readFileSync(join(process.cwd(), file), "utf8")
    const hit = sentence.exec(text)
    expect(hit, `${file} no longer has a sentence matching ${sentence}`).not.toBeNull()
    expect(Number(hit![1])).toBe(CANONICAL_THEME_IDS.length)
  })
})
