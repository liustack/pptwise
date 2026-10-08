---
"@liustack/pptwise": patch
---

A single bar series with no marked bar is drawn flat in the chart's lead colour on every theme. It used to light its tallest bar in the accent and draw the rest in a faded gradient of it, which guessed the page's point and left the other bars under 3:1 on seven themes. Mark the bar the page is about with `data[].emphasis`.
