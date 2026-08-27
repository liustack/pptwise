// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { CANONICAL_THEME_IDS } from "@/themes"
import { LAYOUT_REGISTRY } from "@/layouts/registry"
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

  it("covers every standard layout and every built-in theme", () => {
    const generated = generatedReferenceFiles()
    const layouts = Object.values(LAYOUT_REGISTRY).filter((layout) => layout.kind === "archetype")
    const layoutIds = layouts.map((layout) => `\`${layout.id}\``)
    const themeIds = CANONICAL_THEME_IDS.map((id) => `\`${id}\``)

    expect(layouts).toHaveLength(130)
    expect(generated.layoutsEn.match(/^\| `[^`]+` \|/gm)).toHaveLength(130)
    expect(generated.layoutsZh.match(/^\| `[^`]+` \|/gm)).toHaveLength(130)
    expect(generated.layoutsEn.match(/\| yes \|/g)).toHaveLength(87)
    expect(generated.layoutsZh.match(/\| 是 \|/g)).toHaveLength(87)
    for (const heading of ["Cover", "Chapter", "Content", "Ending"]) {
      expect(generated.layoutsEn).toContain(`#### ${heading}`)
    }
    for (const heading of ["封面", "章节", "内容", "结尾"]) {
      expect(generated.layoutsZh).toContain(`#### ${heading}`)
    }
    for (const id of layoutIds) {
      expect(generated.layoutsEn).toContain(`| ${id} |`)
      expect(generated.layoutsZh).toContain(`| ${id} |`)
    }

    expect(CANONICAL_THEME_IDS).toHaveLength(24)
    expect(generated.themesEn.match(/^\| `[^`]+` \|/gm)).toHaveLength(24)
    expect(generated.themesZh.match(/^\| `[^`]+` \|/gm)).toHaveLength(24)
    for (const id of themeIds) {
      expect(generated.themesEn).toContain(`| ${id} |`)
      expect(generated.themesZh).toContain(`| ${id} |`)
    }
  })
})
