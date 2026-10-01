# Showcase

One sample deck per theme, written to look its best. Each sample is a deck project: a `deck.spec.json` that binds the theme, plus one file per page under `pages/`.

| theme | sample |
| --- | --- |
| [`brief`](brief/) | Halden Partners asks Northwind Logistics to approve a plan that cuts last-mile cost 18% in twelve months. 11 pages: cover, statement, combo chart, waterfall, points, chapter, comparison, roadmap, key figure, org tree, ending. |

Render a sample from the repository root:

```bash
pnpm build
node dist/cli.js render showcase/brief -o out/brief.pptx
node dist/cli.js preview showcase/brief -o out/brief
node dist/cli.js audit showcase/brief
```

Each sample uses `branding: "full"`, so the footer shows the organization and the confidentiality on every content page. The page files show how to mark the one thing each page is about: `**…**` in text, `emphasis` on waterfall bars, a chart series and a roadmap item, and `recommended` on a comparison column.
