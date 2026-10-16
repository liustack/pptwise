---
"@liustack/pptwise": minor
---

`pptwise build --sheet` also draws every page small into one numbered picture, `sheet.jpg`, named in the report as `preview.sheet`, so an agent can look at the whole deck at once: whether the pictures fit their pages, where a page is empty, how the pages follow one another. It needs the optional `sharp`. The DSH plugin's `pptwise_build` takes `sheet: true` and hands the picture to the model where the host and the model take images, and names the file otherwise.
