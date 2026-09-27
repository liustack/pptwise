---
"@liustack/pptwise": patch
---

On Windows, the DSH plugin's preview record store now retries a replace that fails because another reader still holds the old record open. Windows refuses to rename over a file that is open, and the write used to fail outright with EPERM. The retry is bounded, applies only to that lock error, and changes nothing on macOS or Linux.
