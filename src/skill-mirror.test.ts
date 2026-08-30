import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"

import { COMPONENT_TYPES, KIND_VALUES } from "./ir"
import { FULL_BODY_TYPES } from "./render/component-traits"

const ROOT = process.cwd()
const SKILL_ROOT_REL = "skills/pptwise"
const EN_REL = `${SKILL_ROOT_REL}/SKILL.md`
const ZH_REL = `${SKILL_ROOT_REL}/SKILL.zh-CN.md`
const REF = (name: string) => `${SKILL_ROOT_REL}/references/${name}`

const REFERENCE_NAMES = [
  "spec",
  "layouts",
  "components",
  "density",
  "branding",
  "images",
  "validate",
] as const

const EXPECTED_EN_REL = [
  "SKILL.md",
  ...REFERENCE_NAMES.map((name) => `references/${name}.md`),
] as const

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8")
}

function frontmatter(text: string): string {
  const match = text.match(/^---\n([\s\S]*?)\n---/)
  if (!match) throw new Error("no frontmatter block found")
  return match[1]!
}

function wcL(text: string): number {
  if (text.length === 0) return 0
  const body = text.endsWith("\n") ? text.slice(0, -1) : text
  return body.split("\n").length
}

function posixRel(from: string, to: string): string {
  return relative(from, to).split("\\").join("/")
}

function listSkillMarkdown(): { abs: string; rel: string }[] {
  const root = join(ROOT, SKILL_ROOT_REL)
  const out: { abs: string; rel: string }[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name)
      if (entry.isDirectory()) walk(abs)
      if (entry.isFile() && entry.name.endsWith(".md")) {
        out.push({ abs, rel: posixRel(root, abs) })
      }
    }
  }
  walk(root)
  return out.sort((a, b) => a.rel.localeCompare(b.rel))
}

function zhSiblingRel(enRel: string): string {
  return `${enRel.slice(0, -".md".length)}.zh-CN.md`
}

function tableFirstColumn(text: string, headerPrefix: string): string[] {
  const lines = text.split("\n")
  const header = lines.findIndex((line) => line.startsWith(headerPrefix))
  if (header === -1) throw new Error(`table header not found: ${headerPrefix}`)
  const tokens: string[] = []
  for (let index = header + 2; index < lines.length && lines[index]!.startsWith("|"); index++) {
    const match = lines[index]!.match(/^\|\s*`([^`]+)`\s*\|/)
    if (match) tokens.push(match[1]!)
  }
  return tokens
}

function codeTokensOnLine(text: string, fragment: string): string[] {
  const line = text.split("\n").find((candidate) => candidate.includes(fragment))
  if (!line) throw new Error(`line not found: ${fragment}`)
  return [...line.matchAll(/`([a-z_]+)`/g)].map((match) => match[1]!)
}

function pptwiseCommands(text: string): string[] {
  return [...text.matchAll(/^pptwise .+$/gm)].map((match) => match[0].trimEnd())
}

describe("pptwise SKILL model and bilingual mirrors", () => {
  it("registers only the English SKILL", () => {
    expect(existsSync(join(ROOT, EN_REL))).toBe(true)
    expect(existsSync(join(ROOT, ZH_REL))).toBe(true)
    expect(frontmatter(read(EN_REL))).toMatch(/^name:\s*pptwise\s*$/m)
    expect(frontmatter(read(ZH_REL))).not.toMatch(/^name:/m)
  })

  it("keeps a closed English reference set with one Chinese mirror each", () => {
    const files = listSkillMarkdown()
    const english = files.filter((file) => !file.rel.endsWith(".zh-CN.md"))
    expect(english.map((file) => file.rel).sort()).toEqual([...EXPECTED_EN_REL].sort())

    for (const file of english) {
      const sibling = zhSiblingRel(file.rel)
      expect(existsSync(join(ROOT, SKILL_ROOT_REL, sibling)), `missing ${sibling}`).toBe(true)
    }

    for (const file of files.filter((candidate) => candidate.rel.endsWith(".zh-CN.md"))) {
      const fm = frontmatter(readFileSync(file.abs, "utf8"))
      expect(fm, `${file.rel} must declare mirror_of`).toMatch(/^mirror_of:/m)
      expect(fm, `${file.rel} must not register a skill`).not.toMatch(/^name:/m)
    }
  })

  it("keeps the main playbooks concise enough to stay operational", () => {
    expect(wcL(read(EN_REL))).toBeLessThanOrEqual(180)
    expect(wcL(read(ZH_REL))).toBeLessThanOrEqual(180)
  })

  it("pins the serial authoring chain in both languages", () => {
    const en = read(EN_REL)
    const zh = read(ZH_REL)
    expect(en).toContain("intent -> narrative -> theme binding -> spec with kind -> fill -> render")
    expect(zh).toContain("意图 -> 叙事 -> 主题绑定 -> 带 kind 的 spec -> 填充 -> 渲染")
    for (const heading of ["### 1. Intent", "### 2. Narrative", "### 3. Bind a theme", "### 4. Write the spec with `kind`", "### 5. Fill pages", "### 6. Audit, review, and render"]) {
      expect(en).toContain(heading)
    }
  })

  it("reads live schemas and workspace theme signals before authoring", () => {
    for (const rel of [EN_REL, ZH_REL]) {
      const text = read(rel)
      expect(text).toContain("pptwise schema")
      expect(text).toContain("pptwise schema --spec")
      expect(text).toContain("pptwise narratives --json")
      expect(text).toContain("pptwise themes --json")
      expect(text).toContain("deck.spec.json")
      expect(text).toContain("theme.json")
      expect(text).toContain("themes/")
    }
  })

  it("keeps launcher and pinned fallback commands synchronized", () => {
    const launcherLines = (text: string) =>
      [...text.matchAll(/^(?:bash|powershell) [^\n]*run\.(?:sh|ps1)[^\n]*$/gm)].map((match) => match[0])
    const fallbackCommands = (text: string) =>
      [...text.matchAll(/^\d+\. .*`((?:npx --yes --package|bunx --bun) [^`]+)`.*$/gm)].map((match) => match[1]!)
    const en = read(EN_REL)
    const zh = read(ZH_REL)
    expect(launcherLines(en)).toHaveLength(2)
    expect(launcherLines(zh)).toEqual(launcherLines(en))
    expect(fallbackCommands(en)).toHaveLength(2)
    expect(fallbackCommands(zh)).toEqual(fallbackCommands(en))
  })

  it("keeps retired authoring vocabulary out of the public workflow", () => {
    const retired = /pinOnly|pin-only|\bsparse\b|\barrangement\b|\bseed\b|\bbeat\b/i
    for (const rel of [
      EN_REL,
      ZH_REL,
      REF("spec.md"),
      REF("spec.zh-CN.md"),
      REF("layouts.md"),
      REF("layouts.zh-CN.md"),
    ]) {
      expect(read(rel), `${rel} exposes retired author vocabulary`).not.toMatch(retired)
    }
    expect(read(REF("layouts.md"))).not.toMatch(/layout id/i)
    expect(read(REF("layouts.zh-CN.md"))).not.toMatch(/版式 id/i)
    for (const file of listSkillMarkdown()) {
      expect(readFileSync(file.abs, "utf8"), `${file.rel} exposes render --theme`).not.toMatch(
        /(?:^|\s)--theme(?:\s|=|$)/m,
      )
    }
  })

  it("mirrors all eleven generated kind rows", () => {
    const en = tableFirstColumn(read(REF("layouts.md")), "| kind | name |")
    const zh = tableFirstColumn(read(REF("layouts.zh-CN.md")), "| kind | 中文 |")
    expect(en).toEqual([...KIND_VALUES])
    expect(zh).toEqual(en)
  })

  it("mirrors the complete 37-component ownership table", () => {
    const en = tableFirstColumn(read(REF("components.md")), "| component |")
    const zh = tableFirstColumn(read(REF("components.zh-CN.md")), "| component |")
    expect(en).toEqual([...COMPONENT_TYPES])
    expect(zh).toEqual(en)
  })

  it("keeps blockquote in component space and quote in kind space", () => {
    const en = read(REF("components.md"))
    const zh = read(REF("components.zh-CN.md"))
    expect(en).toContain("The component type is `blockquote`. The page kind is `quote`.")
    expect(zh).toContain("组件类型叫 `blockquote`。页面讲法叫 `quote`。")
    expect(COMPONENT_TYPES).toContain("blockquote")
    expect(COMPONENT_TYPES).not.toContain("quote")
    expect(KIND_VALUES).toContain("quote")
  })

  it("keeps the eight full-body components aligned with code", () => {
    const enComponents = codeTokensOnLine(read(REF("components.md")), "are full-body components")
    const zhComponents = codeTokensOnLine(read(REF("components.zh-CN.md")), "是全页组件")
    const enDensity = codeTokensOnLine(read(REF("density.md")), "Eight components own the whole body")
    const zhDensity = codeTokensOnLine(read(REF("density.zh-CN.md")), "八种组件独占整个正文区")
    const expected = new Set(FULL_BODY_TYPES)
    expect(new Set(enComponents)).toEqual(expected)
    expect(new Set(zhComponents)).toEqual(expected)
    expect(new Set(enDensity)).toEqual(expected)
    expect(new Set(zhDensity)).toEqual(expected)
  })

  it("pins theme creation, comparison, binding, and menu mismatch handling", () => {
    for (const rel of [REF("spec.md"), REF("spec.zh-CN.md")]) {
      const text = read(rel)
      expect(text).toContain("pptwise theme try consulting,swiss,memo")
      expect(text).toContain("pptwise theme new --from consulting --id acme-report")
      expect(text).toContain("pptwise brand extract corp.pptx -o themes/acme.theme.json --from consulting")
      expect(text).toContain("pptwise theme fork acme --primary '#0B5FFF' --id acme-blue")
      expect(text).toContain("theme.json")
      expect(text).toContain("kind")
    }
  })

  it("keeps stock-image and live-review operational commands", () => {
    for (const rel of [REF("images.md"), REF("images.zh-CN.md")]) {
      const text = read(rel)
      expect(text).toContain("pptwise asset-brief")
      expect(text).toContain("pptwise images search")
      expect(text).toContain("pptwise images fetch")
      expect(text).toContain("pptwise images generate")
      expect(text).toContain("pptwise config set pexels.apiKey")
    }
    for (const rel of [REF("validate.md"), REF("validate.zh-CN.md")]) {
      const text = read(rel)
      expect(text).toContain("pptwise preview deck-dir/ --html")
      expect(text).toContain("pptwise serve deck-dir/ --no-open")
      expect(text).toContain("localhost")
    }
  })

  it("pins deck branding posture and page-level brand silence", () => {
    for (const rel of [REF("branding.md"), REF("branding.zh-CN.md")]) {
      const text = read(rel)
      expect(text).toContain("`full`")
      expect(text).toContain("`cover-only`")
      expect(text).toContain("`minimal`")
      expect(text).toContain("branding: \"none\"")
      expect(text).toContain("brand: \"none\"")
      expect(text).toContain("theme.json")
    }
  })

  it("keeps invariant CLI lines synchronized in every reference pair", () => {
    let commandCount = 0
    for (const name of REFERENCE_NAMES) {
      const en = pptwiseCommands(read(REF(`${name}.md`)))
      const zh = pptwiseCommands(read(REF(`${name}.zh-CN.md`)))
      commandCount += en.length
      expect(zh, `${name} command lines drifted`).toEqual(en)
    }
    expect(commandCount).toBeGreaterThan(0)
  })

  it("indexes every reference and keeps a local read trigger", () => {
    const enSkill = read(EN_REL)
    const zhSkill = read(ZH_REL)
    for (const name of REFERENCE_NAMES) {
      expect(read(REF(`${name}.md`))).toContain("Read this")
      expect(read(REF(`${name}.zh-CN.md`))).toContain("何时读")
      expect(enSkill).toContain(`references/${name}.md`)
      expect(zhSkill).toContain(`references/${name}.md`)
    }
    expect(enSkill).not.toMatch(/\bshaping\b/i)
    expect(zhSkill).not.toMatch(/\bshaping\b/i)
    expect(read(REF("spec.md"))).not.toContain("typeScale")
    expect(read(REF("spec.zh-CN.md"))).not.toContain("typeScale")
  })
})
