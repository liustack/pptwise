// crayon 色板的对比度地板。每一格的门槛由它**实际扮演的角色**决定，不是
// 一律 4.5：24px 粗体的日期与联系方式答的是 3:1 大字线，图表标记答的是
// 3.0 装饰可见线，只作色块的黄不承字所以不答任何文字门槛。
//
// 这个文件存在的理由：crayon-box 换血那一轮，primary 按 4.5 挑，压深两档
// 后读起来像企业链接蓝；chartPalette 的亮橘掉到 2.74，图表柱子会和纸底
// 分不开。两处都是人眼事后发现的。这里把 14 个值全部钉住。
import { describe, expect, it } from "vitest"
import { contrastRatio, readableOn } from "../svg/ink"
import { CRAYON_TOKENS } from "./crayon"

const c = CRAYON_TOKENS.colors
const ratio = (a: string, b: string) => Number(contrastRatio(a, b).toFixed(2))

describe("crayon 色板对比度地板", () => {
  it("正文与次级文字过 4.5 正文线", () => {
    expect(ratio(c.text, c.bg)).toBeGreaterThanOrEqual(4.5)
    expect(ratio(c.text, c.surface)).toBeGreaterThanOrEqual(4.5)
    expect(ratio(c.muted, c.bg)).toBeGreaterThanOrEqual(4.5)
    expect(ratio(c.muted, c.surface)).toBeGreaterThanOrEqual(4.5)
  })

  it("primary 只给 24px 粗体上色，答 3:1 大字线而不是 4.5", () => {
    expect(ratio(c.primary, c.bg)).toBeGreaterThanOrEqual(3)
  })

  it("号贴纸上的数字压 accent 过 4.5", () => {
    expect(ratio(c.text, c.accent)).toBeGreaterThanOrEqual(4.5)
  })

  it("语义三色：danger 与 success 过 4.5，warning 只答 3:1", () => {
    expect(ratio(c.danger!, c.surface)).toBeGreaterThanOrEqual(4.5)
    expect(ratio(c.success!, c.surface)).toBeGreaterThanOrEqual(4.5)
    expect(ratio(c.warning!, c.surface)).toBeGreaterThanOrEqual(3)
  })

  it("chartPalette 前三格过 3.0 图表标记线，第四格是写明在案的例外", () => {
    const [blue, orange, green, yellow] = c.chartPalette
    for (const hex of [blue, orange, green]) {
      expect(ratio(hex!, c.bg), hex).toBeGreaterThanOrEqual(3)
    }
    // 阳光黄只作色块与太阳笔画，永不承字。改动前的 #F5B700 同样在线下
    // （1.68）。钉住这个数字，让它哪天被当成文字色用时立刻暴露。
    expect(ratio(yellow!, c.bg)).toBeLessThan(3)
  })

  it("chartPalette 每格作徽章底时两墨取优过 4.5", () => {
    for (const hex of c.chartPalette) {
      const ink = readableOn(hex!)
      const alt = ink.toUpperCase() === "#FFFFFF" ? c.text : "#FFFFFF"
      expect(Math.max(ratio(ink, hex!), ratio(alt, hex!)), hex).toBeGreaterThanOrEqual(4.5)
    }
  })
})
