# Showcase

A pair of sample decks per theme, one in Chinese and one in English, written to look their best. Each sample is a deck project: a `deck.spec.json` that binds the theme, plus one file per page under `pages/`.

| theme | sample |
| --- | --- |
| [`brief`](brief/) | After the store boom, what drives growth? A tea chain's strategy team takes listed tea chains' H1 2026 results and industry data to its leadership and asks to make same-store growth the first target for 2027. 12 pages, real public data with a source on every data page. [Chinese](brief/zh/) and [English](brief/en/). |
| [`bulletin`](bulletin/) | Home demand fell a fifth: how do we play Q4? A carmaker's quarterly business review of China's passenger NEV market in Q3 2026, ending in what management needs to decide for Q4. 13 pages, real public data with a source on every data page, September figures labelled as progress or forecast. [Chinese](bulletin/zh/) and [English](bulletin/en/). |

Render a sample from the repository root:

```bash
pnpm build
node dist/cli.js render showcase/brief/en -o out/brief-en.pptx
node dist/cli.js preview showcase/brief/en -o out/brief-en
node dist/cli.js audit showcase/brief/en
```

Each theme has a pair of samples on the same topic, one in Chinese and one in English. The figures come from public filings, industry reports and regulators, and every data page names its source. The street photo in brief's sample and the port photo in bulletin's are AI-generated, and their pages say so. The page files show how to mark the one thing each page is about: `**…**` in text and on a figure, `emphasis` on waterfall bars, a chart series, a roadmap item, a numbered card and a gantt stretch, `recommended` on a comparison column, and `highlight` on a table row or a milestone. bulletin's sample also shows how to say what a number is: `status: "forecast"` and `"target"` on a chart point, `changes` for a bracket between two bars, and `lane` to run a timeline on two tracks.
