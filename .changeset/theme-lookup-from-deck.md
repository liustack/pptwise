---
"@liustack/pptwise": patch
---

A deck's theme name now resolves through the `themes/` folders above the deck itself, wherever the command runs. Building, rendering or previewing a deck from another folder used to look up from that folder instead, so the same deck could pick up a different theme, or fail to find the one its own project holds. `pptwise serve` watches the same folders. Commands with no deck, such as `theme new`, still start from the working directory.
