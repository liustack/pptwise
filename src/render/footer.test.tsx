// @vitest-environment node
//
// The deck footer across the built-in themes: no marks unless the deck asks,
// the same marks in the same places when it does, page numbers on content
// pages only, confidentiality words in the deck's language, and the cover's
// top-left mark on every theme's cover.
import { describe, expect, it } from "vitest"
import { renderSlideSvg, validateIr } from "@/api"
import type { PptxIR } from "@/ir"
import { auditDeck } from "../audit/deck-audit"
import { installNodePlatform } from "../platform/node"
import { CANONICAL_THEME_IDS } from "../themes"
import { parseSvgRoot } from "./serialize"

installNodePlatform()

const ORG = "华东区域运营中心"
const DATE = "2026-08-30"
const VERSION = "v2.1"

function zhDeck(theme: string, extra: Record<string, unknown> = {}, meta: Record<string, unknown> = {}): PptxIR {
  const result = validateIr({
    version: "5",
    theme: { id: theme },
    meta: { organization: ORG, date: DATE, version: VERSION, confidentiality: "confidential", authors: [{ name: "王晓明" }], ...meta },
    slides: [
      { type: "cover", heading: "2026 年门店网络调整方案", subheading: "董事会审议稿" },
      { type: "content", kind: "points", heading: "三项调整的理由", components: [{ type: "bullets", items: ["客流向核心商圈集中", "租金成本连续两年上涨", "线上订单占比过半"] }] },
      { type: "chapter", heading: "调整路径" },
      { type: "content", kind: "points", heading: "分三步关店", components: [{ type: "bullets", items: ["先关亏损店", "再并邻近店", "最后迁址"] }] },
      { type: "ending", heading: "谢谢" },
    ],
    ...extra,
  })
  if (!result.ok) throw new Error(result.errors.map((e) => `${e.path}: ${e.message}`).join("\n"))
  return result.ir!
}

function enDeck(theme: string, extra: Record<string, unknown> = {}): PptxIR {
  const result = validateIr({
    version: "5",
    theme: { id: theme },
    meta: { organization: "Acme Holdings", confidentiality: "confidential" },
    slides: [
      { type: "cover", heading: "Investor Presentation" },
      { type: "content", kind: "points", heading: "Why now", components: [{ type: "bullets", items: ["Demand is back", "Costs are down"] }] },
      { type: "ending", heading: "Thank you" },
    ],
    ...extra,
  })
  if (!result.ok) throw new Error(result.errors.map((e) => `${e.path}: ${e.message}`).join("\n"))
  return result.ir!
}

const page = (ir: PptxIR, index: number) => parseSvgRoot(renderSlideSvg(ir, index))
const texts = (root: Element) => Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "")
const CONTENT_PAGES = [1, 3]
const ALL_MARKS = {
  page_number: true,
  organization: true,
  label: "2026 年中期业绩 | 2026.08",
  draft: "讨论稿",
  confidentiality: "footer",
}

/** A footer rule: a horizontal line on the footer divider, anywhere across the page. */
const footerRules = (root: Element) =>
  Array.from(root.querySelectorAll("line")).filter((l) => l.getAttribute("y1") === "664" && l.getAttribute("y2") === "664")

describe("no footer by default", () => {
  // Representative of every way a footer used to reach a page: the shared
  // footer (swiss, thesis), a motif that is the footer (brief), a motif that
  // printed the organization and date (ink), a motif that printed the month
  // (journal), notebook lines in the footer strip (homeroom), a board frame
  // that shrinks for the footer (lecture), and the static page number of the
  // narrow column (almanac, swiss).
  const THEMES = ["swiss", "thesis", "brief", "ink", "journal", "homeroom", "lecture", "almanac"] as const

  it.each(THEMES)("%s: content pages carry no organization, date, version, mark, page number or footer rule", (theme) => {
    for (const branding of [undefined, "cover-only", "minimal"] as const) {
      const ir = zhDeck(theme, branding ? { branding } : {})
      for (const index of CONTENT_PAGES) {
        const root = page(ir, index)
        const words = texts(root)
        const where = `${theme} ${String(branding)} page ${index + 1}`
        expect(words.some((t) => t.includes(ORG)), `${where}: organization`).toBe(false)
        expect(words.some((t) => t.includes(DATE) || t.includes("2026") || t.includes("八月")), `${where}: date`).toBe(false)
        expect(words.some((t) => t.includes(VERSION)), `${where}: version`).toBe(false)
        expect(words.some((t) => /内部资料|Confidential/.test(t)), `${where}: confidentiality`).toBe(false)
        // A page number: the page's own number, as digits, low on the page
        // (list numbering higher up is content, not a page number).
        const own = new Set([String(index + 1), String(index + 1).padStart(2, "0")])
        const lowNumbers = Array.from(root.querySelectorAll("text")).filter(
          (t) => own.has((t.textContent ?? "").trim()) && Number(t.getAttribute("y")) >= 560,
        )
        expect(lowNumbers, `${where}: page number`).toHaveLength(0)
        expect(root.querySelector("[data-footer]"), `${where}: footer row`).toBeNull()
        expect(root.querySelector("[data-field]"), `${where}: field`).toBeNull()
        expect(footerRules(root), `${where}: footer rule`).toHaveLength(0)
      }
    }
  })

  it.each(CANONICAL_THEME_IDS)("%s: no page carries a footer row or a cover mark", (theme) => {
    const ir = zhDeck(theme)
    ir.slides.forEach((_slide, index) => {
      const root = page(ir, index)
      expect(root.querySelector("[data-footer]"), `${theme} page ${index + 1}`).toBeNull()
      expect(root.querySelector("[data-cover-mark]"), `${theme} page ${index + 1}`).toBeNull()
      expect(root.querySelector("[data-field]"), `${theme} page ${index + 1}`).toBeNull()
    })
  })
})

describe("the footer row, when the deck asks for it", () => {
  // memo, clinic, almanac, homeroom, ember, rally, proposal and thesis set their folios rather than printing the shared row: their own cases below.
  const OWN_FOLIO_THEMES = new Set(["memo", "clinic", "almanac", "homeroom", "ember", "rally", "proposal", "thesis"])
  const SHARED_ROW_THEMES = CANONICAL_THEME_IDS.filter((theme) => !OWN_FOLIO_THEMES.has(theme))

  it.each(SHARED_ROW_THEMES)("%s: every mark in its place, on content pages only", (theme) => {
    const ir = zhDeck(theme, { footer: ALL_MARKS })
    ir.slides.forEach((slide, index) => {
      const root = page(ir, index)
      const numbers = root.querySelectorAll('[data-field="slidenum"]')
      if (slide.type !== "content") {
        expect(numbers, `${theme} ${slide.type}: page number`).toHaveLength(0)
        expect(root.querySelector("[data-footer]"), `${theme} ${slide.type}: footer row`).toBeNull()
        return
      }
      const row = root.querySelector('[data-footer="row"]')
      expect(row, `${theme} page ${index + 1}`).not.toBeNull()
      const [left, right, number] = Array.from(row!.querySelectorAll("text"))
      // Left corner: organization (or not, when the theme's motif sets it
      // elsewhere), then the author's own label.
      const leftText = left!.textContent ?? ""
      expect(leftText.endsWith("2026 年中期业绩 | 2026.08"), theme).toBe(true)
      expect(left!.getAttribute("x")).toBe("96")
      // Right corner: draft mark and confidentiality, then the number.
      expect(right!.textContent).toBe("讨论稿 · 内部资料，请勿外传")
      expect(right!.getAttribute("text-anchor")).toBe("end")
      expect(Number(right!.getAttribute("x"))).toBeLessThan(1184)
      expect(number!.textContent).toBe(String(index + 1))
      expect(number!.getAttribute("data-field")).toBe("slidenum")
      expect([number!.getAttribute("x"), number!.getAttribute("text-anchor")]).toEqual(["1184", "end"])
      for (const t of [left!, right!, number!]) {
        expect(t.getAttribute("y"), theme).toBe("694")
        expect(t.getAttribute("font-size"), theme).toBe("16")
        expect(t.getAttribute("data-contrast-tier"), theme).toBe("meta")
      }
      // The organization appears exactly once on the page, wherever the
      // theme sets it (ink sets it down its colophon rail).
      const all = Array.from(root.querySelectorAll("text"))
      const inColumn = (t: Element) => t.getAttribute("x") === "1244"
      const orgInLines = all.filter((t) => !inColumn(t) && (t.textContent ?? "").includes(ORG)).length
      const orgInColumn = all.filter(inColumn).map((t) => t.textContent).join("").includes(ORG) ? 1 : 0
      expect(orgInLines + orgInColumn, `${theme}: organization once`).toBe(1)
    })
  })

  it("memo: every mark typed in its folio and running head, on content pages only", () => {
    const ir = zhDeck("memo", { footer: ALL_MARKS })
    ir.slides.forEach((slide, index) => {
      const root = page(ir, index)
      if (slide.type !== "content") {
        expect(root.querySelectorAll('[data-field="slidenum"]'), `memo ${slide.type}: page number`).toHaveLength(0)
        expect(root.querySelector("[data-footer]"), `memo ${slide.type}: footer row`).toBeNull()
        expect(root.querySelector("[data-memo-running-head]"), `memo ${slide.type}: running head`).toBeNull()
        return
      }
      // The deck's label is the memo's subject, typed in the running head.
      expect(root.querySelector("[data-memo-running-head]")!.textContent).toBe("2026 年中期业绩 | 2026.08")
      const row = root.querySelector('[data-footer="row"]')!
      const words = texts(row)
      // The issuing office at the left, then the draft and confidentiality
      // marks, then 「第 N 页 共 M 页」 with N the slide-number field.
      expect(words).toEqual([ORG, "讨论稿 · 内部资料，请勿外传", "第", String(index + 1), `页 共 ${ir.slides.length} 页`])
      const number = row.querySelector('[data-field="slidenum"]')!
      expect(number.textContent).toBe(String(index + 1))
      for (const t of Array.from(row.querySelectorAll("text"))) {
        expect(t.getAttribute("y")).toBe(row.querySelector("text")!.getAttribute("y"))
        expect(t.getAttribute("data-font-floor-exempt")).toBe("memo-spec")
      }
      expect(texts(root).filter((t) => t.includes(ORG))).toHaveLength(1)
    })
  })

  it("clinic: the office and 「N / M」 in its folio, the label at the top right, on content pages only", () => {
    const ir = zhDeck("clinic", { footer: ALL_MARKS })
    ir.slides.forEach((slide, index) => {
      const root = page(ir, index)
      if (slide.type !== "content") {
        expect(root.querySelectorAll('[data-field="slidenum"]'), `clinic ${slide.type}: page number`).toHaveLength(0)
        expect(root.querySelector("[data-footer]"), `clinic ${slide.type}: footer row`).toBeNull()
        expect(root.querySelector("[data-dossier-subject]"), `clinic ${slide.type}: subject`).toBeNull()
        return
      }
      // The deck's label is the file's subject, at the top right.
      expect(root.querySelector("[data-dossier-subject]")!.textContent).toBe("2026 年中期业绩 | 2026.08")
      const row = root.querySelector('[data-footer="row"]')!
      // The reporting office at the left, then the draft and confidentiality
      // marks, then 「N / M」 with N the slide-number field.
      expect(texts(row)).toEqual([ORG, "讨论稿 · 内部资料，请勿外传", String(index + 1), `/ ${ir.slides.length}`])
      expect(row.querySelector('[data-field="slidenum"]')!.textContent).toBe(String(index + 1))
      for (const t of Array.from(row.querySelectorAll("text"))) {
        expect(t.getAttribute("y")).toBe(row.querySelector("text")!.getAttribute("y"))
        expect(t.getAttribute("data-font-floor-exempt")).toBe("dossier-spec")
      }
      expect(texts(root).filter((t) => t.includes(ORG))).toHaveLength(1)
    })
  })

  it("almanac: the office and the label and 「N / M」 in its folio, on content pages only", () => {
    const ir = zhDeck("almanac", { footer: ALL_MARKS })
    ir.slides.forEach((slide, index) => {
      const root = page(ir, index)
      if (slide.type !== "content") {
        expect(root.querySelectorAll('[data-field="slidenum"]'), `almanac ${slide.type}: page number`).toHaveLength(0)
        expect(root.querySelector("[data-footer]"), `almanac ${slide.type}: footer row`).toBeNull()
        return
      }
      const row = root.querySelector('[data-footer="row"]')!
      // The reporting office and the deck's label at the left, then the draft
      // and confidentiality marks, then 「N / M」 with N the slide-number field.
      expect(texts(row)).toEqual([`${ORG} · 2026 年中期业绩 | 2026.08`, "讨论稿 · 内部资料，请勿外传", String(index + 1), `/ ${ir.slides.length}`])
      expect(row.querySelector('[data-field="slidenum"]')!.textContent).toBe(String(index + 1))
      for (const t of Array.from(row.querySelectorAll("text"))) {
        expect(t.getAttribute("y")).toBe(row.querySelector("text")!.getAttribute("y"))
        expect(t.getAttribute("data-font-floor-exempt")).toBe("yearbook-spec")
      }
      expect(texts(root).filter((t) => t.includes(ORG))).toHaveLength(1)
    })
  })

  it("homeroom: the office and the label and 「N / M」 in its folio, on content pages only", () => {
    const ir = zhDeck("homeroom", { footer: ALL_MARKS })
    ir.slides.forEach((slide, index) => {
      const root = page(ir, index)
      if (slide.type !== "content") {
        expect(root.querySelectorAll('[data-field="slidenum"]'), `homeroom ${slide.type}: page number`).toHaveLength(0)
        expect(root.querySelector("[data-footer]"), `homeroom ${slide.type}: footer row`).toBeNull()
        return
      }
      const row = root.querySelector('[data-footer="row"]')!
      expect(texts(row)).toEqual([`${ORG} · 2026 年中期业绩 | 2026.08`, "讨论稿 · 内部资料，请勿外传", String(index + 1), `/ ${ir.slides.length}`])
      expect(row.querySelector('[data-field="slidenum"]')!.textContent).toBe(String(index + 1))
      for (const t of Array.from(row.querySelectorAll("text"))) {
        expect(t.getAttribute("y")).toBe(row.querySelector("text")!.getAttribute("y"))
        expect(t.getAttribute("data-font-floor-exempt")).toBe("lesson-spec")
      }
      expect(row.querySelector("text")!.getAttribute("x")).toBe("64")
      expect(texts(root).filter((t) => t.includes(ORG))).toHaveLength(1)
    })
  })

  it("ember: the label at the top left and the organization, marks and page number in its folio, on content pages only", () => {
    const ir = zhDeck("ember", { footer: ALL_MARKS })
    ir.slides.forEach((slide, index) => {
      const root = page(ir, index)
      if (slide.type !== "content") {
        expect(root.querySelectorAll('[data-field="slidenum"]'), `ember ${slide.type}: page number`).toHaveLength(0)
        expect(root.querySelector("[data-footer]"), `ember ${slide.type}: footer row`).toBeNull()
        return
      }
      const row = root.querySelector('[data-footer="row"]')!
      expect(texts(row)).toEqual([ORG, "讨论稿 · 内部资料，请勿外传", String(index + 1)])
      expect(row.querySelector('[data-field="slidenum"]')!.textContent).toBe(String(index + 1))
      for (const t of Array.from(row.querySelectorAll("text"))) expect(t.getAttribute("data-font-floor-exempt")).toBe("pitch-spec")
      const label = root.querySelector("[data-pitch-label] text")!
      expect(label.textContent).toBe("2026 年中期业绩 | 2026.08")
      expect(label.getAttribute("x")).toBe("64")
      expect(texts(root).filter((t) => t.includes(ORG))).toHaveLength(1)
    })
  })

  it("rally: the office and the label at the left, the marks and 「N / M」 at the right, on content pages only", () => {
    const ir = zhDeck("rally", { footer: ALL_MARKS })
    ir.slides.forEach((slide, index) => {
      const root = page(ir, index)
      if (slide.type !== "content") {
        expect(root.querySelectorAll('[data-field="slidenum"]'), `rally ${slide.type}: page number`).toHaveLength(0)
        expect(root.querySelector("[data-footer]"), `rally ${slide.type}: footer row`).toBeNull()
        return
      }
      const row = root.querySelector('[data-footer="row"]')!
      expect(texts(row)).toEqual([`${ORG} · 2026 年中期业绩 | 2026.08`, "讨论稿 · 内部资料，请勿外传", String(index + 1), `/ ${ir.slides.length}`])
      expect(row.querySelector('[data-field="slidenum"]')!.textContent).toBe(String(index + 1))
      for (const t of Array.from(row.querySelectorAll("text"))) {
        expect(t.getAttribute("y")).toBe(row.querySelector("text")!.getAttribute("y"))
        expect(t.getAttribute("data-font-floor-exempt")).toBe("marquee-spec")
      }
      expect(row.querySelector("text")!.getAttribute("x")).toBe("64")
      expect(texts(root).filter((t) => t.includes(ORG))).toHaveLength(1)
    })
  })

  it("proposal: the label at the top left, the office at the left and the marks and page number at the right, on content pages only", () => {
    const ir = zhDeck("proposal", { footer: ALL_MARKS })
    ir.slides.forEach((slide, index) => {
      const root = page(ir, index)
      if (slide.type !== "content") {
        expect(root.querySelectorAll('[data-field="slidenum"]'), `proposal ${slide.type}: page number`).toHaveLength(0)
        expect(root.querySelector("[data-footer]"), `proposal ${slide.type}: footer row`).toBeNull()
        expect(root.querySelector("[data-binder-label]"), `proposal ${slide.type}: label`).toBeNull()
        return
      }
      const row = root.querySelector('[data-footer="row"]')!
      expect(texts(row)).toEqual([ORG, "讨论稿 · 内部资料，请勿外传", String(index + 1)])
      const number = row.querySelector('[data-field="slidenum"]')!
      expect(number.textContent).toBe(String(index + 1))
      expect([number.getAttribute("x"), number.getAttribute("text-anchor")]).toEqual(["1196", "end"])
      for (const t of Array.from(row.querySelectorAll("text"))) expect(t.getAttribute("data-font-floor-exempt")).toBe("binder-spec")
      const label = root.querySelector("[data-binder-label]")!
      expect(label.textContent).toBe("2026 年中期业绩 | 2026.08")
      expect(label.querySelector("text")!.getAttribute("x")).toBe("64")
      expect(texts(root).filter((t) => t.includes(ORG))).toHaveLength(1)
    })
  })

  it("thesis: the label at the top left, the office at the left, the page number centred and the marks at the right, on content pages only", () => {
    const ir = zhDeck("thesis", { footer: ALL_MARKS })
    ir.slides.forEach((slide, index) => {
      const root = page(ir, index)
      if (slide.type !== "content") {
        expect(root.querySelectorAll('[data-field="slidenum"]'), `thesis ${slide.type}: page number`).toHaveLength(0)
        expect(root.querySelector("[data-footer]"), `thesis ${slide.type}: footer row`).toBeNull()
        expect(root.querySelector("[data-manuscript-running-label]"), `thesis ${slide.type}: label`).toBeNull()
        return
      }
      const row = root.querySelector('[data-footer="row"]')!
      expect(texts(row)).toEqual([ORG, "讨论稿 · 内部资料，请勿外传", String(index + 1)])
      const number = row.querySelector('[data-field="slidenum"]')!
      expect(number.textContent).toBe(String(index + 1))
      expect([number.getAttribute("x"), number.getAttribute("text-anchor")]).toEqual(["640", "middle"])
      for (const t of Array.from(row.querySelectorAll("text"))) expect(t.getAttribute("data-font-floor-exempt")).toBe("manuscript-spec")
      const label = root.querySelector("[data-manuscript-running-label]")!
      expect(label.textContent).toBe("2026 年中期业绩 | 2026.08")
      expect(label.querySelector("text")!.getAttribute("x")).toBe("64")
      expect(texts(root).filter((t) => t.includes(ORG))).toHaveLength(1)
    })
  })

  it("a page number alone carries no rule over it", () => {
    for (const theme of ["swiss", "brief", "journal"]) {
      const ir = zhDeck(theme, { footer: { page_number: true } })
      const root = page(ir, 1)
      expect(footerRules(root), theme).toHaveLength(0)
      expect(texts(root.querySelector('[data-footer="row"]')!)).toEqual(["2"])
    }
  })

  it("a photo page whose image runs to the bottom edge carries no footer row; one with room keeps it", () => {
    const photo = (theme: string) => {
      const result = validateIr({
        version: "5",
        theme: { id: theme },
        meta: { organization: ORG },
        footer: { page_number: true, organization: true },
        assets: { images: { p: { src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", alt: "门店" } } },
        slides: [
          { type: "cover", heading: "门店网络调整" },
          { type: "content", kind: "photo", heading: "核心商圈的新门店", components: [{ type: "image", asset_id: "p", caption: "上海静安旗舰店" }] },
        ],
      })
      if (!result.ok) throw new Error(JSON.stringify(result.errors))
      return page(result.ir!, 1)
    }
    // image-split: a full-height bleed column with its caption bar at the bottom.
    for (const theme of ["ink", "journal", "museum"]) {
      expect(photo(theme).querySelector("[data-footer]"), theme).toBeNull()
    }
    // image-top: the photo stays at the top, the footer has its line.
    for (const theme of ["rally", "swiss"]) {
      expect(photo(theme).querySelector('[data-field="slidenum"]')?.textContent, theme).toBe("2")
    }
  })

  it("an English deck prints the English mark", () => {
    const ir = enDeck("swiss", { footer: { confidentiality: "footer" } })
    expect(texts(page(ir, 1))).toContain("Confidential")
    expect(texts(page(ir, 1)).some((t) => t.includes("内部资料"))).toBe(false)
  })

  it('branding "full" without a footer keeps the organization and the mark, not the date or version', () => {
    for (const theme of ["swiss", "brief", "thesis"]) {
      const ir = zhDeck(theme, { branding: "full" })
      const row = page(ir, 1).querySelector('[data-footer="row"]')!
      expect(texts(row), theme).toEqual([ORG, "内部资料，请勿外传"])
    }
  })

  it("every theme's footer reads against its own page: no contrast finding on the row or the cover mark", () => {
    for (const theme of CANONICAL_THEME_IDS) {
      const ir = zhDeck(theme, { footer: { ...ALL_MARKS, confidentiality: "cover" } })
      const report = auditDeck(ir)
      const footerFindings = report.findings.filter(
        (f) => f.code === "low-contrast" && /讨论稿|2026 年中期业绩|内部资料|华东区域运营中心|^\d$/.test(String(f.detail?.text ?? f.message)),
      )
      expect(footerFindings, theme).toEqual([])
    }
  })
})

describe("the cover's confidentiality mark", () => {
  it.each(CANONICAL_THEME_IDS)("%s: printed once on the cover when asked, in the deck's language", (theme) => {
    for (const placement of ["cover", "footer"] as const) {
      const zh = page(zhDeck(theme, { footer: { confidentiality: placement } }), 0)
      expect(texts(zh).join("|").split("内部资料，请勿外传").length - 1, `${theme} ${placement}`).toBe(1)
      expect(texts(zh).some((t) => /Confidential/i.test(t)), `${theme} ${placement}`).toBe(false)
    }
    const en = page(enDeck(theme, { footer: { confidentiality: "cover" } }), 0)
    expect(texts(en).join("|").toUpperCase().split("CONFIDENTIAL").length - 1, `${theme} en`).toBe(1)
  })

  it.each(CANONICAL_THEME_IDS)("%s: placement cover keeps the mark off the content pages", (theme) => {
    const ir = zhDeck(theme, { footer: { confidentiality: "cover" } })
    for (const index of [1, 2, 3, 4]) {
      expect(texts(page(ir, index)).some((t) => t.includes("内部资料")), `${theme} page ${index + 1}`).toBe(false)
    }
  })

  it.each(CANONICAL_THEME_IDS)("%s: a legal classification goes top left on the cover and nowhere else", (theme) => {
    const ir = zhDeck(theme, {}, { confidentiality: undefined, classification: "秘密★1年" })
    const cover = page(ir, 0)
    const mark = cover.querySelector('[data-cover-mark="classification"]')
    expect(mark?.textContent, theme).toBe("秘密★1年")
    expect(Number(mark!.getAttribute("x")), theme).toBeLessThanOrEqual(120)
    expect(Number(mark!.getAttribute("y")), theme).toBeLessThanOrEqual(110)
    for (const index of [1, 2, 3, 4]) {
      expect(texts(page(ir, index)).some((t) => t.includes("秘密")), `${theme} page ${index + 1}`).toBe(false)
    }
  })
})
