---
"@liustack/pptwise": patch
---

A turned shape, line, path or picture exports turned. svg2pptx writes each one as its own box at its own size, turned around its centre by PowerPoint's `rotate`, where it used to export upright and shrunk by the angle's cosine. A tilted chapter sticker and a picture pasted in at an angle now open in PowerPoint as they preview, and stay editable.
