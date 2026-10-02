---
"@liustack/pptwise": minor
---

Charts can now say what a number is and draw the change a page argues about. On `bar` and `stacked` charts, `status: "forecast"` on a point hatches its bar and `status: "target"` draws it as a dashed outline over a pale tint, with a Forecast or Target legend entry. `changes: [{ "from": "...", "to": "..." }]` draws a bracket over two columns with the change between them, and with `at` compares two series at one category. A horizontal chart writes that change after the later bar.
