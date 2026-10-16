---
"@liustack/pptwise": minor
---

`pptwise login [key]` checks a license key with the pack server, saves it, and installs the content packs it covers in one step. A key the server does not know or has revoked is not saved. A key whose purchase is still being reviewed is saved, and `pptwise packs sync` installs the packs once the review clears, which `packs sync` now also says when it meets such a key. `pptwise logout` removes the saved key and leaves installed packs in place.
