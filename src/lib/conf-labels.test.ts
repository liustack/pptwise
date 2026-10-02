import { describe, expect, it } from "vitest"
import type { Slide } from "@/ir"
import { confidentialityLabel, deckWritesChinese } from "./conf-labels"

const page = (heading: string, subheading?: string): Slide =>
  ({ type: "content", kind: "points", heading, ...(subheading ? { subheading } : {}), components: [] }) as Slide

describe("confidentiality marks follow the deck's language", () => {
  it("a Chinese deck says it the way companies do, never with the legal word 机密", () => {
    expect(confidentialityLabel("internal", true)).toBe("仅供内部讨论")
    expect(confidentialityLabel("confidential", true)).toBe("内部资料，请勿外传")
    expect(confidentialityLabel("restricted", true)).toBe("限定范围阅读，请勿转发")
    for (const level of ["internal", "confidential", "restricted"] as const) {
      expect(confidentialityLabel(level, true)).not.toMatch(/机密|秘密|绝密/)
    }
  })

  it("an English deck keeps the familiar words", () => {
    expect(confidentialityLabel("internal", false)).toBe("Internal")
    expect(confidentialityLabel("confidential", false)).toBe("Confidential")
    expect(confidentialityLabel("restricted", false)).toBe("Restricted")
  })

  it("public prints no mark in either language", () => {
    expect(confidentialityLabel("public", true)).toBeNull()
    expect(confidentialityLabel("public", false)).toBeNull()
  })

  it("the deck's language is the language of its headings", () => {
    expect(deckWritesChinese({ slides: [page("门店网络调整方案"), page("三项理由", "客流向核心商圈集中")] })).toBe(true)
    expect(deckWritesChinese({ slides: [page("Investor Presentation"), page("Why now")] })).toBe(false)
    // A Chinese deck may carry English brand names in a heading.
    expect(deckWritesChinese({ slides: [page("Acme 的中国市场策略"), page("三项理由")] })).toBe(true)
    // A tie stays English, as every built-in title vote does.
    expect(deckWritesChinese({ slides: [page("门店网络"), page("Store network")] })).toBe(false)
    expect(deckWritesChinese({ slides: [] })).toBe(false)
  })
})
