import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { KIND_VALUES, type PageKind } from "@/ir"
import { BUILTIN_THEME_FILES } from "@/themes"
import { THEME_PRESETS } from "@/themes/presets"
import type { Menu } from "@/themes/schema"

export const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..")

type Locale = "en" | "zh"
type GeneratedSection = "kinds" | "themes"

interface KindGuidance {
  en: { label: string; use: string; boundary: string }
  zh: { label: string; use: string; boundary: string }
}

const KIND_GUIDANCE = {
  points: {
    en: { label: "Points", use: "Advance an ordered argument whose sequence matters.", boundary: "Use list when the items are peers that can be reordered." },
    zh: { label: "要点", use: "按不可调换的顺序推进一组论点。", boundary: "并列条目可换序时用 list。" },
  },
  list: {
    en: { label: "List", use: "Present peer items whose order may change.", boundary: "Use points when the sequence carries the reasoning." },
    zh: { label: "清单", use: "并列陈列一组可以换序的条目。", boundary: "顺序承载论证时用 points。" },
  },
  comparison: {
    en: { label: "Comparison", use: "Place alternatives, sides, or dimensions in direct contrast.", boundary: "Containment belongs to hierarchy and direction belongs to process." },
    zh: { label: "对比", use: "把两边、多个方案或多个维度直接对照。", boundary: "包含关系用 hierarchy，有方向的变化用 process。" },
  },
  process: {
    en: { label: "Process", use: "Show directed steps, a timeline, or a closed cycle.", boundary: "An ordered argument without motion is points." },
    zh: { label: "流程", use: "表达有方向的步骤、时间线或闭环。", boundary: "只有论证递进而没有运动关系时用 points。" },
  },
  data: {
    en: { label: "Data", use: "Make a set of numbers, a chart, or a table the subject.", boundary: "Use fact when one number is the whole message." },
    zh: { label: "数据", use: "让一组数字、图表或表格成为页面主角。", boundary: "只有一个数字承担全部信息时用 fact。" },
  },
  photo: {
    en: { label: "Photo", use: "Make the image itself the content.", boundary: "Use evidence when an exhibit exists to support a claim." },
    zh: { label: "图像", use: "让画面本身成为内容。", boundary: "展品是为断言服务时用 evidence。" },
  },
  statement: {
    en: { label: "Statement", use: "Give the deck author's own proposition a full page.", boundary: "Words attributed to someone else are quote." },
    zh: { label: "宣言", use: "让作者自己的一句话立论占据整页。", boundary: "借别人之口时用 quote。" },
  },
  quote: {
    en: { label: "Quote", use: "Center words attributed to another speaker or source.", boundary: "The deck author's own proposition is statement." },
    zh: { label: "引用", use: "以他人或外部来源的话为中心。", boundary: "作者自己的立论用 statement。" },
  },
  fact: {
    en: { label: "Fact", use: "Build the page around one number.", boundary: "A numeric set whose structure matters is data." },
    zh: { label: "大数字", use: "让一个数字承担整页冲击。", boundary: "要看一组数字的结构时用 data。" },
  },
  evidence: {
    en: { label: "Evidence", use: "Pair one assertion with one exhibit that supports it.", boundary: "Use photo when the image stands on its own." },
    zh: { label: "单证据", use: "把一个断言与一件支持它的展品配对。", boundary: "画面自己就是内容时用 photo。" },
  },
  hierarchy: {
    en: { label: "Hierarchy", use: "Express containment, levels, or composition.", boundary: "Sequence belongs to process and side-by-side contrast to comparison." },
    zh: { label: "层级", use: "表达包含、层级或组成关系。", boundary: "先后关系用 process，并排对照用 comparison。" },
  },
} as const satisfies Record<PageKind, KindGuidance>

function offeredKinds(themeId: (typeof THEME_PRESETS)[number]["id"]): PageKind[] {
  const menu: Menu["content"] = BUILTIN_THEME_FILES[themeId].menu.content
  return KIND_VALUES.filter((kind) => menu[kind] !== undefined)
}

function renderKinds(locale: Locale): string {
  const lines = [
    locale === "zh" ? "### 讲法全量表" : "### Complete kind vocabulary",
    "",
    locale === "zh"
      ? "本段由 IR v5 的讲法词表与 24 个预设菜单生成。最后一列表示有多少预设菜单提供该讲法。"
      : "This section is generated from the IR v5 kind vocabulary and the 24 preset menus. The final column shows how many preset menus offer each kind.",
    "",
    locale === "zh"
      ? "| kind | 中文 | 何时使用 | 边界 | 预设菜单 |"
      : "| kind | name | use it when | boundary | preset menus |",
    "| --- | --- | --- | --- | ---: |",
  ]
  for (const kind of KIND_VALUES) {
    const copy = KIND_GUIDANCE[kind][locale]
    const offeredBy = THEME_PRESETS.filter((preset) => offeredKinds(preset.id).includes(kind)).length
    lines.push(`| \`${kind}\` | ${copy.label} | ${copy.use} | ${copy.boundary} | ${offeredBy}/24 |`)
  }
  return lines.join("\n")
}

function renderThemes(locale: Locale): string {
  const lines = [
    locale === "zh" ? "### 出厂预设全量表" : "### Complete factory preset catalog",
    "",
    locale === "zh"
      ? "本段由预设库及每个预设的菜单生成。`identity` 表示视觉个性强度。`菜单词数` 与最后一列都只计算内容页讲法。"
      : "This section is generated from the preset library and each preset menu. `identity` is the strength of the visual voice. `menu words` and the final column count content kinds only.",
    "",
    locale === "zh"
      ? "| id | label | occasions | identity | 菜单词数 | 提供的 kind |"
      : "| id | label | occasions | identity | menu words | offered kinds |",
    "| --- | --- | --- | --- | ---: | --- |",
  ]
  for (const preset of THEME_PRESETS) {
    const kinds = offeredKinds(preset.id)
    lines.push(
      `| \`${preset.id}\` | ${preset.label} | ${preset.occasions.join(", ")} | ${preset.identity} | ${kinds.length} | ${kinds.map((kind) => `\`${kind}\``).join(", ")} |`,
    )
  }
  return lines.join("\n")
}

export function generatedReferenceFiles(): {
  kindsEn: string
  kindsZh: string
  themesEn: string
  themesZh: string
} {
  return {
    kindsEn: renderKinds("en"),
    kindsZh: renderKinds("zh"),
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
    { relativePath: "skills/pptwise/references/layouts.md", section: "kinds", generated: generated.kindsEn },
    { relativePath: "skills/pptwise/references/layouts.zh-CN.md", section: "kinds", generated: generated.kindsZh },
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
