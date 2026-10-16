---
"@liustack/pptwise": patch
---

Picture downloads work behind a fake-ip proxy such as Clash or Surge. These proxies resolve every name into 198.18.0.0/15, which the download guard refused as reserved, so `images fetch` and every `--sheet` thumbnail failed. That benchmark range is now allowed. Private, loopback, link-local, and the other reserved ranges are still refused.
