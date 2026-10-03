---
"@liustack/pptwise": patch
---

Charts and waterfalls now group a figure's digits in threes the way the chart's language prints it. An English chart reads "2,778" and "1,500,000" where it read 2778 and 1500000, on bars, labels, axis ticks and totals alike. A Chinese chart keeps a four-digit figure whole, 「8490」, and groups from five digits, 「10,575」, which is what GB/T 15835-2011 asks of Chinese text.
