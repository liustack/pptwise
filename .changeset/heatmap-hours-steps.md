---
"@liustack/pptwise": minor
---

A `heatmap` runs up to 24 columns, a day of hours, and can sort its values into two to five named steps (`steps`, such as the valley, flat, peak and top bands of a day's tariff): every cell takes its step's colour and prints its short name, and a key under the grid names every step. A grid of many columns can print its labels every few columns (`label_every: 6` labels a day's hours at 0, 6, 12 and 18), the other labels still naming their columns for `bands`. Validate refuses steps out of order, a step without its `max` or a last step with one, steps beside a `domain`, and a label step as wide as the grid.
