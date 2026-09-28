---
"@liustack/pptwise": patch
---

A chart legend now keeps at least 20px between a series name and the next swatch, where a name wider than the standard spacing used to end exactly where the next swatch began and could overlap it when the final font set the name a little wider. Legends whose names already left that gap render exactly as before. Longer names move apart, and on a very narrow chart that can leave one more name out of the legend, flagged like any other dropped legend name. A heatmap's row label column now grows to fit its row names, up to a quarter of the chart's width, instead of cutting ordinary names like "Enterprise" at a fixed 96px. Heatmaps whose row names fit the 96px column render exactly as before.
