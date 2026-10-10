---
"@liustack/pptwise": patch
---

A DSH plugin added from the GitHub address now says what went wrong. That source has no built engine, so the plugin installed and then every deck failed on a missing file. The skill now tells the model to stop and ask the user to remove the plugin and add it again by package name, the preview tool fails with the same message, and `pptwise doctor` flags the profile with the fix. On the `desktop` profile, `doctor`'s fix now points at Desktop's own Add plugin instead of an npm `dsh` command that cannot reach that profile.
