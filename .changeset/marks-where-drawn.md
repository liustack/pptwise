---
"@liustack/pptwise": minor
---

A `**…**` mark is drawn in the theme's emphasis in `steps` titles and text, `icon_cards` titles and text, a `kpi_cards` note and an `insight_panel` title, where it used to print its asterisks. Every component field that draws text as written now refuses a mark in validate, naming the fields that draw one, instead of printing four asterisks around the phrase. docs/ir.md lists the fields.
