---
"@liustack/pptwise": patch
---

Chart value axes now always hold what they draw. A `bar` chart whose values are all the same, or all below zero, keeps zero on its axis, so a single bar no longer hangs below the x-axis. Values that differ only in their last few digits get distinct ticks that reach every value, and tick labels print the digits each tick has, so two neighbouring ticks never read the same (a step of 0.000001 used to print every tick as 1). A value past 1e300 on any chart's value axis, which used to stop the page with an error or draw points at NaN, is refused by validate with the same advice stacked and combo charts already gave: divide every series on that axis by one power of ten and name the unit.

Bar values are printed together or not at all, the rule stacked totals already follow. When every value fits beside its bar, clear of the bars and inside the chart, all are printed as before. When they do not, none is printed and the export stops on that page until the numbers are shorter or the chart has fewer bars, where a crowded chart used to print its values on top of its bars and past its edges.

Long names are shown whole where there is room. A horizontal bar chart's name column grows with its longest category name, up to about a third of the chart, and the chart grows taller with its category count, so each category keeps a row. A donut's centre caption and a waterfall's category names wrap onto a second line instead of being cut. Charts whose names and numbers already fit render exactly as before.
