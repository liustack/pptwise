import json, os, sys, datetime
ROOT = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(ROOT, 'project'); L = os.path.join(ROOT, 'local')
os.makedirs(P, exist_ok=True); os.makedirs(L, exist_ok=True)

IKB = "#0032A0"; SKY = "#2F6FBF"; WALL = "#F7F7F4"; SURF = "#FFFFFF"; PANEL = "#EEEEE9"; INK = "#17181A"; MUTED = "#5C6066"
LINE = "#DEE0DB"; GREY = "#C2C6CC"; GREY2 = "#8E939A"; TINT = "#E6ECF7"; TINT2 = "#D3DDF0"
FONT = "'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', 'Helvetica Neue', sans-serif"
PORT = "/_blob/29453a18eaa5ca01f13599fc318480ed"
CUR = ["51b88c0f13b69d9f13e7a4ff690a9221", "ca00496d1f24bd34fca438a6c52a984b", "d1cc5394e45bb2ec8b047734a89764b0", "96b7571881b4a08b96a21788a7d76b33",
       "b256f4aad07df84882c1db81574b0b19", "4bd04790d387acef9ec47a4f2177ca39", "810b015d0d5da956f04d8a4911643e77", "f335a55572bd1893e5212e4e4d9f1f45",
       "287e0082a10b1a2672b14d0566f5be7b", "f4a25c1368ab2c04ea9c0e210d56006d", "572191a98360795c38aea9e838f791b2", "12109b9b30fc3e25449d8c85f3a89ceb",
       "590a057b1097f8373668bc4ce3575e89"]


def page(title, inner, bg=WALL, color=INK, w=1280, h=720):
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
<div style="position: relative; width: """ + str(w) + "px; height: " + str(h) + "px; overflow: hidden; background: " + bg + "; color: " + color + "; font-family: " + FONT + """">
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


def font(size, lh, color=INK, weight=400, extra=""):
    return "font-size: %dpx; line-height: %dpx; color: %s; font-weight: %d; %s" % (size, lh, color, weight, extra)


def motif(x=1158, y=58, c=IKB, s=(14, 10, 7), gap=5):
    out = ""; cx = x
    for v in s:
        out += box(cx, y + s[0] - v, v, v, "background: " + c)
        cx += v + gap
    return out


def head(title, x=80, w=1040, rule_w=1120):
    out = box(x, 44, w, 100, "display: flex; flex-direction: column; justify-content: flex-end; " + font(34, 46, INK, 700), title)
    out += box(x, 163, rule_w, 1, "background: " + LINE) + box(x, 162, 96, 3, "background: " + IKB)
    return out + motif()


def source(t, x=80, y=650, w=1120):
    return box(x, y, w, 40, font(14, 20, MUTED), t)


def svg(body, defs=""):
    return '<svg width="1280" height="720" viewBox="0 0 1280 720" style="position: absolute; left: 0; top: 0" font-family="' + FONT.replace("'", "") + '"><defs>' + defs + '</defs>' + body + '</svg>\n'


def t(x, y, s, size=16, fill=MUTED, anchor="start", weight=400):
    return '<text x="%s" y="%s" font-size="%d" fill="%s" text-anchor="%s" font-weight="%d">%s</text>' % (x, y, size, fill, anchor, weight, s)


def rect(x, y, w, h, fill, extra=""):
    return '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s" %s/>' % (x, y, w, h, fill, extra)


HATCH = '<pattern id="hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)"><rect width="8" height="8" fill="' + TINT2 + '"/><rect width="3" height="8" fill="' + IKB + '"/></pattern>'
HATCH_G = '<pattern id="hatchg" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)"><rect width="8" height="8" fill="#E3E5E8"/><rect width="3" height="8" fill="' + GREY + '"/></pattern>'


def rail(x, y0, items, w=380, step=136):
    """items: (label, value, sub, emphasized)"""
    out = box(x - 40, y0, 1, step * len(items) - 24, "background: " + LINE)
    for i, (lab, val, sub, em) in enumerate(items):
        y = y0 + i * step
        if i:
            out += box(x, y - 16, w, 1, "background: " + LINE)
        out += box(x, y, w, 22, font(16, 22, MUTED), lab)
        out += box(x, y + 28, w, 60, font(50, 60, IKB if em else INK, 700, "white-space: nowrap; letter-spacing: -0.5px"), val)
        if sub:
            out += box(x, y + 92, w, 22, font(16, 22, INK), sub)
    return out


def legend(x, y, items):
    s = ""
    for name, fill in items:
        s += rect(x, y - 12, 14, 14, fill) + t(x + 22, y, name, 15, MUTED)
        x += 22 + len(name) * 15 + 30
    return s


pages = []

# 1 cover
c = motif(1080, 96, "#FFFFFF", (44, 30, 20), 10)
c += box(80, 96, 900, 26, font(18, 26, "rgba(255,255,255,0.78)", 400, "letter-spacing: 1px"), "2026 年三季度经营复盘")
c += box(80, 232, 1040, 196, font(80, 98, "#FFFFFF", 700, "letter-spacing: -1px"), "内需缩了两成，<br>四季度怎么打")
c += box(80, 470, 64, 6, "background: #FFFFFF")
c += box(80, 506, 900, 32, font(22, 32, "rgba(255,255,255,0.86)"), "2026 年三季度新能源乘用车市场复盘与四季度动作")
c += box(80, 616, 600, 24, font(16, 24, "rgba(255,255,255,0.7)"), "2026 年 10 月")
pages.append(("1 封面", c, IKB))

# 2 summary rows
c = head("内需缩了两成，增量来自海外，四季度目标按实际走势重定")
rows = [("国内在缩", "三季度国内零售同比约降两成，9 月没有旺季。渗透率创新高，但新能源零售本身也在降。"),
        ("增量在海外", "7–8 月新能源乘用车出口 105.8 万辆，是去年同期的 2.5 倍，厂家批发靠出口稳住。"),
        ("份额在挪，价格转暗", "比亚迪国内份额约少 4.5 个点，新势力多了 5.5 个点。降价车型变少，单车降得更深。"),
        ("四季度怎么打", "目标按实际走势重定，预算押在补贴窗口，促销和出口定价先过合规。")]
y = 196
for i, (lab, txt) in enumerate(rows):
    em = i == 3
    h = 104
    if em:
        c += box(80, y + 8, 1120, h - 8, "background: " + IKB)
    elif i:
        c += box(80, y, 1120, 1, "background: " + LINE)
    col = "#FFFFFF" if em else INK
    c += box(108 if em else 80, y + 34, 60, 36, font(26, 36, "#FFFFFF" if em else IKB, 700), "0" + str(i + 1))
    c += box(184, y + 34, 280, 36, font(22, 36, col, 700), lab)
    c += box(480, y + 26 if not em else y + 38, 690, 60, font(19, 30, col), txt)
    y += h + (8 if i == 2 else 0)
pages.append(("2 总览", c, WALL))

# 3 retail bars + rail
c = head("国内零售连续三个月同比降两成以上，9 月也没有旺季")
base, H, vmax = 586, 300, 250
s = legend(80, 214, [("2025 年", GREY), ("2026 年", IKB), ("预测", "url(#hatch)")])
s += t(80, 246, "万辆", 15, MUTED)
s += '<line x1="80" y1="%d" x2="760" y2="%d" stroke="%s" stroke-width="1"/>' % (base, base, GREY2)
groups = [("7 月", 182.6, 146.1, False), ("8 月", 199.5, 154.1, False), ("9 月", 224.1, 169, True)]
slot = 680 / 3
for i, (lab, a, b, fc) in enumerate(groups):
    cx = 80 + slot * (i + 0.5); bw = 76
    ha = a / vmax * H; hb = b / vmax * H
    s += rect(cx - bw - 4, base - ha, bw, ha, GREY) + t(cx - bw / 2 - 4, base - ha - 12, "%g" % a, 18, MUTED, "middle")
    s += rect(cx + 4, base - hb, bw, hb, "url(#hatch)" if fc else IKB) + t(cx + bw / 2 + 4, base - hb - 12, ("%g" % b) + ("（预测）" if fc else ""), 18, IKB, "middle", 700)
    s += t(cx, base + 30, lab, 17, INK, "middle")
c += svg(s, HATCH)
c += rail(820, 214, [("7 月零售同比", "−20.9%", "", False), ("8 月零售同比", "−23.6%", "", False), ("9 月 1–27 日零售同比", "−29%", "全月预测约 169 万辆，同比 −24.6%", False)])
c += source("来源：乘联会月报（2025 年 7–9 月，2026 年 7、8 月）、周度数据（2026 年 9 月 30 日）和 9 月预测（2026 年 9 月 17 日）")
pages.append(("3 零售走势", c, WALL))

# 4 waterfall (truncated axis) + rail
c = head("渗透率升到 65%，主要是燃油车掉得更快")
base, lo, k = 590, 250, 2.2
def yv(v): return base - (v - lo) * k
s = t(80, 220, "万辆，纵轴从 250 起", 15, MUTED)
s += '<line x1="80" y1="%d" x2="760" y2="%d" stroke="%s" stroke-width="1"/>' % (base, base, GREY2)
bars = [("2025 年 7–8 月", 382.1, None, GREY2), ("新能源", 382.1, 368.9, GREY), ("常规燃油车", 368.9, 300.2, IKB), ("2026 年 7–8 月", 300.2, None, GREY2)]
slot = 680 / 4; bw = 108
prev = None
for i, (lab, a, b, col) in enumerate(bars):
    cx = 80 + slot * (i + 0.5); x = cx - bw / 2
    if b is None:
        top = yv(a); s += rect(x, top, bw, base - top, col)
        s += '<path d="M%.1f %d l%d -10 M%.1f %d l%d -10" stroke="%s" stroke-width="3"/>' % (x - 2, base - 22, bw + 4, x - 2, base - 12, bw + 4, WALL)
        s += t(cx, top - 12, "%g" % a, 20, INK, "middle", 700)
    else:
        top, bot = yv(a), yv(b); s += rect(x, top, bw, bot - top, col)
        if col == IKB:
            s += t(cx, (top + bot) / 2 + 9, "−%g" % round(a - b, 1), 24, "#FFFFFF", "middle", 700)
        else:
            s += t(cx, bot + 26, "−%g" % round(a - b, 1), 18, MUTED, "middle")
    if prev is not None:
        s += '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-dasharray="3 3"/>' % (prev, yv(a) if b is not None else yv(a), x, yv(a), GREY2)
    prev = x + bw
    s += t(cx, base + 30, lab, 17, INK, "middle")
c += svg(s)
c += rail(820, 214, [("7–8 月新能源零售渗透率", "65.2%", "去年同期 54.6%", False), ("减量里燃油车的占比", "84%", "常规燃油车少了 68.7 万辆，新能源少了 13.2 万辆", False)], step=170)
c += source("来源：乘联会 2025 年及 2026 年 7、8 月月报。乘用车国内零售，增减为两年公布值相减")
pages.append(("4 燃油车塌方", c, WALL))

# 5 photo + pairs
c = '<img src="' + PORT + '" alt="港口滚装码头，待装船的新车（示意图）" style="position: absolute; left: 0; top: 0; width: 560px; height: 720px; object-fit: cover">'
c += box(624, 44, 520, 100, "display: flex; flex-direction: column; justify-content: flex-end; " + font(34, 46, INK, 700), "增量在海外：新能源出口<br>7–8 月是去年同期的 2.5 倍")
c += box(624, 163, 576, 1, "background: " + LINE) + box(624, 162, 96, 3, "background: " + IKB) + motif()
prs = [("7–8 月新能源出口", "105.8 万辆", "去年同期 41.7 万辆", True), ("厂家批发（含出口）", "−1.6%", "", False), ("国内零售", "−21.4%", "", False),
       ("8 月新能源占出口", "58.4%", "", False), ("1–8 月第一大目的国", "巴西，33.7 万辆", "", False)]
y = 196
for i, (a, b, sub, em) in enumerate(prs):
    hh = 104 if em else 72
    if i:
        c += box(624, y, 576, 1, "background: " + LINE)
    c += box(624, y + 24, 210, 26, font(17, 26, MUTED), a)
    c += box(850, y + (16 if em else 20), 350, 44, font(40 if em else 26, 44 if em else 32, IKB if em else INK, 700, "white-space: nowrap"), b)
    if sub:
        c += box(850, y + 64, 350, 24, font(16, 24, MUTED), sub)
    y += hh
c += source("来源：乘联会 7、8 月月报（2025、2026 年），崔东树出口分析（2026 年 9 月 24 日）。图为示意图", 624, 640, 576)
pages.append(("5 出口照片页", c, WALL))

# 6 horizontal share bars + rail
c = head("份额在挪：比亚迪约少 4.5 个点，新势力多 5.5 个点")
s = legend(80, 214, [("2025 年 8 月", GREY), ("2026 年 8 月", IKB)])
s += t(760, 214, "国内新能源零售份额，%", 15, MUTED, "end")
x0, px = 210, 17.0
rowsb = [("比亚迪", 27.8, 23.3), ("吉利", 12.1, 11.0), ("长安", 6.5, 5.8), ("特斯拉中国", 5.1, 5.0)]
y = 246
for i, (lab, a, b) in enumerate(rowsb):
    if i:
        s += '<line x1="80" y1="%d" x2="760" y2="%d" stroke="%s"/>' % (y - 12, y - 12, LINE)
    s += t(80, y + 34, lab, 18, INK, "start", 700 if i == 0 else 400)
    s += rect(x0, y + 6, a * px, 26, GREY) + t(x0 + a * px + 10, y + 26, "%g" % a, 17, MUTED)
    s += rect(x0, y + 38, b * px, 26, IKB) + t(x0 + b * px + 10, y + 58, "%g" % b, 17, IKB, "start", 700)
    if i == 0:
        s += t(x0 + b * px + 62, y + 58, "−4.5 个点", 17, IKB, "start", 700)
    y += 90
s += '<line x1="%d" y1="232" x2="%d" y2="%d" stroke="%s"/>' % (x0, x0, y - 12, GREY2)
c += svg(s)
c += rail(820, 214, [("8 月新势力份额", "26.0%", "同比 +5.5 个百分点", False), ("零跑 8 月国内新能源零售排名", "第 3", "", False)], step=170)
c += source("来源：乘联会 2026 年 8 月月报，CnEVPost 转引乘联会 2025 年 8 月厂商数据（2025 年 9 月 10 日）。国内新能源零售份额，近似值")
pages.append(("6 份额", c, WALL))

# 7 table + closing panel
c = head("三季度成绩分化：零跑涨 78%，鸿蒙智行 9 月降 29%")
cols = [("企业", 80, 180, "left"), ("三季度销量", 280, 200, "right"), ("同比", 500, 140, "right"), ("看点", 700, 500, "left")]
for lab, x, w, al in cols:
    c += box(x, 194, w, 30, font(16, 30, MUTED, 400, "text-align: " + al), lab)
c += box(80, 228, 1120, 1, "background: " + INK)
trs = [("极氪", "110,034 辆", "约 +108%", "9X 9 月交付 7,225 辆", False), ("零跑", "310,052 辆", "+78.3%", "连续三个月超 10 万辆", True),
       ("蔚来公司", "109,178 辆", "+25.4%", "ES8 9 月交付 10,542 辆", False), ("比亚迪", "1,323,065 辆", "+18.8%", "出口占 41.6%", False),
       ("理想", "99,964 辆", "+7.2%", "9 月环比降 15.6%", False), ("小鹏", "118,390 辆", "+2.1%", "MONA L03 9 月交付超 1 万辆", False)]
y = 229
for i, (a, b, d, e, em) in enumerate(trs):
    if em:
        c += box(80, y, 1120, 50, "background: " + TINT)
    elif i:
        c += box(80, y, 1120, 1, "background: " + LINE)
    for (lab, x, w, al), v in zip(cols, (a, b, d, e)):
        bold = em and lab in ("企业", "同比")
        c += box(x + (16 if lab == "企业" else 0), y + 11, w - (16 if lab == "企业" else 0), 28, font(19, 28, IKB if (em and lab != "看点" and lab != "三季度销量") else INK, 700 if bold else 400, "text-align: " + al + "; white-space: nowrap"), v)
    y += 50
c += box(80, y, 1120, 1, "background: " + LINE)
c += box(80, 548, 1120, 64, "background: " + PANEL)
c += svg('<circle cx="113" cy="580" r="11" fill="none" stroke="' + INK + '" stroke-width="2"/><rect x="112" y="573" width="2.4" height="9" fill="' + INK + '"/><rect x="112" y="585" width="2.4" height="2.6" fill="' + INK + '"/>')
c += box(140, 566, 1040, 28, font(20, 28, INK), "鸿蒙智行 9 月交付 37,490 辆，同比 −29.2%，已连续四个月同比下降")
c += source("来源：各公司 2026 年 7–9 月交付公告（港交所、SEC 6-K、CnEVPost 汇总，2026 年 8 月 1 日至 10 月 1 日）。公司口径，含出口，不能横向比份额")
pages.append(("7 企业成绩表", c, WALL))

# 8 figures + pairs
c = head("降价车型少了，单车降得更深，9 月改打金融和保险权益")
figs = [("8 月降价车型", "10 款", "去年同期 23 款", False), ("新能源降价车型平均每辆降幅", "4.5 万元", "降幅 17.8%，1–6 月为 3 万元", True)]
for i, (lab, val, sub, em) in enumerate(figs):
    y = 204 + i * 214
    if i:
        c += box(80, y - 22, 460, 1, "background: " + LINE)
    c += box(80, y, 460, 24, font(17, 24, MUTED), lab)
    c += box(80, y + 30, 460, 86, font(76, 86, IKB if em else INK, 700, "white-space: nowrap; letter-spacing: -1px"), val)
    c += box(80, y + 124, 460, 26, font(18, 26, INK), sub)
c += box(600, 204, 1, 416, "background: " + LINE)
c += box(640, 204, 560, 24, font(17, 24, MUTED), "9 月的打法：金融和保险权益")
perks = [("特斯拉：限时现金", "现车最高减 1 万元，9 月 25 日起改为尾款最高减 7,000 元"), ("小米：零息或保险", "SU7、YU7 3 年零息，或 6,000 元保险补贴"),
         ("极氪 8X：保险加零息", "1 万元保险补贴，加 5 年零息"), ("零跑：购车权益", "购车权益最高 19,680 元")]
y = 244
for i, (a, b) in enumerate(perks):
    c += box(640, y, 560, 1, "background: " + LINE)
    c += box(640, y + 16, 560, 30, font(20, 30, INK, 700), a)
    c += box(640, y + 50, 560, 26, font(17, 26, MUTED), b)
    y += 94
c += source("来源：乘联会降价统计（2026 年 7 月、9 月），特斯拉中国官网，China Daily、第一财经报道（2026 年 9 月）")
pages.append(("8 价格战换打法", c, WALL))

# 9 target bars with brackets + rail
c = head("按 6 月的全年判断，四季度要比三季度多卖六成多")
base, H, vmax = 590, 290, 800
s = legend(80, 214, [("实际", GREY), ("9 月为预测", "url(#hatchg)"), ("倒推所需", TINT2)])
s += t(80, 246, "万辆", 15, MUTED)
s += '<line x1="80" y1="%d" x2="760" y2="%d" stroke="%s"/>' % (base, base, GREY2)
qb = [("2025 年三季度", 606.2, "a"), ("2025 年四季度", 672.8, "a"), ("2026 年三季度", 469.2, "f"), ("2026 年四季度", 772, "r")]
slot = 680 / 4; bw = 104; tops = []
for i, (lab, v, kind) in enumerate(qb):
    cx = 80 + slot * (i + 0.5); x = cx - bw / 2; h = v / vmax * H; top = base - h; tops.append((cx, top))
    if kind == "a":
        s += rect(x, top, bw, h, GREY)
    elif kind == "f":
        hs = 169 / vmax * H
        s += rect(x, top + hs, bw, h - hs, GREY) + rect(x, top, bw, hs, "url(#hatchg)")
    else:
        s += rect(x + 1, top + 1, bw - 2, h - 2, TINT2, 'stroke="%s" stroke-width="2" stroke-dasharray="6 4"' % IKB)
    s += t(cx, top - 12, "%g" % v, 20, IKB if kind == "r" else INK, "middle", 700)
    s += t(cx, base + 30, lab, 17, INK, "middle")
def bracket(a, b, label, col, wt, lift):
    (x1, t1), (x2, t2) = a, b; yb = min(t1, t2) - lift
    return '<path d="M%.1f %.1f V%.1f H%.1f V%.1f" fill="none" stroke="%s" stroke-width="%d"/>' % (x1, t1 - 36, yb, x2, t2 - 36, col, 2 if col == IKB else 1) + t((x1 + x2) / 2, yb - 10, label, 20, col, "middle", wt)
s += bracket(tops[0], tops[1], "+11%", MUTED, 400, 56)
s += bracket(tops[2], tops[3], "+65%", IKB, 700, 56)
c += svg(s, HATCH_G)
c += rail(820, 214, [("四季度比三季度要多卖", "约 +65%", "去年同期只多 11%", False), ("四季度比去年同期要多卖", "约 +15%", "三季度同比约 −22.6%", False)], step=170)
c += source("来源：乘联会月报及 9 月预测，崔东树全年判断（2026 年 6 月 9 日）。四季度为按全年零售降 11% 倒推（计算）")
pages.append(("9 四季度缺口", c, WALL))

# 10 window band + three facts
c = head("补贴额度年底清账，10–11 月是窗口期")
for i, m in enumerate(["10 月", "11 月", "12 月"]):
    c += box(80 + i * 376, 196, 360, 24, font(17, 24, MUTED), m)
c += box(80, 228, 744, 112, "background: " + IKB + "; box-sizing: border-box; padding: 0 32px; display: flex; flex-direction: column; justify-content: center")
c += box(112, 252, 690, 34, font(24, 34, "#FFFFFF", 700), "窗口期：补贴额度还在")
c += box(112, 290, 690, 26, font(17, 26, "rgba(255,255,255,0.86)"), "地方补贴先到先得，门店帮客户把补贴用足")
c += box(832, 228, 368, 112, "background: " + PANEL)
c += box(856, 252, 320, 34, font(24, 34, INK, 700), "12 月 31 日")
c += box(856, 290, 320, 26, font(17, 26, INK), "中央资金到期，没用完的额度收回")
facts = [("购置税", "减半，每辆最多 1.5 万元", "2026、2027 年都减半，年底不退坡"), ("以旧换新", "报废更新补 12%，最高 2 万元", "车价约 16.7 万元以上才拿满"),
         ("地方补贴", "先到先得，用完即止", "如上海浦东 1.4 万个名额")]
for i, (a, b, d) in enumerate(facts):
    x = 80 + i * 376
    c += box(x, 392, 352, 1, "background: " + LINE)
    c += box(x, 414, 352, 24, font(17, 24, IKB, 700), a)
    c += box(x, 446, 352, 34, font(24, 34, INK, 700), b)
    c += box(x, 488, 352, 52, font(17, 26, MUTED), d)
c += source("来源：财政部等公告 2023 年第 10 号，发改环资〔2025〕1745 号，上海市政府、商务部平台（2026 年 9 月）")
pages.append(("10 补贴窗口", c, WALL))

# 11 two-lane timeline + closing panel
c = head("四季度的促销和出口定价，都要先过新规这一关")
axis = 392; x0, cw = 180, 170
ev = [("7 月", "巴西关税 35%", "纯电整车进口", "out", False), ("7 月 7 日", "推进《价格法》修改", "完善低价倾销的认定规则", "in", True),
      ("7 月 28 日", "土耳其关税被判违规", "世贸组织专家组裁定，关税不会自动取消", "out", False), ("8 月 27 日", "生产一致性专项行动", "为期一年，12 月底前报送自查", "in", False),
      ("9 月 1 日", "境外竞争合规指引", "以成本定价，避免频繁大幅调价", "in", False), ("9 月 17 日", "欧盟盯上插混", "报道称要中国限制混动销量", "out", False)]
s = '<line x1="%d" y1="%d" x2="1200" y2="%d" stroke="%s" stroke-width="1.5"/>' % (x0 - 8, axis, axis, INK)
c += box(80, 214, 90, 24, font(17, 24, IKB, 700), "国内")
c += box(80, 420, 90, 24, font(17, 24, IKB, 700), "海外")
for i, (d, ti, de, lane, em) in enumerate(ev):
    x = x0 + i * cw; cx = x + 8
    if lane == "in":
        s += '<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s"/>' % (cx, 218, cx, axis, IKB if em else GREY2)
        ty = 214
    else:
        s += '<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s"/>' % (cx, axis, cx, 560, GREY2)
        ty = 420
    s += '<circle cx="%d" cy="%d" r="7" fill="%s" stroke="%s" stroke-width="2"/>' % (cx, axis, IKB if em else WALL, IKB if em else INK)
    c += box(x + 22, ty, cw - 16, 22, font(15, 22, IKB if em else MUTED, 700 if em else 400), d)
    c += box(x + 22, ty + 26, cw - 16, 24, font(16, 24, IKB if em else INK, 700, "white-space: nowrap"), ti)
    c += box(x + 22, ty + 56, cw - 16, 66, font(15, 22, MUTED), de)
c += svg(s)
c += box(80, 592, 1120, 48, "background: " + PANEL)
c += box(104, 602, 1080, 28, font(18, 28, INK), "对我们的意思：国内每档促销要算清成本、留好依据，出口价格不能靠频繁大幅调价冲量")
c += source("来源：市场监管总局、工信部等四部门、商务部等三部门、世贸组织公告，Vrum、金融时报报道（2026 年 3–9 月）", y=656)
pages.append(("11 新规时间线", c, WALL))

# 12 comparison
c = head("目标按实际走势定，预算押在补贴窗口")
LX, AX, AW, BX, BW = 80, 260, 440, 728, 472
c += box(BX, 196, BW, 410, "background: " + SURF)
c += box(AX, 196, AW, 60, "display: flex; align-items: center; " + font(20, 28, MUTED), "按年中判断冲量")
c += box(BX, 196, BW, 60, "background: " + IKB + "; box-sizing: border-box; padding: 0 28px; display: flex; align-items: center; " + font(20, 28, "#FFFFFF", 700), "按实际走势调整")
cmp = [("国内目标", "四季度比三季度多卖 65%", "按三季度同比约降两成重定"), ("促销方式", "跟进直降", "限时金融和保险权益，逐档过合规"),
       ("补贴窗口", "客户自己申请", "10–11 月门店帮客户用足补贴"), ("出口", "按原计划铺量", "巴西、墨西哥按新税率重算价格"),
       ("代价", "欠目标，库存和降价压力压到年底", "全年目标要下调")]
y = 256
for i, (l, a, b) in enumerate(cmp):
    c += box(LX, y, 1120, 1, "background: " + (INK if i == 0 else LINE))
    c += box(LX, y + 22, 170, 26, font(17, 26, MUTED), l)
    c += box(AX, y + 20, AW - 24, 30, font(20, 30, MUTED), a)
    c += box(BX + 28, y + 20, BW - 56, 30, font(20, 30, INK, 700), b)
    y += 70
c += box(LX, y, 1120, 1, "background: " + LINE)
pages.append(("12 两种定法", c, WALL))

# 13 ending
c = motif(1080, 96, "#FFFFFF", (44, 30, 20), 10)
c += box(80, 96, 900, 26, font(18, 26, "rgba(255,255,255,0.78)", 400, "letter-spacing: 1px"), "需要管理层拍板")
c += box(80, 196, 1000, 148, font(56, 74, "#FFFFFF", 700), "四季度国内目标，<br>按三季度实际走势重定")
c += box(80, 404, 1120, 1, "background: rgba(255,255,255,0.4)")
for i, s_ in enumerate(["促销预算前移到 10–11 月补贴窗口", "促销改为限时金融和保险权益，逐档过合规", "巴西、墨西哥出口按新税率重算价格"]):
    x = 80 + i * 376
    c += box(x, 432, 340, 30, font(20, 30, "rgba(255,255,255,0.7)", 700), "0" + str(i + 1))
    c += box(x, 470, 330, 96, font(24, 34, "#FFFFFF"), s_)
pages.append(("13 结尾", c, IKB))

boards = {}; order = []
local_cells = []
for i, (title, inner, bg) in enumerate(pages):
    name = "Main.dc.html" if i == 0 else "d%02d.dc.html" % (i + 1)
    open(os.path.join(P, name), 'w').write(page(title, inner, bg))
    boards[name] = {"x": 0, "y": i * 840, "w": 1280, "h": 720, "title": title + " · 设计稿"}; order.append(name)
    cur = "c%02d.dc.html" % (i + 1)
    open(os.path.join(P, cur), 'w').write(page(title + " 当前", '<img src="/_blob/' + CUR[i] + '" alt="引擎当前渲染" style="display: block; width: 1280px; height: 720px">'))
    boards[cur] = {"x": 1360, "y": i * 840, "w": 1280, "h": 720, "title": title + " · 引擎当前"}; order.append(cur)
    local_cells.append('<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: %s; color: %s; font-family: %s">%s</div>' % (bg, INK, FONT, inner.replace(PORT, "../up/port.jpg")))
canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}, "title": "bulletin 新能源样例设计稿",
          "launch": {"view": "canvas"}, "pages": [], "boards": boards, "order": order, "notes": {}, "designSystems": []}
pc = os.path.join(P, 'canvas.json')
if os.path.exists(pc):
    canvas["createdOnFiles"] = json.load(open(pc))["createdOnFiles"]
json.dump(canvas, open(pc, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(L, 'sheet.html'), 'w').write('<!doctype html><meta charset="utf-8"><body style="margin:0;background:#888;display:grid;grid-template-columns:repeat(2,1280px);gap:16px;padding:16px;width:2592px">' + "".join(local_cells) + '</body>')
print(len(order))
