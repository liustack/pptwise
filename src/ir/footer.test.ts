// @vitest-environment node
import { describe, expect, it } from "vitest"
import { validateIr } from "@/api"
import { validateSpec } from "@/spec"
import { assembleDeck, disassembleDeck, type PageContent } from "@/spec/assemble"
import { FooterSchema, footerSettingIssues } from "./footer"

function deck(extra: Record<string, unknown> = {}, meta: Record<string, unknown> = {}) {
  return {
    version: "5",
    theme: { id: "swiss" },
    meta: { organization: "华东区域运营中心", confidentiality: "confidential", ...meta },
    slides: [
      { type: "cover", heading: "2026 年门店网络调整方案" },
      { type: "content", kind: "points", heading: "三项调整的理由", components: [{ type: "bullets", items: ["客流集中"] }] },
      { type: "ending", heading: "谢谢" },
    ],
    ...extra,
  }
}

const messages = (result: { errors: { path: string; message: string }[] }) =>
  result.errors.map((e) => `${e.path}: ${e.message}`).join("\n")

describe("footer schema", () => {
  it("accepts every mark", () => {
    const parsed = FooterSchema.parse({
      page_number: true,
      organization: true,
      label: "2026 年中期业绩 | 2026.08",
      notice: "© 2026 华东区域运营中心",
      draft: "讨论稿",
      confidentiality: "footer",
    })
    expect(parsed.confidentiality).toBe("footer")
  })

  it("is strict, refuses blank words and unknown placements", () => {
    expect(FooterSchema.safeParse({ page_numbers: true }).success).toBe(false)
    expect(FooterSchema.safeParse({ label: "   " }).success).toBe(false)
    expect(FooterSchema.safeParse({ confidentiality: "header" }).success).toBe(false)
  })

  it("an empty footer is legal: it says no marks, even under branding full", () => {
    expect(validateIr(deck({ footer: {}, branding: "full" })).ok).toBe(true)
  })
})

describe("footer cross-field rules", () => {
  it("organization needs meta.organization", () => {
    const issues = footerSettingIssues({ meta: {}, footer: { organization: true } })
    expect(issues.map((i) => i.path)).toEqual(["footer.organization"])
  })

  it("confidentiality needs a level that prints something", () => {
    for (const confidentiality of [undefined, "public"]) {
      const issues = footerSettingIssues({ meta: { confidentiality }, footer: { confidentiality: "cover" } })
      expect(issues.map((i) => i.path), String(confidentiality)).toEqual(["footer.confidentiality"])
    }
    expect(footerSettingIssues({ meta: { confidentiality: "internal" }, footer: { confidentiality: "cover" } })).toEqual([])
  })

  it("a legal classification goes in meta.classification and never with a confidentiality mark", () => {
    const both = footerSettingIssues({
      meta: { confidentiality: "confidential", classification: "秘密★1年" },
      footer: { confidentiality: "footer" },
    })
    expect(both.map((i) => i.path)).toEqual(["footer.confidentiality"])
    expect(both[0]!.message).toMatch(/cover only, top left/)

    for (const field of ["label", "notice", "draft"] as const) {
      const issues = footerSettingIssues({ meta: {}, footer: { [field]: "机密★5年" } })
      expect(issues.map((i) => i.path), field).toEqual([`footer.${field}`])
      expect(issues[0]!.message).toMatch(/meta\.classification/)
    }
    // The bare word in ordinary prose is not a legal marking.
    expect(footerSettingIssues({ meta: {}, footer: { notice: "本文件不涉及国家秘密" } })).toEqual([])
  })

  it("validateIr reports each rule at its path", () => {
    const noOrg = validateIr(deck({ footer: { organization: true } }, { organization: undefined }))
    expect(noOrg.ok).toBe(false)
    expect(messages(noOrg)).toMatch(/^footer\.organization: /)

    const legal = validateIr(deck({ footer: { draft: "绝密★长期" } }))
    expect(legal.ok).toBe(false)
    expect(messages(legal)).toMatch(/^footer\.draft: /)

    const blank = validateIr(deck({}, { classification: " " }))
    expect(blank.ok).toBe(false)
    expect(messages(blank)).toMatch(/meta\.classification/)
  })

  it("a footer line too long for the bottom of the page is refused, not trimmed", () => {
    const long = validateIr(deck({ footer: { organization: true, label: "2026 年中期业绩说明会 | ".repeat(8) } }))
    expect(long.ok).toBe(false)
    expect(messages(long)).toMatch(/^footer\.label: .*Shorten footer\.label or footer\.notice/)
    expect(validateIr(deck({ footer: { organization: true, label: "2026 年中期业绩 | 2026.08" } })).ok).toBe(true)
  })

  it("a legal classification alone is valid", () => {
    expect(validateIr(deck({}, { confidentiality: undefined, classification: "秘密★1年" })).ok).toBe(true)
  })
})

describe("footer in a deck project", () => {
  const spec = (extra: Record<string, unknown> = {}) => ({
    version: "1",
    theme: "swiss",
    narrative: { pacing: "spacious" },
    meta: { organization: "Acme Holdings", confidentiality: "confidential" },
    pages: [
      { id: "cover", type: "cover", heading: "Investor Presentation" },
      { id: "why", type: "content", kind: "points", heading: "Why now" },
      { id: "how", type: "content", kind: "points", heading: "How we get there" },
      { id: "end", type: "ending", heading: "Thank you" },
    ],
    ...extra,
  })

  it("the spec carries footer and checks the same rules", () => {
    const ok = validateSpec(spec({ footer: { page_number: true, confidentiality: "footer" } }))
    expect(ok.ok).toBe(true)
    const bad = validateSpec(spec({ footer: { confidentiality: "cover" }, meta: {} }))
    expect(bad.ok).toBe(false)
    expect(bad.errors[0]!.path).toBe("footer.confidentiality")
    expect(validateSpec(spec({ footer: { pagenumber: true } })).ok).toBe(false)
  })

  it("assemble writes footer into the IR, and disassemble gives it back", () => {
    const footer = { page_number: true, label: "Investor Presentation | February 2026" }
    const filled: Record<string, PageContent> = {
      why: { components: [{ type: "bullets", items: ["Demand is back"] }] },
      how: { components: [{ type: "bullets", items: ["Two new regions"] }] },
    }
    const { ir } = assembleDeck(spec({ footer }), filled)
    expect(ir.footer).toEqual(footer)
    expect(disassembleDeck(ir).spec.footer).toEqual(footer)
    const { ir: plain } = assembleDeck(spec(), filled)
    expect(plain).not.toHaveProperty("footer")
  })
})
