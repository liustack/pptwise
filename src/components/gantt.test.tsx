// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize";
import { assertSubset } from "../render/subset-validate";
import { gantt } from "./gantt";
import type { ComponentCtx } from "./types";

const ctx: ComponentCtx = {
  colors: {
    bg: "#F7F7F2",
    surface: "#FFFFFF",
    primary: "#051C2C",
    accent: "#FFC72C",
    text: "#051C2C",
    muted: "#6C6C6C",
    chartPalette: ["#051C2C", "#FFC72C"],
  },
  fonts: {
    heading: "Georgia",
    body: "Microsoft YaHei",
    mono: "Consolas",
    figure: "Georgia",
  },
  bodyFontPx: 24,
};

function svg(node: React.ReactElement) {
  return render(<svg>{node}</svg>);
}

const basic = {
  type: "gantt" as const,
  items: [
    { label: "设计", start: 0, end: 10 },
    { label: "开发", start: 5, end: 10 },
  ],
};

describe("gantt component", () => {
  it("renders one bar rect and one row label per item", () => {
    const { container } = svg(
      gantt.render(basic, { x: 0, y: 0, w: 1000, h: 300 }, ctx)
    );
    expect(container.querySelectorAll("rect")).toHaveLength(2);
    const texts = Array.from(container.querySelectorAll("text")).map(
      (t) => t.textContent
    );
    expect(texts).toContain("设计");
    expect(texts).toContain("开发");
  });

  it("row labels are left-aligned (textAnchor start), not dumbbell's right-aligned convention", () => {
    const { container } = svg(
      gantt.render(basic, { x: 0, y: 0, w: 1000, h: 300 }, ctx)
    );
    const labelTexts = Array.from(container.querySelectorAll("text")).filter(
      (t) => ["设计", "开发"].includes(t.textContent ?? "")
    );
    for (const t of labelTexts)
      expect(t.getAttribute("text-anchor")).toBe("start");
  });

  it("bar width is proportional to the item's own span within the shared [min(start), max(end)] axis", () => {
    // axis bounds: min(start)=0, max(end)=10. Item "设计" spans the full
    // axis (width === plotW); item "开发" spans exactly half of it.
    const { container } = svg(
      gantt.render(basic, { x: 100, y: 0, w: 1000, h: 300 }, ctx)
    );
    const rects = Array.from(container.querySelectorAll("rect"));
    const widths = rects
      .map((r) => Number(r.getAttribute("width")))
      .sort((a, b) => b - a);
    const [fullW, halfW] = widths;
    expect(halfW / fullW).toBeCloseTo(0.5, 1);
  });

  it("evenly distributes axis_labels as tick text, first/last edge-anchored", () => {
    const withAxis = { ...basic, axis_labels: ["W1", "W2", "W3"] };
    const { container } = svg(
      gantt.render(withAxis, { x: 0, y: 0, w: 1000, h: 300 }, ctx)
    );
    const texts = Array.from(container.querySelectorAll("text"));
    const tickTexts = texts.filter((t) =>
      ["W1", "W2", "W3"].includes(t.textContent ?? "")
    );
    expect(tickTexts).toHaveLength(3);
    const first = tickTexts.find((t) => t.textContent === "W1")!;
    const last = tickTexts.find((t) => t.textContent === "W3")!;
    expect(first.getAttribute("text-anchor")).toBe("start");
    expect(last.getAttribute("text-anchor")).toBe("end");
  });

  it("omitting axis_labels renders zero tick text (the field is optional)", () => {
    const { container } = svg(
      gantt.render(basic, { x: 0, y: 0, w: 1000, h: 300 }, ctx)
    );
    const texts = Array.from(container.querySelectorAll("text")).map(
      (t) => t.textContent
    );
    expect(texts).toEqual(["设计", "开发"]);
  });

  it("box.h stretches row height to fill the given height (no 1.7x cap)", () => {
    const natural = gantt.measure(basic, 1000, ctx);
    const shortRender = svg(
      gantt.render(basic, { x: 0, y: 0, w: 1000, h: natural }, ctx)
    );
    const tallRender = svg(
      gantt.render(basic, { x: 0, y: 0, w: 1000, h: natural * 3 }, ctx)
    );
    const shortH = Number(
      shortRender.container.querySelector("rect")!.getAttribute("height")
    );
    const tallH = Number(
      tallRender.container.querySelector("rect")!.getAttribute("height")
    );
    expect(tallH).toBeGreaterThan(shortH * 2);
  });

  it("renders the schema-max 8 items without throwing", () => {
    const eight = {
      type: "gantt" as const,
      items: Array.from({ length: 8 }, (_, i) => ({
        label: `阶段${i}`,
        start: i,
        end: i + 2,
      })),
    };
    const { container } = svg(
      gantt.render(eight, { x: 0, y: 0, w: 1000, h: 500 }, ctx)
    );
    expect(container.querySelectorAll("rect")).toHaveLength(8);
  });

  it("a very long row label still fits (fitSvgLine shrink-then-truncate), never a raw overflow", () => {
    const long = {
      type: "gantt" as const,
      items: [
        {
          label: "一个非常非常非常非常非常非常长的阶段名称用于测试截断行为",
          start: 0,
          end: 10,
        },
        ...basic.items,
      ],
    };
    expect(() =>
      svg(gantt.render(long, { x: 0, y: 0, w: 1000, h: 300 }, ctx))
    ).not.toThrow();
  });

  it("measure()/render() are deterministic — same input, same output", () => {
    const a = gantt.measure(basic, 1000, ctx);
    const b = gantt.measure(basic, 1000, ctx);
    expect(a).toBe(b);
    const markupA = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg">
        {gantt.render(basic, { x: 0, y: 0, w: 1000, h: 300 }, ctx)}
      </svg>
    );
    const markupB = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg">
        {gantt.render(basic, { x: 0, y: 0, w: 1000, h: 300 }, ctx)}
      </svg>
    );
    expect(markupA).toBe(markupB);
  });

  it("renders only svg2pptx-subset primitives", () => {
    const markup = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg">
        {gantt.render(basic, { x: 0, y: 0, w: 1000, h: 300 }, ctx)}
      </svg>
    );
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow();
  });
});

describe("gantt text and emphasis", () => {
  const plan = {
    type: "gantt" as const,
    axis_labels: ["10 月", "11 月", "12 月"],
    items: [
      {
        label: "窗口期",
        text: "地方补贴先到先得",
        start: 0,
        end: 2,
        emphasis: true,
      },
      { label: "12 月 31 日", text: "中央资金到期", start: 2, end: 3 },
    ],
  };

  it("sets a stretch's text in muted type under its label", () => {
    const { container } = svg(
      gantt.render(plan, { x: 0, y: 0, w: 1000, h: 300 }, ctx)
    );
    const texts = Array.from(container.querySelectorAll("text"));
    const label = texts.find((t) => t.textContent === "窗口期")!;
    const text = texts.find((t) => t.textContent === "地方补贴先到先得")!;
    expect(text.getAttribute("x")).toBe(label.getAttribute("x"));
    expect(Number(text.getAttribute("y"))).toBeGreaterThan(
      Number(label.getAttribute("y"))
    );
    expect(text.getAttribute("fill")).toBe(ctx.colors.muted);
  });

  it("draws the marked stretch in the emphasis colour and lets the others recede", () => {
    const { container } = svg(
      gantt.render(plan, { x: 0, y: 0, w: 1000, h: 300 }, ctx)
    );
    const marked = container.querySelector('[data-gantt-marked="1"] rect')!;
    const other = Array.from(container.querySelectorAll("rect")).find(
      (r) => r !== marked
    )!;
    expect(marked.getAttribute("fill")).toBe(ctx.colors.accent);
    expect(other.getAttribute("fill")).not.toBe(ctx.colors.accent);
    expect(other.getAttribute("fill")).not.toBe(ctx.colors.primary);
    expect(() =>
      assertSubset(
        parseSvgRoot(
          renderSvgMarkup(
            <svg>
              {gantt.render(plan, { x: 0, y: 0, w: 1000, h: 300 }, ctx)}
            </svg>
          )
        )
      )
    ).not.toThrow();
  });
});

describe("gantt range, row icon and period", () => {
  const plan = {
    type: "gantt" as const,
    range: { from: 0, to: 18 },
    items: [
      {
        label: "成本",
        start: 15,
        end: 18,
        icon: "coins" as const,
        period: "第 16 至 18 个月",
        text: "参照：每笔约 4.54 元",
      },
      { label: "密度", start: 9, end: 15, period: "第 10 至 15 个月" },
      { label: "安全", start: 6, end: 9 },
    ],
  };

  it("runs the axis over the author's range rather than the bars' own stretch", () => {
    const box = { x: 0, y: 0, w: 1000, h: 300 };
    const { container } = render(<svg>{gantt.render(plan, box, ctx)}</svg>);
    const bars = Array.from(container.querySelectorAll("rect"));
    const plotX = 160 + 14;
    const plotW = 1000 - 160 - 14 - 16;
    expect(Number(bars[0]!.getAttribute("x"))).toBeCloseTo(
      plotX + (15 / 18) * plotW,
      3
    );
    expect(Number(bars[2]!.getAttribute("x"))).toBeCloseTo(
      plotX + (6 / 18) * plotW,
      3
    );
  });

  it("sets a row's icon before its label and its period under it", () => {
    const { container } = render(
      <svg>{gantt.render(plan, { x: 0, y: 0, w: 1000 }, ctx)}</svg>
    );
    expect(
      Array.from(container.querySelectorAll("g[data-row-icon]")).map((g) =>
        g.getAttribute("data-row-icon")
      )
    ).toEqual(["coins"]);
    const label = Array.from(container.querySelectorAll("text")).find(
      (t) => t.textContent === "成本"
    )!;
    expect(Number(label.getAttribute("x"))).toBeGreaterThan(16);
    const periods = Array.from(
      container.querySelectorAll("text[data-gantt-period]")
    );
    expect(periods.map((t) => t.textContent)).toEqual([
      "第 16 至 18 个月",
      "第 10 至 15 个月",
    ]);
    expect(Number(periods[0]!.getAttribute("y"))).toBeGreaterThan(
      Number(label.getAttribute("y"))
    );
    const text = Array.from(container.querySelectorAll("text")).find(
      (t) => t.textContent === "参照：每笔约 4.54 元"
    )!;
    expect(Number(text.getAttribute("y"))).toBeGreaterThan(
      Number(periods[0]!.getAttribute("y"))
    );
  });
});

describe("gantt marked spans (bands)", () => {
  const season = {
    type: "gantt" as const,
    axis_labels: [
      "2026.10",
      "11",
      "12",
      "2027.1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
    ],
    items: [
      { label: "拍板立项", start: 0, end: 1 },
      { label: "首站试点", start: 8, end: 9, emphasis: true },
      { label: "演唱会季执行", start: 9, end: 12 },
    ],
    bands: [{ from: 8, to: 12, label: "演唱会季 6 至 9 月" }],
  };

  it("tints the span behind the bars and names it under the axis", () => {
    const box = { x: 0, y: 0, w: 1000, h: 300 };
    const { container } = render(<svg>{gantt.render(season, box, ctx)}</svg>);
    const band = container.querySelector("[data-gantt-band]")!;
    const tint = band.querySelector("rect")!;
    const plotX = 160 + 14;
    const plotW = 1000 - 160 - 14 - 16;
    expect(Number(tint.getAttribute("x"))).toBeCloseTo(
      plotX + (8 / 12) * plotW,
      3
    );
    expect(Number(tint.getAttribute("width"))).toBeCloseTo((4 / 12) * plotW, 3);
    // The tint is painted first, so every bar stands over it.
    const first = container.querySelector("g > *")!;
    expect(first.hasAttribute("data-gantt-band")).toBe(true);
    const name = band.querySelector("text")!;
    expect(name.textContent).toBe("演唱会季 6 至 9 月");
    const axisLabel = Array.from(container.querySelectorAll("text")).find(
      (t) => t.textContent === "2026.10"
    )!;
    expect(Number(name.getAttribute("y"))).toBeGreaterThan(
      Number(axisLabel.getAttribute("y"))
    );
    expect(Number(name.getAttribute("y"))).toBeLessThanOrEqual(300);
  });

  it("measures a line for the span's name", () => {
    expect(gantt.measure(season, 1000, ctx)).toBe(
      gantt.measure({ ...season, bands: undefined }, 1000, ctx) + 28
    );
  });

  it("refuses a span outside the axis, running backwards, or over another", async () => {
    const { schema } = await import("../ir/components/gantt");
    expect(schema.safeParse(season).success).toBe(true);
    expect(
      schema.safeParse({ ...season, bands: [{ from: 8, to: 13, label: "x" }] })
        .success
    ).toBe(false);
    expect(
      schema.safeParse({
        ...season,
        range: { from: 0, to: 13 },
        bands: [{ from: 8, to: 13, label: "x" }],
      }).success
    ).toBe(true);
    expect(
      schema.safeParse({ ...season, bands: [{ from: 9, to: 8, label: "x" }] })
        .success
    ).toBe(false);
    expect(
      schema.safeParse({
        ...season,
        bands: [
          { from: 2, to: 6, label: "a" },
          { from: 5, to: 9, label: "b" },
        ],
      }).success
    ).toBe(false);
  });

  it("keeps its primitives", () => {
    const markup = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg">
        {gantt.render(season, { x: 0, y: 0, w: 1000, h: 300 }, ctx)}
      </svg>
    );
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow();
  });
});

describe("a gantt's moments and unsettled stretches", () => {
  const months = [
    "2026-10",
    "",
    "",
    "2027-01",
    "",
    "",
    "04",
    "",
    "",
    "07",
    "",
    "",
    "10",
    "",
    "",
    "2028-01",
    "",
    "",
    "04",
    "",
    "",
  ];
  const plan = {
    type: "gantt" as const,
    range: { from: 0, to: 20 },
    axis_labels: months,
    milestones: [{ at: 8.5, label: "数据闸门 · 2027 年 6 月" }],
    items: [
      { label: "旧阈值断点基准", start: 4, end: 10 },
      {
        label: "设计二或深化基准",
        start: 9,
        end: 15,
        basis: "pending" as const,
      },
    ],
  };

  it("is accepted with a moment inside the axis, refused outside it", async () => {
    const { schema } = await import("../ir/components/gantt");
    expect(schema.safeParse(plan).success).toBe(true);
    expect(
      schema.safeParse({ ...plan, milestones: [{ at: 21, label: "x" }] })
        .success
    ).toBe(false);
    expect(
      schema.safeParse({
        ...plan,
        items: [plan.items[0], { ...plan.items[1], basis: "maybe" }],
      }).success
    ).toBe(false);
  });

  it("draws a moment as a line down the rows and a diamond with its label under them", () => {
    const { container } = render(
      <svg>{gantt.render(plan, { x: 0, y: 0, w: 1100, h: 300 }, ctx)}</svg>
    );
    const moment = container.querySelector("[data-gantt-moment]")!;
    expect(moment.getAttribute("data-gantt-moment")).toBe(
      "数据闸门 · 2027 年 6 月"
    );
    const line = moment.querySelector("line")!;
    const diamond = moment.querySelector("path")!;
    expect(Number(line.getAttribute("y2"))).toBeLessThan(
      Number(diamond.getAttribute("d")!.split(" ")[2])
    );
    expect(moment.querySelector("text")!.textContent).toBe(
      "数据闸门 · 2027 年 6 月"
    );
  });

  it("draws an unsettled stretch as a dashed outline", () => {
    const { container } = render(
      <svg>{gantt.render(plan, { x: 0, y: 0, w: 1100, h: 300 }, ctx)}</svg>
    );
    const outline = container.querySelector("[data-gantt-unsettled]")!;
    expect(outline.getAttribute("fill")).toBe("none");
    expect(outline.getAttribute("stroke-dasharray")).toBe("5 3");
  });

  it("lets a named axis label take the room of the blank ones after it", () => {
    const { container } = render(
      <svg>{gantt.render(plan, { x: 0, y: 0, w: 1100, h: 300 }, ctx)}</svg>
    );
    const labels = Array.from(container.querySelectorAll("text")).filter(
      (t) => months.includes(t.textContent ?? "-") && t.textContent
    );
    expect(labels.map((t) => t.textContent)).toEqual([
      "2026-10",
      "2027-01",
      "04",
      "07",
      "10",
      "2028-01",
      "04",
    ]);
    for (const t of labels) expect(t.getAttribute("data-truncated")).toBeNull();
  });
});

describe("gantt rows past its box", () => {
  const six = {
    type: "gantt" as const,
    axis_labels: [
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
    ],
    bands: [{ from: 8, to: 12, label: "Season" }],
    items: [
      { label: "One", start: 0, end: 1 },
      { label: "Two", text: "With a second line", start: 1, end: 4 },
      { label: "Three", text: "With a second line", start: 2, end: 8 },
      { label: "Four", text: "With a second line", start: 8, end: 9 },
      { label: "Five", text: "With a second line", start: 9, end: 12 },
      { label: "Six", start: 11, end: 12 },
    ],
  };

  it("draws every row a box tall enough holds, and declares nothing", () => {
    const { container } = svg(
      gantt.render(six, { x: 0, y: 0, w: 1100, h: 700 }, ctx)
    );
    expect(container.querySelector("[data-dropped]")).toBeNull();
    expect(
      Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
    ).toContain("Six");
  });

  it("leaves off the rows a short box cannot hold and declares them, keeping the whole axis", () => {
    const box = { x: 0, y: 0, w: 1100, h: 448 };
    const { container } = svg(gantt.render(six, box, ctx));
    const marker = container.querySelector("[data-dropped]");
    expect(marker?.getAttribute("data-dropped-kind")).toBe("item");
    const shown = 6 - Number(marker?.getAttribute("data-dropped"));
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThan(6);
    const texts = Array.from(container.querySelectorAll("text")).map(
      (t) => t.textContent
    );
    expect(texts).not.toContain("Six");
    // Every line stays inside the box.
    for (const t of Array.from(container.querySelectorAll("text")))
      expect(Number(t.getAttribute("y"))).toBeLessThanOrEqual(box.h);
    // The span still lies on the axis the whole gantt set: from 8 of 12, not past the plot.
    const span = container.querySelector('[data-gantt-band="Season"] rect')!;
    const right =
      Number(span.getAttribute("x")) + Number(span.getAttribute("width"));
    expect(right).toBeLessThanOrEqual(box.w);
  });
});

describe("gantt under a ruled theme", () => {
  const ruled: ComponentCtx = {
    ...ctx,
    shape: { radius: 8, surfaces: "ruled" },
  };
  const filled: ComponentCtx = { ...ctx, shape: { radius: 8 } };
  const plans = {
    plain: basic,
    marked: {
      type: "gantt" as const,
      items: [
        { label: "窗口期", start: 0, end: 2, emphasis: true },
        { label: "到期", start: 2, end: 3 },
        { label: "复盘", start: 3, end: 4, basis: "estimate" as const },
      ],
    },
  };
  const bars = (c: ComponentCtx, plan: Parameters<typeof gantt.render>[0]) => {
    const { container } = svg(
      gantt.render(plan, { x: 0, y: 0, w: 1000, h: 300 }, c)
    );
    return Array.from(container.querySelectorAll("rect"));
  };

  it("keeps each bar's colour as filled draws it, a bar being a data mark", () => {
    for (const plan of Object.values(plans)) {
      const r = bars(ruled, plan);
      const f = bars(filled, plan);
      expect(r.length).toBe(f.length);
      r.forEach((bar, i) => {
        expect(bar.getAttribute("fill")).toBe(f[i].getAttribute("fill"));
        expect(bar.getAttribute("stroke")).toBe(f[i].getAttribute("stroke"));
      });
      expect(
        r.some((bar) => bar.getAttribute("fill") === ctx.colors.primary)
      ).toBe(false);
    }
  });

  it("squares the bars' corners", () => {
    for (const plan of Object.values(plans)) {
      for (const bar of bars(ruled, plan))
        expect(Number(bar.getAttribute("rx") ?? 0)).toBe(0);
    }
  });
});
