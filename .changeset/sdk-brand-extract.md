---
"@liustack/pptwise": minor
---

The SDK's `extractBrandTheme` now does what `pptwise brand extract` does: it repaints a theme around the template's brand color and second color, by the same rules as `theme fork --brand`, instead of mapping the template's palette onto tokens under a fixed menu. The CLI calls it.

```ts
const { file, placement, fontNotes } = await extractBrandTheme(bytes, {
  id: "acme",
  label: "Acme",
  from: "bulletin", // a built-in theme id or a complete theme file, bulletin by default
  brandFonts: false, // true puts the template's Latin fonts first
})
```

- New options: `from` and `brandFonts`.
- It returns `{ file, placement, fontNotes }` instead of the theme file: `file` is the repainted theme, `placement` says where each color went, and `fontNotes` holds the font warnings `--brand-fonts` prints. The types `BrandThemeResult`, `BrandPlacement`, `PlacedColor`, `Refusal` and `BrandSlot` are exported.
- It renders the theme's sample deck to find the slot the theme shows most, so install a platform (`installPlatform`) before calling it.
- The template's `dk1`, `lt1` and `lt2` are no longer read or checked, since the repainted theme keeps its own ground and text. A template with a grey palette, or with no `dk1`/`lt1`, no longer fails extraction.
