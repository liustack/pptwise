---
"@liustack/pptwise": minor
---

A bar chart can now mark the one bar a page is about with `emphasis: true` on that point, such as the latest year in a run of years. The marked bar keeps its series' colour and the other bars step back to a grey, the way a marked series does. Before, a chart with one series had no way to say which bar mattered. validate holds it to one point per chart, on a `bar` chart, and not beside a marked series.
