---
"@liustack/pptwise": patch
---

`installThemeFile` is removed. `registerBrandThemeFile` now rejects a theme whose id duplicates one already registered instead of silently shadowing it. Theme definitions are passed by value through the call chain.
