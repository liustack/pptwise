---
"@liustack/pptwise": patch
---

Curly quotation marks now take the width PowerPoint gives them. Text set in Georgia measured “ ” and ‘ ’ a full em wide, more than twice their real width, so the words after an opening quote, and the highlight under a marked run, sat to the right of where PowerPoint draws them. A quote in brief's figure and chart pages now sets its marks in the line instead of hanging the opening one.

Headings with no Chinese in them now break into even lines rather than filling the first line and leaving the rest short, and a quote set large evens its lines the same way. Chinese headings keep their current breaks unless the last line is under half as long as the first.
