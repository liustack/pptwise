import { describe, expect, it } from "vitest"
import JSZip from "jszip"
import type { PptxIR } from "@/ir"

/**
 * Through the real export chain: the brief board's figure page (gauge-figure)
 * sets its unit after a 20px `dx`, and every paragraph mark names the
 * paragraph's own face. `pptx-paragraph-mark.test.ts` and `svg2pptx/text.test.ts`
 * cover the two pieces alone. This is the real-pptxgenjs counterpart.
 */
const IR: PptxIR = {
  version: "5",
  filename: "figure.pptx",
  theme: { id: "brief" },
  meta: {},
  assets: { images: {} },
  slides: [
    {
      type: "content",
      kind: "fact",
      heading: "What the program is worth",
      components: [
        {
          type: "kpi_cards",
          items: [{ value: "$154M", unit: "a year", label: "Saving at run rate, from month 12", source: "$0.96 off each of 160 million parcels" }],
        },
      ],
    },
  ],
} as PptxIR

async function slideXml(blob: Blob): Promise<string> {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer())
  return zip.file("ppt/slides/slide1.xml")!.async("string")
}

describe("generatePptxBlob text placement", () => {
  it("keeps the figure's unit gap as spacing after its last digit, in one paragraph", async () => {
    const { generatePptxBlob } = await import("./generate")
    const xml = await slideXml(await generatePptxBlob(IR))
    const paragraph = xml.match(/<a:p>(?:(?!<\/a:p>)[\s\S])*a year[\s\S]*?<\/a:p>/)?.[0]
    expect(paragraph).toBeDefined()
    // 20px → 15pt → spc="1500" on the lone "M" run.
    expect(paragraph).toMatch(/<a:rPr[^>]* spc="1500"[^>]*>(?:(?!<\/a:r>)[\s\S])*<a:t>M<\/a:t>/)
    expect(paragraph).toContain("<a:t>$154</a:t>")
  }, 30000)

  it("gives every paragraph mark that follows a run the run's own fonts", async () => {
    const { generatePptxBlob } = await import("./generate")
    const xml = await slideXml(await generatePptxBlob(IR))
    const paragraphs = xml.match(/<a:p>[\s\S]*?<\/a:p>/g) ?? []
    const withRuns = paragraphs.filter((p) => p.includes("<a:r>"))
    expect(withRuns.length).toBeGreaterThan(2)
    for (const p of withRuns) {
      expect(p).toMatch(/<a:endParaRPr[^>]*><a:latin typeface="Georgia"[^>]*\/><a:ea typeface="Microsoft YaHei"/)
    }
  }, 30000)
})
