---
"@liustack/pptwise": patch
---

A dumbbell chart now names its axes. The rows' title (`axes.y_title`) and the values' title and unit (`axes.x_title`, and `axes.x_unit` or `axes.y_unit`) print as one line under the rows, the way a horizontal bar chart names its axes, so a guidance chart in 亿美元 says what its figures count. validate no longer warns that a dumbbell's axes are ignored, except for `show_grid`, which it has no plot to draw on.
