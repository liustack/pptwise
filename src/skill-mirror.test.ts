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
    for (const heading of ["### 1. Intent", "### 2. Narrative", "### 3. Bind a theme", "### 4. Write the spec with `kind`", "### 5. Fill pages", "### 6. Build, review, and deliver"]) {
      expect(en).toContain(heading)
    }
  })

  it("talks to the user in their language from the first message to the last", () => {
    const en = read(EN_REL)
    const zh = read(ZH_REL)
    expect(en).toContain("Write every message to the user in the language they wrote in, from the first status line to the final answer.")
    expect(en).toContain("- Talk to the user in their language throughout, including progress notes and questions")
    expect(zh).toContain("给用户的每一条消息都用他写话所用的语言，从第一句进度说明到最后的回答。")
    expect(zh).toContain("- 和用户说话始终用他的语言，进度说明和提问也一样")
  })

  it("lists the outline page by page before any page is written, even when the user said to go ahead", () => {
    const en = read(EN_REL)
    const zh = read(ZH_REL)
    expect(en).toContain("Before you write any page file, list it in the conversation, one line per page: page number, page type or `kind`, heading, and what the page says.")
    expect(en).toContain("This step is never skipped")
    expect(en).toContain("When the user said to go ahead or let you decide, list the outline and continue in the same reply.")
    expect(zh).toContain("写任何页面文件之前，先在对话里逐页列出：页码、页型或 `kind`、标题、这一页讲什么。")
    expect(zh).toContain("这一步不论 deck 多短都不能省。")
    expect(zh).toContain("用户说了直接做或让你定，就列出大纲，在同一条回复里接着做。")
  })

  it("shows the outline as a card where the harness has one, and asks through its question tool", () => {
    const en = read(EN_REL)
    const zh = read(ZH_REL)
    expect(en).toContain("When a `pptwise_outline` tool exists, call it on the deck directory too, so the user sees the same list as a card.")
    expect(en).toContain("with `ask_user_question` when that tool exists")
    expect(zh).toContain("有 `pptwise_outline` 工具时，同时对 deck 目录调用它，让用户以卡片看到同一份列表。")
    expect(zh).toContain("有 `ask_user_question` 工具时用它来问")
  })

  it("shows the user the theme and the outline, checks through build, and delivers its one file", () => {
    const en = read(EN_REL)
    const zh = read(ZH_REL)
    // The theme wall comes from the tool where there is one, and from the CLI
    // with the user's own title everywhere else.
    for (const text of [en, zh]) {
      expect(text).toContain("`pptwise_themes`")
      expect(text).toContain('pptwise theme try --title "<cover title>" --subtitle "<subtitle>" --occasion <words> --json')
      expect(text).toContain("`occasion`")
      expect(text).toContain("`pptwise_outline`")
      expect(text).toContain("`pptwise_build`")
      expect(text).toContain("pptwise build deck-dir/ --json")
      expect(text).toContain("`present`")
      // The old five-command tail is gone from the playbook: build runs it.
      expect(text).not.toMatch(/^pptwise render deck-dir\/$/m)
      expect(text).not.toMatch(/^pptwise audit deck-dir\/$/m)
    }
    expect(en).toContain("One decision stops for the user: the outline, which also names the theme: the one the user named, or the one you picked and why.")
    expect(en).toContain("Never convert pages to PNG or read page images to judge them")
    expect(en).toContain("Deliver exactly that file. Do not run `render` again, copy, rename, or export another `.pptx`.")
    expect(zh).toContain("只有一处停下来等用户：大纲，大纲里同时写明主题：用户点名的那个，或者你选的那个和理由。")
    expect(zh).toContain("不要把页面转成 PNG 或读页面图片来判断")
    expect(zh).toContain("只交付这一份文件。")
    for (const rel of [REF("validate.md"), REF("validate.zh-CN.md")]) {
      expect(read(rel)).toContain("pptwise build deck-dir/ --json")
    }
  })

  it("picks the theme by occasion, draws a wall only on request, and switches theme by its name", () => {
    const en = read(EN_REL)
    const zh = read(ZH_REL)
    expect(en).toContain("Otherwise pick the theme yourself.")
    expect(en).toContain("It is their choice: give no reason for it, and build with `--no-alternatives` (`alternatives: false` on the `pptwise_build` tool)")
    expect(en).toContain("Draw a theme wall only when the user asks to see looks before choosing")
    expect(en).toContain("To switch later, change only `theme` in `deck.spec.json` and build again.")
    expect(en).toContain("Name them in one line and keep going: do not stop to ask.")
    expect(en).toContain("When the user asks for other colors without naming one, fork two or three fitting colors")
    expect(zh).toContain("否则主题由你来挑。")
    expect(zh).toContain("这是用户自己的选择：不写理由，build 时加 `--no-alternatives`（`pptwise_build` 工具传 `alternatives: false`）")
    expect(zh).toContain("只有用户想先看看有哪些样子再选")
    expect(zh).toContain("之后要换主题，只改 `deck.spec.json` 里的 `theme`，再 build 一次。")
    expect(zh).toContain("用一句话提一下就继续，不要停下来问。")
    expect(zh).toContain("用户想换个颜色又没说哪种时，先 fork 两三个合适的配色")
    for (const text of [en, zh]) {
      expect(text).toContain("`alternatives`")
      expect(text).toContain("`drawnAs`")
      // A kind the menu lacks is no longer a reason to rewrite the spec.
      expect(text).not.toMatch(/hard error that lists what the menu offers|会硬报错，并列出菜单提供的词/)
    }
  })

  it("reads live schemas and workspace theme signals before authoring", () => {
    for (const rel of [EN_REL, ZH_REL]) {
      const text = read(rel)
      expect(text).toContain("pptwise schema --spec")
      expect(text).toContain("pptwise narratives --json")
      expect(text).toContain("pptwise themes --json")
      // The whole IR schema is never an opening read: the component contract
      // is read one page at a time while filling, one component expanded on
      // demand, the page drawn when its fit is in doubt, and icons come from
      // their own list.
      expect(text).not.toMatch(/^pptwise schema$/m)
      expect(text).toContain("pptwise inspect deck-dir/ --page <id>")
      expect(text).toContain("pptwise inspect deck-dir/ --page <id> --component <type>")
      expect(text).toContain("pptwise inspect deck-dir/ --page <id> --fit")
      expect(text).toContain("pptwise icons")
      expect(text).toContain("deck.spec.json")
      expect(text).toContain("theme.json")
      expect(text).toContain("themes/")
    }
  })

  it("installs content packs at setup, never per deck, and resolves names in four levels", () => {
    for (const rel of [EN_REL, ZH_REL]) {
      const text = read(rel)
      // `packs sync` writes the pptwise home folder, and making a deck must
      // not, so it is an installation step: named before the per-deck
      // commands, and never one of them.
      expect(text).not.toMatch(/^pptwise packs sync$/m)
      expect(text.indexOf("`pptwise packs sync`")).toBeGreaterThan(-1)
      expect(text.indexOf("`pptwise packs sync`")).toBeLessThan(text.indexOf("pptwise schema --spec"))
      expect(text).toMatch(/(Never run `license set` or `packs sync` as part of a deck task|不要在 deck 任务里运行 `license set` 或 `packs sync`)/)
    }
    expect(read(EN_REL)).toMatch(/2\. A workspace `themes\/` directory.*\n3\. Installed content packs.*\n4\. The 24 factory presets\./)
    expect(read(ZH_REL)).toMatch(/2\. 从当前目录向上查找工作区 `themes\/`。\n3\. 已装的内容包.*\n4\. 24 个出厂预设。/)
    for (const rel of [REF("spec.md"), REF("spec.zh-CN.md")]) {
      expect(read(rel)).toMatch(/\n3\. (Installed content packs|已装的内容包).*\n4\. /)
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
    // `--theme` was the retired render-time theme switch. The one place it
    // may appear is `pptwise schema --kind`, where it names the bound theme
    // whose face answers the query, not a render override.
    for (const file of listSkillMarkdown()) {
      const lines = readFileSync(file.abs, "utf8").split("\n").filter((line) => !/^pptwise schema --kind /.test(line))
      expect(lines.join("\n"), `${file.rel} exposes render --theme`).not.toMatch(/(?:^|\s)--theme(?:\s|=|$)/m)
    }
  })

  it("mirrors all eleven generated kind rows", () => {
    const en = tableFirstColumn(read(REF("layouts.md")), "| kind | name |")
    const zh = tableFirstColumn(read(REF("layouts.zh-CN.md")), "| kind | 中文 |")
    expect(en).toEqual([...KIND_VALUES])
    expect(zh).toEqual(en)
  })

  it("mirrors the complete component ownership table", () => {
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

  it("keeps the twelve full-body components aligned with code", () => {
    const enComponents = codeTokensOnLine(read(REF("components.md")), "are full-body components")
    const zhComponents = codeTokensOnLine(read(REF("components.zh-CN.md")), "是全页组件")
    const enDensity = codeTokensOnLine(read(REF("density.md")), "components own the whole body")
    const zhDensity = codeTokensOnLine(read(REF("density.zh-CN.md")), "种组件独占整个正文区")
    const expected = new Set(FULL_BODY_TYPES)
    expect(new Set(enComponents)).toEqual(expected)
    expect(new Set(zhComponents)).toEqual(expected)
    expect(new Set(enDensity)).toEqual(expected)
    expect(new Set(zhDensity)).toEqual(expected)
  })

  it("pins theme creation, comparison, binding, and menu mismatch handling", () => {
    for (const rel of [REF("spec.md"), REF("spec.zh-CN.md")]) {
      const text = read(rel)
      expect(text).toContain("pptwise theme try brief,swiss,memo")
      expect(text).toContain("pptwise theme new --from brief --id acme-report")
      expect(text).toContain("pptwise brand extract corp.pptx -o themes/acme.theme.json --from bulletin")
      expect(text).toContain("pptwise theme fork acme --brand '#0B5FFF' --id acme-blue")
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
