import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { LAYOUT_REGISTRY, type LayoutDefinition, type SlideType } from "@/layouts/registry"
import { CANONICAL_THEME_IDS, THEME_LABELS } from "@/themes"
import { THEME_OCCASIONS } from "@/themes/occasions"

export const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..")

const SLIDE_TYPES: readonly SlideType[] = ["cover", "chapter", "content", "ending"]
const SLIDE_TYPE_LABELS: Record<SlideType, { en: string; zh: string }> = {
  cover: { en: "Cover", zh: "封面" },
  chapter: { en: "Chapter", zh: "章节" },
  content: { en: "Content", zh: "内容" },
  ending: { en: "Ending", zh: "结尾" },
}

type Locale = "en" | "zh"
type GeneratedSection = "layouts" | "themes"

function listWords(words: readonly string[], locale: Locale): string {
  if (locale === "zh") return words.join("、")
  if (words.length <= 1) return words[0] ?? ""
  if (words.length === 2) return `${words[0]} and ${words[1]}`
  return `${words.slice(0, -1).join(", ")}, and ${words.at(-1)}`
}

function slotDetail(slot: LayoutDefinition["slots"][number], locale: Locale): string | undefined {
  const accepts = slot.accepts === "any"
    ? locale === "zh" ? "任意组件" : "any component"
    : slot.accepts.length > 0
      ? locale === "zh"
        ? `${listWords(slot.accepts.map((type) => `\`${type}\``), locale)} 组件`
        : slot.accepts.length === 1
          ? `a ${listWords(slot.accepts.map((type) => `\`${type}\``), locale)} component`
          : `${listWords(slot.accepts.map((type) => `\`${type}\``), locale)} components`
      : undefined

  if (accepts === undefined && slot.capacity === undefined) return undefined
  const name = `\`${slot.name}\``
  if (locale === "zh") {
    const accepted = accepts === undefined ? "承载派生内容" : `接收 ${accepts}`
    const capacity = slot.capacity === undefined ? "" : `，容量 ${slot.capacity}`
    return `${name} 槽${accepted}${capacity}`
  }

  const accepted = accepts === undefined ? "holds derived content" : `accepts ${accepts}`
  const capacity = slot.capacity === undefined ? "" : ` with capacity ${slot.capacity}`
  return `the ${name} slot ${accepted}${capacity}`
}

function layoutUse(layout: LayoutDefinition, locale: Locale): string {
  const slotNames = layout.slots.map((slot) => `\`${slot.name}\``)
  const details = layout.slots
    .map((slot) => slotDetail(slot, locale))
    .filter((detail): detail is string => detail !== undefined)

  if (locale === "zh") {
    const base = `提供 ${listWords(slotNames, locale)} 槽位`
    return details.length === 0 ? `${base}。` : `${base}，其中 ${listWords(details, locale)}。`
  }

  const slotLabel = slotNames.length === 1 ? "slot" : "slots"
  const base = `Provides ${listWords(slotNames, locale)} ${slotLabel}`
  return details.length === 0 ? `${base}.` : `${base}, where ${listWords(details, locale)}.`
}

function layoutCapacity(layout: LayoutDefinition): string {
  const capacities = layout.slots.flatMap((slot) => slot.capacity === undefined ? [] : [slot.capacity])
  return capacities.length === 0 ? "n/a" : String(capacities.reduce((sum, value) => sum + value, 0))
}

function standardLayouts(): LayoutDefinition[] {
  const layouts = Object.values(LAYOUT_REGISTRY).filter((layout) => layout.kind === "archetype")
  if (layouts.length !== 130) {
    throw new Error(`expected 130 standard layouts, found ${layouts.length}`)
  }
  for (const layout of layouts) {
    if (layout.slideTypes.length !== 1) {
      throw new Error(`standard layout ${layout.id} must belong to exactly one page type`)
    }
  }
  return layouts
}

function renderLayouts(locale: Locale): string {
  const lines = [
    locale === "zh" ? "### 标准版式全量表" : "### Complete standard-layout catalog",
    "",
    locale === "zh"
      ? "本段由版式 registry 与每个版式的 slots 元数据生成。`capacity` 是所有已声明槽位容量之和，`n/a` 表示该版式没有声明可计数容量。"
      : "This section is generated from the layout registry and each layout's slot metadata. `capacity` is the sum of declared slot capacities. `n/a` means the layout declares no countable capacity.",
  ]

  const layouts = standardLayouts()
  for (const slideType of SLIDE_TYPES) {
    lines.push("", `#### ${SLIDE_TYPE_LABELS[slideType][locale]}`, "")
    lines.push(locale === "zh"
      ? "| id | pinOnly | capacity | 一句话用途 |"
      : "| id | pinOnly | capacity | one-sentence use |")
    lines.push("| --- | --- | ---: | --- |")
    for (const layout of layouts.filter((candidate) => candidate.slideTypes[0] === slideType)) {
      const pinOnly = locale === "zh" ? layout.pinOnly ? "是" : "否" : layout.pinOnly ? "yes" : "no"
      lines.push(`| \`${layout.id}\` | ${pinOnly} | ${layoutCapacity(layout)} | ${layoutUse(layout, locale)} |`)
    }
  }
  return lines.join("\n")
}

function renderThemes(locale: Locale): string {
  const lines = [
    locale === "zh" ? "### 内置主题全量表" : "### Complete built-in theme catalog",
    "",
    locale === "zh"
      ? "本段由 canonical theme registry 与场合路由表生成。`identity` 表示视觉个性强度。"
      : "This section is generated from the canonical theme registry and occasion routing table. `identity` is the strength of the visual voice.",
    "",
    locale === "zh"
      ? "| id | label | occasions | identity |"
      : "| id | label | occasions | identity |",
    "| --- | --- | --- | --- |",
  ]
  for (const id of CANONICAL_THEME_IDS) {
    const route = THEME_OCCASIONS[id]
    lines.push(`| \`${id}\` | ${THEME_LABELS[id]} | ${route.occasions.join(", ")} | ${route.identity} |`)
  }
  return lines.join("\n")
}

export function generatedReferenceFiles(): {
  layoutsEn: string
  layoutsZh: string
  themesEn: string
  themesZh: string
} {
  return {
    layoutsEn: renderLayouts("en"),
    layoutsZh: renderLayouts("zh"),
    themesEn: renderThemes("en"),
    themesZh: renderThemes("zh"),
  }
}

function replaceGeneratedSection(content: string, section: GeneratedSection, generated: string): string {
  const begin = `<!-- generated:begin ${section} -->`
  const end = `<!-- generated:end ${section} -->`
  const beginAt = content.indexOf(begin)
  const endAt = content.indexOf(end)
  if (beginAt === -1 || endAt === -1 || endAt < beginAt) {
    throw new Error(`missing or invalid ${section} generated markers`)
  }
  const before = content.slice(0, beginAt + begin.length)
  const after = content.slice(endAt)
  return `${before}\n${generated}\n${after}`
}

interface RenderedReferenceFile {
  path: string
  relativePath: string
  content: string
}

export function renderSkillReferenceFiles(root = repoRoot): RenderedReferenceFile[] {
  const generated = generatedReferenceFiles()
  const targets: Array<{ relativePath: string; section: GeneratedSection; generated: string }> = [
    { relativePath: "skills/pptwise/references/layouts.md", section: "layouts", generated: generated.layoutsEn },
    { relativePath: "skills/pptwise/references/layouts.zh-CN.md", section: "layouts", generated: generated.layoutsZh },
    { relativePath: "skills/pptwise/references/spec.md", section: "themes", generated: generated.themesEn },
    { relativePath: "skills/pptwise/references/spec.zh-CN.md", section: "themes", generated: generated.themesZh },
  ]
  return targets.map((target) => {
    const path = join(root, target.relativePath)
    return {
      path,
      relativePath: relative(root, path),
      content: replaceGeneratedSection(readFileSync(path, "utf8"), target.section, target.generated),
    }
  })
}

export function writeSkillReferenceFiles(root = repoRoot): string[] {
  const changed: string[] = []
  for (const file of renderSkillReferenceFiles(root)) {
    const before = readFileSync(file.path, "utf8")
    if (before === file.content) continue
    writeFileSync(file.path, file.content)
    changed.push(file.relativePath)
  }
  return changed
}

export function checkSkillReferenceFiles(root = repoRoot): string[] {
  return renderSkillReferenceFiles(root)
    .filter((file) => readFileSync(file.path, "utf8") !== file.content)
    .map((file) => file.relativePath)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes("--check")) {
    const drifted = checkSkillReferenceFiles()
    if (drifted.length > 0) {
      throw new Error(`generated SKILL references drifted: ${drifted.join(", ")}`)
    }
    console.log("generated SKILL references are current")
  } else {
    const changed = writeSkillReferenceFiles()
    console.log(changed.length === 0
      ? "generated SKILL references were already current"
      : `generated SKILL references in ${changed.length} file(s): ${changed.join(", ")}`)
  }
}
