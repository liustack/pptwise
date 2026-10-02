import { describe, expect, it } from "vitest"
import {
  allowsLineBreakBetween,
  fitSvgLine,
  hasExactWidthTable,
  layoutSvgText,
  measureMonoTextUnits,
  measureTextUnits,
  measuresExactly,
  truncateToMonoUnits,
  truncateToUnits,
} from "./svg-text-layout"
import { QUOTE_ADVANCES, SYMBOL_ADVANCE_BOUNDS } from "./symbol-advances"

describe("svg text layout", () => {
  it("wraps long mixed CJK title into bounded lines", () => {
    const layout = layoutSvgText(
      "平台架构演进 — 从单体到云原生的技术实践（紫蓝渐变背景）",
      {
        maxWidth: 1088,
        fontSize: 92,
        maxLines: 2,
      }
    )

    expect(layout.lines.length).toBeLessThanOrEqual(2)
    expect(layout.lines.join("")).toContain("平台架构演进")
    expect(layout.fontSize).toBeLessThanOrEqual(92)
  })

  it("scales a single line down when one line is required", () => {
    const layout = layoutSvgText(
      "very-long-file-name-for-quarterly-review.pptx",
      {
        maxWidth: 320,
        fontSize: 40,
        maxLines: 1,
      }
    )

    expect(layout.lines).toHaveLength(1)
    expect(layout.fontSize).toBeLessThan(40)
  })

  it("treats CJK characters as wider than Latin letters", () => {
    expect(measureTextUnits("容量评估")).toBeGreaterThan(
      measureTextUnits("opsx")
    )
  })

  it("clips wrap-merged lines that still overrun maxWidth at the 16px floor, without an ellipsis", () => {
    const source = "一".repeat(40)
    const r = layoutSvgText(source, {
      maxWidth: 80,
      fontSize: 24,
      maxLines: 2,
      minPt: 16,
    })
    expect(r.fontSize).toBe(16)
    expect(r.truncated).toBe(true)
    expect(r.lines.join("")).not.toContain("…")
    expect(r.lines.join("")).not.toMatch(/(?<![.])\.\.\.(?![.])/)
    for (const line of r.lines) {
      expect(measureTextUnits(line) * r.fontSize).toBeLessThanOrEqual(80)
    }
  })
})

describe("truncateToUnits", () => {
  it("returns short text unchanged", () => {
    expect(truncateToUnits("短", 10)).toBe("短")
  })
  it("clips to budget without painting an overflow mark", () => {
    const source = "微服务架构下的分布式事务一致性"
    const out = truncateToUnits(source, 6)
    expect(out).not.toContain("…")
    expect(out).not.toMatch(/(?<![.])\.\.\.(?![.])/)
    expect(source.startsWith(out)).toBe(true)
    expect(out.length).toBeLessThan(source.length)
    expect(measureTextUnits(out)).toBeLessThanOrEqual(6)
  })
  it("returns empty string when the budget cannot hold a character", () => {
    const out = truncateToUnits("任意文本", 0.3)
    expect(out).toBe("")
    expect(measureTextUnits(out)).toBeLessThanOrEqual(0.3)
  })
  it("returns empty string when the budget is smaller than one source character", () => {
    const out = truncateToUnits("任意文本", 0.46)
    expect(out).toBe("")
    expect(measureTextUnits(out)).toBeLessThanOrEqual(0.46)
  })

  // Run-awareness (sweep2 T4, R2's recorded follow-up). Pre-fix,
  // truncateToUnits cut strictly char-by-char with no notion of
  // LATIN_RUN_OR_CHAR_RE's own atomic-run boundaries (tokenize()'s
  // wrap/split path already respects those, see that constant's own
  // comment) — so a clip could land mid-Latin-run even though the
  // same text would never *wrap* mid-run. "集群Kubernetes管理" at a budget
  // that lands 7 letters into "Kubernetes" is exactly that repro.
  it("retreats a mid-run clip to the run's own start instead of splitting the run", () => {
    const out = truncateToUnits("集群Kubernetes管理", 7.3)
    expect(out).toBe("集群")
    expect(out).not.toContain("Kuberne")
    expect(out).not.toContain("…")
    expect(measureTextUnits(out)).toBeLessThanOrEqual(7.3)
  })

  it("keeps a mid-run cut when the straddled run starts the line (empty-line floor)", () => {
    // "Kubernetes" here starts the string, so retreating to the run's own
    // start (position 0) would drop all content — content beats purity,
    // same floor philosophy as splitLongToken's own fallback, so the
    // mid-run cut stands.
    const out = truncateToUnits("Kubernetes集群", 5.9)
    expect(out).not.toContain("…")
    expect(out.startsWith("K")).toBe(true)
    expect(out).not.toContain("集群")
    expect(out.length).toBeGreaterThan(1)
    expect(measureTextUnits(out)).toBeLessThanOrEqual(5.9)
  })

  it("clips pure-CJK to a prefix of the source (no Latin/digit run to straddle)", () => {
    // Pinned exact output, not just characteristics — every run
    // LATIN_RUN_OR_CHAR_RE finds in pure-CJK text is a single character
    // (length <= 1), so retreatFromMidRun's own `continue` guard means this
    // path is structurally unreachable here, not merely untested.
    expect(truncateToUnits("微服务架构下的分布式事务一致性", 6)).toBe("微服务架构下")
  })

  it("is deterministic across repeated calls on the same input", () => {
    const first = truncateToUnits("集群Kubernetes管理", 7.3)
    const second = truncateToUnits("集群Kubernetes管理", 7.3)
    expect(second).toBe(first)
  })
})

describe("truncateToMonoUnits", () => {
  it("clips a long mono line to budget without an overflow mark", () => {
    const source = "abcdefghijklmnopqrstuvwxyz"
    const out = truncateToMonoUnits(source, 4)
    expect(out).not.toContain("…")
    expect(source.startsWith(out)).toBe(true)
    expect(out.length).toBeLessThan(source.length)
    expect(measureMonoTextUnits(out)).toBeLessThanOrEqual(4)
  })
  it("returns empty string when even one mono character exceeds the budget", () => {
    expect(truncateToMonoUnits("abc", 0.2)).toBe("")
  })
})

describe("fitSvgLine", () => {
  it("keeps font size when text fits", () => {
    expect(fitSvgLine("OK", { maxWidth: 200, fontSize: 20 })).toEqual({
      text: "OK",
      fontSize: 20,
      truncated: false,
    })
  })
  // roadmap asked for its period labels at 14px under a 16px floor, and
  // every one of them, "Q1" included, came back painted whole at 16px yet
  // marked cut. The floor is where a line starts, not a reason to cut it.
  it("starts a request below the floor at the floor, and cuts nothing that fits there", () => {
    expect(fitSvgLine("Q1", { maxWidth: 200, fontSize: 14, minFontSize: 16 })).toEqual({
      text: "Q1",
      fontSize: 16,
      truncated: false,
    })
  })

  it("solves the tracking budget with the surviving text, not the input", () => {
    // 500 tracked glyphs ask for 499px of gaps alone. Deducting the *input*
    // string's budget from a 485px box left nothing to fit any text into, so
    // both author labels of an `image_compare` came back empty. The budget
    // belongs to whatever survives the cut.
    const weight = { bold: true, fontFamily: "Georgia" }
    const fit = fitSvgLine("i".repeat(500), { maxWidth: 485, fontSize: 16, minFontSize: 16, letterSpacing: 1, ...weight })
    const kept = Array.from(fit.text).length
    expect(kept).toBeGreaterThan(50)
    expect(fit.truncated).toBe(true)
    const painted = (n: number) => measureTextUnits("i".repeat(n), weight) * 16 + Math.max(0, n - 1)
    // Exactly as much as fits, and not one glyph more.
    expect(painted(kept)).toBeLessThanOrEqual(485)
    expect(painted(kept + 1)).toBeGreaterThan(485)
  })

  it("leaves the untracked truncation path alone", () => {
    const text = "一二三四五六七八九十"
    expect(fitSvgLine(text, { maxWidth: 120, fontSize: 20 })).toEqual(
      fitSvgLine(text, { maxWidth: 120, fontSize: 20, letterSpacing: 0 }),
    )
  })

  it("defaults the shrink floor to the 16px (12pt) readable floor", () => {
    const r = fitSvgLine("一二三四五六七八九十", { maxWidth: 120, fontSize: 20 })
    expect(r.fontSize).toBe(16)
    expect(r.truncated).toBe(true)
  })
  it("shrinks font down to the floor before truncating", () => {
    const r = fitSvgLine("一二三四五六七八九十", { maxWidth: 120, fontSize: 20, minFontSize: 12 })
    expect(r.fontSize).toBe(12)
    expect(r.text).toBe("一二三四五六七八九十") // 10 单位 × 12 = 120，恰好放下
    // Exactly fits at the floor — no character was dropped, so this must not
    // read as a truncation (bench-driven fix round, defect E: `truncated`
    // reports real content loss, not merely a smaller font size).
    expect(r.truncated).toBe(false)
  })
  it("truncates at the floor when still too wide", () => {
    const source = "一二三四五六七八九十一二"
    const r = fitSvgLine(source, { maxWidth: 120, fontSize: 20, minFontSize: 12 })
    expect(r.fontSize).toBe(12)
    expect(r.text).not.toContain("…")
    expect(source.startsWith(r.text)).toBe(true)
    expect(r.text.length).toBeLessThan(source.length)
    expect(measureTextUnits(r.text) * 12).toBeLessThanOrEqual(120)
    expect(r.truncated).toBe(true)
  })

  // Regression for the in-browser getBBox audit (Task 12): callers that
  // render the fitted line with an SVG `letterSpacing` attribute (every
  // theme's section-label "kicker" does, e.g. `Chapter 01 · <section>`) add
  // (charCount - 1) * letterSpacing extra real px that the unit-based
  // estimate below didn't know about, so long labels overflowed past the
  // page in a real browser despite passing the estimator-only audit.
  it("shrinks harder to leave room for letterSpacing", () => {
    const withoutSpacing = fitSvgLine("一二三四五六七八九十", { maxWidth: 200, fontSize: 20 })
    const withSpacing = fitSvgLine("一二三四五六七八九十", {
      maxWidth: 200,
      fontSize: 20,
      letterSpacing: 4,
    })
    // 10 chars → 9 gaps × 4px = 36px of letterSpacing to budget out of 200.
    expect(withSpacing.fontSize).toBeLessThan(withoutSpacing.fontSize)
    const charCount = 10
    const totalWidth =
      measureTextUnits(withSpacing.text) * withSpacing.fontSize +
      (charCount - 1) * 4
    expect(totalWidth).toBeLessThanOrEqual(200)
  })

  it("truncates harder (not just shrinks) when letterSpacing alone would blow the budget at the floor", () => {
    const r = fitSvgLine("一二三四五六七八九十一二三四五六七八九十", {
      maxWidth: 120,
      fontSize: 20,
      minFontSize: 12,
      letterSpacing: 4,
    })
    expect(r.fontSize).toBe(12)
    const charCount = Array.from(r.text).length
    const totalWidth = measureTextUnits(r.text) * 12 + Math.max(0, charCount - 1) * 4
    expect(totalWidth).toBeLessThanOrEqual(120)
    expect(r.truncated).toBe(true)
  })

  it("is a no-op when letterSpacing is omitted (existing callers unaffected)", () => {
    const withDefault = fitSvgLine("一二三四五六七八九十", { maxWidth: 120, fontSize: 20, minFontSize: 12 })
    const explicitZero = fitSvgLine("一二三四五六七八九十", {
      maxWidth: 120,
      fontSize: 20,
      minFontSize: 12,
      letterSpacing: 0,
    })
    expect(explicitZero).toEqual(withDefault)
  })
})

describe("layoutSvgText letterSpacing (wrap budget)", () => {
  // Red-first for the round-3 review's fashion-masthead finding:
  // `cover-fashion-masthead.tsx` renders its subtitle with
  // `letterSpacing={4}` but sized it through a `layoutSvgText` call that had
  // no way to hear about that tracking, so this 71-character EN subtitle was
  // judged to fit one 1168px line and rendered 1253.7px wide — right edge
  // 1309.7 on a 1280px page. `fitSvgLine` had budgeted tracking for single
  // lines since the kicker fix; the wrapping sibling had not.
  const EN_SUBTITLE = "Growth quality in predictive maintenance and where the second half goes"
  const realWidth = (line: string, fontSize: number, letterSpacing: number): number =>
    measureTextUnits(line) * fontSize + Math.max(0, Array.from(line).length - 1) * letterSpacing

  it("without the budget, the call site's own numbers reproduce the overflow (the red this fix answers)", () => {
    const blind = layoutSvgText(EN_SUBTITLE, { maxWidth: 1168, fontSize: 30, maxLines: 2, lineHeightRatio: 1.3 })
    expect(blind.lines).toHaveLength(1)
    // The estimator alone says it fits; add the tracking the render actually
    // paints and the same line is over budget — the exact blind spot.
    expect(measureTextUnits(blind.lines[0]) * blind.fontSize).toBeLessThanOrEqual(1168)
    expect(realWidth(blind.lines[0], blind.fontSize, 4)).toBeGreaterThan(1168)
  })

  it("budgets the tracking so every wrapped line fits its declared maxWidth", () => {
    const fitted = layoutSvgText(EN_SUBTITLE, {
      maxWidth: 1168,
      fontSize: 30,
      maxLines: 2,
      lineHeightRatio: 1.3,
      letterSpacing: 4,
    })
    expect(fitted.lines.length).toBeGreaterThan(0)
    expect(fitted.lines.length).toBeLessThanOrEqual(2)
    for (const line of fitted.lines) {
      expect(realWidth(line, fitted.fontSize, 4)).toBeLessThanOrEqual(1168)
    }
    // Content survives the fix — a narrower budget must re-wrap, not drop text.
    expect(fitted.lines.join(" ")).toBe(EN_SUBTITLE)
  })

  it("pays for the tracking out of the font size when the text cannot wrap (maxLines: 1)", () => {
    const withoutSpacing = layoutSvgText("一二三四五六七八九十", { maxWidth: 200, fontSize: 20, maxLines: 1 })
    const withSpacing = layoutSvgText("一二三四五六七八九十", {
      maxWidth: 200,
      fontSize: 20,
      maxLines: 1,
      letterSpacing: 4,
    })
    expect(withSpacing.fontSize).toBeLessThan(withoutSpacing.fontSize)
    expect(realWidth(withSpacing.lines[0], withSpacing.fontSize, 4)).toBeLessThanOrEqual(200)
  })

  it("is a no-op when letterSpacing is omitted or zero (existing callers unaffected)", () => {
    const opts = { maxWidth: 1088, fontSize: 92, maxLines: 2 } as const
    const withDefault = layoutSvgText("平台架构演进 — 从单体到云原生的技术实践（紫蓝渐变背景）", opts)
    const explicitZero = layoutSvgText("平台架构演进 — 从单体到云原生的技术实践（紫蓝渐变背景）", {
      ...opts,
      letterSpacing: 0,
    })
    expect(explicitZero).toEqual(withDefault)
  })
})

describe("layoutSvgText balanceLines (widow avoidance)", () => {
  // 用户复验 backlog#3：emerald 封面「年度战略回顾」在 360px/64px 下贪心断行成
  // 「年度战略回」+「顾」——孤字末行。balanceLines 按 total/N 预算重排为 3+3。
  it("re-balances a CJK widow into even lines when enabled", () => {
    const r = layoutSvgText("年度战略回顾", {
      maxWidth: 360,
      fontSize: 64,
      maxLines: 3,
      balanceLines: true,
    })
    expect(r.lines).toEqual(["年度战", "略回顾"])
    expect(r.fontSize).toBe(64)
  })

  it("keeps the greedy wrap by default, only lifting a lone last character", () => {
    // Greedy is 「年度战略回」+「顾」. Without balanceLines the lines stay
    // greedy, and the one move made is the orphan fix: one character joins
    // 「顾」 so the last line is not a single glyph.
    const r = layoutSvgText("年度战略回顾", { maxWidth: 360, fontSize: 64, maxLines: 3 })
    expect(r.lines).toEqual(["年度战略", "回顾"])
  })

  it("balances space-delimited text without splitting words", () => {
    // 贪心：["Alpha Beta Gamma Delta", "X"]（孤词末行）。平衡预算从
    // max(total/2, 最长词) 起步，逐步放宽，绝不触发 splitLongToken 拆词。
    const r = layoutSvgText("Alpha Beta Gamma Delta X", {
      maxWidth: 806.4, // 12.6 units × 64px
      fontSize: 64,
      maxLines: 2,
      balanceLines: true,
    })
    expect(r.lines.length).toBe(2)
    const greedyLast = "X"
    expect(r.lines[1]).not.toBe(greedyLast)
    for (const line of r.lines) {
      expect(line.split(" ").every((w) => "Alpha Beta Gamma Delta X".includes(w))).toBe(true)
    }
  })

  it("leaves explicit newlines alone", () => {
    const r = layoutSvgText("年度战略回\n顾", {
      maxWidth: 360,
      fontSize: 64,
      maxLines: 3,
      balanceLines: true,
    })
    expect(r.lines).toEqual(["年度战略回", "顾"])
  })

  it("does not rebalance when the last line is reasonably full", () => {
    // 「微服务架构下的分布式一致」12 字在 5.625 units 预算下 5+5+2？——用 2 行
    // 且末行 ≥ 50% 最宽行的用例：8 字 → 5+3，3/5=0.6 ≥ 0.5，保持贪心结果。
    const r = layoutSvgText("年度战略回顾报告", {
      maxWidth: 360,
      fontSize: 64,
      maxLines: 3,
      balanceLines: true,
    })
    expect(r.lines).toEqual(["年度战略回", "顾报告"])
  })

  it("evens Latin lines even when the last one is not a widow (brief en p04 heading)", () => {
    // Greedy: "Guangzhou lost 2,326 tea" + "shops in a year", 448 and 262px.
    // The last line is over half the first, so the widow test left it, with
    // "tea shops" split. Every break in Latin text falls between words, so
    // evening the lines costs no word, the way CSS text-wrap: balance sets a
    // heading.
    const r = layoutSvgText("Guangzhou lost 2,326 tea shops in a year", {
      maxWidth: 512,
      fontSize: 40,
      maxLines: 3,
      minPt: 22,
      lineHeightRatio: 1.3,
      balanceLines: true,
      fontFamily: "Georgia",
      bold: false,
    })
    expect(r.lines).toEqual(["Guangzhou lost 2,326", "tea shops in a year"])
    expect(r.fontSize).toBe(40)
  })

  it("never evens lines into a wider line than the greedy wrap's", () => {
    // Greedy holds three lines at 40px, the widest 305px. The first budget
    // that also makes three lines, "tea brand revenue" + "in leader margin" +
    // "fell sales", runs 319px wide and would have set the text at 38px.
    const opts = { maxWidth: 311, fontSize: 40, maxLines: 3, minPt: 22, fontFamily: "Georgia", bold: false }
    const text = "tea brand revenue in leader margin fell sales"
    const balanced = layoutSvgText(text, { ...opts, balanceLines: true })
    expect(balanced.fontSize).toBe(40)
    expect(balanced.lines).toEqual(layoutSvgText(text, opts).lines)
  })

  it("keeps a Chinese split that is no widow where the greedy wrap put it", () => {
    // The greedy break falls on the author's comma. An even split would fall
    // between any two characters, here 「种子用」+「户，」, so Chinese and
    // mixed text still rebalance only a widow.
    const r = layoutSvgText("每个班组配一名种子用户，问题十分钟内响应", {
      maxWidth: 12 * 40,
      fontSize: 40,
      maxLines: 3,
      balanceLines: true,
      fontFamily: "Microsoft YaHei",
    })
    expect(r.lines).toEqual(["每个班组配一名种子用户，", "问题十分钟内响应"])
  })
})

describe("tokenize atomic Latin/digit runs (task R2: fused-prefix wrap fix)", () => {
  // 缺陷（修复前）：无空格分支旧实现把整串按字符切 token（`Array.from`），
  // 一个粘在 CJK 中间、自身无空格的拉丁 run（本仓惯用语，如
  // "...OpenAPIGateway让..."）因此完全没有"整词"保护——贪心逐行填充可以在
  // run 内部任意字符处断行，且因为从未落进 `truncateToUnits`，`truncated`
  // 仍报 false，缺陷完全静默。
  //
  // R2 review 的 Important finding（test 诚实性，2026-07-24）：上一轮实现
  // 把 brief 原始 repro（run 在 STRING POSITION 0——串首即拉丁 run，典型如
  // 英文品牌名前缀，无任何 CJK 前导字符）换成了 run 在 position ≥1（前面
  // 垫了 5 个 CJK 字符）的变体，回避了真正的失败用例：position ≥1 时前导
  // CJK 先吸收第 1 行的预算，run 到达行尾前就已经该整体换行了，从不需要
  // 收缩字号即可保持完整；position 0 没有这层保护——`layoutSvgText` 的重试
  // 阶梯（retry ladder，本轮 review 判定的 SCOPE EXTENSION）总是收敛到
  // "允许拆分"能达到更大字号的那一档，run 依旧被从中间切断。下面先恢复
  // brief 原始 pin 串作为主用例（position 0），position ≥1 的钉子保留在本
  // describe 块末尾作为补充覆盖（守护"已经工作的那一半"，不删除）。
  const POSITION_0_PIN = "Brandxxxxxxxxxxxxxxx：让工程团队将大模型推理性能提升"
  const POSITION_0_RUN = "Brandxxxxxxxxxxxxxxx" // len 20 —— brief 原文字面 repro 串

  it("keeps the brief's own literal position-0 pin string intact at cover-left-anchor's own 360/64/3 budget (R2 review: restored primary case)", () => {
    const r = layoutSvgText(POSITION_0_PIN, { maxWidth: 360, fontSize: 64, maxLines: 3 })
    expect(r.lines).toEqual(["Brandxxxxxxxxxxxxxxx", "：让工程团队将大模型推", "理性能提升"])
    // run 独占第 1 行、从串首（position 0）开始——不是"某行包含 run"这种弱
    // 断言，而是直接锁死"第 1 行 === run 本身"，排除任何形式的中间切断。
    expect(r.lines[0]).toBe(POSITION_0_RUN)
    expect(r.lines.join("")).toBe(POSITION_0_PIN) // 无丢字/无重排
    expect(r.truncated).toBe(false)
  })

  it("keeps the same literal position-0 pin string intact at cover-split-diagonal's own 588/76/3 budget (R2 review: restored primary case)", () => {
    const r = layoutSvgText(POSITION_0_PIN, { maxWidth: 588, fontSize: 76, maxLines: 3 })
    expect(r.lines).toEqual(["Brandxxxxxxxxxxxxxxx", "：让工程团队将大模型推", "理性能提升"])
    expect(r.lines[0]).toBe(POSITION_0_RUN)
    expect(r.lines.join("")).toBe(POSITION_0_PIN)
    expect(r.truncated).toBe(false)
  })

  describe("sweep-derived position-0 regression thresholds (reviewer's measured mid-run-break range, no font-size floor)", () => {
    // review 的 sweep 脚本（r2-review-probes/sweep-run0-prefix.ts）在这两个
    // 真实预算点上实测：修复前 run 长度 16-45（360px）/ 15-40（588px）区间
    // 内 position-0 均 mid-run 断裂。这里钉 review 指定的四个具体长度，取值
    // 均由本文件同款 `layoutSvgText` 直调（不带 minPt，与上面两条主钉同一
    // 惯例）复算并核对，不是手估。
    function buildPin(runLen: number): { heading: string; run: string } {
      const run = runLen <= 5 ? "Brand".slice(0, runLen) : "Brand" + "x".repeat(runLen - 5)
      return { heading: `${run}：让工程团队将大模型推理性能提升`, run }
    }

    it.each([
      { label: "L=16 @360px (cover-left-anchor's own budget)", runLen: 16, maxWidth: 360, fontSize: 64 },
      { label: "L=20 @360px (cover-left-anchor's own budget)", runLen: 20, maxWidth: 360, fontSize: 64 },
      { label: "L=15 @588px (cover-split-diagonal's own budget)", runLen: 15, maxWidth: 588, fontSize: 76 },
      { label: "L=24 @588px (cover-split-diagonal's own budget)", runLen: 24, maxWidth: 588, fontSize: 76 },
    ])("$label: no mid-run break post-fix", ({ runLen, maxWidth, fontSize }) => {
      const { heading, run } = buildPin(runLen)
      const r = layoutSvgText(heading, { maxWidth, fontSize, maxLines: 3 })
      expect(r.lines[0]).toBe(run) // run 完整独占第 1 行，从 position 0 起无切断
      expect(r.lines.join("")).toBe(heading)
      expect(r.truncated).toBe(false)
    })
  })

  // Position ≥1 (a CJK prefix precedes the run) — already fixed by the
  // original R2 tokenize fix on its own, since the leading CJK chars absorb
  // line 1's budget and the run wraps whole to line 2 without ever needing
  // a smaller font. Kept as additional coverage guarding this already-
  // working half, per the R2 review's own instruction — not deleted.
  const FUSED = "统一接入层OpenAPIGateway让跨团队协作效率显著提升"
  const RUN = "OpenAPIGateway"

  it("keeps a fused Latin run intact at a narrow real call-site budget, run at position ≥1 (additional coverage — guards the already-working half)", () => {
    const r = layoutSvgText(FUSED, { maxWidth: 360, fontSize: 64, maxLines: 3 })
    expect(r.lines).toEqual(["统一接入层", "OpenAPIGateway让跨", "团队协作效率显著提升"])
    expect(r.lines.join("")).toBe(FUSED) // 无丢字/无重排
    expect(r.truncated).toBe(false)
  })

  it("keeps the same fused run intact at a second real call-site budget, run at position ≥1 (additional coverage — guards the already-working half)", () => {
    const r = layoutSvgText(FUSED, { maxWidth: 588, fontSize: 76, maxLines: 3 })
    expect(r.lines).toEqual(["统一接入层", "OpenAPIGateway让跨团", "队协作效率显著提升"])
    expect(r.lines.some((l) => l.includes(RUN))).toBe(true)
  })

  it("pure CJK (no space anywhere) wraps byte-identically to pre-fix behavior — the no-space branch's per-character CJK tokenization is untouched (regression pin)", () => {
    // 钉值取自修复前（未改动 tokenize）代码的实测输出，见任务报告：纯 CJK
    // 串本就一字一 token，新正则的「其余字符」分支与旧 `Array.from` 逐字符
    // 行为完全一致，这两个用例证明字节不变。
    const r1 = layoutSvgText("平台架构演进从单体到云原生的技术实践紫蓝渐变背景", {
      maxWidth: 1088,
      fontSize: 92,
      maxLines: 2,
    })
    expect(r1.lines).toEqual(["平台架构演进从单体到云原生", "的技术实践紫蓝渐变背景"])
    expect(r1.fontSize).toBe(83)
    expect(r1.truncated).toBe(false)

    const r2 = layoutSvgText("年度战略回顾报告全文完整版本不删减", {
      maxWidth: 360,
      fontSize: 64,
      maxLines: 3,
    })
    expect(r2.lines).toEqual(["年度战略回顾", "报告全文完整", "版本不删减"])
    expect(r2.fontSize).toBe(60)
  })

  it("space-delimited English wraps byte-identically to pre-fix behavior — that tokenize() branch is untouched by this fix (regression pin)", () => {
    const r = layoutSvgText("The Quick Brown Fox Jumps Over The Lazy Dog Repeatedly", {
      maxWidth: 400,
      fontSize: 40,
      maxLines: 3,
    })
    expect(r.lines).toEqual(["The Quick Brown Fox", "Jumps Over The Lazy", "Dog Repeatedly"])
    expect(r.fontSize).toBe(38)
  })

  it("an atomic run wider than any achievable line still falls back to splitLongToken -- no infinite loop, no dropped text", () => {
    // 自查点 (d)：原子 run 本身就超过整行预算时，splitLongToken 仍是唯一
    // 出路（不可能不切）——本用例证明该保底路径未被破坏：有限步内终止、
    // 拼回后与原文一致、且每行仍在预算内。
    const LONG = "Supercalifragilisticexpialidocious文本"
    const r = layoutSvgText(LONG, { maxWidth: 60, fontSize: 20, maxLines: 10 })
    expect(r.lines.join("")).toBe(LONG) // 无丢字
    expect(r.lines.length).toBeGreaterThan(1) // 确实被切开了，不是静默溢出成一行
    const maxUnits = 60 / r.fontSize
    for (const line of r.lines) {
      expect(measureTextUnits(line)).toBeLessThanOrEqual(maxUnits + 1e-9)
    }
  })

  describe("self-review: mixed-script / connector / accent boundary cases", () => {
    it("keeps a hyphen+percent run ('60-85%') atomic -- moves wholly to its own line rather than splitting", () => {
      const r = layoutSvgText("业务提升幅度达到60-85%这是核心指标", {
        maxWidth: 140,
        fontSize: 40,
        maxLines: 6,
      })
      expect(r.lines).toContain("60-85%")
    })

    it("keeps a dotted version string ('v2.3.1-rc.4') atomic when the line budget can fit it", () => {
      const r = layoutSvgText("本次发布对应版本号v2.3.1-rc.4请各团队升级验证", {
        maxWidth: 200,
        fontSize: 30,
        maxLines: 6,
      })
      expect(r.lines).toContain("v2.3.1-rc.4")
    })

    it("lets a trailing connector ('etc.') detach from the run -- the period can start the next line, but 'etc' itself never splits", () => {
      const r = layoutSvgText("支etc.以及后续会持续增加的更多类型说明", {
        maxWidth: 108,
        fontSize: 40,
        maxLines: 10,
      })
      const idx = r.lines.findIndex((l) => l.endsWith("etc"))
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(r.lines[idx + 1]?.startsWith(".")).toBe(true)
    })

    it("lets a leading connector ('-flag') detach from the run -- the hyphen can end the previous line, but 'flag' itself never splits", () => {
      const r = layoutSvgText("命令行参数新增了一个重要的-flag选项用于控制", {
        maxWidth: 130,
        fontSize: 40,
        maxLines: 8,
      })
      const idx = r.lines.findIndex((l) => l.endsWith("-"))
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(r.lines[idx + 1]?.startsWith("flag")).toBe(true)
    })

    it("documents the ASCII-only boundary: an accented Latin letter ('café') does NOT extend the atomic run, so a break can land between 'caf' and 'é'", () => {
      // 有意为之、与 brief 范围一致的已知边界：run 正则是 `[A-Za-z0-9]`，不含
      // `\p{L}`，重音拉丁字母不算 run 的延伸字符，退回逐字符 token（与 CJK
      // 同一处理路径）。这不是本任务要修的缺陷范围——诚实钉出这条边界，
      // 而非悄悄扩大正则去覆盖全部 Unicode 字母表。
      const r = layoutSvgText("这家连锁咖啡品牌café在全球范围内开设", {
        maxWidth: 90,
        fontSize: 40,
        maxLines: 6,
      })
      expect(r.lines).toContain("品牌caf")
      expect(r.lines).toContain("é在全球")
    })
  })
})

describe("layoutSvgText word-integrity retry-ladder preference (task R2 scope extension, 2026-07-24)", () => {
  // Critical finding fix: the retry ladder in `layoutSvgText` always
  // converged on the *largest* font satisfying `maxLines`, and character-
  // level `splitLongToken` output can always hit a target line count at a
  // smaller-or-equal budget than keeping a run whole — so a position-0 run
  // (see the describe block above) kept getting cut mid-run even after the
  // tokenizer itself learned to treat it as one atomic token. These tests
  // pin the ladder's own new selection rule directly (independent of any
  // one layout's exact pixel budget): prefer a split-free candidate
  // whenever one exists within `maxLines` and (when supplied) `minPt`,
  // otherwise fall back to exactly what the ladder always returned.
  const POSITION_0_PIN = "Brandxxxxxxxxxxxxxxx：让工程团队将大模型推理性能提升"

  it("prefers a split-free layout over the legacy split once minPt allows it (588/76/3, minPt 44)", () => {
    const withoutFloor = layoutSvgText(POSITION_0_PIN, { maxWidth: 588, fontSize: 76, maxLines: 3 })
    const withFloor = layoutSvgText(POSITION_0_PIN, { maxWidth: 588, fontSize: 76, maxLines: 3, minPt: 44 })
    // minPt=44 does not further constrain this particular search (the
    // split-free candidate's own font, 52, already clears it) -- supplying
    // it changes nothing here, which is itself worth pinning: `minPt` only
    // ever narrows the search, never widens or otherwise perturbs it.
    expect(withFloor).toEqual(withoutFloor)
    expect(withFloor.lines).toEqual(["Brandxxxxxxxxxxxxxxx", "：让工程团队将大模型推", "理性能提升"])
    expect(withFloor.fontSize).toBe(52)
  })

  it("falls back to the legacy split, byte-identical to the pre-task-R2-retry-ladder-fix algorithm, when the run is genuinely wider than a full line even at minPt (360/64/3, minPt 32)", () => {
    // Verified by direct measurement (not estimated): this 20-char run's own
    // width is ~12.04 units at Regular weight, but `maxWidth/minPt =
    // 360/32 = 11.25` units is the widest a single line can ever be once
    // the font has shrunk to the floor -- the run categorically cannot fit
    // one line without going under `minPt` (margin ≈ -2.1pt against the
    // best achievable split-free font, 29). This is exactly the documented
    // fallback condition ("run genuinely wider than a full line at minPt"):
    // splitting is the *correct*, intended outcome here, not a residual
    // defect -- see this task's report for the full margin table across
    // nearby lengths (the crossover sits between 18, which resolves, and
    // 19, which doesn't, at this exact budget).
    const withFloor = layoutSvgText(POSITION_0_PIN, { maxWidth: 360, fontSize: 64, maxLines: 3, minPt: 32 })
    // Cross-verified (scratch harness, not shipped) against the reviewer's
    // own pre-fix reference module (r2-review-probes/pre-fix/svg-text-
    // layout.ts, which has no `minPt` parameter at all -- called with the
    // same maxWidth/fontSize/maxLines): byte-identical output, confirming
    // this is genuinely "fall back to the current behavior", not a new,
    // merely-similar-looking split.
    expect(withFloor.lines.join("")).toBe(POSITION_0_PIN)
    expect(withFloor.truncated).toBe(false)
    expect(withFloor.fontSize).toBeGreaterThanOrEqual(16)
    for (const line of withFloor.lines) {
      expect(measureTextUnits(line) * withFloor.fontSize).toBeLessThanOrEqual(360)
    }
  })

  it("without a minPt floor, the same run finds a smaller but split-free font instead (contrast against the minPt-bounded fallback above)", () => {
    // Same string, same maxWidth/fontSize/maxLines as the fallback test
    // above -- only `minPt` differs (omitted here). Without a floor to
    // respect, the search is bounded only by the legacy ladder's own reach
    // (`baseUnits * 1.14^8`, see the "Supercalifragilisticexpialidocious"
    // test in the describe block above for when even *that* is exceeded),
    // which is generous enough here to find a whole-run layout.
    const r = layoutSvgText(POSITION_0_PIN, { maxWidth: 360, fontSize: 64, maxLines: 3 })
    expect(r.lines).toEqual(["Brandxxxxxxxxxxxxxxx", "：让工程团队将大模型推", "理性能提升"])
    expect(r.fontSize).toBe(31)
    expect(r.truncated).toBe(false)
  })

  it("leaves zero-split content byte-identical regardless of minPt (design constraint: the preference only ever reorders outcomes when a split actually appears)", () => {
    const pureCjk = "年度战略回顾报告全文完整版本不删减"
    const withoutFloor = layoutSvgText(pureCjk, { maxWidth: 360, fontSize: 64, maxLines: 3 })
    // minPt set to exactly this content's own natural fontSize (60) -- an
    // adversarial edge value, not a comfortably-clear one -- to prove the
    // branch genuinely never activates for split-free content, not merely
    // that it happens not to matter for an easy value.
    const withFloor = layoutSvgText(pureCjk, { maxWidth: 360, fontSize: 64, maxLines: 3, minPt: 60 })
    expect(withFloor).toEqual(withoutFloor)
    expect(withFloor.lines).toEqual(["年度战略回顾", "报告全文完整", "版本不删减"])
    expect(withFloor.fontSize).toBe(60)
  })

  it("maxLines=1 is a degenerate case for this preference: single-line output is invariant to it, with or without minPt", () => {
    // Self-review question (hostile pass): does maxLines=1 force the
    // fallback, since a single line leaves nowhere for a whole run to go?
    // Investigated directly rather than assumed -- the answer is no, for a
    // structural reason: whenever the ladder can't reach `maxLines` lines
    // on its own, `layoutSvgText`'s forced-merge fallback concatenates
    // every remaining line into one with no separator (this content has no
    // spaces), which reconstructs the original string exactly regardless of
    // where any *intermediate* wrap step happened to break it. "Mid-run
    // break" is a property of a boundary *between* array elements — with
    // exactly one element, there is no boundary for it to land on. Both
    // calls below therefore produce the identical single line, whether or
    // not `minPt` is supplied.
    const r = layoutSvgText(POSITION_0_PIN, { maxWidth: 360, fontSize: 64, maxLines: 1 })
    expect(r.lines).toHaveLength(1)
    expect(r.fontSize).toBeGreaterThanOrEqual(16)
    expect(measureTextUnits(r.lines[0]!) * r.fontSize).toBeLessThanOrEqual(360)
    expect(r.lines[0]).not.toContain("…")
    expect(r.truncated).toBe(true)
  })

  it("is a pure function of its inputs -- repeated calls with identical arguments produce identical output (no hidden nondeterminism in the search)", () => {
    const opts = { maxWidth: 360, fontSize: 64, maxLines: 3, minPt: 32 } as const
    const a = layoutSvgText(POSITION_0_PIN, opts)
    const b = layoutSvgText(POSITION_0_PIN, opts)
    const c = layoutSvgText(POSITION_0_PIN, opts)
    expect(b).toEqual(a)
    expect(c).toEqual(a)
  })
})

// hasExactWidthTable (backlog-sweep task I2): thin wrapper around
// classifyFaceKey + EXACT_TABLE_FOR's own membership, exported so a
// registration-time caller (themes/definitions.ts's registerTheme) can ask
// "does this resolved face get an exact width model" without reaching into
// this module's private classification internals.
describe("hasExactWidthTable", () => {
  it("is true for the two measured exact-model faces (georgia/yahei)", () => {
    expect(hasExactWidthTable("Georgia")).toBe(true)
    expect(hasExactWidthTable("Microsoft YaHei")).toBe(true)
    expect(hasExactWidthTable("微软雅黑")).toBe(true)
  })

  it("matches classifyFaceKey's own case/quote-insensitive first-member convention", () => {
    expect(hasExactWidthTable('"Georgia"')).toBe(true)
    expect(hasExactWidthTable("georgia")).toBe(true)
    expect(hasExactWidthTable("Georgia, Songti SC, STSong, serif")).toBe(true)
  })

  it("is false for a face that classifies but has only a class-average table (SimSun/KaiTi)", () => {
    expect(hasExactWidthTable("SimSun")).toBe(false)
    expect(hasExactWidthTable("宋体")).toBe(false)
    expect(hasExactWidthTable("KaiTi")).toBe(false)
    expect(hasExactWidthTable("楷体")).toBe(false)
  })

  it("is false for an unmeasured/unknown face, including undefined-like empty input", () => {
    expect(hasExactWidthTable("Cambria")).toBe(false)
    expect(hasExactWidthTable("Arial")).toBe(false)
    expect(hasExactWidthTable("")).toBe(false)
  })
})

describe("Regular widths from the fonts' own advance tables", () => {
  // Advance sum read from /System/Library/Fonts/Supplemental/Georgia.ttf
  // with a standalone cmap+hmtx parser: 26053 / 2048 em. rsvg paints the
  // same string at 100px with its ink ending at 1269px, 0.2% short of it.
  const REAL_EM = 26053 / 2048

  it("measures from the exact advance table, not the class averages", () => {
    // Pre-fix the class path priced this at 15.92em, 25% over the font.
    const units = measureTextUnits("Vertical playbook replication", { fontFamily: "Georgia" })
    expect(Math.abs(units - REAL_EM)).toBeLessThan(0.005)
  })

  it("lets a note that fits one line stay on one line (brief timeline repro)", () => {
    // 12.72em at 16px paints 203.5px. The class estimate (254.7px) wrapped it.
    const r = layoutSvgText("Vertical playbook replication", {
      maxWidth: 210,
      fontSize: 16,
      maxLines: 2,
      minPt: 16,
      fontFamily: "Georgia, Songti SC, STSong, serif",
    })
    expect(r.lines).toEqual(["Vertical playbook replication"])
  })

  it("measures Microsoft YaHei and SimSun Regular from their own advance tables too", () => {
    // msyh.ttc[0] and Simsun.ttc[0] advances, as FreeType reads them: 13.68em
    // and 14.5em, where the class average says 15.92em.
    const text = "Vertical playbook replication"
    expect(measureTextUnits(text, { fontFamily: "Microsoft YaHei" })).toBeCloseTo(13.6825, 3)
    expect(measureTextUnits(text, { fontFamily: "SimSun, 宋体, serif" })).toBe(14.5)
    expect(measureTextUnits(text)).toBeCloseTo(15.92, 3)
  })
})

// CJK line-break prohibition (禁则处理 / kinsoku shori) — see the set
// selection comment above `LINE_START_FORBIDDEN` in svg-text-layout.ts.
//
// The reported defect: the playbill deck cover heading "《候鸟旅馆》毕业公演"
// rendered as 「《候鸟旅馆」/「》毕业公演」, opening the second line with a
// closing book-title mark. Every case below asserts the concrete post-fix
// wrap, not merely the invariant, so a revert of the rule fails loudly
// rather than silently drifting to some other legal-looking split.
describe("CJK line-break prohibition (kinsoku)", () => {
  // Deliberately re-declared instead of imported from the module under
  // test: asserting against the implementation's own character class would
  // hold for whatever set the implementation happens to carry, including an
  // empty one. These are the marks the defect report named plus the ones
  // this repo's own corpus actually contains.
  const OPENS_A_LINE_ILLEGALLY = /^[》）」』】〉，。、：；！？…·]/
  const ENDS_A_LINE_ILLEGALLY = /[《（「『【〈]$/

  /** A first line may legitimately begin with a closing mark (the source
   *  text itself started with one) and a last line may end with an opening
   *  one — only interior boundaries are line breaks this rule governs. */
  const expectNoProhibitedBoundary = (lines: string[]): void => {
    for (const [i, line] of lines.entries()) {
      if (i > 0) expect([i, OPENS_A_LINE_ILLEGALLY.test(line)]).toEqual([i, false])
      if (i < lines.length - 1) expect([i, ENDS_A_LINE_ILLEGALLY.test(line)]).toEqual([i, false])
    }
  }

  const HEADING = {
    maxWidth: 480,
    fontSize: 96,
    maxLines: 2,
    minPt: 28,
    balanceLines: true,
    bold: true,
    fontFamily: "Microsoft YaHei",
  } as const

  it("keeps a closing 》 off a line start (the playbill cover repro)", () => {
    // Pre-fix this exact call returned ["《候鸟旅馆", "》毕业公演"] at
    // fontSize 96 — the closing mark alone at the head of line 2.
    const r = layoutSvgText("《候鸟旅馆》毕业公演", HEADING)
    expectNoProhibitedBoundary(r.lines)
    // Push-out forces three lines at the greedy budget, so `layoutSvgText`'s
    // own retry ladder grows the budget until two lines fit again — landing
    // on the title/occasion split a human would have chosen, one font step
    // smaller. That interplay is the point: the rule steers the existing fit
    // loop rather than bypassing it.
    expect(r.lines).toEqual(["《候鸟旅馆》", "毕业公演"])
    expect(r.fontSize).toBe(80)
    expect(r.truncated).toBe(false)
  })

  it("pushes an opening 《 off a line end", () => {
    // Pre-fix: ["毕业公演《", "候鸟旅馆》"] — line 1 ended on the opening mark.
    const r = layoutSvgText("毕业公演《候鸟旅馆》", HEADING)
    expectNoProhibitedBoundary(r.lines)
    expect(r.lines).toEqual(["毕业公演《候", "鸟旅馆》"])
    expect(r.lines[0]).not.toMatch(/《$/)
    expect(r.truncated).toBe(false)
  })

  it("never strands a Chinese comma or full stop at a line head", () => {
    // The corpus case behind most of the gallery's movement: pre-fix this
    // returned ["七月一场大涝淹田三天", "，稻子倒伏不足一成。"].
    const r = layoutSvgText("七月一场大涝淹田三天，稻子倒伏不足一成。", {
      maxWidth: 256,
      fontSize: 24,
      maxLines: 64,
      minPt: 24,
    })
    expectNoProhibitedBoundary(r.lines)
    // 「成。」 alone would be an orphan, so 「一」 comes down with it.
    expect(r.lines).toEqual(["七月一场大涝淹田三", "天，稻子倒伏不足", "一成。"])
  })

  it("pulls a doubled ellipsis onto the line before it", () => {
    // Pre-fix: ["剩下的部分留给下一季", "……我们不急。"].
    const r = layoutSvgText("剩下的部分留给下一季……我们不急。", {
      maxWidth: 240,
      fontSize: 24,
      maxLines: 3,
      minPt: 12,
    })
    expectNoProhibitedBoundary(r.lines)
    expect(r.lines).toEqual(["剩下的部分留给下一", "季……我们不急。"])
  })

  it("obeys the prohibition inside splitLongToken's emergency cut of an over-long token", () => {
    // A bracketed run wider than a whole line, so `splitLongToken`, not the
    // token packer, chooses the break points. Without the rule its cut lands
    // just before the closing bracket: ["lmnopq", ") now"].
    const r = layoutSvgText("see (abcdefghijklmnopq) now", {
      maxWidth: 60,
      fontSize: 16,
      maxLines: 8,
      minPt: 16,
    })
    expect(r.lines).toEqual(["see", "(abcde", "fghijk", "lmnop", "q) now"])
  })

  it("keeps kinsoku when a space-delimited CJK clause wraps per character", () => {
    // The clause after the space breaks between any two ideographs, and the
    // brackets still keep their places: 「（」 never ends a line and 「）」
    // never starts one.
    const r = layoutSvgText("报告 深度学习（DL）在生产环境的落地路径与成本。", {
      maxWidth: 120,
      fontSize: 24,
      maxLines: 8,
      minPt: 12,
    })
    expectNoProhibitedBoundary(r.lines)
    expect(r.lines).toEqual(["报告 深度", "学习", "（DL）在", "生产环境的", "落地路径与", "成本。"])
  })

  it("keeps the original cut rather than emptying a line when no legal break exists", () => {
    // Every boundary in this string is prohibited. The FLOOR must win:
    // content is preserved, no empty line is emitted, and the call
    // terminates.
    const r = layoutSvgText("》》》》》》》》", {
      maxWidth: 120,
      fontSize: 24,
      maxLines: 4,
      minPt: 12,
    })
    expect(r.lines).toEqual(["》》》》》", "》》》"])
    expect(r.lines.every((line) => line.length > 0)).toBe(true)
    expect(r.lines.join("")).toBe("》》》》》》》》")
  })

  it("retreats inside a CJK token when the line offers no legal boundary between tokens", () => {
    // 「夜校手机摄影课 · 第三讲」 packs as three tokens, and its only token
    // boundary puts the separator at a line head — pre-fix:
    // ["夜校手机摄影课", "· 第三讲"], a lone middle dot opening a 126px
    // display line. There is nothing to retreat *to*, so the boundary has to
    // come from inside the token: CJK breaks between any two ideographs.
    const r = layoutSvgText("夜校手机摄影课 · 第三讲", {
      maxWidth: 1088,
      fontSize: 126,
      maxLines: 2,
      minPt: 40,
      balanceLines: true,
      bold: false,
      fontFamily: "SimSun",
    })
    expectNoProhibitedBoundary(r.lines)
    expect(r.lines).toEqual(["夜校手机摄影", "课 · 第三讲"])
  })

  it("never splits a Latin word to satisfy the rule, even when a separator would head a line", () => {
    // The sub-token retreat requires wide (CJK) characters on both sides of
    // the boundary, so an English token can never supply one. Here the rule
    // does move the break — a middle dot is a middle dot in any script — but
    // it moves a whole word, and "Basics" survives intact.
    const r = layoutSvgText("Photography Basics · Volume Two", {
      maxWidth: 284,
      fontSize: 28,
      maxLines: 4,
      minPt: 14,
    })
    expect(r.lines).toEqual(["Photography", "Basics · Volume", "Two"])
    for (const word of "Photography Basics Volume Two".split(" ")) {
      expect(r.lines.some((line) => line.split(/[\s·]+/).includes(word))).toBe(true)
    }
  })

  it("leaves pure-Latin wrapping byte-identical, brackets and quotes included", () => {
    // The whole point of confining the character sets to CJK and bracket
    // forms: English word wrapping must not move at all. Each expectation
    // below is the pre-fix output, recorded by running these exact calls
    // against the commit before the rule landed.
    expect(
      layoutSvgText("Quarterly revenue review for the northern region", {
        maxWidth: 320,
        fontSize: 24,
        maxLines: 3,
      }).lines,
    ).toEqual(["Quarterly revenue review", "for the northern region"])

    expect(
      layoutSvgText("Adoption (measured weekly) climbed to 62% across the pilot cohort.", {
        maxWidth: 300,
        fontSize: 22,
        maxLines: 4,
      }).lines,
    ).toEqual(["Adoption (measured", "weekly) climbed to 62%", "across the pilot cohort."])

    expect(
      layoutSvgText('The team called it "a quiet, decisive quarter" in the memo.', {
        maxWidth: 260,
        fontSize: 20,
        maxLines: 4,
      }).lines,
    ).toEqual(['The team called it "a', 'quiet, decisive quarter"', "in the memo."])

    expect(
      layoutSvgText("Supercalifragilisticexpialidocious benchmarks", {
        maxWidth: 200,
        fontSize: 28,
        maxLines: 3,
        minPt: 16,
      }).lines,
    ).toEqual(["Supercalifragili", "sticexpialidocio", "us benchmarks"])

    expect(
      layoutSvgText("very-long-file-name-for-quarterly-review.pptx", {
        maxWidth: 320,
        fontSize: 40,
        maxLines: 1,
      }).lines,
    ).toEqual(["very-long-file-name-for-quarterly-re"])
  })
})

describe("allowsLineBreakBetween", () => {
  it("refuses a break that would put a closing mark or trailing punctuation at a line head", () => {
    expect(allowsLineBreakBetween("馆", "》")).toBe(false)
    expect(allowsLineBreakBetween("天", "，")).toBe(false)
    expect(allowsLineBreakBetween("成", "。")).toBe(false)
    expect(allowsLineBreakBetween("点", "」")).toBe(false)
    expect(allowsLineBreakBetween("A", ")")).toBe(false)
    expect(allowsLineBreakBetween("季", "…")).toBe(false)
    expect(allowsLineBreakBetween("戏", "·")).toBe(false)
  })

  it("refuses a break that would leave an opening mark at a line end", () => {
    expect(allowsLineBreakBetween("《", "候")).toBe(false)
    expect(allowsLineBreakBetween("（", "D")).toBe(false)
    expect(allowsLineBreakBetween("「", "这")).toBe(false)
    expect(allowsLineBreakBetween("“", "a")).toBe(false)
  })

  it("allows an ordinary CJK or Latin boundary, and a closing mark at a line end", () => {
    expect(allowsLineBreakBetween("旅", "馆")).toBe(true)
    expect(allowsLineBreakBetween("》", "毕")).toBe(true)
    expect(allowsLineBreakBetween("，", "稻")).toBe(true)
    expect(allowsLineBreakBetween("e", "w")).toBe(true)
    expect(allowsLineBreakBetween(")", "n")).toBe(true)
  })

  it("keeps a number with the unit that counts it, and a magnitude with what it scales", () => {
    expect(allowsLineBreakBetween("2", "个")).toBe(false)
    expect(allowsLineBreakBetween("8", "家")).toBe(false)
    expect(allowsLineBreakBetween("0", "万")).toBe(false)
    expect(allowsLineBreakBetween("3", "亿")).toBe(false)
    expect(allowsLineBreakBetween("亿", "元")).toBe(false)
    expect(allowsLineBreakBetween("万", "人")).toBe(false)
    // Neither rule reaches past the unit, or into Latin text.
    expect(allowsLineBreakBetween("元", "降")).toBe(true)
    expect(allowsLineBreakBetween("亿", "降")).toBe(true)
    expect(allowsLineBreakBetween("2", "a")).toBe(true)
  })

  it("wraps a Chinese sentence without splitting a figure from its unit", () => {
    const text =
      "四年里我们净增了 144 家门店，门店层利润却从 3.08 亿元降到了 1.93 亿元。412 家门店中，38 家已经连续 12 个月亏损，去年合计亏掉 2,860 万元。"
    for (const maxWidth of [600, 700, 760, 820, 880]) {
      const { lines } = layoutSvgText(text, { maxWidth, fontSize: 27, maxLines: 6 })
      for (let i = 1; i < lines.length; i += 1) {
        const before = lines[i - 1]!.trimEnd()
        const after = lines[i]!.trimStart()
        expect(`${before}|${after}`).not.toMatch(/[0-9]\|[万亿元家个月]|亿\|元|万\|元/)
      }
    }
  })

  it("treats ASCII sentence punctuation and straight quotes as freely breakable, keeping English wrapping untouched", () => {
    // Direction-ambiguous or Latin-context marks, deliberately excluded from
    // both sets — see the set-selection comment in svg-text-layout.ts.
    expect(allowsLineBreakBetween("d", ".")).toBe(true)
    expect(allowsLineBreakBetween("d", ",")).toBe(true)
    expect(allowsLineBreakBetween("2", "%")).toBe(true)
    expect(allowsLineBreakBetween('"', "a")).toBe(true)
    expect(allowsLineBreakBetween("'", "a")).toBe(true)
    expect(allowsLineBreakBetween("—", "碰")).toBe(true)
  })

  it("treats a paragraph edge as always breakable", () => {
    expect(allowsLineBreakBetween(undefined, "》")).toBe(true)
    expect(allowsLineBreakBetween("《", undefined)).toBe(true)
    expect(allowsLineBreakBetween("", "》")).toBe(true)
  })
})

describe("CJK orphan avoidance (no single-character last line)", () => {
  // Body type at a frozen size, the way form cards call it (`layoutAtSize`).
  const at = (text: string, maxWidth: number) =>
    layoutSvgText(text, { maxWidth, fontSize: 16, maxLines: 64, minPt: 16 })

  it("moves one character down to a lone last character (runway five-forces repro)", () => {
    // Pre-fix: ["植物染批次色差需沟通成", "本"].
    const r = at("植物染批次色差需沟通成本", 180)
    expect(r.lines).toEqual(["植物染批次色差需沟通", "成本"])
    expect(r.fontSize).toBe(16)
    expect(r.truncated).toBe(false)
  })

  it("splits a four-character label two and two (cycle node repro)", () => {
    // Pre-fix: ["方案评", "审"].
    expect(at("方案评审", 52).lines).toEqual(["方案", "评审"])
  })

  it("counts closing punctuation with the character it trails", () => {
    // Pre-fix: ["女主角「旅馆老板", "娘」"]. 「娘」」 is still one ideograph.
    expect(at("女主角「旅馆老板娘」", 132).lines).toEqual(["女主角「旅馆老", "板娘」"])
    // Pre-fix: ["九十分以上十八人，比期中多了五", "人。"].
    expect(at("九十分以上十八人，比期中多了五人。", 244).lines).toEqual([
      "九十分以上十八人，比期中多了",
      "五人。",
    ])
  })

  it("moves a space-delimited word whole rather than splitting it", () => {
    // Pre-fix: ["业务 SLO 要求 90", "秒。"].
    expect(at("业务 SLO 要求 90 秒。", 144).lines).toEqual(["业务 SLO 要求", "90 秒。"])
  })

  it("leaves the greedy lines alone when no character can be spared", () => {
    // 「季」+「后赛」 would only move the orphan to the first line.
    expect(at("季后赛", 36).lines).toEqual(["季后", "赛"])
  })

  it("never widens the last line past the budget", () => {
    // One ideograph per line: moving one down would overflow, so it stays.
    expect(at("成本", 20).lines).toEqual(["成", "本"])
  })

  it("leaves a lone Latin word on the last line alone", () => {
    expect(at("Vertical playbook replication", 200).lines).toEqual(["Vertical playbook", "replication"])
  })
})

describe("space-delimited mixed text wraps Chinese per character", () => {
  const at = (text: string, maxWidth: number, fontSize = 16, fontFamily?: string) =>
    layoutSvgText(text, { maxWidth, fontSize, maxLines: 64, minPt: fontSize, fontFamily })

  it("fills the line after a lone Latin word (arena split-band repro)", () => {
    // Pre-fix the clause after "BP" moved to the next line whole:
    // ["BP", "前三手的英雄池扩展到二十", "一个。"].
    expect(at("BP 前三手的英雄池扩展到二十一个。", 240).lines).toEqual(["BP 前三手的英雄池扩展到二十", "一个。"])
  })

  it("breaks a Chinese clause mid-sentence instead of ending the line at a Latin word (brief rings repro)", () => {
    // Pre-fix: ["镜像构建从 Jenkins 迁到 GitHub", "Actions，平均构建时长从 11 分钟降到 4 分钟。"].
    const r = at("镜像构建从 Jenkins 迁到 GitHub Actions，平均构建时长从 11 分钟降到 4 分钟。", 430, 20, "Georgia")
    expect(r.lines).toEqual(["镜像构建从 Jenkins 迁到 GitHub Actions，平均", "构建时长从 11 分钟降到 4 分钟。"])
  })

  it("still keeps every Latin word, number and its punctuation whole", () => {
    const text = "迁到 GitHub Actions, 90% 的构建 v2.3.1-rc 版本"
    const r = at(text, 90)
    const words = ["GitHub", "Actions,", "90%", "v2.3.1-rc"]
    for (const word of words) expect(r.lines.some((line) => line.split(" ").includes(word)), word).toBe(true)
    expect(r.lines.join("").replace(/\s/g, "")).toBe(text.replace(/\s/g, ""))
  })

  it("wraps pure English exactly as before", () => {
    expect(at("Seat expansion in existing accounts and more", 200).lines).toEqual([
      "Seat expansion in",
      "existing accounts and",
      "more",
    ])
  })
})

describe("measuresExactly", () => {
  it("is true for printable ASCII in a face with a table for that weight, and for CJK", () => {
    expect(measuresExactly("accounts", { fontFamily: "Georgia" })).toBe(true)
    expect(measuresExactly("k seats 90%", { fontFamily: "Microsoft YaHei" })).toBe(true)
    expect(measuresExactly("Q2 季度", { fontFamily: "SimSun" })).toBe(true)
    expect(measuresExactly("万元，", { fontFamily: "Cambria" })).toBe(true)
  })

  it("is false where a character falls back to a class average", () => {
    // SimSun has no Bold binary, Cambria no table, and "‰"/"·" no entry.
    expect(measuresExactly("Q2", { fontFamily: "SimSun", bold: true })).toBe(false)
    expect(measuresExactly("accounts", { fontFamily: "Cambria" })).toBe(false)
    expect(measuresExactly("3‰", { fontFamily: "Georgia" })).toBe(false)
    expect(measuresExactly("甲 · 乙", { fontFamily: "Microsoft YaHei" })).toBe(false)
  })
})

describe("non-ASCII marks never measure narrower than the face draws them", () => {
  // Read with scripts/gen-symbol-advances.mts from Georgia.ttf, msyh.ttc,
  // Simsun.ttc and Kaiti.ttf. Pre-fix every one of these fell to a class
  // average below the real advance.
  it("prices the marks the fonts draw wide at their real width", () => {
    expect(measureTextUnits("·", { fontFamily: "SimSun" })).toBe(1) // was 0.563
    expect(measureTextUnits("·", { fontFamily: "KaiTi, 楷体, serif" })).toBe(1)
    expect(measureTextUnits("—", { fontFamily: "Microsoft YaHei" })).toBeCloseTo(1.0801, 4) // was 1
    expect(measureTextUnits("‰", { fontFamily: "Georgia" })).toBeCloseTo(1.3125, 4) // was 0.46
    expect(measureTextUnits("…", { fontFamily: "Georgia", bold: true })).toBeCloseTo(0.9629, 4) // was 0.421
    expect(measureTextUnits("\u3000", { fontFamily: "Microsoft YaHei" })).toBe(1) // was 0.35
    expect(measureTextUnits("é", { fontFamily: "Microsoft YaHei" })).toBeCloseTo(0.5674, 4) // was 0.46
  })

  it("covers the marks and symbols a Chinese or English deck carries", () => {
    for (const ch of "·—–…“”‘’《》、。，×°‰¥€") {
      for (const face of ["georgia", "yahei", "simsun-kaiti"] as const) {
        expect(SYMBOL_ADVANCE_BOUNDS[face].regular[ch.charCodeAt(0)], `${face} ${ch}`).toBeDefined()
        expect(SYMBOL_ADVANCE_BOUNDS[face].bold[ch.charCodeAt(0)], `${face} bold ${ch}`).toBeDefined()
      }
    }
  })

  it("never measures a covered character below its bound or below the class average", () => {
    const families = { georgia: "Georgia", yahei: "Microsoft YaHei", "simsun-kaiti": "SimSun" } as const
    for (const [face, weights] of Object.entries(SYMBOL_ADVANCE_BOUNDS) as [keyof typeof families, (typeof SYMBOL_ADVANCE_BOUNDS)["georgia"]][]) {
      for (const [weight, table] of Object.entries(weights) as ["regular" | "bold", Record<number, number>][]) {
        for (const [cp, w] of Object.entries(table)) {
          // A curly quote the face carries is measured, not bounded (next block).
          if (QUOTE_ADVANCES[face][weight][Number(cp)] !== undefined) continue
          const ch = String.fromCharCode(Number(cp))
          const measured = measureTextUnits(ch, { fontFamily: families[face], bold: weight === "bold" })
          expect(measured, `${face} ${weight} U+${Number(cp).toString(16)}`).toBeGreaterThanOrEqual(w)
          if (weight === "regular") expect(measured).toBeGreaterThanOrEqual(measureTextUnits(ch))
        }
      }
    }
  })

  it("leaves a call that names no face on the class average", () => {
    expect(measureTextUnits("·")).toBeCloseTo(0.46, 6)
  })
})

describe("curly quotes measure in the face that paints them", () => {
  // The export writes every run as lang="en-US", and PowerPoint then paints a
  // curly quote from the run's <a:latin> face, beside Chinese text as much as
  // English (PowerPoint for Mac, PDF export, 2026-10-03): Georgia set “ ” at
  // 0.41em and ‘ ’ at 0.23em, YaHei and SimSun on the full em, Consolas on
  // its grid. Pre-fix every face measured them a full em, so a run after an
  // opening quote in Georgia, and the highlight under it, landed 0.59em right.
  it("prices Georgia's quotes at Georgia's own advance", () => {
    expect(measureTextUnits("“", { fontFamily: "Georgia, Songti SC, serif" })).toBeCloseTo(0.4102, 4) // was 1
    expect(measureTextUnits("”", { fontFamily: "Georgia" })).toBeCloseTo(0.4102, 4)
    expect(measureTextUnits("‘", { fontFamily: "Georgia" })).toBeCloseTo(0.2266, 4)
    expect(measureTextUnits("’", { fontFamily: "Georgia" })).toBeCloseTo(0.2266, 4)
    expect(measureTextUnits("“", { fontFamily: "Georgia", bold: true })).toBeCloseTo(0.519, 4)
  })

  it("measures a quote beside Chinese in the same Latin face", () => {
    const g = { fontFamily: "Georgia" }
    expect(measureTextUnits("“第三方”", g)).toBeCloseTo(3 + 2 * 0.4102, 4)
  })

  it("keeps the Chinese faces' quotes on the full em", () => {
    expect(measureTextUnits("“", { fontFamily: "Microsoft YaHei" })).toBe(1)
    expect(measureTextUnits("’", { fontFamily: "Microsoft YaHei", bold: true })).toBe(1)
    expect(measureTextUnits("”", { fontFamily: "SimSun" })).toBe(1)
    expect(measureTextUnits("”", { fontFamily: "KaiTi", bold: true })).toBe(1)
  })

  it("prices a quote in a face it has no table for as wide as a Chinese face sets it", () => {
    expect(measureTextUnits("“", { fontFamily: "Cambria" })).toBe(1)
    expect(measureTextUnits("“")).toBe(1)
  })

  it("sets Consolas's quotes on its grid like any other glyph", () => {
    expect(measureMonoTextUnits("“a”")).toBeCloseTo(3 * (1126 / 2048), 6) // was 2.55
  })

  it("measures every quote a face carries at that face's own advance", () => {
    const families = { georgia: "Georgia", yahei: "Microsoft YaHei", "simsun-kaiti": "SimSun" } as const
    for (const [face, weights] of Object.entries(QUOTE_ADVANCES) as [keyof typeof families, (typeof QUOTE_ADVANCES)["georgia"]][]) {
      for (const [weight, table] of Object.entries(weights) as ["regular" | "bold", Record<number, number>][]) {
        for (const [cp, w] of Object.entries(table)) {
          const ch = String.fromCharCode(Number(cp))
          expect(measureTextUnits(ch, { fontFamily: families[face], bold: weight === "bold" }), `${face} ${weight} U+${Number(cp).toString(16)}`).toBe(w)
        }
      }
    }
  })

  it("counts a quoted sentence in a tabled face as measured exactly", () => {
    expect(measuresExactly("“Sales fell.”", { fontFamily: "Georgia" })).toBe(true)
    expect(measuresExactly("“销量下滑。”", { fontFamily: "Microsoft YaHei" })).toBe(true)
  })
})

describe("balanced lines prefer to break where Latin meets CJK", () => {
  // The brief bmc cell's own call: body size, no line cap, balanced.
  const cell = (text: string, maxWidth: number) =>
    layoutSvgText(text, { maxWidth, fontSize: 16, maxLines: Number.POSITIVE_INFINITY, minPt: 16, balanceLines: true })

  it("keeps an English name on one line when the split at the script seam is nearly as even (bmc repro)", () => {
    // Pre-fix: ["Linjiang", "Group 临江咨询"], a break inside the name.
    const r = cell("Linjiang Group 临江咨询", 160)
    expect(r.lines).toEqual(["Linjiang Group", "临江咨询"])
    expect(r.fontSize).toBe(16)
    expect(r.truncated).toBe(false)
  })

  it("moves a break from between two CJK characters to the script seam at three lines", () => {
    // Pre-fix: ["Linjiang", "Group 临", "江咨询"].
    expect(cell("Linjiang Group 临江咨询", 100).lines).toEqual(["Linjiang", "Group", "临江咨询"])
  })

  it("does not take the seam when it would leave the lines far from even", () => {
    // 「Linjiang Group」+「临江咨询服务中心有限公司」 is the only seam split, and
    // its second line runs far past the balanced widest, so the balanced
    // split between two CJK characters stands.
    expect(cell("Linjiang Group 临江咨询服务中心有限公司", 200).lines).toEqual([
      "Linjiang Group 临江咨询",
      "服务中心有限公司",
    ])
  })

  it("leaves all-Latin and all-CJK balancing as it was", () => {
    const opts = { maxWidth: 360, fontSize: 64, maxLines: 3, balanceLines: true }
    expect(layoutSvgText("年度战略回顾", opts).lines).toEqual(["年度战", "略回顾"])
    expect(
      layoutSvgText("Alpha Beta Gamma Delta X", { ...opts, maxWidth: 806.4, maxLines: 2 }).lines,
    ).toEqual(["Alpha Beta", "Gamma Delta X"])
  })

  it("never widens past the greedy lines or brings back a one-character last line", () => {
    for (let w = 90; w <= 200; w += 2) {
      const text = "Linjiang Group 临江咨询"
      const greedy = layoutSvgText(text, { maxWidth: w, fontSize: 16, maxLines: 8, minPt: 16 })
      const r = cell(text, w)
      expect(r.lines.length, `${w}`).toBe(greedy.lines.length)
      expect(r.fontSize).toBe(16)
      const widest = Math.max(...greedy.lines.map((l) => measureTextUnits(l)))
      for (const line of r.lines) expect(measureTextUnits(line)).toBeLessThanOrEqual(widest + 1e-9)
      expect(Array.from(r.lines.at(-1)!).length).toBeGreaterThan(1)
      expect(r.lines.join("").replace(/\s/g, "")).toBe(text.replace(/\s/g, ""))
    }
  })
})

