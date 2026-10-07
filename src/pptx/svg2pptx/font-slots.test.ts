// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import PptxGenJS from "pptxgenjs"
import JSZip from "jszip"
import { resolveFontStack, type FontRole } from "../../render/fonts"
import { applyEaFontFaces } from "../pptx-ea-fonts"
import { svgToOps } from "./dispatch"
import { renderOps, type SlideLike } from "./render"

/**
 * The font slots a run reaches PowerPoint with, from a theme's font stack to
 * the written `<a:rPr>`: `resolveFontStack` writes the family list, the
 * converter reads its Latin face and the East Asian face it pairs, and
 * `applyEaFontFaces` splits the pair into `<a:latin>` and `<a:ea>`.
 *
 * PowerPoint paints the four curly quotation marks of a run whose `lang` is
 * Western from its `<a:latin>` face (PowerPoint for Mac, PDF export,
 * 2026-10-07), and every run is written lang="en-US". So the Latin slot of
 * an English deck's YaHei text names YaHei's Western cut, whose quotes are
 * Western, and a Chinese deck's keeps YaHei, whose quotes sit on the full em
 * beside Chinese.
 */
interface Slots {
  lang: string | undefined
  latin: string | undefined
  ea: string | undefined
  cs: string | undefined
  text: string
}

async function writtenRuns(fontFamily: string, text: string): Promise<Slots[]> {
  const svg = new DOMParser().parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720"><text x="64" y="200" font-size="24" font-family="${fontFamily}">${text}</text></svg>`,
    "image/svg+xml",
  )
  const pptx = new PptxGenJS()
  pptx.defineLayout({ name: "W", width: 13.333, height: 7.5 })
  pptx.layout = "W"
  renderOps(pptx.addSlide() as unknown as SlideLike, svgToOps(svg.querySelector("svg")!))
  const patched = await applyEaFontFaces((await pptx.write({ outputType: "nodebuffer" })) as Uint8Array)
  const zip = await JSZip.loadAsync(await patched.arrayBuffer())
  const xml = await zip.file("ppt/slides/slide1.xml")!.async("string")
  return Array.from(xml.matchAll(/<a:r><a:rPr([^>]*)>(.*?)<\/a:rPr><a:t>([^<]*)<\/a:t><\/a:r>/g)).map(([, attrs, props, t]) => ({
    lang: / lang="([^"]+)"/.exec(attrs!)?.[1],
    latin: /<a:latin typeface="([^"]+)"/.exec(props!)?.[1],
    ea: /<a:ea typeface="([^"]+)"/.exec(props!)?.[1],
    cs: /<a:cs typeface="([^"]+)"/.exec(props!)?.[1],
    text: t!,
  }))
}

async function slotsFor(stack: string[], role: FontRole, chinese: boolean): Promise<Pick<Slots, "latin" | "ea">> {
  const [run] = await writtenRuns(resolveFontStack(stack, role, chinese), "“A” 甲")
  return { latin: run!.latin, ea: run!.ea }
}

const YAHEI_BODY = ["Microsoft YaHei", "Helvetica Neue", "Arial", "system-ui"]
const DESIGNER_BODY = ["Inter", "PingFang SC", "system-ui"]
const GEORGIA_BODY = ["Bower", "Georgia", "Source Han Serif SC", "serif"]
const SONG_PAIRED_HEADING = ["Times New Roman", "SimSun", "宋体", "Songti SC", "STSong", "serif"]
const KAI_PAIRED_HEADING = ["Times New Roman", "KaiTi", "楷体", "Kaiti SC", "STKaiti", "serif"]
const SONG_HEADING = ["SimSun", "宋体", "Songti SC", "STSong", "serif"]

describe("font slots from a theme's stack, by the deck's language", () => {
  it("a YaHei stack: the Western cut over YaHei in an English deck, YaHei in both slots in a Chinese one", async () => {
    expect(await slotsFor(YAHEI_BODY, "body", false)).toEqual({ latin: "Microsoft YaHei UI", ea: "Microsoft YaHei" })
    expect(await slotsFor(YAHEI_BODY, "body", true)).toEqual({ latin: "Microsoft YaHei", ea: "Microsoft YaHei" })
  })

  it("a designer stack with no safe face takes the YaHei default, and its cut with it", async () => {
    expect(await slotsFor(DESIGNER_BODY, "body", false)).toEqual({ latin: "Microsoft YaHei UI", ea: "Microsoft YaHei" })
    expect(await slotsFor(DESIGNER_BODY, "body", true)).toEqual({ latin: "Microsoft YaHei", ea: "Microsoft YaHei" })
  })

  it("a Latin face keeps its own slots in either language", async () => {
    for (const chinese of [false, true]) {
      expect(await slotsFor(GEORGIA_BODY, "body", chinese)).toEqual({ latin: "Georgia", ea: "Microsoft YaHei" })
      expect(await slotsFor(SONG_PAIRED_HEADING, "heading", chinese)).toEqual({ latin: "Times New Roman", ea: "SimSun" })
      expect(await slotsFor(KAI_PAIRED_HEADING, "heading", chinese)).toEqual({ latin: "Times New Roman", ea: "KaiTi" })
      expect(await slotsFor(["Consolas", "Courier New"], "mono", chinese)).toEqual({ latin: "Consolas", ea: "Microsoft YaHei" })
    }
  })

  it("a Song face, which has no Western cut, stays in both slots in either language", async () => {
    for (const chinese of [false, true]) {
      expect(await slotsFor(SONG_HEADING, "heading", chinese)).toEqual({ latin: "SimSun", ea: "SimSun" })
    }
  })

  it("a mixed English and Chinese line in an English deck is one run: Latin and quotes in the cut, CJK in YaHei", async () => {
    const runs = await writtenRuns(resolveFontStack(YAHEI_BODY, "body", false), "Each “45 in total” counts 非遗 once")
    expect(runs).toEqual([
      {
        lang: "en-US",
        latin: "Microsoft YaHei UI",
        ea: "Microsoft YaHei",
        cs: "Microsoft YaHei UI",
        text: "Each “45 in total” counts 非遗 once",
      },
    ])
  })

  it("a Chinese line in a Chinese deck keeps YaHei in every slot, so its quotes stay on the full em", async () => {
    const runs = await writtenRuns(resolveFontStack(YAHEI_BODY, "body", true), "统计公报只写“共 45 个”，Excel 另算")
    expect(runs).toEqual([
      {
        lang: "en-US",
        latin: "Microsoft YaHei",
        ea: "Microsoft YaHei",
        cs: "Microsoft YaHei",
        text: "统计公报只写“共 45 个”，Excel 另算",
      },
    ])
  })
})
