---
"@liustack/pptwise": minor
---

`theme try --title` with no theme ids now draws a shortlist of four to six themes: the ones whose occasions match `--occasion` (occasion words such as `business`, or a narrative preset such as `weekly-brief`), filled from a spread of quiet to bold general themes. Before, the DSH theme wall drew all 22 themes when the model named none. A page that fails in every theme is now reported once instead of once per theme, and `--json` carries these lines as `notes`. On DSH, `pptwise_themes` takes `occasion`, numbers the themes in its card in the order its result lists them so the question that follows can use the same numbers, and its description tells the model to leave `page` out unless it is a page it already validated.
