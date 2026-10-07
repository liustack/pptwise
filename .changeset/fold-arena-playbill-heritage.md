---
"@liustack/pptwise": minor
---

arena and playbill are folded into rally, and heritage into luxe, so the shelf holds 22 factory themes instead of 25. Drawn side by side on the same content, arena and rally were hard to tell apart, playbill answered the rooms rally already answers, and heritage spoke in luxe's register.

A deck that names a folded id keeps working. `validate`, `render` and `audit` read `arena` and `playbill` as `rally` and `heritage` as `luxe`, and draw exactly what a deck naming the new id draws. `validate` and `render` print a warning that names the one edit to make: `theme id "arena" was folded into "rally", so this deck renders as "rally". Bind it to "rally"`. A deck spec, `schema --kind --theme`, `theme new --from`, `theme fork` and `theme try` resolve the old names the same way. rally now also lists `entertainment` among its occasions, and the annual-review narrative recommends luxe where it recommended heritage.

The old ids are not free names. A theme file, `theme new --id`, `theme fork --id`, a preset copy, `registerTheme` or a content pack that takes one is refused with the theme it folded into. The ten faces and three motifs only those themes drew are deleted: `cut-panel-cover`, `round-mark-chapter`, `seat-cta-ending`, `bill-head`, `day-bill-chapter`, `ticket-cta-ending`, `mono-bleed`, `double-frame-cover`, `mirror-volume-chapter`, `invite-field-ending`, `arena-motif`, `playbill-motif` and `heritage-motif`. A theme file copied from one of those presets names them, and is refused with a message that says which theme to copy again from.
