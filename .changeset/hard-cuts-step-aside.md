---
"@liustack/pptwise": minor
---

A content page whose theme layout would cut text a reader needs whole now goes to the plainer step-aside layout when that layout draws it whole. Hard text is the page's heading, subheading and source line, and every word a component carries except its tags. A cut kicker, stamp, tag or other label stays declared on the theme's layout, as does any cut on a page that carries a kicker, header fields, a stamp, a page tag, a ballot, a stage or years, which the plainer layout has no place for. `pptwise audit` reports such a page as `stepped-aside`, and a `content-truncated` finding now names the field it cut and its tier (`hard` or `declared`) in `detail`.
