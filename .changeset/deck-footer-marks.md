---
"@liustack/pptwise": minor
---

A deck now prints no footer unless it asks for one. Content pages carry no page number, organization, date or confidentiality line by default. Several places used to print them anyway and no longer do: the large page number in the right margin of the narrow-column layout (19 themes), the organization and date down ink's right-edge column, the month in journal's bottom ornament, the organization and date under the statement pages of vermilion, museum and ink, the organization in the kicker of runway's and the photo-split content pages, and the organization line inside the card of a photo-backed content page. Theme decoration stays.

Ask for the marks the occasion needs with the new `footer` field, in a bare IR or in `deck.spec.json`:

```json
"footer": {
  "page_number": true,
  "organization": true,
  "label": "2026 年中期业绩 | 2026.08",
  "notice": "© 2026 Acme",
  "draft": "讨论稿",
  "confidentiality": "footer"
}
```

- `page_number` prints the page number bottom right, on content pages only, never on the cover, chapter or ending pages. In the exported file it is PowerPoint's own slide-number field, so it renumbers when you move slides.
- `organization`, `label` and `notice` print bottom left. `label` and `notice` print exactly what you write.
- `confidentiality: "cover"` puts the `meta.confidentiality` mark on the cover once. `"footer"` also puts it on every content page.

The confidentiality mark now follows the deck's language. A Chinese deck prints 「仅供内部讨论」, 「内部资料，请勿外传」 or 「限定范围阅读，请勿转发」 instead of the English word, and never 「机密」, which is a legal classification in Chinese. `public` prints nothing. A legal classification such as 「秘密★1年」 goes in the new `meta.classification` and prints on the cover only, top left. Every theme's cover now prints the mark under the same rules.

`branding` keeps its three values and now decides only where the logo appears. A deck with `branding: "full"` and no `footer` keeps its footer, now as the organization and the confidentiality mark on content pages. The date and version it used to repeat on every page stay on the cover and ending page. Write `footer: {}` to keep the logo and drop that footer.

The theme brand flag `suppressFooterMeta` is retired. Theme files that set it still load, and the flag is ignored.
