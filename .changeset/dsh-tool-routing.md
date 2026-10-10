---
"@liustack/pptwise": patch
---

On DeepSeek Harness the skill's runtime note now names the plugin's own tools: the theme wall goes through `pptwise_themes`, each build through `pptwise_build`, and neither runs in the terminal, with the call shape for Code Mode spelled out. A model that ran `build` in bash left the user reading logs instead of seeing pages. When the plugin was upgraded while DSH kept running, the note now also tells the model to ask the user to restart DSH, since until then the old plugin code stays loaded and the new tools are not there.
