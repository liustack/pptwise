import type { Component } from "@/ir"
import { PHOTO_ASSETS } from "./components"
import type { Lexicon } from "./lexicon"

/*
 * The gallery pages for proposal's binder sheet: the shapes a client
 * proposal makes its case in, one a composition (`src/layouts/compositions/`,
 * the binder setting). Written from the lexicon, the words a page needs that
 * a lexicon has no field for set in both languages.
 */

interface BinderBody {
  readonly heading: string
  readonly components: Component[]
  readonly footnote?: string
  readonly ballot?: { choices: string[] }
}

const say = (lex: Lexicon, zh: string, en: string) => (lex.id === "zh" ? zh : en)
const colon = (lex: Lexicon) => (lex.id === "zh" ? "：" : ": ")
const stop = (lex: Lexicon) => (lex.id === "zh" ? "。" : ". ")
const figure = (lex: Lexicon, i: number) => `${lex.metrics[i]!.value} ${lex.metrics[i]!.unit}`

type BinderComposition = "gains" | "hours" | "regions" | "workings" | "levers" | "cycles" | "drift" | "parts" | "plans" | "precedents" | "safeguards" | "remedies" | "checkpoints" | "quote" | "papers"

const productOf = (lex: Lexicon, i: number) => lex.products![i]!

export const BINDER_BODIES: Record<BinderComposition, (lex: Lexicon) => BinderBody> = {
  gains: (lex) => ({
    heading: lex.headings[0]!,
    components: [
      { type: "verdict_banner", tone: "positive", icon: "handshake", text: lex.chapters[0]! },
      {
        type: "kpi_cards",
        items: [0, 1, 4].map((m, i) => ({
          icon: (["zap", "calculator", "file-check"] as const)[i]!,
          label: lex.phrases[i]!,
          value: i === 1 ? `**${figure(lex, m)}**` : figure(lex, m),
          note: lex.bullets[i]!,
        })),
      },
      { type: "callout", variant: "tip", icon: "lightbulb", text: lex.verdicts.positive },
    ],
    footnote: lex.sources[0]!.label,
  }),
  hours: (lex) => {
    // Which machines run, hour by hour: off, light and full load.
    const load = [
      [0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 1, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 1, 1, 1, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ]
    return {
      heading: lex.headings[3]!,
      components: [
        {
          type: "heatmap",
          x_labels: Array.from({ length: 24 }, (_, h) => say(lex, `${h} 时`, `${h}:00`)),
          y_labels: [8, 9, 10].map((i, k) => `${lex.labels[i]!}${colon(lex)}${lex.labels[12 + k]!}`),
          values: load,
          label_every: 6,
          steps: [
            { max: 0, label: say(lex, "停机", "Off"), short: say(lex, "停", "Off") },
            { max: 1, label: say(lex, "轻载", "Light load"), short: say(lex, "轻", "Light") },
            { label: say(lex, "满载", "Full load"), short: say(lex, "满", "Full") },
          ],
          bands: [{ from: say(lex, "8 时", "8:00"), to: say(lex, "11 时", "11:00"), label: lex.labels[12]!, icon: "sun" }],
          x_title: lex.segmentAxis,
        },
        { type: "kpi_cards", items: [0, 1, 2].map((i) => ({ label: lex.labels[3]!, value: figure(lex, i), note: lex.labels[i + 4]! })) },
      ],
      footnote: lex.sources[0]!.label,
    }
  },
  regions: (lex) => ({
    heading: lex.headings[2]!,
    components: [
      {
        type: "comparison",
        columns: [lex.labels[8]!, lex.labels[9]!, lex.labels[10]!],
        rows: [
          { label: "", cells: [lex.periods[0]!, lex.periods[1]!, lex.periods[2]!] },
          { label: lex.labels[1]!, cells: [lex.phrases[0]!, lex.phrases[1]!, lex.phrases[2]!] },
          { label: lex.labels[3]!, emphasis: true, cells: [figure(lex, 0), `${figure(lex, 1)}${say(lex, "（估算）", " (est.)")}`, figure(lex, 2)] },
          { label: "", cells: [lex.labels[12]!, lex.labels[13]!, `**${lex.labels[14]!}**`] },
        ],
      },
      { type: "callout", variant: "info", icon: "receipt", title: lex.verdicts.warning, text: lex.sentences[0]! },
    ],
    footnote: lex.sources[1]!.label,
  }),
  workings: (lex) => ({
    heading: lex.headings[1]!,
    components: [
      {
        type: "data_table",
        columns: [
          { key: "name", label: say(lex, "参数", "Input") },
          { key: "how", label: "" },
          { key: "value", label: say(lex, "取值", "Value"), align: "right" },
          { key: "kind", label: say(lex, "来源", "Source") },
        ],
        rows: (["E", "p", "O", "I"] as const).map((symbol, i) => ({
          cells: { name: `${symbol} ${lex.labels[i]!}`, how: lex.phrases[i + 6]!, value: figure(lex, i), kind: lex.tags[i + 8]! },
        })),
      },
      {
        type: "kpi_cards",
        items: [
          { label: lex.metrics[1]!.label, value: figure(lex, 1), note: "E × p − O = 96 × 0.68 − 0.3" },
          { label: lex.metrics[4]!.label, value: `**${figure(lex, 4)}**`, note: "I ÷ 65 = 160 ÷ 65" },
        ],
      },
      { type: "callout", variant: "info", icon: "info", text: lex.callouts.info },
    ],
    footnote: lex.sources[0]!.label,
  }),
  levers: (lex) => ({
    heading: lex.headings[4]!,
    components: [
      {
        type: "chart",
        chart_type: "bar",
        direction: "horizontal",
        axes: { x_unit: say(lex, "年", "yrs") },
        series: [
          { name: lex.metrics[4]!.label, data: [2.1, 2.5, 3.2, 3.8].map((y, i) => ({ x: lex.phrases[i]!, y, note: lex.labels[i + 4]!, ...(i === 1 ? { emphasis: true } : {}) })) },
          { name: lex.chapters[3]!, data: [{ x: lex.phrases[5]!, y: 1.6, note: lex.labels[7]! }] },
        ],
      },
      { type: "icon_cards", items: [0, 1].map((i) => ({ icon: (["gauge", "receipt"] as const)[i]!, title: lex.phrases[i + 8]!, text: lex.sentences[i + 2]! })) },
      { type: "callout", variant: "warn", title: `${lex.verdicts.warning}${colon(lex)}`, text: lex.callouts.warn },
    ],
    footnote: lex.sources[0]!.label,
  }),
  cycles: (lex) => ({
    heading: lex.headings[8]!,
    components: [
      { type: "callout", variant: "info", text: "E = (P₀ − P₁) × h", tag: { text: lex.tags[8]! } },
      {
        type: "comparison",
        title: lex.periodAxis,
        columns: [lex.labels[12]!, lex.labels[14]!],
        rows: [
          { label: lex.stages[2]!, cells: [`${lex.labels[1]} 0.8 → ${lex.labels[1]} 0.7${colon(lex)}${figure(lex, 0)}`, `${lex.labels[1]} 0.8 → ${lex.labels[1]} 0.7${colon(lex)}${figure(lex, 1)}`] },
          { label: lex.stages[3]!, cells: [`${lex.labels[8]} → ${lex.labels[9]}${colon(lex)}${figure(lex, 2)}`, `${lex.labels[10]} → ${lex.labels[11]}${colon(lex)}${figure(lex, 3)}`] },
          { label: lex.metrics[0]!.label, emphasis: true, cells: [figure(lex, 0), `${figure(lex, 1)} · ${lex.labels[15]!}`] },
          { label: lex.metrics[4]!.label, cells: [figure(lex, 4), figure(lex, 5)] },
        ],
      },
      { type: "callout", variant: "warn", icon: "triangle-alert", title: lex.verdicts.neutral, text: lex.callouts.warn },
    ],
    footnote: lex.sources[0]!.label,
  }),
  drift: (lex) => ({
    heading: lex.headings[5]!,
    components: [
      {
        type: "from_to",
        from: { title: lex.periods[0]! },
        to: { title: lex.periods[4]! },
        rows: [0, 2, 3].map((m, i) => ({
          icon: (["zap", "gauge", "thermometer"] as const)[i]!,
          label: lex.metrics[m]!.label,
          note: lex.labels[i + 4]!,
          from: String(Number(lex.metrics[m]!.value) * 2),
          to: lex.metrics[m]!.value,
          unit: lex.metrics[m]!.unit,
          tag: { text: lex.tags[i + 2]! },
          ...(i === 2 ? { emphasis: true } : {}),
        })),
      },
      { type: "callout", variant: "info", icon: "trending-down", text: lex.callouts.tip },
    ],
    footnote: lex.sources[0]!.label,
  }),
  parts: (lex) => ({
    heading: lex.headings[6]!,
    components: [
      {
        type: "image_grid",
        emphasis: "first",
        items: [0, 1, 2, 3].map((i) => ({
          asset_id: PHOTO_ASSETS[i % PHOTO_ASSETS.length]!,
          icon: (["wrench", "gauge", "flame", "receipt"] as const)[i]!,
          caption: `${lex.phrases[[0, 2, 4, 5][i]!]!}${colon(lex)}${lex.sentences[[1, 4, 5, 8][i]!]!}`,
          ...(i === 2 ? { tag: { text: say(lex, "选配", "Optional"), basis: "pending" as const } } : {}),
        })),
      },
    ],
    footnote: lex.captions[0]!,
  }),
  plans: (lex) => ({
    heading: lex.headings[5]!,
    components: [
      {
        type: "comparison",
        columns: [lex.choices[0]!.title, lex.choices[1]!.title, productOf(lex, 2).name],
        rows: [
          { label: "", cells: [lex.choices[0]!.detail, `${lex.choices[1]!.detail} · **${lex.metrics[5]!.label} ${figure(lex, 5)}**`, productOf(lex, 2).note] },
          {
            label: lex.metrics[1]!.label,
            emphasis: true,
            cells: [`${lex.choices[0]!.outcomes[0]!.value} ${lex.choices[0]!.outcomes[0]!.unit} · ${lex.choices[0]!.outcomes[0]!.detail}`, `${lex.choices[1]!.outcomes[0]!.value} ${lex.choices[1]!.outcomes[0]!.unit} · ${lex.choices[1]!.outcomes[0]!.detail}`, `${lex.choices[0]!.outcomes[1]!.value} ${lex.choices[0]!.outcomes[1]!.unit} · ${lex.choices[0]!.outcomes[1]!.detail}`],
          },
          { label: lex.labels[5]!, cells: [lex.choices[0]!.outcomes[0]!.title, lex.choices[1]!.outcomes[0]!.title, lex.choices[0]!.outcomes[1]!.title] },
          { label: lex.labels[7]!, cells: [lex.strengths[2]!, lex.strengths[3]!, lex.strengths[1]!] },
        ],
      },
      { type: "callout", variant: "info", icon: "handshake", text: lex.callouts.warn },
    ],
    footnote: lex.sources[1]!.label,
  }),
  precedents: (lex) => ({
    heading: lex.headings[9]!,
    components: [
      {
        type: "data_table",
        title: lex.chapters[1]!,
        columns: [
          { key: "name", label: "" },
          { key: "scale", label: "" },
          { key: "num", label: "" },
        ],
        rows: [0, 1, 2, 3].map((i) => ({
          icon: (["factory", "factory", "zap", "file-check"] as const)[i]!,
          cells: { name: lex.orgs[i + 4]!, scale: lex.tags[i]!, num: `${lex.metrics[i]!.label} ${figure(lex, i)}` },
          tag: { text: lex.labels[i + 4]! },
          ...(i === 3 ? { emphasis: "highlight" as const } : {}),
        })),
      },
      { type: "callout", variant: "tip", icon: "lightbulb", text: lex.verdicts.positive },
    ],
    footnote: lex.sources[2]!.label,
  }),
  safeguards: (lex) => ({
    heading: lex.headings[9]!,
    components: [
      {
        type: "icon_cards",
        title: lex.chapters[4]!,
        items: [0, 1].map((i) => ({ icon: (["shield-check", "file-check"] as const)[i]!, title: lex.phrases[i + 10]!, text: lex.sentences[i + 9]!, ...(i === 0 ? { tag: { text: lex.tags[9]!, settled: true } } : {}) })),
      },
      {
        type: "icon_cards",
        title: lex.chapters[5]!,
        items: [0, 1].map((i) => ({ icon: (["flame", "zap"] as const)[i]!, tone: "danger" as const, title: lex.threats[i]!, text: `${lex.weaknesses[i]!}${stop(lex)}${lex.labels[7]!}${colon(lex)}${lex.bullets[i + 4]!}` })),
      },
      { type: "insight_panel", title: lex.chapters[3]!, icon: "scale", rows: [0, 1, 2].map((i) => ({ label: lex.orgs[i]!, text: lex.people[i]!.role! })), footnote: lex.verdicts.neutral },
    ],
    footnote: lex.sources[0]!.label,
  }),
  remedies: (lex) => ({
    heading: lex.headings[9]!,
    components: [
      {
        type: "data_table",
        columns: [
          { key: "risk", label: lex.labels[5]! },
          { key: "basis", label: lex.labels[6]! },
          { key: "answer", label: lex.labels[7]!, icon: "shield-check" },
        ],
        rows: [0, 1, 2, 3].map((i) => ({
          icon: (["trending-down", "wrench", "calendar", "zap"] as const)[i]!,
          cells: { risk: lex.labels[i]!, basis: lex.threats[i]!, answer: lex.opportunities[i]! },
          ...(i === 0 ? { emphasis: "highlight" as const } : {}),
        })),
      },
    ],
    footnote: lex.sources[1]!.label,
  }),
  checkpoints: (lex) => ({
    heading: lex.headings[6]!,
    components: [
      {
        type: "timeline",
        milestones: [0, 1, 2, 3, 4, 5].map((i) => ({
          date: lex.periods[Math.min(i, 4)]!,
          title: lex.stages[i]!,
          desc: `${lex.labels[i]!}${stop(lex)}${lex.labels[7]!}${colon(lex)}${lex.phrases[i + 6]!}`,
          icon: (["search", "calculator", "wrench", "zap", "flame", "receipt"] as const)[i]!,
          ...(i === 2 ? { highlight: true, source: lex.sources[0]!.ref } : {}),
        })),
      },
      { type: "callout", variant: "info", icon: "clipboard-check", title: `${lex.verdicts.neutral}${colon(lex)}`, text: lex.bullets[5]! },
    ],
    footnote: lex.sources[0]!.label,
  }),
  quote: (lex) => {
    const columns = [
      { key: "item", label: lex.labels[0]! },
      { key: "what", label: lex.labels[1]! },
      { key: "how", label: lex.labels[5]! },
      { key: "amount", label: lex.labels[7]! },
    ]
    const row = (i: number, extra = {}) => ({ icon: (["wrench", "gauge", "zap", "flame", "receipt"] as const)[i % 5]!, cells: { item: lex.phrases[i]!, what: lex.tags[i]!, how: productOf(lex, i % 3).priceUnit, amount: "— — —" }, ...extra })
    return {
      heading: lex.headings[10]!,
      components: [
        { type: "data_table", title: productOf(lex, 0).name, columns, rows: [row(0), row(1)] },
        { type: "data_table", title: productOf(lex, 1).name, columns, rows: [row(2), row(3, { emphasis: "highlight", tag: { text: lex.bullets[5]! } })] },
        { type: "data_table", title: productOf(lex, 2).name, columns, rows: [row(4)] },
      ],
      footnote: lex.sources[1]!.label,
    }
  },
  papers: (lex) => ({
    heading: lex.headings[11]!,
    components: [
      { type: "icon_cards", items: [0, 1, 2, 3].map((i) => ({ icon: (["receipt", "gauge", "ruler", "calendar"] as const)[i]!, title: lex.sources[i % 3]!.label, text: `${say(lex, "用来", "For")}${colon(lex)}${lex.phrases[i]!}`, tag: { text: lex.orgs[i]! } })) },
      { type: "callout", variant: "info", text: `${lex.verdicts.positive}${stop(lex)}${lex.verdicts.neutral}` },
    ],
  }),
}
