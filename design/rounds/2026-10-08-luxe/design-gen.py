import json, os, re, datetime, math
ROOT = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(ROOT, 'project'); L = os.path.join(ROOT, 'local')
os.makedirs(P, exist_ok=True); os.makedirs(L, exist_ok=True)

# luxe: a gilt invitation. Warm true black, champagne gold for lines and letters only, ivory words.
BG = "#0B0908"; SURF = "#14110E"; VEIL = "#1B1713"; GOLD = "#C6A15B"; GOLDL = "#E2C891"; BRONZE = "#8A6B3F"
IVORY = "#F5EFE3"; MUTED = "#A89A82"; LINE = "#2E2822"; DIM = "#6F6555"
SERIF = "'Songti SC', 'STSong', 'Noto Serif SC', Georgia, serif"
SANS = "'PingFang SC', 'Microsoft YaHei', sans-serif"
IMG = {k: "__%s__" % k for k in ["bangle", "charms", "counter", "filigree", "hands", "street", "tray"]}
CUR = ["__CUR%02d__" % (i + 1) for i in range(18)]
TOTAL = 18
EVENT = "年度经销商大会"
DATE = "二〇二六年十月"

_cat = open(os.path.join(ROOT, '..', '..', '..', 'src', 'icons', 'catalog.ts')).read()


def _icon_svg(name):
    m = re.search(r'^  "%s": (\[.*\]),$' % re.escape(name), _cat, re.M)
    prims = json.loads(m.group(1))
    return ''.join('<%s %s/>' % (tag, ' '.join('%s="%s"' % (k, v) for k, v in attrs.items())) for tag, attrs in prims)


def icon(name, x, y, size=20, color=GOLD, sw=1.4):
    s = size / 24
    return '<g transform="translate(%.1f %.1f) scale(%.3f)" fill="none" stroke="%s" stroke-width="%.2f" stroke-linecap="round" stroke-linejoin="round">%s</g>' % (x, y, s, color, sw, _icon_svg(name))


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
<div style="position: relative; width: """ + str(w) + "px; height: " + str(h) + "px; overflow: hidden; background: " + BG + "; color: " + IVORY + "; font-family: " + SANS + """">
""" + inner.replace("<!--BG-->", "") + """
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


def font(size, lh, color=IVORY, weight=400, extra="", family=SANS):
    return "font-family: %s; font-size: %dpx; line-height: %dpx; color: %s; font-weight: %d; %s" % (family, size, lh, color, weight, extra)


def serif(size, lh, color=IVORY, weight=400, extra=""):
    return font(size, lh, color, weight, extra, SERIF)


def svg(body):
    return '<svg width="1280" height="720" viewBox="0 0 1280 720" style="position: absolute; left: 0; top: 0">' + body + '</svg>\n'


def text(x, y, s, size=12, fill=MUTED, anchor="start", weight=400, fam="PingFang SC, sans-serif"):
    return '<text x="%.1f" y="%.1f" font-size="%d" fill="%s" text-anchor="%s" font-weight="%d" font-family="%s">%s</text>' % (x, y, size, fill, anchor, weight, fam, s)


def stext(x, y, s, size=14, fill=IVORY, anchor="start", weight=400):
    return text(x, y, s, size, fill, anchor, weight, "Songti SC, STSong, serif")


def line(x1, y1, x2, y2, c=LINE, w=1, dash=None):
    d = ' stroke-dasharray="%s"' % dash if dash else ''
    return '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%.2f"%s/>' % (x1, y1, x2, y2, c, w, d)


def diamond(cx, cy, r=4, c=GOLD):
    return '<polygon points="%.1f,%.1f %.1f,%.1f %.1f,%.1f %.1f,%.1f" fill="%s"/>' % (cx, cy - r, cx + r, cy, cx, cy + r, cx - r, cy, c)


def hallmark(pg):
    """The page number struck like a hallmark: a small lozenge outlined in gold."""
    s = '<rect x="1168" y="664" width="48" height="22" rx="11" fill="none" stroke="%s" stroke-width="1"/>' % GOLD
    s += '<rect x="1171" y="667" width="42" height="16" rx="8" fill="none" stroke="%s" stroke-width="0.6" opacity="0.6"/>' % GOLD
    return svg(s) + box(1168, 664, 48, 22, serif(12, 22, GOLD, 400, "text-align: center; letter-spacing: 1px"), "%02d" % pg)


CH = {1: ("第一章", "顾客变了"), 2: ("第二章", "行业变了"), 3: ("第三章", "我们一起做什么")}


def head(pg, ch, title, lines=1):
    """The card stock: a hairline frame inset on every page, the chapter in small tracking at the top, the title centred in serif gold, a diamond under its last line."""
    s = '<rect x="24.5" y="24.5" width="1231" height="671" fill="none" stroke="%s" stroke-width="1"/>' % LINE
    out = svg(s)
    if ch:
        a, b = CH[ch]
        lab = a + "　" + b
        w_ = len(lab) * 15 + 40
        out += box(640 - w_ // 2, 40, w_, 18, font(12, 18, MUTED, 400, "text-align: center; letter-spacing: 3px"), lab)
        out += svg(line(640 - w_ // 2 - 36, 49, 640 - w_ // 2 - 8, 49, GOLD, 0.8) + line(640 + w_ // 2 + 8, 49, 640 + w_ // 2 + 36, 49, GOLD, 0.8))
    out += box(120, 66, 1040, 76, "display: flex; flex-direction: column; justify-content: flex-end; text-align: center; " + serif(30, 38, GOLD, 600, "letter-spacing: 1px"), "<div>" + title + "</div>")
    out += svg(diamond(640, 156, 4) + line(604, 156, 628, 156, GOLD, 0.6) + line(652, 156, 676, 156, GOLD, 0.6))
    out += box(64, 666, 600, 18, font(11, 18, DIM, 400, "letter-spacing: 2px"), EVENT + " · " + DATE)
    out += hallmark(pg)
    return out + "<!--BG-->"


def under(c, s):
    return c.replace("<!--BG-->", svg(s) + "<!--BG-->", 1)


def source(t_, y=628, x=64, w=1100):
    return box(x, y, w, 30, font(11, 15, DIM, 400), t_)


def photo(key, x, y, w, h, extra=""):
    return box(x, y, w, h, "overflow: hidden; " + extra, '<img src="' + IMG[key] + '" alt="" style="display: block; width: %dpx; height: %dpx; object-fit: cover">' % (w, h))


def cap(x, y, w, t_, align="left"):
    return box(x, y, w, 16, font(10, 16, DIM, 400, "text-align: %s" % align), t_)


def gilt_frame(x, y, w, h):
    return ('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="none" stroke="%s" stroke-width="1.4"/>' % (x, y, w, h, GOLD)
            + '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="none" stroke="%s" stroke-width="0.7" opacity="0.7"/>' % (x + 8, y + 8, w - 16, h - 16, GOLD))


pages = []

# 1 cover: an invitation card on the left, the bangle on velvet on the right
c = photo("bangle", 640, 0, 640, 720)
c += box(640, 0, 260, 720, "background: linear-gradient(90deg, %s 0%%, rgba(11,9,8,0) 100%%)" % BG)
c += svg(gilt_frame(48, 48, 560, 624))
c += box(48, 132, 560, 20, font(13, 20, GOLD, 400, "text-align: center; letter-spacing: 8px"), EVENT)
c += svg(diamond(328, 178, 4) + line(278, 178, 318, 178, GOLD, 0.7) + line(338, 178, 378, 178, GOLD, 0.7))
c += box(88, 214, 480, 140, "text-align: center; " + serif(46, 66, GOLD, 600, "letter-spacing: 2px"), "金价新高之后<br>我们卖什么")
c += box(88, 384, 480, 28, "text-align: center; " + serif(18, 28, IVORY, 400, "letter-spacing: 3px"), "品牌总部 敬致全国经销商伙伴")
c += svg(line(268, 454, 388, 454, GOLD, 0.7))
c += box(88, 478, 480, 24, "text-align: center; " + serif(15, 24, MUTED, 400, "letter-spacing: 6px"), DATE)
c += cap(1000, 694, 260, "示意图：古法金手镯（AI 生成）", "right")
pages.append(("1 请柬封面", c))

# 2 the order of the day, set like a gala programme
c = head(2, None, "今天讲四件事，最后一件请大家一起定")
prog = [("壹", "金价", "涨到了什么位置，高点之后回落了多少", "03"), ("贰", "顾客", "首饰少了，金条金币多了，一口价和按克在回摆", "05"), ("叁", "行业", "谁在关店，税改和纯度国标带来什么", "09"), ("肆", "我们", "产品、定价、门店服务和金价风险，请大家一起定五件事", "13")]
s = ""
for i, (n, t_, d_, p_) in enumerate(prog):
    y = 210 + i * 98
    last = i == 3
    c += box(250, y, 60, 60, serif(40, 60, GOLD, 600), n)
    c += box(330, y + 4, 300, 32, serif(24, 32, GOLD if last else IVORY, 600, "letter-spacing: 2px"), t_)
    c += box(330, y + 38, 560, 22, font(14, 22, MUTED), d_)
    c += box(960, y + 4, 70, 32, serif(18, 32, GOLD if last else MUTED, 400, "text-align: right"), p_)
    s += line(420 + len(t_) * 8, y + 24, 950, y + 24, LINE, 1, "1 6")
    if i < 3:
        s += line(250, y + 82, 1030, y + 82, LINE, 0.8)
c = under(c, s)
pages.append(("2 程序单", c))

# 3 seven years of the gold price, the computed years drawn hatched
c = head(3, None, "金价七年涨到 3.3 倍，盘中最高到过 1,256 元/克")
yrs = ["2019", "2020", "2021", "2022", "2023", "2024", "2025", "2026 年 1 至 9 月"]
vals = [308.70, 388.13, 373.66, 390.58, 449.05, 548.49, 798.12, 1025.08]
X0, BASE, SC = 110, 590, 340 / 1500
s = '<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="%s" stroke-width="1.6"/></pattern></defs>' % GOLD
for k in (0, 500, 1000, 1500):
    y = BASE - k * SC
    s += line(X0, y, 820, y, LINE, 0.8) + text(X0 - 10, y + 4, "{:,}".format(k), 11, DIM, "end")
for i, (yv, v) in enumerate(zip(yrs, vals)):
    x = X0 + 20 + i * 86
    h = v * SC
    calc = i >= 6
    if calc:
        s += '<rect x="%.1f" y="%.1f" width="54" height="%.1f" fill="url(#hatch)" opacity="0.55"/>' % (x, BASE - h, h)
        s += '<rect x="%.1f" y="%.1f" width="54" height="%.1f" fill="none" stroke="%s" stroke-width="1.2"/>' % (x + 0.6, BASE - h + 0.6, h - 1.2, GOLD)
    else:
        s += '<rect x="%.1f" y="%.1f" width="54" height="%.1f" fill="%s" opacity="%.2f"/>' % (x, BASE - h, h, GOLD, 0.45 + i * 0.07)
    s += text(x + 27, BASE - h - 10, "{:,.2f}".format(v), 13, GOLDL if i == 7 else IVORY, "middle", 600 if i == 7 else 400, "Georgia, serif")
    s += text(x + 27, BASE + 20, yv if i < 7 else "2026", 12, MUTED, "middle")
s += text(X0 + 20 + 7 * 86 + 27, BASE + 36, "1 至 9 月", 11, DIM, "middle")
py = BASE - 1256 * SC
s += line(X0, py, 820, py, GOLD, 1, "2 5") + text(X0 + 4, py - 8, "历史最高 1,256.00 · 2026-01-29 盘中", 12, GOLD, "start")
s += line(X0, BASE, 820, BASE, MUTED, 1)
s += '<rect x="880" y="216" width="14" height="14" fill="%s" opacity="0.8"/>' % GOLD + text(904, 228, "中国黄金协会公布的年度均价", 12, MUTED)
s += '<rect x="880" y="242" width="14" height="14" fill="url(#hatch)" opacity="0.7" stroke="%s"/>' % GOLD + text(904, 254, "按上金所 Au99.99 日行情计算", 12, MUTED)
c = under(c, s)
c += box(880, 300, 330, 130, serif(104, 130, GOLD, 600), '3.3<span style="font-size:52px">×</span>')
c += svg(line(880, 452, 1000, 452, GOLD, 0.7))
c += box(880, 470, 320, 80, font(15, 26, IVORY), "2019 年均价 308.70 元/克<br>2026 年 1 至 9 月均价 1,025.08 元/克")
c += box(880, 548, 320, 40, font(12, 20, MUTED), "单位：元/克。倍数为计算")
c += source("来源：中国黄金协会年度公告，上海黄金交易所 Au99.99 每日行情。2025 年起均价按日行情、用协会同一方法计算")
pages.append(("3 七年金价", c))

# 4 the retreat: one big figure and the drop drawn as a single falling line
c = head(4, None, "高点之后回落 27%，仍比去年均价高 14%")
c += box(80, 232, 470, 170, serif(150, 170, GOLD, 600, "letter-spacing: -2px"), "−27%")
c += box(86, 410, 440, 60, font(15, 26, IVORY), "9 月 30 日收盘 907.32 元/克，比最高收盘低 27%")
c += svg(line(86, 492, 206, 492, GOLD, 0.7))
c += box(86, 508, 440, 50, font(13, 22, MUTED), "仍比 2025 年均价 798.12 元/克（按日行情计算）高 14%")
X1, X2 = 640, 1150
y_of = lambda v: 560 - (v - 700) / 600 * 330
s = line(X1, y_of(798.12), X2 + 20, y_of(798.12), DIM, 1, "3 5") + text(X2 + 20, y_of(798.12) + 18, "2025 年均价 798.12", 11, DIM, "end")
s += '<path d="M %d %.1f C %d %.1f, %d %.1f, %d %.1f" fill="none" stroke="%s" stroke-width="2"/>' % (X1, y_of(1243.02), X1 + 200, y_of(1243.02), X2 - 220, y_of(907.32), X2, y_of(907.32), GOLD)
s += '<circle cx="%d" cy="%.1f" r="6" fill="%s"/>' % (X1, y_of(1243.02), GOLD) + '<circle cx="%d" cy="%.1f" r="6" fill="%s" stroke="%s" stroke-width="2"/>' % (X2, y_of(907.32), BG, GOLD)
s += stext(X1, y_of(1243.02) - 18, "1,243.02", 22, GOLDL, "start", 600) + text(X1, y_of(1243.02) - 44, "最高收盘 · 2026-01-29", 12, MUTED)
s += stext(X2, y_of(907.32) - 18, "907.32", 22, IVORY, "end", 600) + text(X2, y_of(907.32) + 28, "2026-09-30 收盘", 12, MUTED, "end")
s += line(600, 230, 600, 580, LINE, 1)
c = under(c, s)
c += source("来源：上海黄金交易所 Au99.99 每日行情。单位：元/克。回落幅度和 2025 年均价为按日行情计算")
pages.append(("4 回落", c))


def chapter(pg, num, roman, title, sub, key):
    c = photo(key, 0, 0, 1280, 720)
    c += box(0, 0, 1280, 720, "background: linear-gradient(90deg, rgba(11,9,8,0.94) 0%, rgba(11,9,8,0.78) 42%, rgba(11,9,8,0.15) 78%)")
    c += svg(gilt_frame(32, 32, 1216, 656))
    c += box(96, 96, 400, 20, font(12, 20, GOLD, 400, "letter-spacing: 6px"), EVENT)
    c += box(96, 236, 300, 150, serif(140, 150, GOLD, 400), roman)
    c += box(100, 400, 300, 24, font(14, 24, MUTED, 400, "letter-spacing: 6px"), num)
    c += box(96, 432, 600, 72, serif(52, 72, IVORY, 600, "letter-spacing: 4px"), title)
    c += svg(line(100, 524, 220, 524, GOLD, 1.2))
    c += box(100, 542, 520, 28, font(15, 26, MUTED), sub)
    c += cap(980, 664, 240, "示意图（AI 生成）", "right")
    return c


pages.append(("5 第一章", chapter(5, "第一章", "Ⅰ", "顾客变了", "首饰少了，金条金币多了，一口价在回摆", "counter")))

# 6 the flip: bars and coins overtook jewellery
c = head(6, 1, "金条金币第一次超过首饰，今年上半年已是首饰的 2.6 倍")
c += box(80, 236, 380, 170, serif(150, 170, GOLD, 600), '2.6<span style="font-size:70px">×</span>')
c += box(86, 414, 360, 60, font(15, 26, IVORY), "2026 年上半年，金条金币用金是首饰的 2.6 倍")
c += svg(line(86, 492, 206, 492, GOLD, 0.7))
c += box(86, 508, 360, 50, font(13, 22, MUTED), "2025 年全年，金条金币第一次超过首饰")
rows = [("2025 年", 504.238, 363.836), ("2026 年上半年", 339.3, 132.1)]
s = line(520, 230, 520, 580, LINE, 1)
SCB = 560 / 520
for i, (lab, bar, jew) in enumerate(rows):
    y = 240 + i * 170
    s += text(570, y + 6, lab, 14, IVORY, "start", 600)
    s += '<rect x="570" y="%d" width="%.1f" height="26" fill="%s"/>' % (y + 22, bar * SCB, GOLD)
    s += stext(570 + bar * SCB + 10, y + 42, "{:,.1f} 吨".format(bar), 16, GOLDL, "start", 600)
    s += text(570, y + 70, "金条及金币", 11, MUTED)
    s += '<rect x="570" y="%d" width="%.1f" height="26" fill="none" stroke="%s" stroke-width="1.2"/>' % (y + 82, jew * SCB, MUTED)
    s += stext(570 + jew * SCB + 10, y + 102, "{:,.1f} 吨".format(jew), 16, IVORY, "start", 400)
    s += text(570, y + 130, "黄金首饰", 11, MUTED)
c = under(c, s)
c += source("来源：中国黄金协会 2025 年度及 2026 年上半年黄金市场数据公告。中国黄金协会口径。倍数为计算")
pages.append(("6 翻转", c))

# 7 lighter in gold, heavier in money: two columns on either side of a balance
c = head(7, 1, "金饰用金一年少了四分之一，花的钱反而多了 8%")
s = line(640, 200, 640, 540, GOLD, 0.8)
s += icon("scale", 622, 186, 36, GOLD, 1.3)
cols = [(120, "用金量", [("2025 年", "360.1", "吨", "−25%"), ("2026 年上半年", "136", "吨", "−30%")], "trending-down"),
        (700, "消费金额", [("2025 年", "2,814", "亿元", "+8%"), ("2026 年上半年", "1,419", "亿元", "+2%")], "trending-up")]
for x, name, items, ic in cols:
    c += box(x, 236, 460, 30, serif(20, 30, GOLD, 600, "letter-spacing: 4px; text-align: center"), name)
    for j, (per, v, u, ch) in enumerate(items):
        y = 282 + j * 136
        big = j == 0
        c += box(x, y, 460, 20, font(12, 20, MUTED, 400, "text-align: center; letter-spacing: 2px"), per)
        c += box(x, y + 22, 460, 70, "text-align: center; " + serif(56 if big else 40, 70, IVORY, 600), v + '<span style="font-size:18px; color:%s"> %s</span>' % (MUTED, u))
        c += box(x + 180, y + 94, 100, 22, "text-align: center; border: 1px solid %s; border-radius: 11px; " % (GOLD if ch.startswith("+") else DIM) + font(12, 20, GOLD if ch.startswith("+") else MUTED, 600), "同比 " + ch)
c = under(c, s)
c += svg(line(160, 558, 1120, 558, LINE, 0.8))
c += box(160, 568, 960, 44, font(12, 20, MUTED, 400, "text-align: center"), "世界黄金协会口径。消费金额是吨数乘以 Au9999 均价的估算，不含工费、品牌溢价和税，不等于门店收银额。不与中国黄金协会的吨数相加或相比")
c += source("来源：世界黄金协会 2025 年及 2026 年上半年中国黄金市场回顾", y=636)
pages.append(("7 轻与重", c))

# 8 the swing: fixed prices rose while gold climbed, then per-gram came back
c = head(8, 1, "一口价做上去了，金价一回落，按克计价又回来了")
s = ""
rows = [("周大福", "定价首饰占内地零售值", [("2025 财年", 30.6), ("2026 财年", 35.4)], [("去年 4 至 6 月", 34.0), ("今年 4 至 6 月", 29.0)], "按克计价零售值同比 +21.0%"),
        ("六福", "定价款占集团零售值", None, [("去年 4 至 6 月", 24), ("今年 4 至 6 月", 18)], "同店销量 +13%，由跌转升"),
        ("周生生", "内地同店，2026 年上半年", None, None, "一口价同比 −20%，按克 +34%")]
c += box(380, 192, 300, 20, font(12, 20, MUTED, 400, "text-align: center; letter-spacing: 3px"), "金价上行时")
c += box(380, 212, 300, 18, font(11, 18, DIM, 400, "text-align: center"), "上一财年 ○ → ● 本财年")
c += box(700, 192, 300, 20, font(12, 20, GOLD, 400, "text-align: center; letter-spacing: 3px"), "金价回落后")
c += box(700, 212, 300, 18, font(11, 18, DIM, 400, "text-align: center"), "去年 4 至 6 月 ○ → ● 今年 4 至 6 月")
s += line(690, 196, 690, 580, LINE, 1)
X = lambda v, x0: x0 + 20 + (v - 15) / 25 * 260
for i, (co, base, up, down, note) in enumerate(rows):
    y = 250 + i * 116
    c += box(80, y - 6, 260, 30, serif(20, 30, IVORY, 600), co)
    c += box(80, y + 26, 280, 20, font(12, 20, MUTED), base)
    for pair, x0, col in ((up, 380, MUTED), (down, 700, GOLD)):
        if not pair:
            continue
        (la, a), (lb, b) = pair
        s += line(X(a, x0), y + 14, X(b, x0), y + 14, col, 2)
        s += '<circle cx="%.1f" cy="%d" r="5" fill="%s" stroke="%s" stroke-width="1.5"/>' % (X(a, x0), y + 14, BG, col)
        s += '<circle cx="%.1f" cy="%d" r="6" fill="%s"/>' % (X(b, x0), y + 14, col)
        s += text(X(a, x0), y - 2, "%g%%" % a, 13, col, "middle", 400, "Georgia, serif") + text(X(b, x0), y - 2, "%g%%" % b, 15, GOLDL if col == GOLD else IVORY, "middle", 600, "Georgia, serif")
    c += box(1010, y + 2, 210, 44, font(13, 22, IVORY), note)
    if i < 2:
        s += line(80, y + 74, 1216, y + 74, LINE, 0.6)
c = under(c, s)
c += box(80, 590, 1100, 20, font(12, 20, MUTED), "三家的期间和分母都不同，只比各家自己的方向，不互相比高低")
c += source("来源：周大福 2026 财年业绩公告及季度经营数据，六福季度零售表现，周生生 2026 中期业绩公告。企业口径", y=636)
pages.append(("8 回摆", c))

pages.append(("9 第二章", chapter(9, "第二章", "Ⅱ", "行业变了", "同行在关店，税和标准在改", "street")))

# 10 stores: a diverging bar, closures to the left in bronze, openings to the right in gold
c = head(10, 2, "上市同行大多在关店，逆势开店的是老铺和潮宏基")
rows = [("周大福", "内地零售点", "2024-03 至 2026-06", "7,170 → 5,047", -2123), ("中国黄金", "门店", "2025 年", "4,236 → 3,311", -925),
        ("老凤祥", "营销网点", "2024 年末至 2026-06", "5,838 → 4,916", -922), ("六福", "内地店铺", "2025-03 至 2026-03", "3,179 → 2,880", -299),
        ("周生生", "内地门店", "2024 年末至 2026-06", "842 → 677", -165), ("老铺黄金", "自营门店", "2024 年末至 2026-06", "36 → 45", 9),
        ("潮宏基", "珠宝门店", "2024 年末至 2026-06", "1,511 → 1,682", 171)]
Z = 880; K = 330 / 2123
s = line(Z, 196, Z, 590, MUTED, 1)
s += text(Z - 8, 196, "← 净关店", 11, DIM, "end") + text(Z + 8, 196, "净开店 →", 11, DIM, "start")
for i, (co, kind, per, ft, n) in enumerate(rows):
    y = 214 + i * 52
    c += box(64, y, 150, 24, serif(17, 24, IVORY if n < 0 else GOLD, 600), co)
    c += box(64, y + 24, 300, 18, font(10, 18, DIM), kind + " · " + per)
    c += box(300, y + 4, 150, 20, font(12, 20, MUTED, 400, "text-align: right"), ft)
    w_ = abs(n) * K
    if n < 0:
        s += '<rect x="%.1f" y="%d" width="%.1f" height="18" fill="%s"/>' % (Z - w_, y + 6, w_, BRONZE)
        s += stext(Z - w_ - 8, y + 20, "{:,}".format(n).replace("-", "−"), 14, IVORY, "end", 600)
    else:
        s += '<rect x="%d" y="%d" width="%.1f" height="18" fill="%s"/>' % (Z, y + 6, max(w_, 2), GOLD)
        s += stext(Z + max(w_, 2) + 8, y + 20, "+{:,}".format(n), 14, GOLDL, "start", 600)
    if i < 6:
        s += line(64, y + 46, 1216, y + 46, LINE, 0.5)
c = under(c, s)
c += source("来源：各公司年报、中期报告及季度经营数据。企业口径，各家期间和门店口径不同，只看方向，不比大小", y=630)
pages.append(("10 关店", c))

# 11 tax: two invitation cards, before and after, the second in a gilt frame
c = head(11, 2, "每 100 元原料可抵税从约 11.50 元降到 6.00 元")
rows = [("拿到的发票", "增值税专用发票", "普通发票"), ("进项怎么算", "按 13% 税率价税分离", "发票金额 × 6%")]
s = '<rect x="290.5" y="196.5" width="380" height="380" fill="none" stroke="%s" stroke-width="1"/>' % DIM + gilt_frame(760, 196, 400, 380)
s += '<path d="M 690 386 L 736 386" stroke="%s" stroke-width="1.4"/>' % GOLD + '<path d="M 728 380 L 738 386 L 728 392" fill="none" stroke="%s" stroke-width="1.4"/>' % GOLD
c += box(290, 216, 380, 20, font(12, 20, MUTED, 400, "text-align: center; letter-spacing: 2px"), "2025 年 10 月 31 日前")
c += box(290, 238, 380, 24, serif(15, 24, IVORY, 400, "text-align: center"), "财税〔2002〕142 号")
c += box(760, 216, 400, 20, font(12, 20, GOLD, 400, "text-align: center; letter-spacing: 2px"), "2025 年 11 月 1 日起")
c += box(760, 238, 400, 24, serif(15, 24, IVORY, 400, "text-align: center"), "财政部 税务总局公告 2025 年第 11 号")
for j, (lab, a, b) in enumerate(rows):
    y = 290 + j * 70
    c += box(64, y + 8, 200, 20, font(13, 20, MUTED, 400, "text-align: right"), lab)
    c += box(290, y, 380, 36, serif(20, 36, IVORY, 400, "text-align: center"), a)
    c += box(760, y, 400, 36, serif(20, 36, IVORY, 400, "text-align: center"), b)
    s += line(310, y + 52, 650, y + 52, LINE, 0.6) + line(790, y + 52, 1130, y + 52, LINE, 0.6)
c += box(64, 452, 200, 40, font(13, 20, MUTED, 400, "text-align: right"), "每 100 元原料<br>可抵扣")
c += box(290, 436, 380, 80, serif(54, 80, IVORY, 600, "text-align: center"), '约 11.50<span style="font-size:18px"> 元</span>')
c += box(760, 436, 400, 80, serif(54, 80, GOLD, 600, "text-align: center"), '6.00<span style="font-size:18px"> 元</span>')
c += box(760, 524, 400, 22, font(13, 22, GOLDL, 600, "text-align: center"), "少抵约 5.50 元")
c += box(64, 186, 220, 20, font(11, 20, DIM, 400, "text-align: right"), "做首饰用的提金，非投资用途")
c = under(c, s)
c += source("来源：财政部 税务总局公告 2025 年第 11 号，财税〔2002〕142 号第二条。可抵扣额按公告原文公式计算：100 × 13 ÷ 113，100 × 6%", y=600)
pages.append(("11 税改", c))

# 12 the purity standard on a hairline timeline, a break in the long quiet years
c = head(12, 2, "纯度国标仍用 2012 版，新版还在批准")
ev = [(120, "2013-05", "GB 11887-2012 实施", "强制性国标，现行", True), (380, "2022-07", "明码标价新规施行", "不得在标价之外加价", False), (530, "2024-01", "国标复审：修订", "", True),
      (680, "2024-10", "修订计划下达", "新名称加入「标识」", False), (840, "2025-05", "硬足金行标实施", "QB/T 5793-2024", True), (1080, "2026-10", "新版仍在批准", "尚未发布", False)]
s = line(100, 380, 250, 380, GOLD, 1.2) + line(250, 380, 270, 380, GOLD, 1.2, "2 4") + line(280, 372, 268, 388, MUTED, 1) + line(290, 372, 278, 388, MUTED, 1) + line(292, 380, 1120, 380, GOLD, 1.2)
for x, d, t_, sub, up in ev:
    last = d == "2026-10"
    s += ('<circle cx="%d" cy="380" r="7" fill="%s" stroke="%s" stroke-width="1.6"/>' % (x, BG, GOLD)) if last else ('<circle cx="%d" cy="380" r="6" fill="%s"/>' % (x, GOLD))
    ty = 270 if up else 410
    s += line(x, 380 + (-10 if up else 10), x, ty + (60 if up else -6), LINE, 1)
    c += box(x - 100, ty, 200, 20, font(12, 20, GOLD if last else MUTED, 400, "text-align: center; letter-spacing: 1px"), d)
    c += box(x - 100, ty + 20, 200, 24, serif(15, 24, GOLDL if last else IVORY, 600, "text-align: center"), t_)
    if sub:
        c += box(x - 100, ty + 44, 200, 18, font(11, 18, DIM, 400, "text-align: center"), sub)
c = under(c, s)
c += svg(line(240, 518, 1040, 518, LINE, 0.8))
c += box(240, 530, 800, 20, font(12, 20, GOLD, 400, "text-align: center; letter-spacing: 4px"), "现在怎么做")
c += box(240, 554, 800, 50, font(14, 24, IVORY, 400, "text-align: center"), "价签和凭证按现行要求，标清纯度、重量、计价方式和工费。新版发布后，总部统一给出价签和印记的改法")
c += source("来源：国家标准信息公共服务平台（2026-10-07 查询），市场监管总局令第 56 号，QB/T 5793-2024", y=630)
pages.append(("12 国标", c))

pages.append(("13 第三章", chapter(13, "第三章", "Ⅲ", "我们一起做什么", "产品、定价、门店服务和金价风险", "hands")))

# 14 three directions for next year's range, set as a catalogue triptych
c = head(14, 3, "明年上新往三处走：古法金、设计款、小克重")
items = [("bangle", "古法金", "手工厚重，零售商的核心利润来源", None), ("filigree", "设计款", "轻克重、设计感强、附加值高", None), ("charms", "小克重", "10 克以内的产品占门店销量", "45%")]
for i, (k, t_, d_, fig) in enumerate(items):
    x = 96 + i * 372
    c += photo(k, x, 192, 344, 286)
    c += svg('<rect x="%d.5" y="192.5" width="343" height="285" fill="none" stroke="%s" stroke-width="0.8" opacity="0.6"/>' % (x, GOLD))
    c += box(x, 494, 344, 32, serif(22, 32, GOLD, 600, "text-align: center; letter-spacing: 6px"), t_)
    c += box(x, 528, 344, 24, font(13, 22, IVORY, 400, "text-align: center"), d_ + (' <b style="color:%s; font-family: Georgia, serif; font-size: 16px">%s</b>' % (GOLDL, fig) if fig else ""))
c += source("来源：世界黄金协会《2025 中国金饰零售市场洞察》（576 份店长反馈），中国黄金协会 2025 年上半年公告。图片为 AI 生成的示意图", y=620)
pages.append(("14 上新", c))

# 15 two legs of pricing, set symmetrically either side of a gold hairline
c = head(15, 3, "定价两条腿走：设计和手艺走一口价，素金和金条按克卖")
rows = [("放在哪些货上", "设计款、古法金小件、工艺复杂的款", "素金、大克重足金、金条金币"), ("金价上涨时", "售价不随日金价变，占比上升", "售价跟着涨，顾客改买轻的"),
        ("金价回落时", "显得贵，占比回落，要按时复盘调价", "售价跟着降，先回暖"), ("毛利从哪来", "设计和工艺的溢价含在价里", "工费，金价部分基本透明")]
s = line(640, 236, 640, 530, GOLD, 0.8) + icon("scale", 626, 186, 28, GOLD, 1.3)
c += box(180, 196, 400, 30, serif(22, 30, GOLD, 600, "text-align: right; letter-spacing: 2px"), "一口价 · 按件定价")
c += box(700, 196, 400, 30, serif(22, 30, IVORY, 600, "text-align: left; letter-spacing: 2px"), "按克计价")
for i, (lab, a, b) in enumerate(rows):
    y = 252 + i * 70
    c += box(570, y, 140, 20, font(11, 20, MUTED, 400, "text-align: center; letter-spacing: 2px; background: %s" % BG), lab)
    c += box(160, y + 24, 440, 26, font(15, 26, IVORY, 400, "text-align: right"), a)
    c += box(680, y + 24, 440, 26, font(15, 26, IVORY, 400, "text-align: left"), b)
c = under(c, s)
c += svg(line(240, 548, 1040, 548, LINE, 0.8))
c += box(160, 560, 960, 24, font(14, 24, IVORY, 400, "text-align: center"), '<span style="color:%s">两条腿都要守的规矩：</span>价签标清计价方式、重量、纯度和工费，不在标价之外加价，不收未标明的费用' % GOLD)
c += source("依据：第 8 页三家上市公司的披露，老铺黄金招股书（产品推出时定价，不随原料小幅波动调整），市场监管总局令第 56 号", y=630)
pages.append(("15 定价", c))

# 16 trade-ins, recycling and gold risk beside the tray of old gold
c = photo("tray", 0, 0, 560, 720)
c += box(380, 0, 180, 720, "background: linear-gradient(90deg, rgba(11,9,8,0) 0%%, %s 100%%)" % BG)
c += svg('<rect x="584.5" y="24.5" width="671" height="671" fill="none" stroke="%s" stroke-width="1"/>' % LINE)
c += box(608, 40, 600, 18, font(12, 18, MUTED, 400, "letter-spacing: 3px"), "第三章　我们一起做什么")
c += box(608, 76, 620, 96, "display: flex; flex-direction: column; justify-content: flex-end; " + serif(28, 40, GOLD, 600), "<div>以旧换新和回收按标准做，<br>金价风险先记清再对冲</div>")
c += svg(diamond(612, 192, 4) + line(624, 192, 660, 192, GOLD, 0.6)) + "<!--BG-->"
its = [("repeat", "以旧换新", "约占首饰消费量两成。按行业团体标准做，凭证写清损耗和折价"), ("recycle", "回收", "税改后售价含税、回收价不含，报价当着顾客算清"), ("shield-check", "金价风险", "先把每家店的库存克重和金价敞口记清，再谈对冲")]
s = ""
for i, (ic, t_, d_) in enumerate(its):
    y = 232 + i * 120
    s += '<circle cx="636" cy="%d" r="22" fill="none" stroke="%s" stroke-width="1"/>' % (y + 24, GOLD) + icon(ic, 624, y + 12, 24, GOLD, 1.3)
    c += box(680, y, 520, 30, serif(20, 30, IVORY, 600), t_)
    c += box(680, y + 34, 520, 48, font(14, 24, MUTED), d_)
    if i < 2:
        s += line(680, y + 100, 1200, y + 100, LINE, 0.6)
c = under(c, s)
c += box(608, 600, 620, 40, font(11, 16, DIM), "来源：中国黄金协会（2025-12-13，两成为不完全统计），世界黄金协会增值税解读（2025-11-07）。图片为 AI 生成的示意图")
c += box(608, 666, 500, 18, font(11, 18, DIM, 400, "letter-spacing: 2px"), EVENT + " · " + DATE)
c += hallmark(16)
pages.append(("16 服务", c))

# 17 the reply card: five things to settle together, with boxes to tick and a perforated edge
c = svg('<rect x="24.5" y="24.5" width="1231" height="671" fill="none" stroke="%s" stroke-width="1"/>' % LINE)
c += svg(gilt_frame(200, 64, 880, 584) + line(260, 64, 260, 648, GOLD, 1, "2 6"))
c += box(200, 88, 60, 560, font(12, 18, GOLD, 400, "writing-mode: vertical-rl; letter-spacing: 8px; text-align: center; line-height: 60px"), "回执 · 敬请回复")
c += box(290, 92, 760, 20, font(12, 20, MUTED, 400, "letter-spacing: 4px"), "第三章　我们一起做什么")
c += box(290, 116, 760, 44, serif(30, 44, GOLD, 600, "letter-spacing: 2px"), "请与我们一起定的五件事") + "<!--BG-->"
items = [("上新结构", "古法金、设计款、小克重在明年上新里各占多少，按区域分别定"), ("定价规则", "哪些款走一口价、哪些按克，一口价多久复盘一次，金价变动多少就调"),
         ("以旧换新", "是否全网按团体标准执行，验金设备和凭证模板由谁来出"), ("金价风险", "每家店建金价敞口台账，总部是否对接黄金租赁和套保，经销商自愿参加"), ("税票和进货", "提金用途和发票逐项核对，金条进货走哪条渠道")]
s = ""
for i, (t_, d_) in enumerate(items):
    y = 188 + i * 84
    s += '<rect x="292" y="%d" width="22" height="22" fill="none" stroke="%s" stroke-width="1.2"/>' % (y + 4, GOLD)
    c += box(334, y, 200, 30, serif(20, 30, IVORY, 600), t_)
    c += box(334, y + 32, 700, 22, font(13, 22, MUTED), d_)
    if i < 4:
        s += line(334, y + 68, 1040, y + 68, LINE, 0.6, "1 4")
c = under(c, s)
c += box(64, 666, 600, 18, font(11, 18, DIM, 400, "letter-spacing: 2px"), EVENT + " · " + DATE)
c += hallmark(17)
pages.append(("17 回执", c))

# 18 the closing card: the invitation again, signed by head office
c = svg(gilt_frame(48, 48, 1184, 624))
c += box(140, 150, 1000, 20, font(13, 20, GOLD, 400, "text-align: center; letter-spacing: 8px"), EVENT)
c += svg(diamond(640, 196, 4) + line(590, 196, 630, 196, GOLD, 0.7) + line(650, 196, 690, 196, GOLD, 0.7))
c += box(140, 252, 1000, 150, "text-align: center; " + serif(44, 70, IVORY, 400, "letter-spacing: 3px"), '金价我们定不了，<br>卖什么、怎么卖，我们<span style="color:%s">一起</span>定。' % GOLD)
c += svg(line(580, 456, 700, 456, GOLD, 0.7))
c += box(140, 478, 1000, 28, "text-align: center; " + serif(16, 28, MUTED, 400, "letter-spacing: 4px"), "品牌总部 敬上")
c += box(140, 510, 1000, 24, "text-align: center; " + serif(14, 24, DIM, 400, "letter-spacing: 6px"), DATE)
pages.append(("18 结尾", c))

assert len(pages) == TOTAL, len(pages)
boards = {}; order_ = []; cells = []
for i, (ttl, inner) in enumerate(pages):
    name = "Main.dc.html" if i == 0 else "d%02d.dc.html" % (i + 1)
    open(os.path.join(P, name), 'w').write(page(ttl, inner))
    boards[name] = {"x": 0, "y": i * 840, "w": 1280, "h": 720, "title": ttl + " · 设计稿"}; order_.append(name)
    cur = "c%02d.dc.html" % (i + 1)
    open(os.path.join(P, cur), 'w').write(page(ttl + " 当前", '<img src="' + CUR[i] + '" alt="引擎当前渲染" style="display: block; width: 1280px; height: 720px">'))
    boards[cur] = {"x": 1360, "y": i * 840, "w": 1280, "h": 720, "title": ttl + " · 引擎当前"}; order_.append(cur)
    loc = inner.replace("<!--BG-->", "")
    for k_ in IMG:
        loc = loc.replace(IMG[k_], "../up/" + k_ + ".jpg")
    cells.append('<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: %s; color: %s; font-family: %s">%s</div>' % (BG, IVORY, SANS, loc))
    cells.append('<div style="width:1280px;height:720px"><img src="../cur/cur%03d.png" style="width:1280px;height:720px"></div>' % (i + 1))
canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}, "title": "luxe 黄金经销商大会样例设计稿",
          "launch": {"view": "canvas"}, "pages": [], "boards": boards, "order": order_, "notes": {}, "designSystems": []}
pc = os.path.join(P, 'canvas.json')
if os.path.exists(pc):
    canvas["createdOnFiles"] = json.load(open(pc))["createdOnFiles"]
json.dump(canvas, open(pc, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(L, 'sheet.html'), 'w').write('<!doctype html><meta charset="utf-8"><body style="margin:0;background:#555;display:grid;grid-template-columns:repeat(2,1280px);gap:16px;padding:16px;width:2592px">' + "".join(cells) + '</body>')
print(len(order_))
