import json, os, datetime
ROOT = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(ROOT, 'project'); L = os.path.join(ROOT, 'local')
os.makedirs(P, exist_ok=True); os.makedirs(L, exist_ok=True)

BG = "#0A0F1E"; SURF = "#121A30"; PRIM = "#14294A"; CYAN = "#53E0D2"; TEXT = "#EAF1FA"; MUTED = "#93A5C0"; BORDER = "#24304A"
RED = "#FF6B7D"; AMBER = "#FFC14D"; GREEN = "#4BD98A"; BLUE = "#5B8CFF"; TINT = "#0E2A33"; DIM = "#3A4A66"
SANS = "'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', sans-serif"
MONO = "'SF Mono', Menlo, Consolas, monospace"
IMG = {k: "/_blob/" + v for k, v in {'cover-aisle': '4c8867cdcab5e0c969586923b518900f', 'chapter-storm': '7b9b5d4e960acaa294a712f17a74e585', 'chapter-oncall': '1560870900ce985e7cf6dcab51ae0665', 'grid-cooling': '34796156cc0bef161263f1f09de067fe', 'grid-power': 'fbb4472b8060bd8cd180f303b0c7f410', 'grid-fiber': '6cb20d4badcc5afabffbb9041a04a4d6', 'mock-dashboard': '2f03890767999b5a3961422aa371601d'}.items()}
CUR = ["/_blob/" + i for i in ['2b7e60906d0b22685a03aad3eef34cf5', '2fcbde15c466345bfa13b6eac47e2344', '94ee8929dc8a04775fb624e7de6956f8', '8c188803a893d15aacb700b07fede3c6', '87930a3503b38423af267b037471adb0', 'be6e85530d4238a4591af8ca3ef28b1a', '4e8e8aefaed6750923f00982a055fd21', '1680c5d0f22793de76021c14fc47fa8f', '280c18d303fd4cb434339edcfc081092', '6f18d97df1a41f1ceaedf42fefcfe303', 'f6e5b985bf829807c172f36a13a971e7', '247e257e16b156ab5348c36fc3a7acc3', '8ec1c11dfc84618ecf76319959a9b7c4', '3f66e36c4a64d9c60d048380e5868c0e', 'c7848df6c438c952ebe89d8cb14d860e', '6278905a417c8e551d72e47ebd72d745']]

# lucide icon paths (24x24, stroke)
ICONS = {
 "zap": "<path d=\"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z\"/>",
 "cloud-lightning": "<path d=\"M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973\"/><path d=\"m13 12-3 5h4l-3 5\"/>",
 "repeat": "<path d=\"m17 2 4 4-4 4\"/><path d=\"M3 11v-1a4 4 0 0 1 4-4h14\"/><path d=\"m7 22-4-4 4-4\"/><path d=\"M21 13v1a4 4 0 0 1-4 4H3\"/>",
 "receipt": "<path d=\"M12 17V7\"/><path d=\"M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8\"/><path d=\"M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z\"/>",
 "layers": "<path d=\"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z\"/><path d=\"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12\"/><path d=\"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17\"/>",
 "refresh-cw": "<path d=\"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8\"/><path d=\"M21 3v5h-5\"/><path d=\"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16\"/><path d=\"M8 16H3v5\"/>",
 "log-in": "<path d=\"m10 17 5-5-5-5\"/><path d=\"M15 12H3\"/><path d=\"M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4\"/>",
 "hard-drive": "<path d=\"M10 16h.01\"/><path d=\"M2.212 11.577a2 2 0 0 0-.212.896V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5.527a2 2 0 0 0-.212-.896L18.55 5.11A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z\"/><path d=\"M21.946 12.013H2.054\"/><path d=\"M6 16h.01\"/>",
 "timer": "<line x1=\"10\" x2=\"14\" y1=\"2\" y2=\"2\"/><line x1=\"12\" x2=\"15\" y1=\"14\" y2=\"11\"/><circle cx=\"12\" cy=\"14\" r=\"8\"/>",
 "check": "<path d=\"M20 6 9 17l-5-5\"/>",
 "x": "<path d=\"M18 6 6 18\"/><path d=\"m6 6 12 12\"/>",
 "minus": "<path d=\"M5 12h14\"/>",
 "globe": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20\"/><path d=\"M2 12h20\"/>",
 "key-round": "<path d=\"M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z\"/><circle cx=\"16.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\"/>",
 "git-branch": "<path d=\"M15 6a9 9 0 0 0-9 9V3\"/><circle cx=\"18\" cy=\"6\" r=\"3\"/><circle cx=\"6\" cy=\"18\" r=\"3\"/>",
 "database": "<ellipse cx=\"12\" cy=\"5\" rx=\"9\" ry=\"3\"/><path d=\"M3 5V19A9 3 0 0 0 21 19V5\"/><path d=\"M3 12A9 3 0 0 0 21 12\"/>",
 "arrow-right": "<path d=\"M5 12h14\"/><path d=\"m12 5 7 7-7 7\"/>",
 "server": "<rect width=\"20\" height=\"8\" x=\"2\" y=\"2\" rx=\"2\" ry=\"2\"/><rect width=\"20\" height=\"8\" x=\"2\" y=\"14\" rx=\"2\" ry=\"2\"/><line x1=\"6\" x2=\"6.01\" y1=\"6\" y2=\"6\"/><line x1=\"6\" x2=\"6.01\" y1=\"18\" y2=\"18\"/>",
 "siren": "<path d=\"M7 18v-6a5 5 0 1 1 10 0v6\"/><path d=\"M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z\"/><path d=\"M21 12h1\"/><path d=\"M18.5 4.5 18 5\"/><path d=\"M2 12h1\"/><path d=\"M12 2v1\"/><path d=\"m4.929 4.929.707.707\"/><path d=\"M12 12v6\"/>",
 "shield-check": "<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\"/><path d=\"m9 12 2 2 4-4\"/>",
 "bell-off": "<path d=\"M10.268 21a2 2 0 0 0 3.464 0\"/><path d=\"M17 17H4a1 1 0 0 1-.74-1.673C4.59 13.956 6 12.499 6 8a6 6 0 0 1 .258-1.742\"/><path d=\"m2 2 20 20\"/><path d=\"M8.668 3.01A6 6 0 0 1 18 8c0 2.687.77 4.653 1.707 6.05\"/>",
 "radio-tower": "<path d=\"M4.9 16.1C1 12.2 1 5.8 4.9 1.9\"/><path d=\"M7.8 4.7a6.14 6.14 0 0 0-.8 7.5\"/><circle cx=\"12\" cy=\"9\" r=\"2\"/><path d=\"M16.2 4.8c2 2 2.26 5.11.8 7.47\"/><path d=\"M19.1 1.9a9.96 9.96 0 0 1 0 14.1\"/><path d=\"M9.5 18h5\"/><path d=\"m8 22 4-11 4 11\"/>",
 "flag": "<path d=\"M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528\"/>",
 "flame": "<path d=\"M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4\"/>"
}


def icon(name, x, y, size=20, color=CYAN, sw=2):
    s = size / 24
    return '<g transform="translate(%.1f %.1f) scale(%.3f)" fill="none" stroke="%s" stroke-width="%.2f" stroke-linecap="round" stroke-linejoin="round">%s</g>' % (x, y, s, color, sw / s * s if False else sw, ICONS[name])


def page(title, inner, w=1280, h=720):
    return """<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>""" + title + """</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<style>
body{margin:0}
</style>
</helmet>
<div style="position: relative; width: """ + str(w) + "px; height: " + str(h) + "px; overflow: hidden; background: " + BG + "; color: " + TEXT + "; font-family: " + SANS + """">
""" + inner + """
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":""" + str(w) + ""","height":""" + str(h) + """}}'>
class Component extends DCLogic {
renderVals() {
return {};
}
}
</script>
</body>
</html>
"""


def box(x, y, w, h, style="", content=""):
    s = "position: absolute; left: %dpx; top: %dpx; width: %dpx; " % (x, y, w)
    if h is not None:
        s += "height: %dpx; " % h
    return '<div style="' + s + style + '">' + content + '</div>\n'


def font(size, lh, color=TEXT, weight=400, extra="", fam=None):
    return "font-size: %dpx; line-height: %dpx; color: %s; font-weight: %d; %s%s" % (size, lh, color, weight, ("font-family: " + fam + "; ") if fam else "", extra)


def svg(body):
    return '<svg width="1280" height="720" viewBox="0 0 1280 720" style="position: absolute; left: 0; top: 0">' + body + '</svg>\n'


def t(x, y, s, size=14, fill=MUTED, anchor="start", weight=400, mono=False):
    fam = MONO if mono else SANS
    return '<text x="%s" y="%s" font-size="%d" fill="%s" text-anchor="%s" font-weight="%d" font-family="%s">%s</text>' % (x, y, size, fill, anchor, weight, fam.replace("'", ""), s)


def rect(x, y, w, h, fill, extra=""):
    return '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s" %s/>' % (x, y, w, h, fill, extra)


def brackets(x, y, w, h, color=BORDER, L=16):
    p = []
    for (cx, cy, dx, dy) in [(x, y, 1, 1), (x + w, y, -1, 1), (x, y + h, 1, -1), (x + w, y + h, -1, -1)]:
        p.append('<path d="M%.1f %.1f V%.1f M%.1f %.1f H%.1f" stroke="%s" stroke-width="1.5" fill="none"/>' % (cx, cy, cy + dy * L, cx, cy, cx + dx * L, color))
    return "".join(p)


def crumb(sec, name, pg):
    out = box(64, 34, 10, 10, "background: " + CYAN + "; border-radius: 5px; margin-top: 3px")
    out += box(84, 30, 900, 20, font(13, 20, CYAN, 400, "letter-spacing: 1px", MONO), "%s / %s" % (sec, name) + ('<span style="color: ' + DIM + '">  ·  </span><span style="color: ' + MUTED + '">P%02d</span>' % pg))
    return out


def head(sec, name, pg, title):
    out = crumb(sec, name, pg)
    out += box(64, 56, 1152, 88, "display: flex; flex-direction: column; justify-content: flex-end; " + font(31, 42, TEXT, 700), "<div>" + title + "</div>")
    out += box(64, 156, 1152, 1, "background: " + BORDER) + box(64, 155, 32, 3, "background: " + CYAN)
    return out


def source(t_, x=64, y=668, w=1152):
    return box(x, y, w, 36, font(12, 18, MUTED, 400, "", MONO), "src: " + t_)


def tag(x, y, text, color, filled=False):
    w = int(len(text) * 8.4 + 18) if all(ord(c) < 256 for c in text) else int(len(text) * 13 + 18)
    st = "border: 1px solid " + color + "; box-sizing: border-box; text-align: center; " + font(12, 20, "#0A0F1E" if filled else color, 700, "", MONO) + ("background: " + color + "; " if filled else "")
    return box(x, y, w, 22, st, text)


def fullimg(key, overlay=True):
    out = '<img src="' + IMG[key] + '" alt="" style="position: absolute; left: 0; top: 0; width: 1280px; height: 720px; object-fit: cover">'
    if overlay:
        out += box(0, 0, 1280, 720, "background: linear-gradient(90deg, rgba(10,15,30,0.94) 0%, rgba(10,15,30,0.78) 45%, rgba(10,15,30,0.15) 100%)")
    return out


pages = []

# 1 cover
c = fullimg("cover-aisle")
c += crumb("00", "基础架构组 · 技术评审", 1).replace("P01", "2026-10")
c += box(64, 300, 900, 160, "display: flex; flex-direction: column; justify-content: flex-end; " + font(60, 76, TEXT, 700), "<div>云中断复盘：高可用先补什么</div>")
c += box(64, 478, 64, 3, "background: " + CYAN)
c += box(64, 500, 900, 30, font(21, 30, MUTED), "13 起云中断的官方记录，决定多区域做到哪一档、先做哪几件事")
c += box(64, 640, 900, 22, font(14, 22, CYAN, 400, "letter-spacing: 1px", MONO), "● 13 起事故  ·  2025-06 → 2026-09  ·  只用官方复盘和状态页")
pages.append(("1 封面", c))

# 2 verdict 2x2
c = head("00", "结论", 2, "结论：多区域做到温备，但先补限流退避和独立备用路径")
v = [("zap", "大面积中断多是一次变更推到全部", "8 起重大中断里 5 起是全局配置或策略很快推到全部节点，同云多开一个区域挡不住。", True),
     ("cloud-lightning", "单区域故障是真的，多区域挡得住", "雷暴、电压跌落、光纤维护都只伤一个区域，其他区域照常运行。", False),
     ("repeat", "拖长恢复的是重试和积压", "AWS 那次 DynamoDB 2 小时 52 分恢复，事故拖到 14 小时 32 分。", False),
     ("receipt", "SLA 只赔服务费", "99.99% 每月只允许 4.38 分钟，抵扣上限是当月服务费，不赔营收。", False)]
s = ""
for i, (ic, ti, tx, em) in enumerate(v):
    x = 64 + (i % 2) * 584; y = 184 + (i // 2) * 236
    c += box(x, y, 568, 220, "background: " + (TINT if em else SURF) + "; border: 1px solid " + (CYAN if em else BORDER) + "; box-sizing: border-box")
    s += rect(x + 24, y + 26, 44, 44, "none", 'stroke="%s" stroke-width="1.5"' % (CYAN if em else DIM)) + icon(ic, x + 34, y + 36, 24, CYAN if em else TEXT)
    c += box(x + 492, y + 30, 60, 20, font(13, 20, CYAN if em else DIM, 400, "text-align: right", MONO), "0" + str(i + 1))
    c += box(x + 24, y + 92, 520, 34, font(23, 34, CYAN if em else TEXT, 700), ti)
    c += box(x + 24, y + 136, 520, 60, font(17, 28, "#C9D4E5"), tx)
c += svg(s)
pages.append(("2 结论", c))


def chapter(no, title, key, items):
    c = fullimg(key)
    c += crumb(no, "章节", 0).replace("P00", "DIR")
    c += box(64, 140, 400, 120, font(110, 120, CYAN, 700, "", MONO), no)
    c += box(64, 270, 700, 110, "display: flex; flex-direction: column; justify-content: flex-end; " + font(44, 56, TEXT, 700), "<div>" + title + "</div>")
    y = 410
    c += box(64, y - 8, 620, 1, "background: " + BORDER)
    for pg, it in items:
        c += box(64, y + 6, 60, 26, font(15, 26, CYAN, 400, "", MONO), "├─ " + pg)
        c += box(140, y + 6, 560, 26, font(17, 26, "#D6DEEB", 400, "white-space: nowrap; overflow: hidden; text-overflow: ellipsis"), it)
        y += 38
    return c


pages.append(("3 章节：复盘", chapter("01", "复盘：13 起中断说了什么", "chapter-storm",
                                  [("04", "8 起重大中断里 5 起是同一类：一次变更推到全部"), ("05", "复盘原话：坏配置几秒内推到全部"), ("06", "AWS 那次 DynamoDB 坏了 2 小时 52 分"),
                                   ("07", "拖长恢复的是重试、积压和同时重启"), ("08", "单区域的物理和网络故障是真的"), ("09", "同云多区域挡得住单区域故障")])))

# 4 incident windows bars
c = head("01", "复盘", 4, "8 起重大中断里 5 起是同一类：一次变更推到全部")
c += box(64, 180, 760, 470, "background: " + SURF + "; border: 1px solid " + BORDER + "; box-sizing: border-box")
rows = [("Azure West US 2", "2026-05", 1326, "R"), ("AWS us-east-1", "2025-10", 872, "R"), ("Azure Front Door", "2025-10", 504, "G"), ("Azure 多区域", "2026-02", 387, "G"),
        ("Cloudflare 全网", "2025-11", 190, "G"), ("Google 全球 API", "2025-06", 180, "G"), ("Cloudflare WAF", "2025-12", 25, "G")]
s = '<rect x="88" y="200" width="12" height="12" fill="%s"/>' % CYAN + t(108, 211, "全局变更推到全部", 13, CYAN) + '<rect x="250" y="200" width="12" height="12" fill="%s"/>' % BLUE + t(270, 211, "单区域故障", 13, BLUE) + t(800, 211, "事故窗口 · 分钟", 13, MUTED, "end", 400, True)
y = 236; x0 = 300; k = 400 / 1326
for name, d, v, cat in rows:
    col = CYAN if cat == "G" else BLUE
    s += t(88, y + 21, name, 15, TEXT) + t(88, y + 39, d, 12, MUTED, "start", 400, True)
    s += rect(x0, y + 8, max(v * k, 3), 26, col) + t(x0 + v * k + 10, y + 27, str(v), 15, col, "start", 700, True)
    y += 56
c += svg(s)
c += box(848, 180, 368, 230, "background: " + TINT + "; border: 1px solid " + CYAN + "; box-sizing: border-box")
c += svg(icon("zap", 872, 204, 22, CYAN))
c += box(904, 202, 290, 24, font(14, 24, CYAN, 400, "", MONO), "一次变更推到全部")
c += box(872, 240, 320, 80, font(72, 80, CYAN, 700, "", MONO), "5/8")
c += box(872, 330, 320, 60, font(15, 24, "#C9D4E5"), "全局配置、策略或数据很快推到全部节点")
c += box(848, 426, 368, 224, "background: " + SURF + "; border: 1px solid " + BORDER + "; box-sizing: border-box")
c += svg(icon("flame", 872, 450, 22, RED))
c += box(904, 448, 290, 24, font(14, 24, RED, 400, "", MONO), "AWS 中东两个区域")
c += box(872, 486, 320, 60, font(52, 60, TEXT, 700, "", MONO), "7+ 个月")
c += box(872, 556, 320, 70, font(15, 24, "#C9D4E5"), "从 3 月 1 日算起，设施遭无人机袭击，部分数据已确认无法恢复")
c += source("四家厂商官方复盘和状态页，团队计算。Google 按迷你报告 3 小时，Cloudflare 11 月到核心恢复，Azure 2 月为主体")
pages.append(("4 事故窗口", c))

# 5 quotes terminal window
c = head("01", "复盘", 5, "复盘原话：坏配置几秒内推到全部，客户做什么都挡不住")
c += box(64, 180, 1152, 470, "background: #070B16; border: 1px solid " + BORDER + "; box-sizing: border-box")
c += box(64, 180, 1152, 36, "background: " + SURF + "; border-bottom: 1px solid " + BORDER + "; box-sizing: border-box")
c += box(84, 188, 600, 20, font(13, 20, MUTED, 400, "", MONO), "postmortems / quotes.txt")
c += box(1000, 188, 196, 20, font(13, 20, DIM, 400, "text-align: right", MONO), "UTF-8  ·  4 sources")
lines = [("# Google Cloud · 2025-06-12 · Service Control quota policy", "c"), ('"this metadata was replicated globally within seconds."', "s"), ("", ""),
         ("# Cloudflare · 2025-12-05 · global configuration system", "c"), ('"propagates changes within seconds to the entire fleet of servers in our network"', "s"), ("", ""),
         ("# Cloudflare · 2025-12-19 · Code Orange, on Nov 18 and Dec 5", "c"), ('"In both events, a wrong configuration took down our network in seconds."', "s"), ("", ""),
         ("# Azure · 2026-02-02 · a policy job that reached many regions", "c"), ('"There was nothing that customers could have done to avoid or minimize', "e"), (' impact from this specific service incident."', "e")]
y = 232
for i, (ln, kind) in enumerate(lines):
    c += box(84, y, 36, 30, font(15, 30, DIM, 400, "text-align: right", MONO), str(i + 1))
    col = {"c": MUTED, "s": CYAN, "e": AMBER, "": MUTED}[kind]
    c += box(140, y, 1060, 30, font(16 if kind != "c" else 15, 30, col, 700 if kind == "e" else 400, "white-space: pre", MONO), ln.replace("<", "&lt;"))
    y += 33
c += source("Google Cloud 复盘（2025-06-13），Cloudflare 复盘（2025-12-05）和 Code Orange（2025-12-19），Azure 复盘 FNJ8-VQZ。照录原文")
pages.append(("5 复盘原话", c))

# 6 cascade log + durations
c = head("01", "复盘", 6, "AWS 那次 DynamoDB 坏了 2 小时 52 分，事故拖到 14 小时 32 分")
c += box(64, 180, 700, 470, "background: " + SURF + "; border: 1px solid " + BORDER + "; box-sizing: border-box")
c += box(88, 194, 600, 20, font(13, 20, MUTED, 400, "", MONO), "us-east-1 · 2025-10-20 · UTC")
log = [("06:48", "DNS 记录被清空", "端点 IP 全部消失", RED), ("09:40", "DynamoDB 恢复", "开始后 2 小时 52 分", GREEN), ("11:14", "租约系统限流重启", "积压成拥塞崩溃", AMBER),
       ("12:30", "NLB 连接报错", "健康检查时好时坏", RED), ("16:36", "关掉 NLB 自动切换", "止住节点被反复移出", AMBER), ("21:20", "事件结束", "共 14 小时 32 分", GREEN)]
s = '<line x1="182" y1="236" x2="182" y2="620" stroke="%s" stroke-width="1.5"/>' % BORDER
y = 232
for i, (tm, ti, de, col) in enumerate(log):
    em = i == 1
    if em:
        c += box(70, y - 6, 688, 62, "background: " + TINT)
    c += box(88, y + 4, 80, 24, font(17, 24, CYAN if em else MUTED, 700 if em else 400, "", MONO), tm)
    s += '<circle cx="182" cy="%d" r="6" fill="%s"/>' % (y + 16, col)
    c += box(206, y + 2, 320, 26, font(18, 26, CYAN if em else TEXT, 700), ti)
    c += box(206, y + 28, 520, 22, font(14, 22, MUTED), de)
    y += 66
c += svg(s)
c += box(788, 180, 428, 260, "background: " + SURF + "; border: 1px solid " + BORDER + "; box-sizing: border-box")
c += box(812, 194, 380, 20, font(13, 20, MUTED, 400, "", MONO), "故障本身 vs 事故窗口")
s = rect(812, 252, 380 * 172 / 872, 30, CYAN) + t(812, 240, "DynamoDB 不可达", 14, CYAN) + t(812 + 380 * 172 / 872 + 10, 273, "2h52m", 16, CYAN, "start", 700, True)
s += rect(812, 336, 380, 30, "none", 'stroke="%s" stroke-width="2"' % RED) + rect(812, 336, 380 * 172 / 872, 30, "rgba(255,107,125,0.25)") + t(812, 324, "整个事件", 14, RED) + t(1190, 357, "14h32m", 16, RED, "end", 700, True)
s += t(812, 410, "5 倍：拖长它的是积压和连锁，不是故障本身", 14, MUTED)
c += svg(s)
c += box(788, 456, 428, 194, "background: " + SURF + "; border: 1px solid " + AMBER + "; box-sizing: border-box")
c += svg(icon("siren", 812, 476, 22, AMBER))
c += box(844, 474, 340, 24, font(14, 24, AMBER, 400, "", MONO), "原文")
c += box(812, 512, 384, 120, font(17, 27, TEXT, 400, "", MONO), '"DWFM had entered a state of congestive collapse"，而且没有现成的恢复手册。')
c += source("AWS DynamoDB 事故复盘（2025 年 10 月）。时间为 UTC，结束按复盘的 21:20，状态页写 22:01")
pages.append(("6 级联日志", c))

# 7 recovery 5 cards + tip
c = head("01", "复盘", 7, "拖长恢复的是重试、积压和同时重启，不是故障本身")
rc = [("repeat", "重试风暴跨区", "重试先压垮 East US 的托管标识，又被转去压垮 West US。", "Azure 2026-02"), ("layers", "积压成拥塞崩溃", "租约积压到处理不动，最后靠限流加分批重启。", "AWS 2025-10"),
      ("refresh-cw", "同时重启", "大区域的任务一起重启，压向同一张表，没做随机指数退避。", "Google 2025-06"), ("log-in", "登录积压", "积压的登录请求加上重试，控制台又有 50 分钟不可用。", "Cloudflare 2025-11"),
      ("hard-drive", "逐个检查", "制冷 1 小时 31 分恢复，存储逐个检查约 14 小时。", "Azure 2026-05")]
s = ""
pos = [(64, 180), (452, 180), (840, 180), (64, 418), (452, 418)]
for i, ((ic, ti, tx, src), (x, y)) in enumerate(zip(rc, pos)):
    c += box(x, y, 376, 222, "background: " + SURF + "; border: 1px solid " + BORDER + "; box-sizing: border-box")
    s += brackets(x + 8, y + 8, 360, 206, DIM, 10) + icon(ic, x + 24, y + 24, 26, CYAN)
    c += tag(x + 376 - 24 - int(len(src) * 8.4 + 18), y + 26, src, MUTED)
    c += box(x + 24, y + 72, 330, 32, font(21, 32, TEXT, 700), ti)
    c += box(x + 24, y + 114, 330, 84, font(16, 26, "#C9D4E5"), tx)
c += svg(s)
c += box(840, 418, 376, 222, "background: " + TINT + "; border: 1px solid " + CYAN + "; box-sizing: border-box")
c += svg(icon("timer", 864, 442, 26, CYAN))
c += box(864, 490, 330, 26, font(15, 26, CYAN, 400, "", MONO), "我们现在就能做")
c += box(864, 522, 330, 110, font(17, 27, TEXT), "前四样我们的服务里也有。重试加随机退避和上限，重启错峰，队列按长度限流，不用等多区域。")
c += source("Azure、AWS、Google Cloud、Cloudflare 各自的事故复盘（2025 年 6 月至 2026 年 5 月）")
pages.append(("7 恢复拖长", c))

# 8 physical image grid
c = head("01", "复盘", 8, "单区域的物理和网络故障是真的：雷暴、电压跌落、光纤维护")
ph = [("grid-cooling", "Azure West US 2 · 2026-05", "雷暴打中两个可用区", "22h 06m"), ("grid-power", "Google europe-west4-a · 2026-07", "备用冷源恰在施工", "44°C"),
      ("grid-fiber", "Google us-west1 · 2026-08", "带宽被压缩，其他区域照常", "单区域")]
for i, (k, cap, fact, big) in enumerate(ph):
    x = 64 + i * 392
    c += '<img src="' + IMG[k] + '" alt="" style="position: absolute; left: %dpx; top: 180px; width: 376px; height: 250px; object-fit: cover">' % x
    c += box(x, 180, 376, 250, "border: 1px solid " + BORDER + "; box-sizing: border-box")
    c += box(x, 444, 376, 20, font(12, 20, MUTED, 400, "", MONO), cap)
    c += box(x, 470, 376, 52, font(44, 52, TEXT, 700, "white-space: nowrap", MONO), big)
    c += box(x, 528, 376, 26, font(17, 26, "#C9D4E5"), fact)
c += box(64, 578, 1152, 64, "background: " + TINT + "; border: 1px solid " + CYAN + "; box-sizing: border-box")
c += svg(icon("shield-check", 88, 598, 24, CYAN))
c += box(124, 596, 1060, 28, font(19, 28, TEXT), "三起都只伤一个区域，同云多区域挡得住")
c += source("Microsoft Azure 复盘 GHRP-84G，Google Cloud 复盘（2026-07-25、2026-08-27）。图为 AI 生成的示意图")
pages.append(("8 物理故障图组", c))

# 9 matrix with icons
c = head("01", "复盘", 9, "同云多区域挡得住单区域故障，挡不住全局变更")
c += box(64, 180, 1152, 470, "background: " + SURF + "; border: 1px solid " + BORDER + "; box-sizing: border-box")
hdr = [("事故", 88), ("故障范围", 400), ("多可用区", 720), ("同云多区域", 900)]
for h_, x in hdr:
    c += box(x, 196, 280, 20, font(13, 20, MUTED, 400, "", MONO), h_)
c += box(65, 226, 1150, 1, "background: " + BORDER)
mx = [("AWS use1-az4 · 2026-05", "单可用区", "ok", "", "ok", ""), ("Azure West US 2 · 2026-05", "一个区域的两个可用区", "no", "", "ok", ""),
      ("Google us-west1 · 2026-08", "单区域网络", "no", "", "ok", ""), ("AWS us-east-1 · 2025-10", "单区域，牵连部分全局功能", "no", "", "ok", "大体能，IAM 依赖 us-east-1"),
      ("AWS 中东 · 2026-03", "两个区域，跨多个可用区", "no", "", "ok", "数据要在区域外"), ("Google 2025-06、Azure 2026-02", "全球或多区域控制面", "no", "", "no", ""),
      ("Cloudflare、Azure Front Door", "全球边缘网络", "na", "", "na", "要备用入口")]
y = 228; s = ""
for i, (a, b, az, _, rg, note) in enumerate(mx):
    em = i == 5
    if em:
        c += box(65, y, 1150, 58, "background: " + TINT) + box(65, y, 3, 58, "background: " + CYAN)
    c += box(65, y + 58, 1150, 1, "background: " + BORDER)
    c += box(88, y + 16, 300, 26, font(16, 26, CYAN if em else TEXT, 700 if em else 400), a)
    c += box(400, y + 16, 300, 26, font(15, 26, "#C9D4E5"), b)
    for (val, x, nt) in [(az, 720, ""), (rg, 900, note)]:
        ic, col, word = {"ok": ("check", GREEN, "能"), "no": ("x", RED, "不能"), "na": ("minus", MUTED, "不适用")}[val]
        s += icon(ic, x, y + 17, 22, col, 2.5)
        c += box(x + 30, y + 16, 280, 26, font(15, 26, col, 700, "white-space: nowrap"), word + (("<span style=\"color:" + MUTED + "; font-weight:400\">  " + nt + "</span>") if nt else ""))
    y += 59
c += svg(s)
c += source("各事故的官方复盘和 AWS 状态页（2025 年 10 月至 2026 年 9 月），团队按原文归纳。use1-az4 按 AWS 的单可用区说法")
pages.append(("9 冗余矩阵", c))

pages.append(("10 章节：决定", chapter("02", "决定：做到哪一档，先做哪几件", "chapter-oncall",
                                   [("11", "SLA 只赔服务费：99.99% 一个月只允许停机 4.38 分钟"), ("12", "灾备四档选温备，不上多活"), ("13", "入口、身份、配置发布、数据各留一条路"),
                                    ("14", "状态页和告警要搬出主云"), ("15", "路线图：Q4 先补限流和发布")])))

# 11 SLA table + kpis
c = head("02", "决定", 11, "SLA 只赔服务费：99.99% 一个月只允许停机 4.38 分钟")
c += box(64, 180, 640, 470, "background: " + SURF + "; border: 1px solid " + BORDER + "; box-sizing: border-box")
c += box(88, 196, 300, 20, font(13, 20, MUTED, 400, "", MONO), "SLA 允许的停机") + box(400, 196, 130, 20, font(13, 20, MUTED, 400, "text-align: right", MONO), "每月") + box(550, 196, 130, 20, font(13, 20, MUTED, 400, "text-align: right", MONO), "每年")
c += box(65, 226, 638, 1, "background: " + BORDER)
sl = [("99.9%", "43.8 分钟", "8.77 小时"), ("99.95%", "21.9 分钟", "4.38 小时"), ("99.99%", "4.38 分钟", "52.6 分钟"), ("99.999%", "26.3 秒", "5.26 分钟")]
y = 228
for i, (a, b, d) in enumerate(sl):
    em = i == 2
    if em:
        c += box(65, y, 638, 96, "background: " + TINT) + box(65, y, 3, 96, "background: " + CYAN)
    c += box(65, y + 96, 638, 1, "background: " + BORDER)
    c += box(88, y + 28, 280, 40, font(32, 40, CYAN if em else TEXT, 700, "", MONO), a)
    c += box(400, y + 32, 130, 32, font(20, 32, CYAN if em else TEXT, 700 if em else 400, "text-align: right", MONO), b)
    c += box(550, y + 32, 130, 32, font(18, 32, MUTED, 400, "text-align: right", MONO), d)
    y += 97
kp = [("receipt", "抵扣上限", "当月服务费", "AWS、Google、Azure 都是。Azure 写明不补偿 lost revenue", False), ("server", "三家虚拟机 SLA 最高档", "99.99%", "同一区域多可用区，没有多区域档", False),
      ("timer", "AWS 2025-10 窗口是月度额度的", "199 倍", "872 分钟对 4.38 分钟，按整窗不可用估算", True)]
for i, (ic, lab, val, sub, em) in enumerate(kp):
    y = 180 + i * 160
    c += box(720, y, 496, 150, "background: " + (TINT if em else SURF) + "; border: 1px solid " + (CYAN if em else BORDER) + "; box-sizing: border-box")
    c += svg(icon(ic, 744, y + 20, 20, CYAN))
    c += box(774, y + 18, 420, 22, font(14, 22, MUTED), lab)
    c += box(744, y + 50, 440, 46, font(38, 46, CYAN if em else TEXT, 700, "white-space: nowrap", MONO), val)
    c += box(744, y + 104, 450, 40, font(14, 20, "#C9D4E5"), sub)
c += source("AWS EC2 SLA、Google Compute Engine SLA、Microsoft Online Services SLA（2026 年 10 月版），团队计算。按平均月 30.4375 天")
pages.append(("11 SLA", c))

# 12 DR tiers with cost meter
c = head("02", "决定", 12, "灾备四档选温备：RPO 秒级、RTO 分钟级，不上多活")
tiers = [("备份恢复", "小时级", "24 小时内", "只有备份", "全部基础设施", 1, False), ("核心待命", "分钟级", "几十分钟", "数据库和存储常开", "应用服务器", 2, False),
         ("温备", "秒级", "分钟级", "缩小规模的整套服务", "不用，只需扩容", 3, True), ("多区域多活", "接近零", "可能为零", "多个区域同时接流量", "不用", 4, False)]
for i, (nm, rpo, rto, run, build, cost, em) in enumerate(tiers):
    x = 64 + i * 292
    c += box(x, 180, 276, 470, "background: " + (TINT if em else SURF) + "; border: 1px solid " + (CYAN if em else BORDER) + "; box-sizing: border-box")
    c += box(x + 20, 198, 60, 20, font(13, 20, DIM if not em else CYAN, 400, "", MONO), "T" + str(i + 1))
    if em:
        c += tag(x + 276 - 20 - 58, 196, "SELECT", CYAN, True)
    c += box(x + 20, 226, 240, 34, font(24, 34, CYAN if em else TEXT, 700), nm)
    meter = "".join('<span style="display:inline-block;width:46px;height:8px;margin-right:6px;background:%s"></span>' % ((CYAN if em else BLUE) if j < cost else BORDER) for j in range(4))
    c += box(x + 20, 272, 240, 10, "line-height: 8px", meter)
    c += box(x + 20, 290, 240, 18, font(12, 18, MUTED, 400, "", MONO), "成本 " + "$" * cost)
    rowsd = [("RPO", rpo), ("RTO", rto), ("平时在跑", run), ("出事时要新建", build)]
    y = 330
    for lab, val in rowsd:
        c += box(x + 20, y, 236, 1, "background: " + BORDER)
        c += box(x + 20, y + 10, 236, 20, font(12, 20, MUTED, 400, "", MONO), lab)
        c += box(x + 20, y + 32, 236, 48, font(17 if lab in ("RPO", "RTO") else 15, 24, (CYAN if em else TEXT), 700 if lab in ("RPO", "RTO") else 400, "", MONO if lab in ("RPO", "RTO") else None), val)
        y += 76
c += source("AWS Well-Architected 可靠性支柱 REL13-BP02，AWS 灾备白皮书。成本是白皮书的相对示意，三家云都没有公布多区域的美元价差")
pages.append(("12 灾备四档", c))

# 13 dependency paths
c = head("02", "决定", 13, "入口、身份、配置发布、数据，各留一条不走同一控制面的路")
dp = [("globe", "入口与 DNS 只有一条路", "Azure Front Door 全球中断 8 小时 24 分", "备用入口，可绕开主 CDN", False), ("key-round", "身份绑在一个区域", "所有区域的 Redshift 用 IAM 用户查不了", "登录和权限解析不依赖单一区域", True),
      ("git-branch", "配置一次推到全部", "8 起重大中断里 5 起", "分批推送，读不到新配置沿用上一版", False), ("database", "数据只在一个区域", "AWS 巴林区域只在本区的数据已无法恢复", "跨区域副本，加区域外备份", False)]
c += box(64, 180, 520, 20, font(13, 20, RED, 400, "", MONO), "✕ 会拖垮多区域的单点") + box(700, 180, 516, 20, font(13, 20, CYAN, 400, "", MONO), "✓ 各留一条独立的路")
s = ""
for i, (ic, a, ev, fix, em) in enumerate(dp):
    y = 212 + i * 110
    c += box(64, y, 560, 96, "background: " + SURF + "; border: 1px solid " + (RED if em else BORDER) + "; box-sizing: border-box")
    s += icon(ic, 84, y + 20, 26, RED if em else MUTED)
    c += box(126, y + 16, 480, 28, font(19, 28, TEXT, 700), a)
    c += box(126, y + 50, 480, 24, font(14, 24, MUTED), ev)
    s += icon("arrow-right", 638, y + 36, 24, CYAN if em else DIM)
    c += box(676, y, 540, 96, "background: " + (TINT if em else SURF) + "; border: 1px solid " + (CYAN if em else BORDER) + "; box-sizing: border-box")
    c += box(700, y + 32, 500, 30, font(19, 30, CYAN if em else TEXT, 700 if em else 400), fix)
c += svg(s)
c += source("Azure 复盘 YKYN-BWZ，AWS DynamoDB 事故复盘（2025 年 10 月），AWS 状态页（2026-09-15），团队归纳")
pages.append(("13 依赖路径", c))

# 14 observe device mockup + log list
c = head("02", "决定", 14, "状态页和告警要搬出主云：Google 首条公告晚了 55 分钟")
c += box(64, 184, 640, 420, "background: #070B16; border: 1px solid " + BORDER + "; box-sizing: border-box; border-radius: 8px")
c += box(64, 184, 640, 34, "background: " + SURF + "; border-bottom: 1px solid " + BORDER + "; box-sizing: border-box; border-radius: 8px 8px 0 0")
c += box(84, 191, 400, 20, font(12, 20, DIM, 400, "", MONO), "status.internal / overview")
c += '<img src="' + IMG["mock-dashboard"] + '" alt="监控大盘（示意图，AI 生成）" style="position: absolute; left: 65px; top: 218px; width: 638px; height: 385px; object-fit: cover">'
ob = [("bell-off", "Google · 2025-06", "状态页受连累，晚 55 分钟才发公告", RED, False), ("radio-tower", "Cloudflare · 2025-11", "状态页也挂了，一度疑为 DDoS", RED, False),
      ("shield-check", "Google 承诺", "主监控挂了，通报设施也要能用", MUTED, False), ("flag", "我们", "状态页、告警和值班通知不走主云", CYAN, True)]
s = ""
for i, (ic, who, tx, col, em) in enumerate(ob):
    y = 184 + i * 106
    if em:
        c += box(728, y, 488, 96, "background: " + TINT + "; border: 1px solid " + CYAN + "; box-sizing: border-box")
    else:
        c += box(728, y + 96, 488, 1, "background: " + BORDER)
    s += icon(ic, 748, y + 22, 22, col)
    c += box(782, y + 18, 420, 22, font(13, 22, col if em or col == RED else MUTED, 400, "", MONO), who)
    c += box(782, y + 44, 420, 44, font(17, 24, CYAN if em else TEXT, 700 if em else 400), tx)
c += svg(s)
c += source("Google Cloud 事故复盘（2025-06-13），Cloudflare 事故复盘（2025-11-18）。界面为 AI 生成的示意图")
pages.append(("14 观测出主云", c))

# 15 roadmap
c = head("02", "决定", 15, "路线图：Q4 先补限流和发布，2027 Q2 上第二区域温备")
rm = [("2026 Q4", "限流与退避", [("重试", "随机指数退避，设上限"), ("队列", "按积压长度限流"), ("发布", "配置分批推送"), ("开关", "关键改动默认关闭")], True),
      ("2027 Q1", "独立备用路径", [("入口", "备用 DNS 与入口"), ("身份", "登录不依赖单一区域"), ("观测", "状态页和告警迁出主云")], False),
      ("2027 Q2", "第二区域温备", [("规模", "缩小规模、功能完整"), ("数据", "跨区副本加区外备份"), ("RPO", "秒级"), ("RTO", "分钟级")], False),
      ("2027 Q3 起", "切换演练", [("频率", "每季度一次区域切换"), ("决策", "按演练结果再议多活")], False)]
s = '<line x1="64" y1="208" x2="1216" y2="208" stroke="%s" stroke-width="2"/>' % BORDER
for i, (q, nm, rows_, em) in enumerate(rm):
    x = 64 + i * 292
    s += '<circle cx="%d" cy="208" r="7" fill="%s" stroke="%s" stroke-width="2"/>' % (x + 8, CYAN if em else BG, CYAN if em else MUTED)
    c += box(x, 172, 240, 24, font(15, 24, CYAN if em else MUTED, 700 if em else 400, "", MONO), q)
    c += box(x, 228, 276, 326, "background: " + (TINT if em else SURF) + "; border: 1px solid " + (CYAN if em else BORDER) + "; box-sizing: border-box")
    c += box(x + 20, 246, 240, 32, font(22, 32, CYAN if em else TEXT, 700), nm)
    y = 292
    for lab, val in rows_:
        c += box(x + 20, y, 236, 1, "background: " + BORDER)
        c += box(x + 20, y + 10, 70, 22, font(12, 22, MUTED, 400, "", MONO), lab)
        c += box(x + 84, y + 10, 176, 44, font(15, 22, TEXT), val)
        y += 62
c += svg(s)
c += box(64, 570, 1152, 72, "background: " + SURF + "; border: 1px solid " + AMBER + "; box-sizing: border-box")
c += svg(icon("flag", 88, 594, 24, AMBER))
c += box(124, 584, 1070, 44, font(19, 22, TEXT, 400, "display: flex; align-items: center; height: 44px"), "请评审会拍板：第二区域做温备，不做多活。Q4 先上限流、退避和分批发布。")
pages.append(("15 路线图", c))

# 16 ending checklist
c = crumb("EOF", "决定", 16).replace("P16", "2026-10")
c += box(64, 150, 1152, 140, "display: flex; flex-direction: column; justify-content: flex-end; " + font(48, 64, TEXT, 700), '<div>多区域做到<span style="color: ' + CYAN + '">温备</span>，先补限流退避和独立备用路径</div>')
c += box(64, 316, 1152, 1, "background: " + BORDER) + box(64, 315, 32, 3, "background: " + CYAN)
ck = [("2026 Q4", "限流与退避", "重试退避、队列限流、配置分批推送"), ("2027 Q1", "独立备用路径", "入口、身份、观测各留一条路"), ("2027 Q2", "第二区域温备", "RPO 秒级，RTO 分钟级")]
for i, (q, a, b) in enumerate(ck):
    y = 350 + i * 86
    c += box(64, y, 1152, 72, "background: " + SURF + "; border: 1px solid " + BORDER + "; box-sizing: border-box")
    c += box(88, y + 22, 40, 28, font(20, 28, CYAN, 700, "", MONO), "[ ]")
    c += box(150, y + 22, 140, 28, font(17, 28, MUTED, 400, "", MONO), q)
    c += box(300, y + 20, 300, 32, font(22, 32, TEXT, 700), a)
    c += box(620, y + 24, 580, 26, font(17, 26, "#C9D4E5"), b)
pages.append(("16 结尾", c))

boards = {}; order_ = []; cells = []
for i, (title, inner) in enumerate(pages):
    name = "Main.dc.html" if i == 0 else "d%02d.dc.html" % (i + 1)
    open(os.path.join(P, name), 'w').write(page(title, inner))
    boards[name] = {"x": 0, "y": i * 840, "w": 1280, "h": 720, "title": title + " · 设计稿"}; order_.append(name)
    cur = "c%02d.dc.html" % (i + 1)
    open(os.path.join(P, cur), 'w').write(page(title + " 当前", '<img src="' + CUR[i] + '" alt="引擎当前渲染" style="display: block; width: 1280px; height: 720px">'))
    boards[cur] = {"x": 1360, "y": i * 840, "w": 1280, "h": 720, "title": title + " · 引擎当前"}; order_.append(cur)
    loc = inner
    for k in IMG:
        loc = loc.replace(IMG[k], "../up/" + k + ".jpg")
    cells.append('<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: %s; color: %s; font-family: %s">%s</div>' % (BG, TEXT, SANS, loc))
canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}, "title": "terminal 云中断复盘样例设计稿",
          "launch": {"view": "canvas"}, "pages": [], "boards": boards, "order": order_, "notes": {}, "designSystems": []}
pc = os.path.join(P, 'canvas.json')
if os.path.exists(pc):
    canvas["createdOnFiles"] = json.load(open(pc))["createdOnFiles"]
json.dump(canvas, open(pc, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(L, 'sheet.html'), 'w').write('<!doctype html><meta charset="utf-8"><body style="margin:0;background:#444;display:grid;grid-template-columns:repeat(2,1280px);gap:16px;padding:16px;width:2592px">' + "".join(cells) + '</body>')
print(len(order_))
