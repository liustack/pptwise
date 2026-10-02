// @vitest-environment node
//
// L1 is the zero-model geometry pass. Planted SVGs must hit. A live corpus
// sample must complete even when the current render still has findings.

import { describe, expect, it } from "vitest"
import { renderSlideSvg } from "@/api"
import { installNodePlatform } from "@/platform/node"
import { COMPONENT_BUILDERS, CHART_VARIANTS } from "./corpus/components"
import { componentPage, corpusAssets, layoutPage, themeDeck } from "./corpus/decks"
import { LEXICONS } from "./corpus/lexicon"
import { validateIr } from "@/api"
import { auditL1, classifyL1 } from "./l1"
import { loadPlantedManifest, plantedSvg } from "./planted/load"

await installNodePlatform()

const wrap = (inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">${inner}</svg>`

function codes(svg: string): string[] {
  return classifyL1(auditL1(svg))
}

describe("auditL1 planted defects", () => {
  it("flags text overflowing its data-audit-box as overflow", () => {
    const long = "微服务架构下的分布式事务一致性保障机制与补偿策略设计规范说明"
    const svg = wrap(
      `<g data-audit-rect="0,0,1280,720"><g data-audit-box="100,100,300">` +
        `<g transform="translate(100,100)"><text x="0" y="20" font-size="20">${long}</text></g>` +
        `</g></g>`,
    )
    expect(codes(svg)).toContain("overflow")
  })

  it("flags text past 1280×720 as out-of-bounds", () => {
    const svg = wrap(`<text x="1270" y="30" font-size="20">edge overflow text</text>`)
    expect(codes(svg)).toContain("out-of-bounds")
  })

  it("flags +3 more and +2 … as overflow-marker", () => {
    expect(codes(wrap(`<text x="40" y="40" font-size="14">+3 more</text>`))).toContain("overflow-marker")
    expect(codes(wrap(`<text x="40" y="40" font-size="14">+2 …</text>`))).toContain("overflow-marker")
  })

  it("flags a declared drop as content-dropped, and ignores a zero count", () => {
    expect(codes(wrap(`<g data-dropped="3"></g>`))).toContain("content-dropped")
    expect(codes(wrap(`<g data-dropped="1"></g>`))).toContain("content-dropped")
    // The marker is invisible, so nothing else on the page can give it away.
    expect(codes(wrap(`<g data-dropped="0"></g>`))).not.toContain("content-dropped")
    expect(codes(wrap(`<text x="40" y="40" font-size="16">all of it fits</text>`))).not.toContain("content-dropped")
  })

  // bulletin deck review (2026-10): a numbered card printed 「约降**两成**」
  // with its asterisks, and nothing reported it.
  it("flags an emphasis mark printed as asterisks as content-dropped", () => {
    expect(codes(wrap(`<text x="40" y="40" font-size="16">同比约降**两成**</text>`))).toContain("content-dropped")
    expect(codes(wrap(`<text x="40" y="40" font-size="16">a ** b, painted as written</text>`))).not.toContain("content-dropped")
  })

  it("flags a bare ellipsis or standalone ... inside text as overflow-marker", () => {
    expect(codes(wrap(`<text x="40" y="40" font-size="14">云觅科技 2026…</text>`))).toContain("overflow-marker")
    expect(codes(wrap(`<text x="40" y="40" font-size="14">cut short...</text>`))).toContain("overflow-marker")
  })

  it("does not treat thesis statement gold-dot circles as overflow-marker", () => {
    const svg = wrap(
      `<text x="96" y="350" font-size="48">设备不会突然坏</text>` +
        `<circle cx="200" cy="400" r="4" fill="#C6A15B"/>` +
        `<circle cx="220" cy="400" r="4" fill="#C6A15B"/>` +
        `<circle cx="240" cy="400" r="4" fill="#C6A15B"/>`,
    )
    expect(codes(svg)).not.toContain("overflow-marker")
  })

  it("flags readable text below the 16px (12pt) floor, and ignores data-decor", () => {
    expect(codes(wrap(`<text x="40" y="40" font-size="10">tiny body</text>`))).toContain("font-size")
    expect(codes(wrap(`<text x="40" y="40" font-size="15">almost</text>`))).toContain("font-size")
    expect(codes(wrap(`<text x="40" y="40" font-size="16">on the floor</text>`))).not.toContain("font-size")
    expect(
      codes(wrap(`<text x="40" y="40" font-size="14" data-font-floor-exempt="gauge-spec">approved meta</text>`)),
    ).not.toContain("font-size")
    expect(
      codes(wrap(`<text x="40" y="40" font-size="12" data-font-floor-exempt="show-spec">approved show label</text>`)),
    ).not.toContain("font-size")
    expect(codes(wrap(`<text x="40" y="40" font-size="10" data-decor="1">star</text>`))).not.toContain("font-size")
    expect(codes(wrap(`<g data-decor="1"><text x="40" y="40" font-size="10">star</text></g>`))).not.toContain("font-size")
  })

  it("flags text x=1 as edge-stick", () => {
    expect(codes(wrap(`<text x="1" y="40" font-size="16">stuck</text>`))).toContain("edge-stick")
  })

  it("flags writing-mode tb with Latin as latin-vertical", () => {
    expect(codes(wrap(`<text x="40" y="40" font-size="16" writing-mode="tb">ABC</text>`))).toContain("latin-vertical")
  })

  it("flags an axis title whose box intersects a data mark", () => {
    const svg = wrap(
      `<text data-axis-title="y" x="80" y="280" font-size="18">营收  ↑</text>` +
        `<circle data-plot-mark="1" cx="110" cy="272" r="28" fill="#2B6CB0"/>`,
    )
    expect(codes(svg)).toContain("axis-title-overlap")
  })

  it("does not flag an axis title sitting clear of the plot marks", () => {
    const svg = wrap(
      `<text data-axis-title="x" x="80" y="80" font-size="16">Quarter  →</text>` +
        `<circle data-plot-mark="1" cx="400" cy="400" r="16" fill="#2B6CB0"/>`,
    )
    expect(codes(svg)).not.toContain("axis-title-overlap")
  })

  it("flags a tick label whose box intersects a data mark", () => {
    const svg = wrap(
      `<text data-axis-tick="x" x="200" y="480" font-size="15" text-anchor="middle">2 周</text>` +
        `<circle data-plot-mark="1" cx="200" cy="478" r="28" fill="#E0489A"/>`,
    )
    expect(codes(svg)).toContain("axis-title-overlap")
  })

  it("flags two data-value-label ink boxes that intersect as label-collision", () => {
    const svg = wrap(
      `<text data-value-label="1" x="1000" y="174" font-size="16" text-anchor="end">90</text>` +
        `<text data-value-label="1" x="1000" y="184" font-size="16" text-anchor="end">87</text>`,
    )
    expect(codes(svg)).toContain("label-collision")
  })

  it("does not flag two data-value-label boxes that sit a line apart", () => {
    const svg = wrap(
      `<text data-value-label="1" x="1000" y="160" font-size="16" text-anchor="end">90</text>` +
        `<text data-value-label="1" x="1000" y="190" font-size="16" text-anchor="end">87</text>`,
    )
    expect(codes(svg)).not.toContain("label-collision")
  })

  it("does not flag a tick label sitting clear of the plot marks", () => {
    const svg = wrap(
      `<text data-axis-tick="y" x="180" y="280" font-size="15" text-anchor="end">80%</text>` +
        `<circle data-plot-mark="1" cx="400" cy="300" r="16" fill="#E0489A"/>`,
    )
    expect(codes(svg)).not.toContain("axis-title-overlap")
  })

  it("classifies the same SVG identically on a dual run (0 drift)", () => {
    const svg = wrap(
      `<text x="1" y="40" font-size="10">tiny</text>` +
        `<text x="40" y="80" font-size="14">+3 more</text>` +
        `<text x="1270" y="30" font-size="20">edge overflow text</text>`,
    )
    expect(classifyL1(auditL1(svg))).toEqual(classifyL1(auditL1(svg)))
  })

  it("flags a horizontal line through the title x-height as strikethrough", () => {
    const svg = wrap(
      `<text x="100" y="200" font-size="80">客户与收入结构</text>` +
        `<line x1="90" y1="172" x2="500" y2="172" stroke="#F5C518" stroke-width="2"/>`,
    )
    expect(codes(svg)).toContain("strikethrough")
  })

  it("does not flag a legal underline below the baseline as strikethrough", () => {
    const svg = wrap(
      `<text x="100" y="200" font-size="80">客户与收入结构</text>` +
        `<line x1="90" y1="212" x2="500" y2="212" stroke="#F5C518" stroke-width="2"/>`,
    )
    expect(codes(svg)).not.toContain("strikethrough")
  })

  // homeroom's bmc page before its rules moved: a midground rule at y548 ran
  // behind the opaque bottom cards, and the card text sat on it. The page
  // showed no line through the words, only a stub in the gap between cards.
  // Text 1 has the rule through its x-height, text 2 has it on its baseline.
  const ruleUnderCard = (card: string) =>
    wrap(
      `<g data-depth="bg"><rect x="0" y="0" width="1280" height="720" fill="#ECF0F2"/></g>` +
        `<g data-depth="mid"><g data-decor="true">` +
        `<line x1="96" y1="548" x2="1184" y2="548" stroke="#D3DBE0" stroke-width="1" opacity="0.55"/>` +
        `</g></g>` +
        `<g data-depth="fg">${card}` +
        `<text x="110" y="553" font-size="16">辅助线变式见得太少</text>` +
        `<text x="661" y="548" font-size="16">暑假是补计算的黄金窗口</text></g>`,
    )
  const OPAQUE_CARDS =
    `<rect x="96" y="491" width="537" height="140" rx="12" fill="#F9FBFC"/>` +
    `<rect x="647" y="491" width="537" height="140" rx="12" fill="#F9FBFC"/>`

  it("does not flag a rule the text's opaque card paints over", () => {
    const found = codes(ruleUnderCard(OPAQUE_CARDS))
    expect(found).not.toContain("strikethrough")
    expect(found).not.toContain("edge-stick")
  })

  it("still flags the rule when nothing covers it", () => {
    const found = codes(ruleUnderCard(""))
    expect(found).toContain("strikethrough")
    expect(found).toContain("edge-stick")
  })

  it("still flags the rule when the card is painted under it", () => {
    const svg = wrap(
      `${OPAQUE_CARDS}<line x1="96" y1="548" x2="1184" y2="548" stroke="#D3DBE0"/>` +
        `<text x="110" y="553" font-size="16">辅助线变式见得太少</text>` +
        `<text x="661" y="548" font-size="16">暑假是补计算的黄金窗口</text>`,
    )
    expect(codes(svg)).toContain("strikethrough")
    expect(codes(svg)).toContain("edge-stick")
  })

  it("still flags the rule through a card that lets it show", () => {
    const card = (attrs: string) =>
      `<rect x="96" y="491" width="537" height="140" ${attrs}/>` +
      `<rect x="647" y="491" width="537" height="140" ${attrs}/>`
    for (const cards of [
      card(`fill="#F9FBFC" fill-opacity="0.6"`),
      card(`fill="#F9FBFC" opacity="0.9"`),
      `<g opacity="0.8">${card(`fill="#F9FBFC"`)}</g>`,
      card(`fill="none" stroke="#D3DBE0"`),
      card(`fill="#F9FBFC80"`),
      card(`fill="url(#paper)"`),
      card(`fill="#F9FBFC" clip-path="url(#c)"`),
      card(`fill="#F9FBFC" transform="rotate(8)"`),
    ]) {
      const found = codes(ruleUnderCard(cards))
      expect(found, cards).toContain("strikethrough")
      expect(found, cards).toContain("edge-stick")
    }
  })

  it("still flags the part of the rule a card leaves uncovered", () => {
    // Each card stops 40px into its text, so most of the words keep the line.
    const svg = ruleUnderCard(
      `<rect x="96" y="491" width="54" height="140" fill="#F9FBFC"/>` +
        `<rect x="647" y="491" width="54" height="140" fill="#F9FBFC"/>`,
    )
    expect(codes(svg)).toContain("strikethrough")
    expect(codes(svg)).toContain("edge-stick")
  })

  // A rect only hides a rule when nothing can take it off the page or move
  // it: one in <defs> is never painted, an inline style can make it clear,
  // and a transform the checker cannot read puts it somewhere else.
  it.each([
    ["kept in defs", `<defs><rect x="80" y="150" width="540" height="100" fill="#ffffff"/></defs>`],
    ["made clear by an inline style", `<rect x="80" y="150" width="540" height="100" fill="#ffffff" style="fill-opacity:0"/>`],
    [
      "squashed by an uneven scale",
      `<g transform="scale(1,0.1)"><rect x="80" y="150" width="540" height="100" fill="#ffffff"/></g>`,
    ],
    [
      "shrunk by a scale written in exponent form",
      `<g transform="scale(1e-1)"><rect x="80" y="150" width="540" height="100" fill="#ffffff"/></g>`,
    ],
    [
      "moved by a scale applied before its translate",
      `<g transform="scale(2) translate(20,100)"><rect x="20" y="20" width="300" height="40" fill="#ffffff"/></g>`,
    ],
  ])("still flags a rule over a rect %s", (_label, cover) => {
    const svg = wrap(
      `<line x1="90" y1="190" x2="600" y2="190" stroke="#000000"/>${cover}` +
        `<text x="100" y="200" font-size="24">Visible rule crossing this text</text>`,
    )
    expect(codes(svg)).toContain("strikethrough")
  })

  it("still flags a rule that runs through a rounded card's corner", () => {
    // y=493 is 2px under the top edge of an rx=12 card. The corner curve
    // leaves the line bare there, and the text sits across the corner.
    const svg = wrap(
      `<line x1="40" y1="493" x2="700" y2="493" stroke="#D3DBE0" stroke-width="1"/>` +
        `<rect x="96" y="491" width="537" height="140" rx="12" fill="#F9FBFC"/>` +
        `<text x="76" y="498" font-size="16">角落</text>`,
    )
    expect(codes(svg)).toContain("strikethrough")
  })

  // brief's stat-hero: "10.2" at 310px with the unit as an 81px run. Read at
  // the outer size, the unit alone was charged 620px and the line ended at
  // x=1381, a page edge it stops 350px short of.
  it("measures a hero figure's smaller unit at its own size", () => {
    const svg = wrap(`<text x="96" y="450" font-size="310">10.2<tspan font-size="81">万席</tspan></text>`)
    expect(codes(svg)).not.toContain("edge-stick")
    expect(codes(svg)).not.toContain("out-of-bounds")
  })

  it("still flags a run that really carries the line off the page", () => {
    const svg = wrap(`<text x="900" y="450" font-size="100">10<tspan font-size="100">万席万席</tspan></text>`)
    expect(codes(svg)).toContain("out-of-bounds")
  })

  // luxe's stat-hero: a rule at y=200 sat exactly one font size above a
  // 270px figure's baseline, which is where the em box ends, while the
  // digits' ink starts some 75px lower.
  it("does not flag a rule that clears a display figure's ink but not its em box", () => {
    const svg = wrap(
      `<line x1="96" y1="200" x2="1184" y2="200" stroke="#222" stroke-width="1"/>` +
        `<text x="96" y="470" font-size="270">307</text>`,
    )
    expect(codes(svg)).not.toContain("edge-stick")
  })

  // memo's stat-hero: "22" at 280px with "个月" as a 73px run, over a double
  // rule at y=530 and 534. Reading the whole line at 280px put a descender
  // 70px below the baseline, on the rule, where the digits have none and
  // the unit's ink stops about 10px down.
  it("reads a line's ink depth from its runs, not from the outer size", () => {
    const svg = wrap(
      `<line x1="96" y1="170" x2="1184" y2="170" stroke="#222" stroke-width="2"/>` +
        `<text x="640" y="460" text-anchor="middle" font-size="280">22<tspan dx="11" font-size="73">个月</tspan></text>` +
        `<line x1="96" y1="530" x2="1184" y2="530" stroke="#222" stroke-width="1"/>` +
        `<line x1="96" y1="534" x2="1184" y2="534" stroke="#222" stroke-width="2"/>`,
    )
    expect(codes(svg)).not.toContain("edge-stick")
  })

  // An accented capital stands about 0.9em tall, well above the Latin
  // ascender height the calibrated estimate uses.
  it("still flags accented capitals that rise off the top of the page", () => {
    expect(codes(wrap(`<text x="100" y="90" font-family="Arial" font-size="100">ÉTÉ</text>`))).toContain("edge-stick")
  })

  it("reads an accented capital at full height inside a Chinese line too", () => {
    expect(codes(wrap(`<text x="100" y="96" font-family="Arial" font-size="100">夏ÉTÉ</text>`))).toContain("edge-stick")
  })

  it("still flags a rule just under a Latin line's descenders", () => {
    const svg = wrap(
      `<text x="100" y="300" font-size="16">graphing yearly</text>` +
        `<line x1="96" y1="306" x2="700" y2="306" stroke="#222" stroke-width="1"/>`,
    )
    expect(codes(svg)).toContain("edge-stick")
  })

  it("still flags a rule just under a line of Chinese text", () => {
    const svg = wrap(
      `<text x="100" y="300" font-size="16">上节课平均分在这里</text>` +
        `<line x1="96" y1="303" x2="700" y2="303" stroke="#222" stroke-width="1"/>`,
    )
    expect(codes(svg)).toContain("edge-stick")
  })

  it("still flags a rule just above the ink of a line of Chinese text", () => {
    const svg = wrap(
      `<line x1="96" y1="284" x2="700" y2="284" stroke="#222" stroke-width="1"/>` +
        `<text x="100" y="300" font-size="16">上节课平均分在这里</text>`,
    )
    expect(codes(svg)).toContain("edge-stick")
  })

  it("does not flag a short gold underline as edge-stick", () => {
    const svg = wrap(
      `<text x="640" y="404" font-size="84" text-anchor="middle">客户与收入结构</text>` +
        `<line x1="568" y1="472" x2="712" y2="472" stroke="#F5C518" stroke-width="1.6"/>`,
    )
    expect(codes(svg)).not.toContain("edge-stick")
    expect(codes(svg)).not.toContain("strikethrough")
  })

  it("flags two axis-aligned text ink boxes that intersect as overlap", () => {
    const svg = wrap(
      `<text x="200" y="435" font-size="70" font-weight="700">年第二季度业务评审</text>` +
        `<text x="200" y="446" font-size="34">工作区席位订阅业务的增长质量</text>`,
    )
    expect(codes(svg)).toContain("overlap")
  })

  it("does not flag a hanging quotation mark against the first glyph as overlap", () => {
    const svg = wrap(
      `<text x="96" y="200" font-size="48">“</text>` +
        `<text x="110" y="200" font-size="24">我们不是在卖算法，是在卖一个团队少开一场会。</text>`,
    )
    expect(codes(svg)).not.toContain("overlap")
  })

  it("does not flag stacked 70px lines at y=360 and y=435 as overlap", () => {
    const svg = wrap(
      `<text x="200" y="360" font-size="70" font-weight="700">云觅科技 2026</text>` +
        `<text x="200" y="435" font-size="70" font-weight="700">年第二季度业务评审</text>`,
    )
    expect(codes(svg)).not.toContain("overlap")
  })

  it("flags boxless overflow when a long line leaves a 300px parent card", () => {
    const zh = "微服务架构下的分布式事务一致性保障机制与补偿策略设计规范说明"
    const en = "Distributed transaction consistency under a microservice architecture and compensation policy"
    const zhSvg = wrap(
      `<g>` +
        `<rect x="100" y="80" width="300" height="80" fill="#eee"/>` +
        `<text x="110" y="130" font-size="20">${zh}</text>` +
        `</g>`,
    )
    const enSvg = wrap(
      `<g>` +
        `<rect x="100" y="80" width="300" height="80" fill="#eee"/>` +
        `<text x="110" y="130" font-size="20">${en}</text>` +
        `</g>`,
    )
    expect(codes(zhSvg)).toContain("overflow")
    expect(codes(enSvg)).toContain("overflow")
  })

  it("flags a bento shell that runs past the page bottom as out-of-bounds", () => {
    const svg = wrap(
      `<rect data-bento-shell="true" x="96" y="421" width="400" height="320" fill="#26342E"/>` +
        `<text x="116" y="500" font-size="16">接入设备总量</text>`,
    )
    expect(codes(svg)).toContain("out-of-bounds")
    const hit = auditL1(svg).findings.find((f) => f.code === "out-of-bounds")
    expect(hit?.message).toMatch(/shell|card/i)
    expect(hit?.message).toMatch(/1280/)
  })

  it("does not treat a giant watermark or the page fill as boxless overflow", () => {
    const svg = wrap(
      `<rect x="0" y="0" width="1280" height="720" fill="#1E2A4A"/>` +
        `<text x="1224" y="650" font-size="260" font-weight="700" opacity="0.05" text-anchor="end">01</text>` +
        `<text x="640" y="404" font-size="84" text-anchor="middle">客户与收入结构</text>`,
    )
    expect(codes(svg)).not.toContain("overflow")
  })

  it("classifies a mixed new-rule SVG identically on a dual run (0 drift)", () => {
    const svg = wrap(
      `<text x="100" y="200" font-size="80">客户与收入结构</text>` +
        `<line x1="90" y1="172" x2="500" y2="172" stroke="#F5C518"/>` +
        `<text x="200" y="435" font-size="70">年第二季度业务评审</text>` +
        `<text x="200" y="446" font-size="34">工作区订阅业务</text>`,
    )
    expect(classifyL1(auditL1(svg))).toEqual(classifyL1(auditL1(svg)))
  })

  it("flags a midground group painted after foreground as depth-contract", () => {
    const svg = wrap(
      `<g data-depth="bg"><rect width="1280" height="720" fill="#FFFFFF"/></g>` +
        `<g data-depth="fg"><text x="96" y="120" font-size="32">主体</text></g>` +
        `<g data-depth="mid"><line x1="80" y1="680" x2="1200" y2="680" stroke="#999999" opacity="0.2"/></g>`,
    )
    expect(codes(svg)).toContain("depth-contract")
  })

  it("flags midground paint at or above the shared contrast ceiling", () => {
    const svg = wrap(
      `<g data-depth="bg"><rect width="1280" height="720" fill="#FFFFFF"/></g>` +
        `<g data-depth="mid"><rect x="100" y="100" width="80" height="60" fill="#000000"/></g>` +
        `<g data-depth="fg"></g>`,
    )
    expect(codes(svg)).toContain("depth-contract")
  })

  it("does not flag identity-marked midground paint that exceeds the contrast ceiling", () => {
    const svg = wrap(
      `<g data-depth="bg"><rect width="1280" height="720" fill="#FFFFFF"/></g>` +
        `<g data-depth="mid"><g data-identity="true"><rect x="100" y="100" width="32" height="32" fill="#C3272B"/></g></g>` +
        `<g data-depth="fg"></g>`,
    )
    expect(codes(svg)).not.toContain("depth-contract")
  })

  it("does not flag structure-marked midground paint that exceeds the contrast ceiling", () => {
    const svg = wrap(
      `<g data-depth="bg"><rect width="1280" height="720" fill="#FFFFFF"/></g>` +
        `<g data-depth="mid"><g data-decor-role="structure"><rect x="0" y="0" width="1280" height="12" fill="#D7282F"/></g></g>` +
        `<g data-depth="fg"></g>`,
    )
    expect(codes(svg)).not.toContain("depth-contract")
  })

  it("accepts ordered layers whose midground paint stays below the shared ceiling", () => {
    const svg = wrap(
      `<g data-depth="bg"><rect width="1280" height="720" fill="#FFFFFF"/></g>` +
        `<g data-depth="mid"><line x1="80" y1="680" x2="1200" y2="680" stroke="#999999" opacity="0.2"/></g>` +
        `<g data-depth="fg"><text x="96" y="120" font-size="32">主体</text></g>`,
    )
    expect(codes(svg)).not.toContain("depth-contract")
  })

  it("flags a midground ghost label whose glyph box bleeds off canvas", () => {
    const svg = wrap(
      `<g data-depth="bg"><rect width="1280" height="720" fill="#FFFFFF"/></g>` +
        `<g data-depth="mid"><text x="1260" y="700" font-size="160" fill="#999999" opacity="0.1" data-bleed="true">09</text></g>` +
        `<g data-depth="fg"></g>`,
    )
    expect(codes(svg)).toContain("mid-text-bleed")
  })

  it("flags an isolated small stroked midground piece", () => {
    const svg = wrap(
      `<g data-depth="bg"><rect width="1280" height="720" fill="#FFFFFF"/></g>` +
        `<g data-depth="mid"><path d="M 100 100 h 16 v 16" fill="none" stroke="#999999" opacity="0.2"/></g>` +
        `<g data-depth="fg"></g>`,
    )
    expect(codes(svg)).toContain("isolated-mid-piece")
  })

  it("accepts a small midground tick attached to a structural rule", () => {
    const svg = wrap(
      `<g data-depth="bg"><rect width="1280" height="720" fill="#FFFFFF"/></g>` +
        `<g data-depth="mid">` +
        `<line x1="40" y1="100" x2="100" y2="100" stroke="#999999" opacity="0.2"/>` +
        `<path d="M 100 100 h 16 v 16" fill="none" stroke="#999999" opacity="0.2"/>` +
        `</g><g data-depth="fg"></g>`,
    )
    expect(codes(svg)).not.toContain("isolated-mid-piece")
  })

  it("flags an isolated filled midground dot", () => {
    const svg = wrap(
      `<g data-depth="bg"><rect width="1280" height="720" fill="#FFFFFF"/></g>` +
        `<g data-depth="mid"><circle cx="186" cy="152" r="3" fill="#847441" fill-opacity="0.807"/></g>` +
        `<g data-depth="fg"><text x="96" y="120" font-size="42">续约率回升</text></g>`,
    )
    expect(codes(svg)).toContain("isolated-mid-piece")
  })

  it("flags an isolated filled midground square of dot size", () => {
    const svg = wrap(
      `<g data-depth="bg"><rect width="1280" height="720" fill="#FFFFFF"/></g>` +
        `<g data-depth="mid"><rect x="200" y="80" width="6" height="6" fill="#847441"/></g>` +
        `<g data-depth="fg"></g>`,
    )
    expect(codes(svg)).toContain("isolated-mid-piece")
  })

  it("accepts three aligned midground dots as a sequence", () => {
    const svg = wrap(
      `<g data-depth="bg"><rect width="1280" height="720" fill="#FFFFFF"/></g>` +
        `<g data-depth="mid">` +
        `<circle cx="616" cy="430" r="3" fill="#A8861D"/>` +
        `<circle cx="640" cy="430" r="3" fill="#A8861D"/>` +
        `<circle cx="664" cy="430" r="3" fill="#A8861D"/>` +
        `</g><g data-depth="fg"></g>`,
    )
    expect(codes(svg)).not.toContain("isolated-mid-piece")
  })

  it("accepts a midground dot seated on a structural rule", () => {
    const svg = wrap(
      `<g data-depth="bg"><rect width="1280" height="720" fill="#FFFFFF"/></g>` +
        `<g data-depth="mid">` +
        `<line x1="96" y1="36" x2="1104" y2="36" stroke="#999999" opacity="0.2"/>` +
        `<circle cx="568" cy="36" r="2.5" fill="#76BDB6"/>` +
        `<circle cx="632" cy="36" r="2.5" fill="#76BDB6"/>` +
        `</g><g data-depth="fg"></g>`,
    )
    expect(codes(svg)).not.toContain("isolated-mid-piece")
  })

  it("does not treat a 10px seal square as an isolated dot", () => {
    const svg = wrap(
      `<g data-depth="bg"><rect width="1280" height="720" fill="#FFFFFF"/></g>` +
        `<g data-depth="mid"><rect x="99" y="72" width="10" height="10" fill="#9D4D4F"/></g>` +
        `<g data-depth="fg"></g>`,
    )
    expect(codes(svg)).not.toContain("isolated-mid-piece")
  })
})

describe("planted L1 regression", () => {
  it("hits every expected L1 code on planted pages that declare one", () => {
    const { entries } = loadPlantedManifest()
    const l1Entries = entries.filter((entry) => entry.l1Expected.length > 0)
    expect(l1Entries.length).toBeGreaterThan(0)
    for (const entry of l1Entries) {
      const got = classifyL1(auditL1(plantedSvg(entry)))
      for (const code of entry.l1Expected) {
        expect(got, `${entry.id} should include ${code}, got ${got.join(",")}`).toContain(code)
      }
    }
  })

  it("does not require L1 hits on radius and rotate plants", () => {
    const { entries } = loadPlantedManifest()
    const visualOnly = entries.filter((entry) => entry.class === "radius" || entry.class === "rotate")
    expect(visualOnly.length).toBeGreaterThanOrEqual(4)
    expect(visualOnly.every((entry) => entry.l1Expected.length === 0)).toBe(true)
  })
})

describe("auditL1 live sample", () => {
  it("completes on a real rendered page without treating corpus findings as failure", async () => {
    const assets = await corpusAssets(LEXICONS.zh)
    const svg = renderSlideSvg(layoutPage("two-column", LEXICONS.zh, assets), 0)
    const result = auditL1(svg)
    expect(Array.isArray(result.findings)).toBe(true)
    expect(classifyL1(result)).toEqual(classifyL1(auditL1(svg)))
  })

  it("thesis content pages have no isolated midground dot", async () => {
    const assets = await corpusAssets(LEXICONS.zh)
    const ir = themeDeck("thesis", LEXICONS.zh, assets)
    for (let index = 2; index <= 8; index++) {
      const svg = renderSlideSvg(ir, index)
      expect(classifyL1(auditL1(svg)), `p${String(index + 1).padStart(2, "0")}`).not.toContain("isolated-mid-piece")
      expect(svg, `p${String(index + 1).padStart(2, "0")}`).not.toMatch(/<g data-decor="">\s*<circle[^>]*r="3"/)
    }
  })

  it("live journal line chart has no label-collision", async () => {
    const assets = await corpusAssets(LEXICONS.zh)
    const ir = themeDeck("journal", LEXICONS.zh, assets)
    const svg = renderSlideSvg(ir, 2)
    expect(classifyL1(auditL1(svg))).not.toContain("label-collision")
  })

  it("live chart/heatmap/matrix/sankey pages have no axis-title-overlap", async () => {
    const assets = await corpusAssets(LEXICONS.zh)
    const pages = [
      ["chart", COMPONENT_BUILDERS.chart!],
      ["chart-scatter", CHART_VARIANTS["chart · scatter"]!],
      ["heatmap", COMPONENT_BUILDERS.heatmap!],
      ["matrix", COMPONENT_BUILDERS.matrix!],
      ["sankey", COMPONENT_BUILDERS.sankey!],
    ] as const
    for (const [id, build] of pages) {
      const svg = renderSlideSvg(componentPage(id, build, LEXICONS.zh, assets), 0)
      if (id !== "sankey") {
        expect(svg, id).toContain("data-axis-title")
        expect(svg, id).toContain("data-plot-mark")
      }
      expect(classifyL1(auditL1(svg)), id).not.toContain("axis-title-overlap")
    }
  })
})

// A page that loses its whole chart is the case the visible overflow count
// used to give away. It paints a heading over empty space and says nothing,
// so L1 is the only pass that can still see it.
describe("auditL1 on a page whose component declines outright", () => {
  const declinedChartDeck = {
    version: "5",
    filename: "declined-chart",
    theme: { id: "brief" },
    meta: {},
    assets: { images: {} },
    slides: [
      {
        type: "content",
        kind: "data",
        heading: "二十四条系列的折线图",
        components: [
          {
            type: "chart",
            chart_type: "line",
            series: Array.from({ length: 24 }, (_, i) => ({
              name: `系列 ${i + 1}`,
              data: [
                { x: "Q1", y: i + 1 },
                { x: "Q2", y: i + 2 },
              ],
            })),
          },
        ],
      },
    ],
  }

  // 24 series, not 16: through 20 the face steps aside and the sheet holds
  // the chart (`render/step-aside.tsx`), so there is nothing to report.
  it("cannot pass: a 24-series line chart declines on every rendering and L1 reports the drop", () => {
    const v = validateIr(declinedChartDeck)
    expect(v.ok).toBe(true)
    const svg = renderSlideSvg(v.ir!, 0)
    // The page really does lose the chart, and really does say nothing.
    expect(svg).toMatch(/data-dropped="[1-9]/)
    expect(svg).not.toMatch(/>[^<]*\+\s*\d+[^<]*</)
    const result = auditL1(svg)
    expect(classifyL1(result)).toContain("content-dropped")
    expect(result.findings.length).toBeGreaterThan(0)
  })
})
