# Showcase

A pair of sample decks per theme, one in Chinese and one in English, written to look their best. Each sample is a deck project: a `deck.spec.json` that binds the theme, plus one file per page under `pages/`.

| theme | sample |
| --- | --- |
| [`brief`](brief/) | After the store boom, what drives growth? A tea chain's strategy team takes listed tea chains' H1 2026 results and industry data to its leadership and asks to make same-store growth the first target for 2027. 12 pages, real public data with a source on every data page. [Chinese](brief/zh/) and [English](brief/en/). |
| [`bulletin`](bulletin/) | Home demand fell a fifth: how do we play Q4? A carmaker's quarterly business review of China's passenger NEV market in Q3 2026, ending in what management needs to decide for Q4. 13 pages, real public data with a source on every data page, September figures labelled as progress or forecast. [Chinese](bulletin/zh/) and [English](bulletin/en/). |
| [`swiss`](swiss/) | Clean power met all new demand. Not settled yet. An energy research team's annual report on the world's and China's power systems in 2025, and what to watch in 2026. 14 pages, real public data from Ember, the IEA, China's NEA and NBS, SolarPower Europe and BNEF with a source on every data page, 2026 figures labelled as year to date or forecast. [Chinese](swiss/zh/) and [English](swiss/en/). |
| [`ledger`](ledger/) | How long can AI capex keep rising? An equity research team's investment committee review of what Microsoft, Alphabet, Amazon and Meta are spending on AI in 2026, who pays for it, who gets paid, and where it could stall: money, customers or power. 15 pages, real public data from company filings and calls, PJM, LBNL and market prices with a source on every data page, ending in what the committee is asked to decide and the three signals to watch. [Chinese](ledger/zh/) and [English](ledger/en/). |

Render a sample from the repository root:

```bash
pnpm build
node dist/cli.js render showcase/brief/en -o out/brief-en.pptx
node dist/cli.js preview showcase/brief/en -o out/brief-en
node dist/cli.js audit showcase/brief/en
```

Each theme has a pair of samples on the same topic, one in Chinese and one in English. The figures come from public filings, industry reports and regulators, and every data page names its source. The street photo in brief's sample, the port photo in bulletin's, the storage photo in swiss's and the data center photo in ledger's are AI-generated, and their pages say so. The page files show how to mark the one thing each page is about: `**…**` in text and on a figure, `emphasis` on waterfall bars, a chart series, a roadmap item, a numbered card and a gantt stretch, `recommended` on a comparison column, and `highlight` on a table row or a milestone. bulletin's sample also shows how to say what a number is: `status: "forecast"` and `"target"` on a chart point, `changes` for a bracket between two bars, and `lane` to run a timeline on two tracks. swiss's sample marks the one bar a page is about with `emphasis` on that chart point, draws one whole as a share bar (a `stacked` chart with `direction: "horizontal"` and one category, its marked run of parts totalled under it), and sets a page's figures as `kpi_cards` beside a chart, under a statement and under a photograph. ledger's sample sets a `kicker` over the cover's and the ending's titles, a ticker of `kpi_cards` on the cover, a dot plot of guidance moves (a `dumbbell` chart), a timeline over a note written as "label: text", the ending's next steps as "label: text" bullets under the decision, and the ending's `footnote` as a disclaimer.
