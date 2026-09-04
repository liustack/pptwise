/** Fixed fitting-room deck for `pptwise theme try`. Product copy, aligned with
 *  `theme-try/deck.spec.json`. */
export const THEME_TRY_SAMPLE_IR = {
  version: "5",
  filename: "northstar-review",
  theme: { id: "brief" },
  slides: [
    {
      type: "cover",
      heading: "Northstar Review",
      subheading: "Q3 operating report for the board",
    },
    {
      type: "chapter",
      heading: "The Quarter",
    },
    {
      type: "content",
      kind: "points",
      heading: "What we decided",
      components: [
        {
          type: "bullets",
          items: [
            "Hold hiring at 42",
            "Cut the analytics rebuild",
            "Share the support rotation",
          ],
        },
      ],
    },
    {
      type: "content",
      kind: "list",
      heading: "Open workstreams",
      components: [
        {
          type: "bullets",
          items: [
            "EU residency addendum",
            "Partner invite flow",
            "Invoice localization",
          ],
        },
      ],
    },
    {
      type: "content",
      kind: "comparison",
      heading: "Build vs buy",
      components: [
        {
          type: "comparison",
          columns: ["Build", "Buy"],
          rows: [
            { label: "Time to first report", cells: ["14 weeks", "3 weeks"] },
            { label: "Year-one cost", cells: ["$420k", "$180k"] },
            { label: "Lock-in", cells: ["None", "Vendor roadmap"] },
          ],
        },
      ],
    },
    {
      type: "content",
      kind: "process",
      heading: "How we ship",
      components: [
        {
          type: "steps",
          items: [
            { title: "Scope", text: "One page, one owner" },
            { title: "Build", text: "Two-week slices" },
            { title: "Prove", text: "A number in production" },
          ],
        },
      ],
    },
    {
      type: "content",
      kind: "data",
      heading: "Pipeline by stage",
      components: [
        {
          type: "chart",
          chart_type: "bar",
          series: [
            {
              name: "Qualified",
              data: [
                { x: "Discover", y: 42 },
                { x: "Propose", y: 19 },
                { x: "Close", y: 11 },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "content",
      kind: "statement",
      heading: "We will not add a fourth product line this year",
      components: [
        {
          type: "blockquote",
          text: "Three products is the house.",
        },
      ],
    },
    {
      type: "content",
      kind: "fact",
      heading: "NPS",
      components: [
        {
          type: "kpi_cards",
          items: [{ value: "61", label: "trailing 90-day NPS", delta: "up" }],
        },
      ],
    },
    {
      type: "ending",
      heading: "See you Thursday",
    },
  ],
}
