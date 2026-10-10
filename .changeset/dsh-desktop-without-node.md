---
"@liustack/pptwise": patch
---

The DSH plugin now works on DSH Desktop for people who never installed Node. Desktop keeps its own Node off the agent's PATH, so the preview tool's `node` fallback failed and the skill told the model to run a `node` that was not there. When no `node` is on PATH, both now run the CLI with Desktop's own executable in Node mode (`ELECTRON_RUN_AS_NODE=1`), still in a separate process.
