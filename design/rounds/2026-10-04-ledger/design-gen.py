import json, os, datetime
ROOT = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(ROOT, 'project'); L = os.path.join(ROOT, 'local')
os.makedirs(P, exist_ok=True); os.makedirs(L, exist_ok=True)

BG = "linear-gradient(180deg, #151B23 0%, #0C1016 100%)"; SURF = "#171C22"; BORDER = "#2A3440"; TEXT = "#F2EFE8"; MUTED = "#9AA7B4"
AMBER = "#F0A63C"; GREEN = "#2FA97C"; RED = "#DA6354"; SL1 = "#7E93A8"; SL2 = "#56677A"; SL3 = "#3D4B5A"; SL4 = "#2E3A47"; TINT = "#2A2418"
SERIF = "Georgia, 'Songti SC', 'STSong', serif"
SANS = "'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', sans-serif"
PHOTO = "/_blob/db0d0dd06e207cd4c731592f5bcab26c"
CUR = ["/_blob/" + i for i in ['42a080d72aaad8efd56902740089fd8a', 'a44d3323aabed18156d872cc82ba3f37', '2a490c4eed4000ac6056df5c7ceaad05', 'a099ea6621e66d8af1897f4eeb90ef41', '6d7a1a88e6ebf85d2721d41f73ee5d4d', '3ad173503a74ee3e15d7fcd83a980144', '5065f40bf19cccbb505f568eeea70ae9', 'ea22044ed9c8097dc972fbcceb2c738b', '5c66565302f78fe1e2d86ea9c625a46a', '9cd6c52127d4c13f2f226b88d71b4836', '936bbadbd774c6e6dc9f170ca3145c2d', '52546a7c0def8caaa66250d5899d2e83', '5d6cfd83fa59751867736a95ebae4525', 'ed62b46324a24458f01fe3b12a0a4dd7', 'bf1dbb750bd45e30d5a3334c6b815c98']]


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


def strip():
    out = box(0, 0, 1280, 32, "background: #0B0E12; border-bottom: 1px solid " + BORDER + "; box-sizing: border-box")
    out += box(64, 13, 6, 6, "background: " + AMBER + "; border-radius: 3px")
    out += box(78, 8, 700, 16, font(12, 16, MUTED, 400, "letter-spacing: 0.5px"), "行业研究 · 投委会专题")
    out += box(916, 8, 300, 16, font(12, 16, MUTED, 400, "text-align: right; letter-spacing: 0.5px"), "2026 年 10 月")
    return out


def head(title):
    out = strip()
    out += box(64, 46, 1152, 84, "display: flex; flex-direction: column; justify-content: flex-end; " + font(31, 42, TEXT, 400, "", SERIF), title)
    return out


def panel(x, y, w, h, label="", meta="", accent=False):
    out = box(x, y, w, h, "background: " + SURF + "; border: 1px solid " + (AMBER if accent else BORDER) + "; box-sizing: border-box")
    if label or meta:
        out += box(x + 18, y + 9, w - 36, 18, font(13, 18, AMBER if accent else MUTED, 400, "letter-spacing: 0.4px"), label)
        if meta:
            out += box(x + 18, y + 9, w - 36, 18, font(13, 18, MUTED, 400, "text-align: right"), meta)
        out += box(x + 1, y + 35, w - 2, 1, "background: " + BORDER)
    return out


def source(t, y=664):
    return box(64, y, 1152, 36, font(13, 18, MUTED), t)


def svg(body, defs=""):
    return '<svg width="1280" height="720" viewBox="0 0 1280 720" style="position: absolute; left: 0; top: 0" font-family="' + SANS.replace("'", "") + '"><defs>' + defs + '</defs>' + body + '</svg>\n'


def t(x, y, s, size=14, fill=MUTED, anchor="start", weight=400, fam=None):
    f = ' font-family="%s"' % fam.replace("'", "") if fam else ""
    return '<text x="%s" y="%s" font-size="%d" fill="%s" text-anchor="%s" font-weight="%d"%s>%s</text>' % (x, y, size, fill, anchor, weight, f, s)


def rect(x, y, w, h, fill, extra=""):
    return '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s" %s/>' % (x, y, w, h, fill, extra)


def kpi(x, y, w, h, label, val, sub, color=TEXT, delta=None, accent=False, vsize=44):
    out = panel(x, y, w, h, label, "", accent)
    arrow = ""
    if delta == "up":
        arrow = '<span style="color: ' + GREEN + '; font-size: 20px; margin-left: 10px">▲</span>'
    elif delta == "down":
        arrow = '<span style="color: ' + RED + '; font-size: 20px; margin-left: 10px">▼</span>'
    out += box(x + 18, y + 50, w - 36, vsize + 8, font(vsize, vsize + 8, color, 400, "white-space: nowrap", SERIF), val + arrow)
    out += box(x + 18, y + 58 + vsize, w - 36, 44, font(15, 22, MUTED), sub)
    return out


pages = []

# 1 cover: stat ticker
c = strip()
c += box(64, 214, 600, 22, font(15, 22, AMBER, 400, "letter-spacing: 1px"), "投委会专题")
c += box(64, 250, 1152, 96, font(76, 96, TEXT, 400, "", SERIF), "AI 资本开支还能涨多久")
c += box(64, 364, 1152, 32, font(24, 32, MUTED), "2027 年还会涨，能涨多久要看钱、客户和电")
c += box(64, 470, 1152, 1, "background: " + BORDER)
tick = [("2026 年四家指引中值", "7,325", "亿美元", "▲ 79%", GREEN), ("资本开支占经营现金流", "96%", "2026 年二季度", "两年前 45%", None),
        ("已签未起租的租约", "1.12", "万亿美元", "五家合计", None), ("PJM 容量价格", "325", "美元/兆瓦/天", "触及上限", AMBER)]
for i, (lab, val, unit, d, dc) in enumerate(tick):
    x = 64 + i * 288
    if i:
        c += box(x - 20, 494, 1, 150, "background: " + BORDER)
    c += box(x, 494, 260, 20, font(14, 20, MUTED), lab)
    c += box(x, 522, 260, 60, font(52, 60, AMBER if i == 0 else TEXT, 400, "white-space: nowrap", SERIF), val)
    c += box(x, 588, 260, 20, font(15, 20, MUTED), unit)
    c += box(x, 614, 260, 20, font(15, 20, dc or MUTED, 700 if dc else 400), d)
pages.append(("1 封面", c))

# 2 summary: 2x2 panels
c = head("结论：开支还在加速，先松动的会是钱，不是需求")
items = [("开支还在上调", "四家 2026 年指引合计约 7,325 亿美元，比 2025 年高约八成，7 月没有一家下调。", False),
         ("自有现金快不够了", "资本开支已占经营现金流的 96%，缺口开始靠发债、发股和长期租约补。", True),
         ("需求押在少数客户身上", "订单集中在几家 AI 实验室，投资方和客户常常是同一批公司。", False),
         ("瓶颈转向电力", "东部电网容量价格触顶，德州暂停新数据中心并网。", False)]
for i, (ti, tx, em) in enumerate(items):
    x = 64 + (i % 2) * 584; y = 152 + (i // 2) * 252
    c += panel(x, y, 568, 236, "0" + str(i + 1), "", em)
    c += box(x + 24, y + 60, 520, 40, font(28, 40, AMBER if em else TEXT, 400, "", SERIF), ti)
    c += box(x + 24, y + 116, 520, 90, font(19, 30, TEXT if em else "#D6D9DE"), tx)
pages.append(("2 结论", c))

# 3 fact: giant number + comparison bars
c = head("四家 2026 年资本开支指引中值 7,325 亿美元，比去年高约八成")
c += box(64, 172, 700, 20, font(15, 20, MUTED), "微软、Alphabet、亚马逊、Meta 2026 年资本开支指引中值")
c += box(56, 200, 760, 210, font(200, 210, AMBER, 400, "letter-spacing: -4px; white-space: nowrap", SERIF), "7,325")
c += box(64, 420, 400, 44, font(36, 44, TEXT, 400, "", SERIF), "亿美元")
c += box(64, 486, 620, 60, font(19, 30, "#D6D9DE"), "区间 7,200 至 7,450 亿美元，7 月这一轮财报只有上调和口径调整，没有一家下调。")
c += panel(760, 172, 456, 380, "与 2025 年对比", "亿美元 · 公司口径")
s = ""
for i, (lab, v, col) in enumerate([("2025 年实际", 4100, SL2), ("2026 年指引中值", 7325, AMBER)]):
    y = 260 + i * 120; w = v / 7325 * 380
    s += t(782, y - 14, lab, 15, MUTED) + rect(782, y, w, 44, col) + t(782 + w - 10, y + 29, ("约 " if i == 0 else "") + "{:,}".format(v), 18, "#0C1016" if i else TEXT, "end", 700)
s += t(782, 500, "▲ 79%", 30, GREEN, "start", 400, SERIF) + t(890, 500, "一年多出约 3,200 亿美元", 16, MUTED)
c += svg(s)
c += source("来源：各公司新闻稿和电话会（2026 年 7 月），研究团队计算。公司口径")
pages.append(("3 大数字", c))

# 4 stacked quarterly
c = head("四家单季资本开支一年涨了 87%，Alphabet 一家翻了一倍")
c += panel(64, 152, 1152, 496, "四家季度资本开支", "亿美元 · 现金口径 · 日历季度")
data = {"微软": [110, 139, 149, 158, 168, 171, 194, 299, 309, 358], "Alphabet": [120, 132, 131, 143, 172, 224, 240, 278, 357, 449],
        "亚马逊": [149, 176, 226, 278, 250, 322, 351, 395, 442, 542], "Meta": [64, 82, 83, 144, 129, 165, 188, 214, 190, 301]}
order = [("Meta", SL4), ("亚马逊", SL3), ("微软", SL2), ("Alphabet", AMBER)]
qs = ["24Q1", "24Q2", "24Q3", "24Q4", "25Q1", "25Q2", "25Q3", "25Q4", "26Q1", "26Q2"]
base, H, vmax = 610, 340, 1800
s = ""
lx = 90
for name, col in reversed(order):
    s += rect(lx, 192, 12, 12, col) + t(lx + 18, 203, name, 14, AMBER if col == AMBER else MUTED)
    lx += 18 + len(name) * 14 + 28 if all(ord(ch) > 255 for ch in name) else 18 + len(name) * 8 + 28
s += '<line x1="90" y1="%d" x2="1190" y2="%d" stroke="%s"/>' % (base, base, BORDER)
slot = 1100 / 10; bw = 64; tops = []
for i, q in enumerate(qs):
    cx = 90 + slot * (i + 0.5); y = base; tot = 0
    for name, col in order:
        v = data[name][i]; h = v / vmax * H
        s += rect(cx - bw / 2, y - h, bw, h - 1, col); y -= h; tot += v
    tops.append((cx, y))
    s += t(cx, y - 10, "{:,}".format(tot), 15, TEXT, "middle", 700 if i == 9 else 400)
    s += t(cx, base + 22, q, 14, MUTED, "middle")
(x1, t1), (x2, t2) = tops[5], tops[9]; yb = min(t1, t2) - 40
s += '<path d="M%.1f %.1f V%.1f H%.1f V%.1f" fill="none" stroke="%s" stroke-width="1.5"/>' % (x1, t1 - 28, yb, x2, t2 - 28, AMBER) + t((x1 + x2) / 2, yb - 8, "▲ 87%", 16, AMBER, "middle", 700)
c += svg(s)
c += source("来源：微软、Alphabet、亚马逊、Meta 的 10-Q 和 10-K（2024 年 4 月至 2026 年 7 月）。现金口径，亚马逊为毛额")
pages.append(("4 季度堆叠", c))

# 5 guidance
c = head("指引一路上调：下半年每季开支要比二季度再高两到三成")
c += kpi(64, 152, 360, 236, "四家合计比 2025 年", "+79%", "约 4,100 亿美元到约 7,325 亿美元", AMBER, "up", True, 56)
c += kpi(64, 404, 360, 244, "下半年隐含单季", "2,100 至 2,220", "亿美元，比二季度的 1,701 亿高 23% 至 31%", TEXT, None, False, 40)
c += panel(440, 152, 776, 496, "2026 年指引：年内首次到 7 月最新", "亿美元 · 公司口径 · 区间取中值")
rows = [("Alphabet", 1800, 2000, "up"), ("亚马逊", 2000, 2200, "up"), ("Meta", 1250, 1375, "up"), ("微软", 1900, 1750, "acct")]
x0, x1_, lo, hi = 600, 1180, 1000, 2400
def xv(v): return x0 + (v - lo) / (hi - lo) * (x1_ - x0)
s = ""
for v in (1000, 1500, 2000):
    s += '<line x1="%.1f" y1="210" x2="%.1f" y2="610" stroke="%s" stroke-dasharray="2 4"/>' % (xv(v), xv(v), BORDER) + t(xv(v), 630, "{:,}".format(v), 13, MUTED, "middle")
for i, (name, a, b, kind) in enumerate(rows):
    y = 250 + i * 96
    s += t(466, y + 6, name, 18, TEXT, "start", 700)
    if kind == "acct":
        s += t(466, y + 28, "租赁改口径，投资不变", 13, MUTED)
    col = SL1 if kind == "acct" else AMBER
    s += '<line x1="%.1f" y1="%d" x2="%.1f" y2="%d" stroke="%s" stroke-width="3"/>' % (xv(a), y, xv(b), y, SL2 if kind == "acct" else AMBER)
    s += '<circle cx="%.1f" cy="%d" r="7" fill="%s" stroke="%s" stroke-width="2"/>' % (xv(a), y, SURF, SL1)
    s += '<circle cx="%.1f" cy="%d" r="8" fill="%s"/>' % (xv(b), y, col)
    s += t(xv(a), y - 16, "{:,}".format(a), 14, MUTED, "middle")
    s += t(xv(b), y - 16, "{:,}".format(b), 16, col, "middle", 700)
c += svg(s)
c += source("来源：各公司新闻稿和电话会（2026 年 1 至 7 月），亚马逊 2,200 亿据 Fortune（2026 年 7 月）。公司口径")
pages.append(("5 指引演变", c))

# 6 combo bars + ratio line
c = head("资本开支已吃掉 96% 的经营现金流，两年前是 45%")
c += panel(64, 152, 1152, 496, "四家合计：经营现金流减资本开支，及资本开支占经营现金流", "左轴亿美元 · 右轴 % · 现金口径")
bars = [547, 556, 567, 627, 423, 402, 617, 602, 210, 67]; ratio = [45, 49, 51, 54, 63, 69, 61, 66, 86, 96]
base, H = 600, 320
s = rect(90, 190, 12, 12, SL2) + t(108, 201, "经营现金流减资本开支", 14, MUTED) + '<line x1="290" y1="196" x2="314" y2="196" stroke="%s" stroke-width="3"/>' % AMBER + t(322, 201, "资本开支占经营现金流", 14, AMBER)
s += '<line x1="90" y1="%d" x2="1190" y2="%d" stroke="%s"/>' % (base, base, BORDER)
slot = 1100 / 10; bw = 58; pts = []
for i, (b, r) in enumerate(zip(bars, ratio)):
    cx = 90 + slot * (i + 0.5); h = b / 800 * H
    s += rect(cx - bw / 2, base - h, bw, h, SL2) + t(cx, base - h - 8, str(b), 14, MUTED, "middle")
    s += t(cx, base + 22, qs[i], 14, MUTED, "middle")
    pts.append((cx, base - r / 100 * H * 1.05))
s += '<polyline points="%s" fill="none" stroke="%s" stroke-width="3"/>' % (" ".join("%.1f,%.1f" % p for p in pts), AMBER)
for i, (px, py) in enumerate(pts):
    s += '<circle cx="%.1f" cy="%.1f" r="%d" fill="%s"/>' % (px, py, 6 if i in (0, 9) else 4, AMBER)
s += t(pts[0][0], pts[0][1] - 14, "45%", 20, AMBER, "middle", 700) + t(pts[9][0], pts[9][1] - 14, "96%", 24, AMBER, "middle", 700)
c += svg(s)
c += source("来源：微软、Alphabet、亚马逊、Meta 的 10-Q 和 10-K（2024 年 4 月至 2026 年 7 月），研究团队计算。现金口径")
pages.append(("6 现金流比例", c))

# 7 FCF table
c = head("五家里三家自由现金流已转负，另两家也在缩水")
c += panel(64, 152, 1152, 384, "自由现金流", "亿美元 · 按各公司自己的定义")
cols = [("公司", 88, 220, "left"), ("最新一期", 308, 300, "left"), ("自由现金流", 640, 220, "right"), ("一年前或对比", 900, 290, "right")]
for lab, x, w, al in cols:
    c += box(x, 200, w, 22, font(14, 22, MUTED, 400, "text-align: " + al), lab)
c += box(65, 230, 1150, 1, "background: " + BORDER)
rws = [("微软", "2026 年二季度", "196", "一年前 256", False), ("Alphabet", "2026 年二季度", "−59", "一年前 53", True), ("亚马逊", "截至 6 月的十二个月", "−76", "一年前 182", False),
       ("Meta", "2026 年二季度", "7.8", "一年前 85.5", False), ("甲骨文", "6 至 8 月财季", "−54", "2026 财年 −237", False)]
y = 232
for a, b, v, d, em in rws:
    if em:
        c += box(65, y, 1150, 58, "background: " + TINT) + box(65, y, 3, 58, "background: " + AMBER)
    c += box(65, y + 58, 1150, 1, "background: " + BORDER)
    c += box(88, y + 16, 220, 26, font(19, 26, AMBER if em else TEXT, 700 if em else 400), a)
    c += box(308, y + 16, 300, 26, font(17, 26, MUTED), b)
    c += box(640, y + 12, 220, 34, font(28, 34, RED if v.startswith("−") else TEXT, 400, "text-align: right", SERIF), v)
    c += box(900, y + 16, 290, 26, font(17, 26, MUTED, 400, "text-align: right"), d)
    y += 59
c += panel(64, 552, 1152, 92)
c += box(88, 580, 1100, 36, font(19, 30, TEXT), "微软还明显为正，但比一年前少了 23%，管理层称 2027 财年仍为正。")
c += source("来源：微软电话会，Alphabet、亚马逊、Meta 新闻稿（2026 年 7 月），甲骨文新闻稿和 10-Q（2026 年 6 月、9 月）")
pages.append(("7 自由现金流表", c))

# 8 financing timeline
c = head("缺口开始靠外部资金补：发债、发股、签长租轮番上阵")
c += panel(64, 152, 1152, 360, "2026 年外部融资和长期承诺", "亿美元")
ev = [("3 至 7 月", "亚马逊发债", "新发约 919 亿", False), ("5 月", "Meta 发债 250 亿", "票据余额升到 840 亿", False), ("6 月 2 日", "Alphabet 发股 847.5 亿", "含伯克希尔 100 亿", True),
      ("6 至 8 月", "甲骨文增发 199 亿", "额度一个季度用完", False), ("7 月", "Meta 新签长租约", "约 680 亿，2027 年起租", False), ("8 月", "英伟达担保", "上限 1,050 亿", False)]
axis = 300; s = '<line x1="88" y1="%d" x2="1192" y2="%d" stroke="%s" stroke-width="2"/>' % (axis, axis, SL2)
cw = 1104 / 6
for i, (d, ti, de, em) in enumerate(ev):
    x = 88 + i * cw
    s += '<circle cx="%.1f" cy="%d" r="%d" fill="%s" stroke="%s" stroke-width="2"/>' % (x + 8, axis, 8 if em else 6, AMBER if em else SURF, AMBER if em else SL1)
    c += box(int(x), 214, int(cw) - 12, 22, font(15, 22, AMBER if em else MUTED, 700 if em else 400), d)
    c += box(int(x), 330, int(cw) - 14, 56, font(18, 26, AMBER if em else TEXT, 700), ti)
    c += box(int(x), 392, int(cw) - 14, 52, font(15, 22, MUTED), de)
c += svg(s)
c += panel(64, 528, 1152, 116, "表外安排")
c += box(88, 574, 1100, 60, font(19, 30, TEXT), "Meta 与贝莱德合建 1 GW 园区，贝莱德持股 80%，约 140 亿开发成本里 125 亿是借款。")
c += source("来源：亚马逊、Alphabet、Meta、甲骨文的 10-Q 和 SEC 公告，Meta 公告，英伟达 CFO 评论（2026 年 6 月至 9 月）。单位为美元")
pages.append(("8 融资时间线", c))

# 9 leases horizontal bars + kpis
c = head("还没起租的数据中心租约已有 1.12 万亿美元")
c += panel(64, 152, 760, 496, "已签未起租的数据中心租约", "亿美元 · 多年承诺")
ls_ = [("微软", 3291), ("甲骨文", 2880), ("Meta", 2790), ("亚马逊", 1372), ("Alphabet", 852)]
s = ""
for i, (n, v) in enumerate(ls_):
    y = 220 + i * 82; w = v / 3600 * 520; em = n == "甲骨文"
    s += t(88, y + 26, n, 18, AMBER if em else TEXT, "start", 700 if em else 400)
    s += rect(200, y + 4, w, 34, AMBER if em else SL2) + t(200 + w + 12, y + 28, "{:,}".format(v), 18, AMBER if em else TEXT, "start", 700 if em else 400)
c += svg(s)
c += kpi(840, 152, 376, 240, "五家合计", "1.12 万亿", "美元。另有 Meta 7 月新签的约 680 亿", TEXT, None, False, 48)
c += kpi(840, 408, 376, 240, "甲骨文租约是年经营现金流的", "约 9 倍", "2,880 亿对 2026 财年的 320 亿", AMBER, None, True, 48)
c += source("来源：微软 10-K，Alphabet、亚马逊、Meta 10-Q（2026 年 7 月），甲骨文 10-Q（2026 年 9 月）。陆续起租，不是年度开支")
pages.append(("9 租约横条", c))

# 10 exposure ledger table
c = head("订单押在少数 AI 实验室身上，投资方和客户互为彼此")
c += panel(64, 152, 1152, 496, "谁押在 AI 实验室上", "亿美元")
ex = [("微软", "商业未确认收入，剔除 OpenAI 只增长 25%", "6,780", False), ("亚马逊", "投资 OpenAI，OpenAI 对 AWS 的采购承诺扩大 1,000 亿", "500", False),
      ("英伟达", "为租给 OpenAI 的园区提供担保，上限", "1,050", False), ("Anthropic", "未来算力和基础设施义务（路透报道的招股书）", "5,180", False),
      ("四家云积压订单", "可能对应同一批客户，不能简单相加", "23,520", True)]
c += box(88, 200, 220, 22, font(14, 22, MUTED), "谁") + box(330, 200, 600, 22, font(14, 22, MUTED), "押了什么") + box(960, 200, 230, 22, font(14, 22, MUTED, 400, "text-align: right"), "金额")
c += box(65, 230, 1150, 1, "background: " + BORDER)
y = 232
for a, b, v, em in ex:
    if em:
        c += box(65, y, 1150, 80, "background: " + TINT) + box(65, y, 3, 80, "background: " + AMBER)
    c += box(65, y + 80, 1150, 1, "background: " + BORDER)
    c += box(88, y + 26, 230, 28, font(20, 28, AMBER if em else TEXT, 700), a)
    c += box(330, y + 26, 600, 28, font(17, 28, "#D6D9DE"), b)
    c += box(960, y + 18, 230, 44, font(36, 44, AMBER if em else TEXT, 400, "text-align: right", SERIF), v)
    y += 81
c += source("来源：微软 10-K、亚马逊 10-Q、英伟达 CFO 评论（2026 年 4 至 8 月），路透（2026 年 9 月），研究团队计算")
pages.append(("10 实验室敞口", c))

# 11 upstream bars + kpis
c = head("钱先流到上游：英伟达数据中心单季收入一年翻了一倍多")
c += panel(64, 152, 760, 496, "英伟达数据中心收入", "亿美元 · 财季")
nv = [226, 263, 308, 356, 391, 411, 512, 623, 753, 890]; nq = ["FY25Q1", "Q2", "Q3", "Q4", "FY26Q1", "Q2", "Q3", "Q4", "FY27Q1", "Q2"]
base, H = 600, 330; s = '<line x1="88" y1="%d" x2="800" y2="%d" stroke="%s"/>' % (base, base, BORDER)
slot = 712 / 10; bw = 48; tops = []
for i, v in enumerate(nv):
    cx = 88 + slot * (i + 0.5); h = v / 960 * H; last = i == 9
    s += rect(cx - bw / 2, base - h, bw, h, AMBER if last else SL2) + t(cx, base - h - 8, str(v), 14, AMBER if last else MUTED, "middle", 700 if last else 400)
    s += t(cx, base + 22, nq[i], 12, MUTED, "middle"); tops.append((cx, base - h))
(x1, t1), (x2, t2) = tops[5], tops[9]; yb = min(t1, t2) - 36
s += '<path d="M%.1f %.1f V%.1f H%.1f V%.1f" fill="none" stroke="%s" stroke-width="1.5"/>' % (x1, t1 - 26, yb, x2, t2 - 26, GREEN) + t((x1 + x2) / 2, yb - 8, "▲ 117%", 16, GREEN, "middle", 700)
c += svg(s)
for i, (lab, val, sub) in enumerate([("博通 AI 半导体收入，单季", "167 亿美元", "同比 +221%"), ("美光单季收入", "542 亿美元", "同比 +379%，内存涨价"), ("台积电 2026 年资本预算", "600 至 640 亿", "美元，此前为 520 至 560 亿")]):
    c += kpi(840, 152 + i * 168, 376, 160, lab, val, sub, TEXT, "up", False, 34)
c += source("来源：英伟达（2026 年 8 月），博通、美光（2026 年 9 月），台积电（2026 年 7 月）。英伟达 FY27Q2 截至 2026 年 7 月")
pages.append(("11 上游", c))

# 12 power photo + figures
c = strip()
c += '<img src="' + PHOTO + '" alt="夜间数据中心园区和变电站（示意图）" style="position: absolute; left: 0; top: 32px; width: 600px; height: 688px; object-fit: cover">'
c += box(640, 52, 576, 84, "display: flex; flex-direction: column; justify-content: flex-end; " + font(30, 42, TEXT, 400, "", SERIF), "瓶颈从芯片转向电力：电网容量价格顶格，德州暂停并网")
pw = [("PJM 容量价格，每兆瓦每天", "325 美元", "2028/29 年拍卖，触及上限", True), ("比可靠性标准少", "6,831 MW", "连续两期全网不足", False),
      ("德州", "暂停并网", "8 月起暂停新数据中心接入，先做审计", False), ("2030 年数据中心占美国用电", "11.8%", "LBNL 基准情景预测", False)]
y = 156
for lab, val, sub, em in pw:
    c += box(640, y, 576, 1, "background: " + BORDER)
    c += box(640, y + 16, 260, 20, font(14, 20, MUTED), lab)
    c += box(640, y + 40, 300, 48, font(40, 48, AMBER if em else TEXT, 400, "white-space: nowrap", SERIF), val)
    c += box(940, y + 48, 276, 40, font(15, 20, MUTED), sub)
    y += 116
c += box(640, 664, 576, 36, font(13, 18, MUTED), "来源：PJM（2026 年 7 月），LBNL（2026 年 6 月），K&amp;L Gates、EIA（2026 年 8 月、9 月）。图为示意图")
pages.append(("12 电力照片页", c))

# 13 market: 4 kpis + oracle panel
c = head("市场开始挑：云收入加速的大涨，现金流变差的下跌")
mk = [("微软 · 财报日", "+15.5%", "Azure 增长 43%", "up"), ("亚马逊 · 财报日", "+15.3%", "AWS 增长 37%", "up"), ("Alphabet · 财报日", "−7.1%", "自由现金流转负", "down"), ("Meta · 财报日", "−8.0%", "自由现金流只剩 7.8 亿", "down")]
for i, (lab, val, sub, d) in enumerate(mk):
    c += kpi(64 + i * 292, 152, 276, 220, lab, val, sub, GREEN if d == "up" else RED, d, False, 48)
c += panel(64, 388, 1152, 260, "甲骨文：花钱最多、回款最慢", "")
c += box(88, 440, 400, 120, font(110, 120, RED, 400, "white-space: nowrap; letter-spacing: -2px", SERIF), "−56%")
c += box(88, 568, 400, 26, font(17, 26, MUTED), "股价距 2025 年 9 月高点")
c += box(560, 452, 630, 140, font(20, 32, TEXT), "6 月 1 日到 7 月 24 日就跌了 53.5%。2027 财年资本开支最高约 950 亿美元，计划外部融资约 400 亿，上一财年自由现金流 −237 亿。")
c += source("来源：Yahoo Finance 复权价，研究团队计算（截至 2026 年 10 月 2 日），各公司新闻稿（2026 年 6 月、7 月），路透（2026 年 6 月）")
pages.append(("13 市场", c))

# 14 decision table
c = head("建议：配置向上游和电力倾斜，云厂商只留回款快的")
c += panel(64, 152, 1152, 496, "三个方案", "研究判断，不是公司指引")
LX, CX = 88, [300, 600, 900]; CW = 280
hdr = ["维持现有配置", "向上游和电力倾斜", "整体减配 AI 链"]
c += box(CX[1] - 12, 188, CW + 12, 448, "background: " + TINT + "; border: 1px solid " + AMBER + "; box-sizing: border-box")
for i, h in enumerate(hdr):
    c += box(CX[i], 202, CW - 12, 26, font(19, 26, AMBER if i == 1 else MUTED, 700 if i == 1 else 400), h + ("（建议）" if i == 1 else ""))
cr = [("做法", ["三条线权重不动", "算力链保持，电力加配，云厂商只留回款快的", "三条线同步降权"]), ("依据", ["2027 年开支继续上升", "钱先流向上游，瓶颈转向电力", "自有现金见底，需求集中"]),
      ("主要风险", ["融资一紧，云厂商先跌", "电力受政策和电价牵制", "开支仍在上调，过早离场"]), ("改主意的信号", ["任何一家下调指引", "融资成本跳升，或实验室收入失速", "2027 年指引继续上调"])]
y = 244
for lab, cells in cr:
    c += box(65, y, 1150, 1, "background: " + BORDER)
    c += box(LX, y + 18, 200, 24, font(15, 24, MUTED), lab)
    for i, cell in enumerate(cells):
        c += box(CX[i], y + 16, CW - 16, 60, font(17, 26, TEXT if i == 1 else "#C4C9D0", 700 if i == 1 else 400), cell)
    y += 98
c += source("「回款快」指云收入在加速、自由现金流仍为正")
pages.append(("14 方案对比", c))

# 15 ending
c = strip()
c += box(64, 120, 600, 22, font(15, 22, AMBER, 400, "letter-spacing: 1px"), "请投委会定")
c += box(64, 152, 1152, 150, "display: flex; flex-direction: column; justify-content: flex-end; " + font(52, 70, TEXT, 400, "", SERIF),
         '<div>向<span style="color: ' + AMBER + '">上游和电力</span>倾斜，云厂商只留回款快的</div>')
c += box(64, 340, 1152, 1, "background: " + BORDER)
c += box(64, 362, 600, 20, font(14, 20, MUTED), "接下来盯三个信号")
sig = [("融资", "发债和增发的成本有没有跳升"), ("客户", "OpenAI、Anthropic 的收入能不能撑起采购承诺"), ("电力", "PJM 和德州的并网什么时候松动")]
for i, (a, b) in enumerate(sig):
    x = 64 + i * 384
    c += panel(x, 396, 368, 176)
    c += box(x + 22, 418, 60, 20, font(14, 20, AMBER), "0" + str(i + 1))
    c += box(x + 22, 446, 320, 40, font(30, 40, TEXT, 400, "", SERIF), a)
    c += box(x + 22, 496, 320, 60, font(17, 26, "#D6D9DE"), b)
c += box(64, 664, 1152, 20, font(13, 18, MUTED), "本材料不构成投资建议")
pages.append(("15 结尾", c))

boards = {}; order_ = []; cells = []
for i, (title, inner) in enumerate(pages):
    name = "Main.dc.html" if i == 0 else "d%02d.dc.html" % (i + 1)
    open(os.path.join(P, name), 'w').write(page(title, inner))
    boards[name] = {"x": 0, "y": i * 840, "w": 1280, "h": 720, "title": title + " · 设计稿"}; order_.append(name)
    cur = "c%02d.dc.html" % (i + 1)
    open(os.path.join(P, cur), 'w').write(page(title + " 当前", '<img src="' + CUR[i] + '" alt="引擎当前渲染" style="display: block; width: 1280px; height: 720px">'))
    boards[cur] = {"x": 1360, "y": i * 840, "w": 1280, "h": 720, "title": title + " · 引擎当前"}; order_.append(cur)
    cells.append('<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: %s; color: %s; font-family: %s">%s</div>' % (BG, TEXT, SANS, inner.replace(PHOTO, "../up/photo.jpg")))
canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}, "title": "ledger AI 资本开支样例设计稿",
          "launch": {"view": "canvas"}, "pages": [], "boards": boards, "order": order_, "notes": {}, "designSystems": []}
pc = os.path.join(P, 'canvas.json')
if os.path.exists(pc):
    canvas["createdOnFiles"] = json.load(open(pc))["createdOnFiles"]
json.dump(canvas, open(pc, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(L, 'sheet.html'), 'w').write('<!doctype html><meta charset="utf-8"><body style="margin:0;background:#444;display:grid;grid-template-columns:repeat(2,1280px);gap:16px;padding:16px;width:2592px">' + "".join(cells) + '</body>')
print(len(order_))
