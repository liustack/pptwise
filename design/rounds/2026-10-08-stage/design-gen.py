import json, os, re, datetime, math
ROOT = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(ROOT, 'project'); L = os.path.join(ROOT, 'local')
os.makedirs(P, exist_ok=True); os.makedirs(L, exist_ok=True)

# stage: the house lights go down and one sentence is left on a black field.
BG = "#0F0F12"; SURF = "#1A1A1F"; SILVER = "#C4BFB6"; PAPER = "#F3EFE7"; MUTED = "#B0A694"; LINE = "#2A2A30"; DIM = "#7E786C"
SANS = "'PingFang SC', 'Helvetica Neue', 'Microsoft YaHei', sans-serif"
KEYS = ["city", "controller", "hall", "studio", "worldmap"]
IMG = {k: "__%s__" % k for k in KEYS}
CUR = ["__CUR%02d__" % (i + 1) for i in range(18)]
TOTAL = 18

_cat = open('/Users/leon/projects/pptwise/src/icons/catalog.ts').read()


def _icon_svg(name):
    m = re.search(r'^  "%s": (\[.*\]),$' % re.escape(name), _cat, re.M)
    prims = json.loads(m.group(1))
    return ''.join('<%s %s/>' % (tag, ' '.join('%s="%s"' % (k, v) for k, v in attrs.items())) for tag, attrs in prims)


def icon(name, x, y, size=20, color=SILVER, sw=1.5):
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
<div style="position: relative; width: """ + str(w) + "px; height: " + str(h) + "px; overflow: hidden; background: " + BG + "; color: " + PAPER + "; font-family: " + SANS + """">
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


def font(size, lh, color=PAPER, weight=400, extra=""):
    return "font-family: %s; font-size: %dpx; line-height: %dpx; color: %s; font-weight: %d; %s" % (SANS, size, lh, color, weight, extra)


def svg(body):
    return '<svg width="1280" height="720" viewBox="0 0 1280 720" style="position: absolute; left: 0; top: 0">' + body + '</svg>\n'


def line(x1, y1, x2, y2, c=LINE, w=1, dash=None):
    d = ' stroke-dasharray="%s"' % dash if dash else ''
    return '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%.2f"%s/>' % (x1, y1, x2, y2, c, w, d)


def text(x, y, s, size=12, fill=MUTED, anchor="start", weight=400):
    return '<text x="%.1f" y="%.1f" font-size="%d" fill="%s" text-anchor="%s" font-weight="%d" font-family="PingFang SC, sans-serif">%s</text>' % (x, y, size, fill, anchor, weight, s)


def photo(key, x, y, w, h, pos="50% 50%"):
    return box(x, y, w, h, "overflow: hidden; ", '<img src="' + IMG[key] + '" alt="" style="display: block; width: %dpx; height: %dpx; object-fit: cover; object-position: %s">' % (w, h, pos))


def clicker(pg, chapter=None, light=False):
    """The talk's progress along the foot, like a presenter's clicker: a hairline, the part played in silver, the slide count at its end; the part's name top left."""
    out = ""
    if chapter:
        out += box(64, 40, 600, 18, font(12, 18, MUTED, 500, "letter-spacing: 4px"), chapter)
    done = 64 + (1152 - 120) * pg / TOTAL
    out += svg(line(64, 676, 1096, 676, "#3A3A42" if not light else "rgba(255,255,255,0.25)", 2) + line(64, 676, done, 676, SILVER, 2))
    out += box(1110, 666, 106, 20, font(12, 20, MUTED, 500, "text-align: right; letter-spacing: 1px"), "%02d / %d" % (pg, TOTAL))
    return out


def source(t_, y=626, x=64, w=1152, align="left"):
    return box(x, y, w, 30, font(11, 16, DIM, 400, "text-align: %s" % align), t_)


def spot(cx, cy, r, op=0.08):
    return box(cx - r, cy - r, 2 * r, 2 * r, "border-radius: 50%%; background: radial-gradient(circle, rgba(243,239,231,%.2f) 0%%, rgba(243,239,231,0) 70%%)" % op)


pages = []

# 1 cover: the hall from the back row, the title huge in the dark half
c = photo("hall", 0, 0, 1280, 720)
c += box(0, 0, 1280, 720, "background: linear-gradient(90deg, rgba(15,15,18,0.92) 0%, rgba(15,15,18,0.55) 50%, rgba(15,15,18,0.1) 100%)")
c += box(64, 64, 700, 20, font(13, 20, SILVER, 500, "letter-spacing: 6px"), "游戏开发者大会　主题演讲")
c += box(64, 330, 900, 210, font(76, 100, PAPER, 700, "letter-spacing: -1px"), "中国游戏，<br>下一个十年靠什么出海")
c += box(64, 560, 600, 22, font(14, 22, MUTED), "二〇二六年十月")
c += clicker(1, light=True)
pages.append(("1 封面", c))

# 2 one sentence: revenue still climbing, the head count at its ceiling
c = spot(640, 330, 420)
c += box(64, 230, 1152, 180, font(72, 96, PAPER, 700, "text-align: center"), '国内收入还在涨，<br>到顶的是<span style="color:%s">人数</span>' % SILVER)
c += svg(line(600, 452, 680, 452, SILVER, 2))
c += box(64, 476, 1152, 26, font(16, 26, MUTED, 400, "text-align: center"), "2025 年收入增长 7.68%，用户只增长 1.35%")
c += source("来源：游戏工委《2025 年中国游戏产业报告》", align="center")
c += clicker(2)
pages.append(("2 人数到顶", c))

# 3 one number with its claim above it and the two ends of the climb under it
c = box(64, 150, 1152, 30, font(22, 30, MUTED, 400, "text-align: center"), "2018 年到 2025 年，七年里国内游戏用户只多了")
c += box(64, 196, 1152, 240, font(220, 240, PAPER, 700, "text-align: center; letter-spacing: -6px"), '5,700<span style="font-size:80px; letter-spacing:0"> 万</span>')
s = line(380, 500, 900, 500, "#3A3A42", 2) + '<circle cx="380" cy="500" r="6" fill="%s"/>' % MUTED + '<circle cx="900" cy="500" r="7" fill="%s"/>' % SILVER
s += text(380, 532, "2018 年　6.26 亿", 14, MUTED, "middle") + text(900, 532, "2025 年　6.83 亿", 14, SILVER, "middle", 600)
c += svg(s)
c += source("来源：游戏工委 2018、2025 年《中国游戏产业报告》。差值为计算", align="center")
c += clicker(3)
pages.append(("3 5700 万", c))


def chapter(pg, num, ttl, sub, key, pos="50% 50%"):
    c = photo(key, 0, 0, 1280, 720, pos)
    c += box(0, 0, 1280, 720, "background: linear-gradient(90deg, rgba(15,15,18,0.9) 0%, rgba(15,15,18,0.4) 55%, rgba(15,15,18,0.2) 100%)")
    c += box(64, 220, 600, 40, font(20, 40, SILVER, 500, "letter-spacing: 8px"), num)
    c += box(64, 270, 900, 170, font(150, 170, PAPER, 700, "letter-spacing: -2px"), ttl)
    c += box(68, 460, 700, 32, font(22, 32, MUTED), sub)
    c += clicker(pg, light=True)
    return c


pages.append(("4 第一章", chapter(4, "第一章", "出海", "十年，去了哪里，卖什么", "worldmap")))

# 5 one line across the page: the decade, the dip marked, only the ends labelled large
c = box(64, 76, 1152, 50, font(40, 50, PAPER, 700), "出海十年放大近 4 倍，中间跌过两年")
c += box(64, 40, 600, 18, font(12, 18, MUTED, 500, "letter-spacing: 4px"), "第一章　出海")
vals = [53.1, 72.3, 82.8, 95.9, 115.9, 154.5, 180.13, 173.46, 163.66, 185.57, 204.55]
X0, X1, Y0, Y1 = 120, 1100, 560, 230
xs = [X0 + i * (X1 - X0) / 10 for i in range(11)]
ys = [Y0 - v / 220 * (Y0 - Y1) for v in vals]
s = '<path d="M %s L %d %d L %d %d Z" fill="%s" opacity="0.06"/>' % (" L ".join("%.1f %.1f" % p for p in zip(xs, ys)), X1, Y0, X0, Y0, SILVER)
s += '<rect x="%.1f" y="%d" width="%.1f" height="%d" fill="%s" opacity="0.08"/>' % (xs[6], Y1 - 20, xs[8] - xs[6], Y0 - Y1 + 20, SILVER)
s += '<polyline points="%s" fill="none" stroke="%s" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>' % (" ".join("%.1f,%.1f" % p for p in zip(xs, ys)), PAPER)
for i in (0, 10):
    s += '<circle cx="%.1f" cy="%.1f" r="8" fill="%s"/>' % (xs[i], ys[i], SILVER if i == 10 else PAPER)
s += '<circle cx="%.1f" cy="%.1f" r="6" fill="%s" stroke="%s" stroke-width="2"/>' % (xs[8], ys[8], BG, SILVER)
s += text(xs[0], ys[0] - 26, "53.1", 34, PAPER, "middle", 700) + text(xs[0], ys[0] - 64, "2015", 14, MUTED, "middle")
s += text(xs[10], ys[10] - 26, "204.55", 34, SILVER, "middle", 700) + text(xs[10], ys[10] - 64, "2025", 14, MUTED, "middle")
s += text((xs[6] + xs[8]) / 2, Y1 - 30, "2022、2023 连跌两年", 15, SILVER, "middle", 600)
s += line(X0, Y0, X1, Y0, "#3A3A42", 1)
for i, yv in enumerate(range(2015, 2026)):
    s += text(xs[i], Y0 + 26, str(yv), 12, DIM, "middle")
c += svg(s)
c += box(64, 596, 600, 24, font(14, 24, MUTED), "单位：亿美元，自研游戏海外实际销售收入")
c += box(780, 590, 436, 34, font(16, 34, PAPER, 500, "text-align: right"), '3.85 倍　年均约 14.4%')
c += source("来源：游戏工委 2015 至 2025 年《中国游戏产业报告》。倍数与年均增速为计算", y=640)
c += clicker(5)
pages.append(("5 十年", c))

# 6 two numbers face to face, the claim between them
c = box(64, 40, 600, 18, font(12, 18, MUTED, 500, "letter-spacing: 4px"), "第一章　出海")
c += box(64, 110, 1152, 50, font(40, 50, PAPER, 700, "text-align: center"), "今年上半年，出海增速是国内的 2.5 倍")
s = line(640, 230, 640, 540, "#3A3A42", 1)
c += svg(s)
for x, v, lab, sub, col in ((64, "30.22%", "出海", "自研游戏海外收入 123.72 亿美元", SILVER), (704, "12.17%", "国内", "国内游戏收入 1,884.5 亿元", PAPER)):
    c += box(x, 236, 512, 30, font(20, 30, col, 600, "text-align: center; letter-spacing: 8px"), lab)
    c += box(x, 280, 512, 180, font(150, 180, col, 700, "text-align: center; letter-spacing: -4px"), v)
    c += box(x, 476, 512, 26, font(16, 26, MUTED, 400, "text-align: center"), sub)
c += source("来源：游戏工委《2026 年 1-6 月中国游戏产业报告》。倍数为计算：30.22 ÷ 12.17。只比增速，不比规模", align="center")
c += clicker(6)
pages.append(("6 2.5 倍", c))

# 7 a slope chart: four markets, a year apart, Europe rising in silver
c = box(64, 40, 600, 18, font(12, 18, MUTED, 500, "letter-spacing: 4px"), "第一章　出海")
c += box(64, 76, 1152, 50, font(40, 50, PAPER, 700), "日本在变小，欧洲在变大")
LX, RX = 420, 860
yv = lambda v: 590 - v / 36 * 400
rows = [("美国", 31.96, 32.31, MUTED), ("日本", 16.20, 14.05, PAPER), ("德英法合计", 8.78, 10.14, SILVER), ("韩国", 7.47, 7.48, MUTED)]
s = line(LX, 180, LX, 600, "#3A3A42", 1) + line(RX, 180, RX, 600, "#3A3A42", 1)
s += text(LX, 168, "2025 年上半年", 14, MUTED, "middle") + text(RX, 168, "2026 年上半年", 14, MUTED, "middle")
for nm, a, b, col in rows:
    w = 4 if col != MUTED else 2
    off = {"德英法合计": -14, "韩国": 18}.get(nm, 0)
    s += line(LX, yv(a), RX, yv(b), col, w)
    s += '<circle cx="%d" cy="%.1f" r="6" fill="%s"/>' % (LX, yv(a), col) + '<circle cx="%d" cy="%.1f" r="7" fill="%s"/>' % (RX, yv(b), col)
    s += text(LX - 20, yv(a) + 6 + off, "%s　%.2f%%" % (nm, a), 18, col, "end", 600 if col != MUTED else 400)
    s += text(RX + 20, yv(b) + 6 + off, "%.2f%%" % b, 22 if col == SILVER else 18, col, "start", 700 if col != MUTED else 400)
c += svg(s)
c += source("来源：游戏工委 2025、2026 年《1-6 月中国游戏产业报告》。自研移动游戏海外收入占比", y=636)
c += clicker(7)
pages.append(("7 地区", c))

# 8 two leaderboards side by side: what sells abroad and at home are different lists
c = box(64, 40, 600, 18, font(12, 18, MUTED, 500, "letter-spacing: 4px"), "第一章　出海")
c += box(64, 76, 1152, 50, font(40, 50, PAPER, 700), "出海手游一半的钱来自策略类，和国内是两张榜")
s = ""
for col_x, head_, items, hot in ((64, "出海　海外收入前 100 的自研手游", [("策略", 49.96), ("射击", 9.69), ("角色扮演", 9.39)], True), (684, "国内　国内收入前 100 的手游", [("多人在线战术竞技", 19.45), ("射击", 18.29), ("角色扮演", 15.10)], False)):
    c += box(col_x, 170, 532, 24, font(15, 24, MUTED, 500, "letter-spacing: 2px"), head_)
    s += line(col_x, 204, col_x + 532, 204, "#3A3A42", 1)
    for i, (nm, v) in enumerate(items):
        y = 230 + i * 120
        big = hot and i == 0
        c += box(col_x, y, 60, 60, font(44, 60, SILVER if big else DIM, 700), str(i + 1))
        c += box(col_x + 70, y + 4, 300, 34, font(26 if big else 22, 34, PAPER, 700 if big else 500), nm)
        s += '<rect x="%d" y="%d" width="%.1f" height="8" rx="4" fill="%s"/>' % (col_x + 70, y + 48, v / 50 * 400, SILVER if big else "#4A4A52")
        c += box(col_x + 70 + int(v / 50 * 400) + 12, y + 36, 120, 32, font(22 if big else 18, 32, SILVER if big else MUTED, 700 if big else 500), "%.2f%%" % v)
c += svg(s + line(640, 170, 640, 580, "#3A3A42", 1))
c += source("来源：游戏工委《2025 年中国游戏产业报告》。分母分别是海外、国内收入前 100 的手游")
c += clicker(8)
pages.append(("8 两张榜", c))

pages.append(("9 第二章", chapter(9, "第二章", "单机", "买断制，和小团队", "controller", "70% 50%")))

# 10 one number: ten million copies, the claim above, the caveat under
c = spot(640, 330, 460)
c += box(64, 150, 1152, 30, font(22, 30, MUTED, 400, "text-align: center"), "《黑神话：悟空》发售不到 4 天，全平台卖出")
c += box(64, 196, 1152, 240, font(220, 240, PAPER, 700, "text-align: center; letter-spacing: -6px"), '1,000<span style="font-size:80px; letter-spacing:0"> 万套</span>')
c += box(64, 470, 1152, 26, font(16, 26, SILVER, 500, "text-align: center; letter-spacing: 4px"), "开发商口径")
c += source("来源：开发商公告，经澎湃新闻转引（2024 年 8 月 23 日）", align="center")
c += clicker(10)
pages.append(("10 1000 万套", c))

# 11 three peaks on one scale: the gap is the point, so the smallest is drawn to scale too
c = box(64, 40, 600, 18, font(12, 18, MUTED, 500, "letter-spacing: 4px"), "第二章　单机")
c += box(64, 76, 1152, 50, font(40, 50, PAPER, 700), "同样是国产动作大作，峰值能差几百倍")
rows = [("黑神话：悟空", 2415714, PAPER), ("明末：渊虚之羽", 131518, MUTED), ("失落之魂", 3070, SILVER)]
s = ""
for i, (nm, v, col) in enumerate(rows):
    y = 200 + i * 110
    c += box(64, y, 300, 30, font(20, 30, PAPER, 600), nm)
    w_ = max(v / 2415714 * 880, 2)
    s += '<rect x="64" y="%d" width="%.1f" height="28" fill="%s"/>' % (y + 40, w_, col if col != PAPER else "#E8E3DA")
    c += box(64 + int(w_) + 16, y + 36, 300, 36, font(28, 36, col, 700), "{:,}".format(v))
c += svg(s)
c += box(64, 540, 1152, 30, font(18, 30, PAPER, 500), '最高和最低相差约 <span style="color:%s; font-weight:700">787 倍</span>　这是 Steam 历史同时在线峰值，不是销量' % SILVER)
c += box(64, 580, 1152, 24, font(14, 24, MUTED), "同期国内主机游戏收入 9.61 亿元，下降 7.06%。协会给的原因：《黑神话：悟空》降温，后续新品跟进不足")
c += source("来源：SteamDB，经互联网档案馆快照（2025-12 至 2026-08），游戏工委 2026 年半年报告。倍数为计算", y=632)
c += clicker(11)
pages.append(("11 峰值", c))

# 12 one in four: a hundred dots, about a quarter lit
c = box(64, 40, 600, 18, font(12, 18, MUTED, 500, "letter-spacing: 4px"), "第二章　单机")
c += box(64, 150, 560, 230, font(200, 230, PAPER, 700, "letter-spacing: -4px"), '约 ¼')
c += box(64, 400, 560, 80, font(24, 38, PAPER, 500), "平常月份，Steam 用户里选简体中文客户端的比例")
c += box(64, 490, 560, 48, font(14, 24, MUTED), "去掉每年 2 月的冲高，平均 24.2%。统计的是客户端语言，不是国籍")
s = ""
for i in range(100):
    r_, col_ = divmod(i, 10)
    on = i < 24
    s += '<circle cx="%d" cy="%d" r="15" fill="%s"/>' % (730 + col_ * 46, 160 + r_ * 46, SILVER if on else "#26262C")
c += svg(s)
c += source("来源：Valve《Steam 硬件和软件调查》。平均值为计算，一个点约 1%", y=636)
c += clicker(12)
pages.append(("12 四分之一", c))

# 13 small teams: the empty studio at night on the left, three figures stacked on the right
c = photo("studio", 0, 0, 640, 720, "40% 50%")
c += box(440, 0, 200, 720, "background: linear-gradient(90deg, rgba(15,15,18,0) 0%, #0F0F12 100%)")
c += box(700, 40, 520, 18, font(12, 18, MUTED, 500, "letter-spacing: 4px"), "第二章　单机")
c += box(700, 80, 520, 100, font(40, 50, PAPER, 700), "小团队，<br>也有自己的路")
figs = [("300 万份+", "《逃离鸭科夫》首月内，发行方口径", SILVER), ("301,322", "《逃离鸭科夫》Steam 历史峰值", PAPER), ("5 人团队", "《戴森球计划》抢先体验 4 天 20 万份", PAPER)]
s = ""
for i, (v, d_, col) in enumerate(figs):
    y = 230 + i * 128
    s += line(700, y, 1216, y, "#3A3A42", 1)
    c += box(700, y + 14, 516, 64, font(52, 64, col, 700, "letter-spacing: -1px"), v)
    c += box(700, y + 82, 516, 24, font(14, 24, MUTED), d_)
c += svg(s)
c += box(700, 612, 516, 40, font(11, 16, DIM), "来源：哔哩哔哩 2025 年三季度业绩会，SteamDB 档案馆快照 2026-08，《戴森球计划》发行方新闻稿。左图为 AI 生成")
c += clicker(13)
pages.append(("13 小团队", c))

pages.append(("14 第三章", chapter(14, "第三章", "押注", "先算账，再下注", "city", "50% 60%")))

# 15 the bill: two bars standing, a hundred yuan of revenue, the gap is the sentence
c = box(64, 40, 600, 18, font(12, 18, MUTED, 500, "letter-spacing: 4px"), "第三章　押注")
c += box(64, 76, 1152, 50, font(40, 50, PAPER, 700), "出海最贵的不是研发，是流量")
base = 580
s = line(64, base, 640, base, "#3A3A42", 1)
for x, v, nm, col in ((140, 48.6, "销售费用", SILVER), (400, 4.3, "研发费用", MUTED)):
    h = v / 50 * 340
    s += '<rect x="%d" y="%.1f" width="160" height="%.1f" fill="%s"/>' % (x, base - h, h, col)
    s += text(x + 80, base - h - 18, "%.1f 元" % v, 40 if col == SILVER else 30, col if col == SILVER else PAPER, "middle", 700)
    s += text(x + 80, base + 28, nm, 16, PAPER, "middle", 500)
c += svg(s)
c += box(720, 220, 496, 30, font(16, 30, MUTED, 500, "letter-spacing: 2px"), "每 100 元营业收入里，2025 年")
c += box(720, 270, 496, 150, font(26, 42, PAPER, 500), "一家出海做得多的上市游戏公司，花在买量上的钱是研发的 11 倍多")
c += box(720, 450, 496, 80, "border-left: 2px solid %s; padding-left: 18px; box-sizing: border-box; " % SILVER + font(15, 26, MUTED), "年报原话：销售费用下降，「主要系报告期内互联网流量费用减少」")
c += source("来源：三七互娱《2025 年年度报告》。每 100 元营收占比和倍数为计算，销售费用为集团口径", y=632)
c += clicker(15)
pages.append(("15 买量", c))

# 16 three gates: three tall doors, each with its number
c = box(64, 40, 600, 18, font(12, 18, MUTED, 500, "letter-spacing: 4px"), "第三章　押注")
c += box(64, 76, 1152, 50, font(40, 50, PAPER, 700), "出海要过三道门：版号、合规、本地化")
c_doors = c
c = ""
gates = [("ticket", "版号", "1,525", "个", "今年 1 至 9 月国产游戏获批，月均约 169 个。进口只有 46 个。只在海外发行不需要国内版号"),
         ("shield-check", "合规", "4%", "", "欧盟 GDPR 最高罚全球营业额的 4%。韩国强制公示抽卡概率，海外公司也要"),
         ("languages", "本地化", "一成", "", "德英法合计已占出海收入一成。本地化没有行业统一单价，账要自己算")]
s = ""
for i, (ic, nm, v, u, d_) in enumerate(gates):
    x = 64 + i * 392
    s += '<path d="M %d 560 L %d 240 Q %d 170 %d 170 Q %d 170 %d 240 L %d 560" fill="%s" stroke="#3A3A42" stroke-width="1"/>' % (x, x, x, x + 184, x + 368, x + 368, x + 368, SURF)
    s += icon(ic, x + 168, 196, 32, SILVER, 1.5)
    c += box(x, 246, 368, 30, font(20, 30, MUTED, 600, "text-align: center; letter-spacing: 8px"), nm)
    c += box(x, 290, 368, 100, font(80, 100, SILVER if i == 0 else PAPER, 700, "text-align: center; letter-spacing: -2px"), v + ('<span style="font-size:26px"> %s</span>' % u if u else ""))
    c += box(x + 32, 410, 304, 120, font(14, 24, MUTED, 400, "text-align: center"), d_)
c = c_doors + svg(s) + c
c += source("来源：国家新闻出版署审批名单，官方名单现存数（2026-10-08 计数），欧盟 GDPR 原文，韩国文化体育观光部，游戏工委 2026 年半年报告", y=600)
c += clicker(16)
pages.append(("16 三道门", c))

# 17 five bets: one per line, large, the number in silver, the reason small
c = box(64, 40, 600, 18, font(12, 18, MUTED, 500, "letter-spacing: 4px"), "第三章　押注")
c += box(64, 76, 1152, 50, font(40, 50, PAPER, 700), "下一个十年，我押这五件事")
bets = [("押留存，不押拉新", "用户五年都在 6.64 亿到 6.84 亿之间"), ("押美国，把欧洲当第二主场", "美国稳在三成，德英法升到一成"), ("押新玩法，别只靠策略类的惯性", "合成类一年涨了 9.74 个百分点"),
        ("押 PC 和主机，按小团队的规模算账", "天花板有人摸到，3,070 的峰值也是真的"), ("押合规和本地化的完成度", "先定在哪运营，再定过哪几道门")]
s = ""
for i, (b_, r_) in enumerate(bets):
    y = 166 + i * 88
    s += line(64, y, 1216, y, "#2A2A30", 1)
    c += box(64, y + 14, 80, 60, font(44, 60, SILVER, 700), "%d" % (i + 1))
    c += box(150, y + 16, 620, 40, font(28, 40, PAPER, 700), b_)
    c += box(780, y + 24, 436, 30, font(16, 30, MUTED, 400, "text-align: right"), r_)
c += svg(s)
c += source("来源：游戏工委历年《中国游戏产业报告》，SteamDB，三七互娱《2025 年年度报告》", y=626)
c += clicker(17)
pages.append(("17 五件事", c))

# 18 the last sentence, alone
c = spot(640, 340, 460, 0.07)
c += box(64, 250, 1152, 180, font(64, 90, PAPER, 700, "text-align: center"), '下一个十年，<br>不比谁去得早，比谁<span style="color:%s">留得住</span>' % SILVER)
c += box(64, 600, 1152, 22, font(13, 22, DIM, 400, "text-align: center; letter-spacing: 6px"), "游戏开发者大会　二〇二六年十月")
c += clicker(18)
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
    loc = inner
    for k_ in IMG:
        loc = loc.replace(IMG[k_], "../up/" + k_ + ".jpg")
    cells.append('<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: %s; color: %s; font-family: %s">%s</div>' % (BG, PAPER, SANS, loc))
    cells.append('<div style="width:1280px;height:720px"><img src="../cur/cur%03d.png" style="width:1280px;height:720px"></div>' % (i + 1))
canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}, "title": "stage 游戏出海主题演讲样例设计稿",
          "launch": {"view": "canvas"}, "pages": [], "boards": boards, "order": order_, "notes": {}, "designSystems": []}
pc = os.path.join(P, 'canvas.json')
if os.path.exists(pc):
    canvas["createdOnFiles"] = json.load(open(pc))["createdOnFiles"]
json.dump(canvas, open(pc, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(L, 'sheet.html'), 'w').write('<!doctype html><meta charset="utf-8"><body style="margin:0;background:#888;display:grid;grid-template-columns:repeat(2,1280px);gap:16px;padding:16px;width:2592px">' + "".join(cells) + '</body>')
print(len(order_))
