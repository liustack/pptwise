// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import type { ContentRect } from "../../render/layout"
import type { ComponentCtx } from "../../components/types"
import { compose, type CompositionId } from "."
import { cardsComposition } from "./cards"
import { listingComposition } from "./listing"
import { logComposition } from "./log"
import { spanComposition, parseDuration } from "./span"
import { platesComposition } from "./plates"
import { pathsComposition } from "./paths"
import { screenComposition } from "./screen"
import { consoleInks } from "./console"
import type { Composition } from "./shared"
import { byText, renderComposition, renderNode, testCtx, texts, textOf } from "./__fixtures__/kit"

/*
 * The compositions the console setting added, terminal's 2026-10 board (`design/rounds/2026-10-05-terminal/`).
 * Each page is the board's own, set on terminal, and every page is drawn on
 * two themes that share nothing with it too: vermilion (warm paper, a red
 * mark, a gold accent) and crayon (light, rounded, saturated). The setting
 * reads the theme's tokens only.
 */

/** The console sheet's body: x64 to x1216, y180 to y650. */
const BAND: ContentRect = { x: 64, y: 180, w: 1152, h: 470 }
const IMAGES = { "grid-a": { src: "data:image/png;base64,AAAA" }, "grid-b": { src: "data:image/png;base64,BBBB" }, "grid-c": { src: "data:image/png;base64,CCCC" }, dash: { src: "data:image/png;base64,DDDD" } }
const chinese = (ctx: ComponentCtx): ComponentCtx => ({ ...ctx, figures: { chinese: true, groupFour: false }, images: IMAGES })
const THEMES = ["terminal", "vermilion", "crayon"] as const

function draw(composition: Composition, components: unknown[], theme: string = "terminal", rect: ContentRect = BAND) {
  return renderComposition(composition, components, { theme, rect, setting: "console", ctx: chinese })
}

const numberOf = (el: Element | undefined | null, name: string) => Number(el?.getAttribute(name))

/** p02: four findings, the first the one the page lands on. */
const verdict = [
  {
    type: "row_cards",
    items: [
      { icon: "zap", title: "大面积中断多是一次变更推到全部", text: "8 起重大中断里 5 起是全局配置或策略很快推到全部节点，同云多开一个区域挡不住。", highlight: true },
      { icon: "cloud-lightning", title: "单区域故障是真的，多区域挡得住", text: "雷暴、电压跌落、光纤维护都只伤一个区域，其他区域照常运行。" },
      { icon: "repeat", title: "拖长恢复的是重试和积压", text: "AWS 那次 DynamoDB 2 小时 52 分恢复，事故拖到 14 小时 32 分。" },
      { icon: "receipt", title: "SLA 只赔服务费", text: "99.99% 每月只允许 4.38 分钟，抵扣上限是当月服务费，不赔营收。" },
    ],
  },
]

/** p07: five causes with where they came from, and what we can do now. */
const recovery = [
  {
    type: "icon_cards",
    items: [
      { icon: "repeat", title: "重试风暴跨区", text: "重试先压垮 East US 的托管标识，又被转去压垮 West US。", tag: { text: "Azure 2026-02" } },
      { icon: "layers", title: "积压成拥塞崩溃", text: "租约积压到处理不动，最后靠限流加分批重启。", tag: { text: "AWS 2025-10" } },
      { icon: "refresh-cw", title: "同时重启", text: "大区域的任务一起重启，压向同一张表，没做随机指数退避。", tag: { text: "Google 2025-06" } },
      { icon: "log-in", title: "登录积压", text: "积压的登录请求加上重试，控制台又有 50 分钟不可用。", tag: { text: "Cloudflare 2025-11" } },
      { icon: "hard-drive", title: "逐个检查", text: "制冷 1 小时 31 分恢复，存储逐个检查约 14 小时。", tag: { text: "Azure 2026-05" } },
    ],
  },
  { type: "callout", variant: "tip", icon: "timer", text: "我们现在就能做：前四样我们的服务里也有。重试加随机退避和上限，重启错峰，队列按长度限流，不用等多区域。" },
]

/** p05: four postmortems in their own words, the last one marked. */
const quotes = [
  {
    type: "code",
    language: "text",
    title: "postmortems / quotes.txt",
    code: [
      "# Google Cloud · 2025-06-12 · Service Control quota policy",
      '"this metadata was replicated globally within seconds."',
      "",
      "# Azure · 2026-02-02 · a policy job that reached many regions",
      '"There was nothing that customers could have done to avoid or minimize',
      ' impact from this specific service incident."',
    ].join("\n"),
    highlight_lines: [5, 6],
  },
]

/** p06: the cascade as a log, two durations to scale and a quoted note beside it. */
const cascade = [
  {
    type: "timeline",
    title: "us-east-1 · 2025-10-20 · UTC",
    milestones: [
      { date: "06:48", title: "DNS 记录被清空", desc: "端点 IP 全部消失", tone: "danger" },
      { date: "09:40", title: "DynamoDB 恢复", desc: "开始后 2 小时 52 分", tone: "success", highlight: true },
      { date: "11:14", title: "租约系统限流重启", desc: "积压成拥塞崩溃", tone: "warning" },
      { date: "21:20", title: "事件结束", desc: "共 14 小时 32 分", tone: "success" },
    ],
  },
  { type: "kpi_cards", items: [{ value: "**2h52m**", label: "DynamoDB 不可达" }, { value: "14h32m", label: "整个事件", tone: "danger" }] },
  { type: "callout", variant: "info", text: "故障本身 vs 事故窗口：5 倍：拖长它的是积压和连锁，不是故障本身" },
  { type: "callout", variant: "warn", icon: "siren", text: '原文："DWFM had entered a state of congestive collapse"，而且没有现成的恢复手册。' },
]

/** p08: three pictures over their figures, and what they share. */
const physical = [
  {
    type: "image_grid",
    items: [
      { asset_id: "grid-a", caption: "Azure West US 2 · 2026-05" },
      { asset_id: "grid-b", caption: "Google europe-west4-a · 2026-07" },
      { asset_id: "grid-c", caption: "Google us-west1 · 2026-08" },
    ],
  },
  { type: "kpi_cards", items: [{ value: "22h 06m", label: "雷暴打中两个可用区" }, { value: "44°C", label: "备用冷源恰在施工" }, { value: "单区域", label: "带宽被压缩，其他区域照常" }] },
  { type: "callout", variant: "tip", icon: "shield-check", text: "三起都只伤一个区域，同云多区域挡得住" },
]

/** p13: single points beside their paths, the second marked. */
const paths = [
  {
    type: "issue_tree",
    question: "会拖垮多区域的单点",
    children_column: "各留一条独立的路",
    branches: [
      { label: "入口与 DNS 只有一条路", note: "Azure Front Door 全球中断 8 小时 24 分", icon: "globe", children: [{ label: "备用入口，可绕开主 CDN" }] },
      { label: "身份绑在一个区域", note: "所有区域的 Redshift 用 IAM 用户查不了", icon: "key-round", emphasis: true, children: [{ label: "登录和权限解析不依赖单一区域" }] },
      { label: "数据只在一个区域", note: "AWS 巴林区域只在本区的数据已无法恢复", icon: "database", children: [{ label: "跨区域副本，加区域外备份" }] },
    ],
  },
]

/** p14: a dashboard beside four lines, two bad news, the last the answer. */
const screen = [
  { type: "device_mockup", device: "browser", asset_id: "dash", url: "status.internal / overview" },
  {
    type: "row_cards",
    items: [
      { icon: "bell-off", title: "Google · 2025-06", text: "状态页受连累，晚 55 分钟才发公告", tone: "danger" },
      { icon: "radio-tower", title: "Cloudflare · 2025-11", text: "状态页也挂了，一度疑为 DDoS", tone: "danger" },
      { icon: "shield-check", title: "Google 承诺", text: "主监控挂了，通报设施也要能用" },
      { icon: "flag", title: "我们", text: "状态页、告警和值班通知不走主云", highlight: true },
    ],
  },
]

const PAGES: [string, Composition, unknown[]][] = [
  ["cards (verdict)", cardsComposition, verdict],
  ["cards (HUD)", cardsComposition, recovery],
  ["listing", listingComposition, quotes],
  ["plates", platesComposition, physical],
  ["paths", pathsComposition, paths],
  ["screen", screenComposition, screen],
]

describe("the console compositions on terminal and two themes unlike it", () => {
  for (const theme of THEMES) {
    for (const [name, composition, components] of PAGES) {
      it(`${name} draws the board's page on ${theme}, inside the band, in the subset`, () => {
        const { root } = draw(composition, components, theme)
        expect(root, name).not.toBeNull()
        expect(() => assertSubset(root!)).not.toThrow()
        for (const text of texts(root!)) {
          const x = Number(text.getAttribute("x"))
          expect(x, textOf(text)).toBeGreaterThanOrEqual(BAND.x - 1)
          expect(x, textOf(text)).toBeLessThanOrEqual(BAND.x + BAND.w + 1)
        }
      })
    }
    it(`log hands its side column on to span on ${theme}`, () => {
      const { ctx } = testCtx(theme)
      const drawn = compose({ components: cascade as never, ctx: chinese(ctx), rect: BAND, setting: "console" }, ["log", "span"] as CompositionId[])
      expect(drawn).not.toBeNull()
      const { root } = renderNode(drawn!)
      expect(root.querySelector("[data-gauge-module='log']")).not.toBeNull()
      expect(root.querySelector("[data-gauge-module='span']")).not.toBeNull()
    })
  }

  it("declines outside the console setting", () => {
    for (const [name, composition, components] of PAGES.filter(([, c]) => [cardsComposition, listingComposition, platesComposition, pathsComposition, screenComposition].includes(c))) {
      expect(renderComposition(composition, components, { theme: "terminal", rect: BAND }).element, name).toBeNull()
    }
  })
})

describe("cards", () => {
  it("sets the verdict two across, the highlighted card on the mark's tint inside an edge of it, its title in the mark", () => {
    const { root, ctx } = draw(cardsComposition, verdict)
    const inks = consoleInks(ctx)
    const marked = root!.querySelector("[data-card-marked='1']")!
    expect(marked.querySelector("rect")!.getAttribute("fill")).toBe(inks.tint)
    expect(marked.querySelector("rect")!.getAttribute("stroke")).toBe(inks.mark)
    expect(byText(root!, "大面积中断多是一次变更推到全部")!.getAttribute("fill")).toBe(inks.mark)
    expect(Array.from(root!.querySelectorAll("text")).filter((t) => /^0\d$/.test(textOf(t))).map(textOf)).toEqual(["01", "02", "03", "04"])
    const second = byText(root!, "单区域故障是真的，多区域挡得住")!
    expect(numberOf(second, "x")).toBe(BAND.x + (BAND.w - 16) / 2 + 16 + 24)
  })

  it("sets HUD cards three across with brackets and tags, the callout in the sixth cell under its mono label", () => {
    const { root, ctx } = draw(cardsComposition, recovery)
    expect(root!.querySelectorAll("[data-hud-brackets]")).toHaveLength(5)
    expect(Array.from(root!.querySelectorAll("[data-console-tag]")).map(textOf)).toEqual(["Azure 2026-02", "AWS 2025-10", "Google 2025-06", "Cloudflare 2025-11", "Azure 2026-05"])
    const label = byText(root!, "我们现在就能做")!
    expect(label.getAttribute("font-family")).toBe(ctx.fonts.mono)
    expect(label.getAttribute("data-gloss-break")).toBe("：")
    const closing = root!.querySelector("[data-card-closing] rect")!
    expect(closing.getAttribute("fill")).toBe(consoleInks(ctx).tint)
  })

  it("sets numbered cards as verdict cards, numbered at their top right and with no count beside them", () => {
    const numbered = [{ type: "numbered_cards", items: (verdict[0] as { items: { title: string; text: string }[] }).items.map((item, i) => ({ title: item.title, text: item.text, ...(i === 1 ? { emphasis: true } : {}) })) }]
    const { root, ctx } = draw(cardsComposition, numbered)
    expect(root!.querySelector("[data-card-marked='1']")).not.toBeNull()
    expect(byText(root!, "单区域故障是真的，多区域挡得住")!.getAttribute("fill")).toBe(consoleInks(ctx).mark)
    expect(texts(root!).map(textOf).filter((t) => /^0\d$/.test(t))).toEqual(["01", "02", "03", "04"])
    expect(root!.querySelectorAll("circle")).toHaveLength(0)
  })

  it("lifts icon-less cards' titles level with their number, clear of it", () => {
    const numbered = [{ type: "numbered_cards", items: (verdict[0] as { items: { title: string; text: string }[] }).items.map((item) => ({ title: item.title, text: item.text })) }]
    const { root } = draw(cardsComposition, numbered)
    const title = byText(root!, "SLA 只赔服务费")!
    const number = texts(root!).find((t) => textOf(t) === "04")!
    expect(Math.abs(numberOf(title, "y") - numberOf(number, "y"))).toBeLessThan(12)
  })

  it("closes the cards with the page's verdict as a banner under them, in the variant its tone reads as", () => {
    const short = [{ type: "numbered_cards", items: ["多区域做到温备", "先补限流退避", "独立备用路径", "状态页搬出主云"].map((title) => ({ title, text: "一行说明" })) }]
    for (const [tone, variant] of [["positive", "tip"], ["warning", "warn"], ["neutral", "info"]] as const) {
      const { root } = draw(cardsComposition, [...short, { type: "verdict_banner", tone, text: "多区域做到温备，但先补限流退避和独立备用路径" }])
      const banner = root!.querySelector("[data-console-banner]")!
      expect(banner.getAttribute("data-console-banner")).toBe(variant)
      expect(textOf(byText(banner, "多区域做到温备，但先补限流退避和独立备用路径")!)).toBe("多区域做到温备，但先补限流退避和独立备用路径")
      const lastCard = Array.from(root!.querySelectorAll("[data-gauge-module='cards'] rect")).filter((r) => numberOf(r, "height") > 100).at(-1)!
      expect(numberOf(lastCard, "y") + numberOf(lastCard, "height")).toBeLessThanOrEqual(numberOf(banner.querySelector("rect"), "y") - 16)
    }
    const { root } = draw(cardsComposition, [...short, { type: "callout", variant: "warn", text: "先补限流退避" }])
    expect(root!.querySelector("[data-console-banner='warn']")).not.toBeNull()
    // Cards with an icon box and two lines of text need their full height: under a banner they decline.
    expect(draw(cardsComposition, [...verdict, { type: "callout", variant: "tip", text: "先补限流退避" }]).element).toBeNull()
  })

  it("declines a closing block that is not a verdict or a callout, and a verdict too long for two lines", () => {
    expect(draw(cardsComposition, [...verdict, { type: "bullets", items: ["a"] }]).element).toBeNull()
    expect(draw(cardsComposition, [...verdict, { type: "verdict_banner", tone: "positive", text: "很长的结论".repeat(30) }]).element).toBeNull()
  })

  it("declines a verdict title past its line", () => {
    const long = [{ ...verdict[0], items: (verdict[0] as { items: object[] }).items.map((item, i) => (i === 0 ? { ...item, title: "大面积中断多是一次变更推到全部节点而且同云多开一个区域也挡不住" } : item)) }]
    expect(draw(cardsComposition, long).element).toBeNull()
  })
})

describe("listing", () => {
  it("numbers every line, sets comments muted at 15px, quoted lines in the mark and marked lines bold in the warning ink", () => {
    const { root, ctx } = draw(listingComposition, quotes)
    const inks = consoleInks(ctx)
    expect(Array.from(root!.querySelectorAll("[data-gutter]")).map(textOf)).toEqual(["1", "2", "3", "4", "5", "6"])
    const kinds = Array.from(root!.querySelectorAll("[data-line-kind]")).map((g) => g.getAttribute("data-line-kind"))
    expect(kinds).toEqual(["comment", "quote", "plain", "comment", "marked", "marked"])
    const marked = root!.querySelectorAll("[data-line-kind='marked'] text:not([data-gutter])")
    expect(Array.from(marked).every((t) => t.getAttribute("font-weight") === "700")).toBe(true)
    expect(byText(root!, '"this metadata was replicated globally within seconds."')!.getAttribute("fill")).toBe(inks.mark)
    expect(byText(root!, "postmortems / quotes.txt")).toBeDefined()
  })

  it("declines a line wider than the window", () => {
    expect(draw(listingComposition, [{ type: "code", language: "text", code: "x".repeat(200) }]).element).toBeNull()
  })
})

describe("log and span", () => {
  it("dots each milestone in its tone's ink and lays the highlighted one on the mark's tint", () => {
    const { root, ctx } = draw(logComposition, [cascade[0]])
    const inks = consoleInks(ctx)
    const dots = Array.from(root!.querySelectorAll("[data-log-row] circle")).map((c) => c.getAttribute("fill"))
    expect(dots).toEqual([inks.danger, inks.success, inks.warning, inks.success])
    expect(root!.querySelector("[data-log-marked]")!.getAttribute("fill")).toBe(inks.tint)
    expect(byText(root!, "09:40")!.getAttribute("font-weight")).toBe("700")
  })

  it("reads lengths of time a console writes", () => {
    expect(parseDuration("2h52m")).toBe(172)
    expect(parseDuration("22h 06m")).toBe(1326)
    expect(parseDuration("3d 4h")).toBe(4560)
    expect(parseDuration("45 分钟")).toBeNull()
    expect(parseDuration("5/8")).toBeNull()
  })

  it("draws durations to one scale, the marked bar solid, the toned bar an outline with the marked span echoed inside", () => {
    const { root, ctx } = draw(spanComposition, cascade.slice(1), "terminal", { x: 788, y: 180, w: 428, h: 470 })
    const inks = consoleInks(ctx)
    const marked = root!.querySelector("[data-span-bar='marked'] rect")!
    const toned = Array.from(root!.querySelectorAll("[data-span-bar='toned'] rect"))
    expect(marked.getAttribute("fill")).toBe(inks.mark)
    expect(toned.at(-1)!.getAttribute("stroke")).toBe(inks.danger)
    expect(numberOf(toned[0], "width")).toBeCloseTo((380 * 172) / 872, 0)
    expect(byText(root!, "故障本身 vs 事故窗口")).toBeDefined()
    expect(root!.querySelector("[data-console-note='warn']")).not.toBeNull()
    const quote = Array.from(root!.querySelectorAll("[data-console-note='warn'] text")).find((t) => textOf(t).startsWith('"DWFM'))!
    expect(quote.getAttribute("font-family")).toBe(ctx.fonts.mono)
  })

  it("declines values that are not lengths of time", () => {
    expect(draw(spanComposition, [{ type: "kpi_cards", items: [{ value: "5/8", label: "a" }, { value: "7", label: "b" }] }]).element).toBeNull()
  })
})

describe("plates, paths and screen", () => {
  it("sets each picture over its caption, figure and label, and the banner across the foot", () => {
    const { root } = draw(platesComposition, physical)
    expect(root!.querySelectorAll("image")).toHaveLength(3)
    expect(byText(root!, "22h 06m")!.getAttribute("font-size")).toBe("44")
    expect(root!.querySelector("[data-console-banner='tip']")).not.toBeNull()
  })

  it("heads the failure points in the danger ink and the paths in the mark, the marked branch edged in danger", () => {
    const { root, ctx } = draw(pathsComposition, paths)
    const inks = consoleInks(ctx)
    expect(byText(root!, "会拖垮多区域的单点")!.getAttribute("fill")).toBe(inks.danger)
    expect(byText(root!, "各留一条独立的路")!.getAttribute("fill")).toBe(inks.mark)
    const marked = root!.querySelector("[data-path='marked']")!
    expect(marked.querySelector("rect")!.getAttribute("stroke")).toBe(inks.danger)
    expect(byText(root!, "登录和权限解析不依赖单一区域")!.getAttribute("font-weight")).toBe("700")
  })

  it("declines an issue tree without a header over its sub-points", () => {
    expect(draw(pathsComposition, [{ ...paths[0], children_column: undefined }]).element).toBeNull()
  })

  it("frames the screenshot in a browser with its address, the toned lines' names in their ink", () => {
    const { root, ctx } = draw(screenComposition, screen)
    const inks = consoleInks(ctx)
    expect(byText(root!, "status.internal / overview")).toBeDefined()
    expect(byText(root!, "Google · 2025-06")!.getAttribute("fill")).toBe(inks.danger)
    expect(root!.querySelector("[data-line='marked'] rect")!.getAttribute("fill")).toBe(inks.tint)
  })
})

describe("a picture's tag", () => {
  const withTag = (components: readonly unknown[]) => (components as { type: string; items?: Record<string, unknown>[] }[]).map((c) => (c.type === "image_grid" ? { ...c, items: c.items!.map((it, i) => (i === 1 ? { ...it, tag: { text: "选配", basis: "pending" } } : it)) } : c))
  it("leaves the pictures over their figures to the ordinary grid, which draws the tag", () => {
    expect(draw(platesComposition, physical).root).not.toBeNull()
    expect(draw(platesComposition, withTag(physical)).root).toBeNull()
  })
})
