// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { KIND_VALUES } from "@/ir"
import { BUILTIN_THEME_FILES } from "@/themes"
import { THEME_PRESETS } from "@/themes/presets"
import type { Menu } from "@/themes/schema"
import {
  generatedReferenceFiles,
  renderSkillReferenceFiles,
} from "./gen-skill-refs.mts"

describe("generated SKILL reference data", () => {
  it("matches every committed generated section", () => {
    for (const file of renderSkillReferenceFiles()) {
      expect(
        readFileSync(file.path, "utf8"),
        `${file.relativePath} has drifted. Run pnpm gen:skill-refs`,
      ).toBe(file.content)
    }
  })

  it("covers every content kind from preset menus without exposing engine layouts", () => {
    const generated = generatedReferenceFiles()
    expect(KIND_VALUES).toHaveLength(11)
    expect(generated.kindsEn.match(/^\| `[^`]+` \|/gm)).toHaveLength(11)
    expect(generated.kindsZh.match(/^\| `[^`]+` \|/gm)).toHaveLength(11)
    expect(generated.kindsEn).not.toMatch(/pinOnly|layout id/i)
    expect(generated.kindsZh).not.toMatch(/pinOnly|版式 id/i)
    for (const kind of KIND_VALUES) {
      const offeredBy = THEME_PRESETS.filter(
        (preset) => {
          const menu: Menu["content"] = BUILTIN_THEME_FILES[preset.id].menu.content
          return menu[kind] !== undefined
        },
      ).length
      const enRow = generated.kindsEn.split("\n").find((line) => line.startsWith(`| \`${kind}\` |`))
      const zhRow = generated.kindsZh.split("\n").find((line) => line.startsWith(`| \`${kind}\` |`))
      expect(enRow).toMatch(new RegExp(`\\| ${offeredBy}/24 \\|$`))
      expect(zhRow).toMatch(new RegExp(`\\| ${offeredBy}/24 \\|$`))
    }
  })

  it("covers every preset with its occasion, identity, and menu word count", () => {
    const generated = generatedReferenceFiles()
    expect(THEME_PRESETS).toHaveLength(24)
    expect(generated.themesEn.match(/^\| `[^`]+` \|/gm)).toHaveLength(24)
    expect(generated.themesZh.match(/^\| `[^`]+` \|/gm)).toHaveLength(24)
    for (const preset of THEME_PRESETS) {
      const menu: Menu["content"] = BUILTIN_THEME_FILES[preset.id].menu.content
      const kinds = KIND_VALUES.filter(
        (kind) => menu[kind] !== undefined,
      )
      const row = `| \`${preset.id}\` | ${preset.label} | ${preset.occasions.join(", ")} | ${preset.identity} | ${kinds.length} | ${kinds.map((kind) => `\`${kind}\``).join(", ")} |`
      expect(generated.themesEn).toContain(row)
      expect(generated.themesZh).toContain(row)
    }
  })
})
