# Showcase

A pair of sample decks per theme, one in Chinese and one in English, written to look their best. Each sample is a deck project: a `deck.spec.json` that binds the theme, plus one file per page under `pages/`.

| theme | sample |
| --- | --- |
| [`brief`](brief/) | After the store boom, what drives growth? A tea chain's strategy team takes listed tea chains' H1 2026 results and industry data to its leadership and asks to make same-store growth the first target for 2027. 12 pages, real public data with a source on every data page. [Chinese](brief/zh/) and [English](brief/en/). |

Render a sample from the repository root:

```bash
pnpm build
node dist/cli.js render showcase/brief/en -o out/brief-en.pptx
node dist/cli.js preview showcase/brief/en -o out/brief-en
node dist/cli.js audit showcase/brief/en
```

Each theme has a pair of samples on the same topic, one in Chinese and one in English. The figures come from public filings, industry reports and regulators, and every data page names its source. The street photo in brief's sample is AI-generated and its page says so. The page files show how to mark the one thing each page is about: `**…**` in text, `emphasis` on waterfall bars, a chart series and a roadmap item, and `recommended` on a comparison column.
