---
"@liustack/pptwise": patch
---

A content page's kicker is now checked against what actually prints it. museum's Placard Sheet and runway's Lineup Sheet leave the kicker to their theme's motif, the hall sign and the masthead, which print it over any content layout. A theme file that put either layout under another motif lost the kicker without saying so, and validate passed it. validate now refuses it there, naming the layout, and takes a kicker on any content layout under the museum or runway motif.
