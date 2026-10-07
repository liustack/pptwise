import json, os, re, datetime
ROOT = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(ROOT, 'project'); L = os.path.join(ROOT, 'local')
os.makedirs(P, exist_ok=True); os.makedirs(L, exist_ok=True)

# journal: a small periodical's own pages. Warm paper, ink, brick red for the one thing a page.
BG = "#EFEBE1"; SURF = "#F8F5EC"; INK = "#26261F"; PRIM = "#2C2C2A"; BRICK = "#8C4A3C"; BRICKL = "#E8DACF"
MOSS = "#4E5E4A"; TAUPE = "#827C6B"; MUTED = "#626159"; LINE = "#D9D3C2"; GHOST = "#C9C2B1"
SANS = "'PingFang SC', 'Microsoft YaHei', sans-serif"
SERIF = "'Songti SC', 'Noto Serif SC', 'STSong', Georgia, serif"
IMG = {k: "__%s__" % k for k in ["desk", "listening", "subway", "magazines", "bookshop", "library"]}
CUR = ["__CUR%02d__" % (i + 1) for i in range(18)]
TOTAL = 18
COL = "致读者"
ISSUE = "二〇二六年秋"

_cat = open(os.path.join(ROOT, '..', '..', '..', 'src', 'icons', 'catalog.ts')).read()


def _icon_svg(name):
    m = re.search(r'^  "%s": (\[.*\]),$' % re.escape(name), _cat, re.M)
    prims = json.loads(m.group(1))
    return ''.join('<%s %s/>' % (tag, ' '.join('%s="%s"' % (k, v) for k, v in attrs.items())) for tag, attrs in prims)


def icon(name, x, y, size=20, color=PRIM, sw=1.6):
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
<div style="position: relative; width: """ + str(w) + "px; height: " + str(h) + "px; overflow: hidden; background: " + BG + "; color: " + INK + "; font-family: " + SANS + """">
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


def serif(size, lh, color=INK, weight=600, extra=""):
    return font(size, lh, color, weight, "font-family: %s; %s" % (SERIF, extra))


def svg(body):
    return '<svg width="1280" height="720" viewBox="0 0 1280 720" style="position: absolute; left: 0; top: 0">' + body + '</svg>\n'


def rect(x, y, w, h, fill, extra=""):
    return '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s" %s/>' % (x, y, w, h, fill, extra)


def line(x1, y1, x2, y2, color=LINE, w=1, extra=""):
    return '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%.1f" %s/>' % (x1, y1, x2, y2, color, w, extra)


def text(x, y, s, size=12, fill=MUTED, anchor="start", weight=400, fam="PingFang SC, sans-serif"):
    return '<text x="%.1f" y="%.1f" font-size="%d" fill="%s" text-anchor="%s" font-weight="%d" font-family="%s">%s</text>' % (x, y, size, fill, anchor, weight, fam, s)


def tw(s, cjk=12, lat=7.2):
    return sum(cjk if ord(ch) > 0x2e80 else lat for ch in s)


def masthead(pg, section):
    """A running head as a periodical sets it: column name and issue, the section in brick, a heavy and a hairline rule."""
    out = box(64, 26, 400, 18, serif(13, 18, PRIM, 700, "letter-spacing: 6px"), COL)
    out += box(470, 26, 340, 18, font(11, 18, BRICK, 700, "text-align: center; letter-spacing: 4px"), section)
    out += box(816, 26, 400, 18, font(11, 18, MUTED, 400, "text-align: right; letter-spacing: 2px"), ISSUE + " · 年度长信")
    out += svg(line(64, 50, 1216, 50, PRIM, 2.2) + line(64, 55, 1216, 55, PRIM, 0.6))
    out += folio(pg)
    return out


def folio(pg, color=MUTED):
    return box(540, 684, 200, 20, serif(13, 20, color, 400, "text-align: center; letter-spacing: 2px"), "· %d ·" % pg)


def title(t_, y=70, h=88, size=32, x=64, w=1152):
    return box(x, y, w, h, "display: flex; flex-direction: column; justify-content: flex-end; " + serif(size, 44, INK, 700), "<div>" + t_ + "</div>")


def figcap(x, y, w, label, t_, comment=""):
    """A figure's caption under it, numbered, and the editor's one-line comment in italic."""
    out = box(x, y, w, 20, font(12, 20, INK, 400), '<b style="color:%s;letter-spacing:1px">%s</b>　%s' % (BRICK, label, t_))
    if comment:
        out += box(x, y + 22, w, 22, serif(13, 22, MUTED, 400, "font-style: italic"), comment)
    return out


def source(t_, y=648):
    return box(64, y, 1152, 30, font(11, 15, MUTED), t_)


def photo(key, x, y, w, h):
    return box(x, y, w, h, "overflow: hidden", '<img src="' + IMG[key] + '" alt="" style="display: block; width: %dpx; height: %dpx; object-fit: cover">' % (w, h))


def photocap(x, y, w, t_):
    return box(x, y, w, 18, serif(11, 18, MUTED, 400, "font-style: italic"), t_)


pages = []

# 1 cover: a periodical's cover with its masthead and cover lines
c = photo("desk", 620, 0, 660, 720)
c += svg(line(64, 64, 576, 64, PRIM, 2.4) + line(64, 70, 576, 70, PRIM, 0.6))
c += box(64, 84, 520, 110, serif(96, 110, PRIM, 800, "letter-spacing: 8px"), COL)
c += box(64, 198, 520, 22, font(13, 22, MUTED, 400, "letter-spacing: 3px"), ISSUE + " · 一封写给订阅读者的年度长信")
c += svg(line(64, 236, 576, 236, PRIM, 0.6))
c += box(64, 272, 540, 64, serif(50, 64, BRICK, 800), "我们还在读书吗")
c += box(64, 340, 520, 26, serif(17, 26, INK, 500), "十年阅读调查读下来，主编想和你说的话")
lines = [("十年里，读书的人和本数几乎没变", 3), ("跌得最狠的是报刊，我们也在其中", 6), ("书卖得更少、更便宜，也换了地方卖", 11), ("编辑部接下来一年的四个打算", 17)]
for i, (t_, p_) in enumerate(lines):
    y = 410 + i * 46
    c += svg(line(64, y + 38, 576, y + 38, LINE))
    c += box(64, y + 4, 60, 30, serif(22, 30, BRICK, 700), "%02d" % p_)
    c += box(124, y + 6, 452, 28, serif(16, 28, INK, 500), t_)
c += box(64, 648, 520, 20, font(11, 20, MUTED), "封面图为 AI 生成的示意图")
pages.append(("1 封面", c))

# 2 editor's note, with a drop cap and three figures
c = masthead(2, "编 者 按")
c += title("读书的人没变少，变的是读法")
body = "今年我们把十年的全国国民阅读调查从头读了一遍，想回答一个常被问起的问题：大家还在读书吗？答案比担心的好，也比想的复杂。读书的人和本数几乎没动，动的是读的方式和花的时间，而跌得最狠的那一条线，正好是我们自己。"
c += box(64, 192, 720, 400, serif(20, 38, INK, 400, "text-align: justify"), '<span style="float: left; font-size: 112px; line-height: 104px; font-weight: 800; color: %s; margin: 4px 14px 0 0">%s</span>%s' % (BRICK, body[0], body[1:]))
figs = [("book-open", "60.0%", "成年人图书阅读率", "2015 年 58.4%", PRIM), ("smartphone", "80.8%", "数字化阅读接触率", "2015 年 64.0%", PRIM), ("newspaper", "16.6%", "期刊阅读率", "2015 年 34.6%", BRICK)]
s = line(832, 188, 832, 600, LINE)
for i, (ic, v, k, base, col) in enumerate(figs):
    y = 188 + i * 140
    s += icon(ic, 864, y + 8, 22, col)
    c += box(900, y, 300, 60, serif(48, 60, col, 700), v)
    c += box(864, y + 66, 340, 22, font(13, 22, INK, 600), k)
    c += box(864, y + 90, 340, 20, font(12, 20, MUTED), base)
c += svg(s)
c += source("来源：第 13、23 次全国国民阅读调查（中国新闻出版研究院，调查年份 2015、2025），成年人，按该调查口径")
pages.append(("2 编者按", c))

# 3 ten years of books per head
c = masthead(3, "十 年")
c += title("十年里，读书的人从 58.4% 到 60.0%，人均纸书只多了 0.23 本")
yrs = list(range(2015, 2026))
paper = [4.58, 4.65, 4.66, 4.67, 4.65, 4.70, 4.76, 4.78, 4.75, 4.79, 4.81]
ebook = [3.26, 3.21, 3.12, 3.32, 2.84, 3.29, 3.30, 3.33, 3.40, 3.52, 3.58]
X0, X1, Y0, Y1 = 130, 1060, 200, 520
def lx(y): return X0 + (y - 2015) / 10 * (X1 - X0)
def ly(v): return Y1 - v / 6 * (Y1 - Y0)
s = ""
for v in (0, 2, 4, 6):
    s += line(X0, ly(v), X1, ly(v), LINE)
    s += text(X0 - 12, ly(v) + 4, "%d 本" % v, 12, MUTED, "end")
for yv in yrs:
    s += text(lx(yv), Y1 + 22, str(yv), 12, MUTED, "middle")
for vals, col, nm in [(paper, PRIM, "纸书"), (ebook, TAUPE, "电子书")]:
    s += '<polyline points="%s" fill="none" stroke="%s" stroke-width="2.6"/>' % (" ".join("%.1f,%.1f" % (lx(y), ly(v)) for y, v in zip(yrs, vals)), col)
    for y, v in [(2015, vals[0]), (2025, vals[-1])]:
        s += '<circle cx="%.1f" cy="%.1f" r="4.5" fill="%s"/>' % (lx(y), ly(v), col)
    s += text(lx(2015) - 10, ly(vals[0]) + 4, "%.2f" % vals[0], 14, col, "end", 700)
    s += text(lx(2025) + 12, ly(vals[-1]) + 5, "%s %.2f 本" % (nm, vals[-1]), 15, col, "start", 700)
s += '<circle cx="%.1f" cy="%.1f" r="4" fill="none" stroke="%s" stroke-width="1.6"/>' % (lx(2019), ly(2.84), BRICK)
s += text(lx(2019), ly(2.84) + 22, "2019 年电子书 2.84 本，一个凹点", 12, BRICK, "middle", 700)
c += svg(s)
c += figcap(64, 566, 1100, "图 1", "成年人人均阅读量（本），分母是全体成年人，调查年份 2015 至 2025", "4.81 本是平均数，被少数读得多的人拉高了，发布稿没有给中位数。")
c += source("来源：第 13 至 23 次全国国民阅读调查（中国新闻出版研究院）")
pages.append(("3 十年", c))

# 4 ways of reading
c = masthead(4, "读 法")
c += title("变的是读法：79.0% 的人用手机读，38.7% 的人用耳朵听", w=1152)
ways = [("smartphone", "手机阅读", 79.0), ("book-marked", "电脑端在线", 66.4), ("headphones", "听书", 38.7), ("book-open", "电子阅读器", 21.3), ("clapperboard", "视频讲书", 6.3)]
s = ""
for i, (ic, nm, v) in enumerate(ways):
    y = 196 + i * 62
    hot = nm == "听书"
    s += icon(ic, 64, y + 8, 20, BRICK if hot else PRIM)
    c += box(94, y + 4, 130, 28, font(15, 28, INK, 700 if hot else 500), nm)
    s += rect(230, y + 6, v * 4.6, 24, BRICK if hot else PRIM)
    c += box(int(240 + v * 4.6), y + 4, 120, 28, serif(18, 28, BRICK if hot else INK, 700), "%.1f%%" % v)
c += svg(s)
c += photo("listening", 820, 180, 396, 330)
c += photocap(820, 514, 396, "窗边听书的人（AI 生成示意）")
c += figcap(64, 520, 720, "图 2", "2025 年成年人各种读法的接触率（%），一个人可以同时用几种", "数字化阅读接触率十年从 64.0% 升到 80.8%，但 2019 年以后几乎不再涨。")
c += source("来源：第 13、17、23 次全国国民阅读调查")
pages.append(("4 读法", c))

# 5 where the minutes went
c = masthead(5, "时 间")
c += photo("subway", 64, 70, 420, 548)
c += photocap(64, 622, 420, "晚高峰的地铁车厢（AI 生成示意）")
c += title("纸书的时间没少，手机的时间多得多", x=530, w=686)
SC = 5.4
rows = [("smartphone", "每天接触手机", 80.43, 109.54, PRIM), ("book-open", "每天读纸书", 20.38, 24.68, BRICK)]
s = ""
for i, (ic, nm, a, b, col) in enumerate(rows):
    y = 196 + i * 130
    s += icon(ic, 530, y + 2, 20, col)
    c += box(560, y, 300, 24, font(14, 24, INK, 700), nm)
    s += rect(530, y + 34, b * SC, 30, col)
    s += line(530 + a * SC, y + 28, 530 + a * SC, y + 70, BG, 2, 'stroke-dasharray="3 3"')
    c += box(int(530 + b * SC) + 10, y + 30, 200, 38, serif(28, 38, col, 700), "%.2f" % b + '<span style="font-size:13px;font-weight:400;color:%s"> 分钟</span>' % MUTED)
    c += box(530, y + 72, 500, 20, font(12, 20, MUTED), "虚线是 2017 年：%.2f 分钟" % a)
c += svg(s)
c += box(530, 470, 686, 110, "border-top: 1px solid %s; padding-top: 14px; box-sizing: border-box; " % PRIM + serif(16, 28, INK, 400), "短视频用户 10.74 亿，占网民 95.4%。它挤走了多少读书时间，没有数据，只能说两件事同时在发生。")
c += source("来源：第 15、23 次全国国民阅读调查，CNNIC 第 57 次报告。2015 至 2016 年的手机时长指标名称不同，未并入", 648)
pages.append(("5 时间", c))

# 6 the big number, with its heading
c = masthead(6, "报 刊")
c += title("跌得最狠的是报刊：期刊阅读率十年少了一半还多")
c += box(64, 196, 600, 230, serif(200, 230, BRICK, 700, "letter-spacing: -6px"), '16.6<span style="font-size:72px">%</span>')
c += box(70, 430, 560, 26, serif(18, 26, INK, 500), "2025 年成年人期刊阅读率")
c += box(70, 460, 560, 22, font(13, 22, MUTED), "2015 年是 34.6%")
yrs2 = [2015, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
mag = [34.6, 25.3, 23.4, 19.3, 18.7, 18.4, 17.7, 17.5, 17.1, 16.6]
news = [45.7, 37.6, 35.1, 27.6, 25.5, 24.6, 23.5, 23.1, 22.5, 21.2]
SX0, SX1, SY0, SY1 = 740, 1190, 220, 470
def sx(y): return SX0 + (y - 2015) / 10 * (SX1 - SX0)
def sy(v): return SY1 - v / 50 * (SY1 - SY0)
s = ""
for v in (0, 25, 50):
    s += line(SX0, sy(v), SX1, sy(v), LINE)
    s += text(SX0 - 8, sy(v) + 4, "%d%%" % v, 11, MUTED, "end")
for vals, col, nm in [(news, TAUPE, "报纸"), (mag, BRICK, "期刊")]:
    s += '<polyline points="%s" fill="none" stroke="%s" stroke-width="2.4"/>' % (" ".join("%.1f,%.1f" % (sx(y), sy(v)) for y, v in zip(yrs2, vals)), col)
    s += text(sx(2015) - 4, sy(vals[0]) - 8, "%.1f" % vals[0], 12, col, "start", 700)
    s += text(sx(2025) + 6, sy(vals[-1]) + 4, "%s %.1f" % (nm, vals[-1]), 12, col, "start", 700)
s += text(sx(2016), SY1 - 6, "2016 留空", 10, MUTED, "middle")
for y in (2015, 2020, 2025):
    s += text(sx(y), SY1 + 18, str(y), 11, MUTED, "middle")
c += svg(s)
c += figcap(740, 506, 476, "图 3", "成年人报纸和期刊阅读率（%）", "2016 年两格没能核实，留空不连。")
c += source("来源：第 13 至 23 次全国国民阅读调查")
pages.append(("6 报刊大数", c))

# 7 these lines are ours
c = masthead(7, "报 刊")
c += photo("magazines", 64, 70, 380, 548)
c += photocap(64, 622, 380, "一摞旧杂志的书脊（AI 生成示意）")
c += title("报刊的线都在往下走，我们也在其中", x=490, w=726)
st = [("book-marked", "1.57", "期", "人均每年读的纸质期刊", "2015 年 4.91 期，少了 68%"), ("clock", "2.77", "分钟", "每天读期刊的时间", "2015 年 8.83 分钟"), ("newspaper", "21.2", "%", "报纸阅读率", "2015 年 45.7%")]
s = ""
for i, (ic, v, u, k, base) in enumerate(st):
    x = 490 + i * 244
    s += icon(ic, x, 196, 20, PRIM)
    c += box(x, 228, 230, 56, serif(46, 56, INK, 700), v + '<span style="font-size:16px;font-weight:400;color:%s"> %s</span>' % (MUTED, u))
    c += box(x, 290, 230, 22, font(13, 22, INK, 600), k)
    c += box(x, 314, 230, 20, font(12, 20, MUTED), base)
c += svg(s)
c += box(490, 380, 726, 200, "border-top: 1px solid %s; border-bottom: 1px solid %s; padding: 26px 0 0 56px; box-sizing: border-box; " % (PRIM, PRIM) + serif(24, 40, BRICK, 600), "这不是别人的数字。一本靠订阅读者撑着的杂志，就站在这几条线上。")
c += box(490, 384, 60, 80, serif(80, 80, BRICK, 700), "“")
c += source("来源：第 13、23 次全国国民阅读调查，成年人。期刊十年少了 68% 由两年数值计算：1.57 ÷ 4.91 − 1", 648)
pages.append(("7 我们在其中", c))

# 8 the reasons, as a pull quote
c = masthead(8, "不 读 的 人")
c += box(64, 130, 140, 160, serif(200, 200, BRICK, 700), "“")
c += box(220, 170, 900, 260, serif(40, 64, INK, 600), "没有读书的习惯或不喜欢读书。<br>工作太忙。<br>因上网、玩游戏、看电视、玩手机等没时间。")
c += svg(line(220, 470, 300, 470, BRICK, 2))
c += box(220, 486, 900, 50, font(14, 25, MUTED), "第 23 次全国国民阅读调查列出的不读书三条主要原因。各原因的占比没有公布。")
c += box(220, 100, 900, 24, font(13, 24, BRICK, 700, "letter-spacing: 3px"), "不读书的人自己说")
pages.append(("8 引语", c))

# 9 the regular readers
c = masthead(9, "常 读 的 人")
c += title("常读书的人在慢慢变多：一年读 10 本以上纸书的人从 10.2% 升到 13.5%")
ten = [(2017, 10.2), (2018, None), (2019, 11.1), (2020, 11.6), (2021, 11.9), (2022, None), (2023, 12.3), (2024, 13.2), (2025, 13.5)]
BX0, BW = 100, 74
def by(v): return 470 - v / 16 * 250
s = line(80, 470, 820, 470, PRIM, 1)
for i, (y, v) in enumerate(ten):
    x = BX0 + i * 80
    if v is None:
        s += rect(x, by(12), BW - 14, 470 - by(12), "none", 'stroke="%s" stroke-width="1" stroke-dasharray="4 3"' % GHOST)
        s += text(x + (BW - 14) / 2, by(12) - 8, "未公布", 11, MUTED, "middle")
    else:
        col = BRICK if y == 2025 else PRIM
        s += rect(x, by(v), BW - 14, 470 - by(v), col)
        s += text(x + (BW - 14) / 2, by(v) - 8, "%.1f" % v, 14, col, "middle", 700)
    s += text(x + (BW - 14) / 2, 490, str(y), 12, MUTED, "middle")
c += svg(s)
c += figcap(80, 514, 740, "图 4", "一年读 10 本以上纸书的成年人（%）", "2018、2022 年没有可核的数，留空。")
nums = [("45.9%", "最想「拿一本纸质书读」", "倾向题，2024 年起可能多选"), ("30.3%", "对自己的阅读满意", "不满意 13.8%，一般 46.2%")]
for i, (v, k, n) in enumerate(nums):
    y = 196 + i * 180
    c += box(880, y, 336, 160, "background: %s; border-top: 3px solid %s; box-sizing: border-box; padding: 18px 22px; " % (SURF, PRIM if i == 0 else TAUPE), "")
    c += box(902, y + 16, 300, 56, serif(46, 56, INK, 700), v)
    c += box(902, y + 80, 300, 24, font(15, 24, INK, 600), k)
    c += box(902, y + 108, 300, 20, font(12, 20, MUTED), n)
c += source("来源：第 15 至 23 次全国国民阅读调查")
pages.append(("9 常读的人", c))

# 10 town and country, children and adults
c = masthead(10, "谁 读 得 少")
c += title("城镇和农村差 18.4 个百分点，孩子比大人读得多")
ur = [(2017, 67.5, 49.3), (2019, 67.9, 49.8), (2020, 68.3, 49.9), (2021, 68.5, 50.0), (2022, 68.6, 50.2)]
def uy(v): return 480 - v / 80 * 270
s = line(70, 480, 760, 480, PRIM)
for i, (y, u, r) in enumerate(ur):
    x = 90 + i * 112
    s += rect(x, uy(u), 40, 480 - uy(u), PRIM)
    s += rect(x + 44, uy(r), 40, 480 - uy(r), TAUPE)
    s += text(x + 20, uy(u) - 7, "%.1f" % u, 12, PRIM, "middle", 700)
    s += text(x + 64, uy(r) - 7, "%.1f" % r, 12, TAUPE, "middle", 700)
    s += text(x + 42, 500, str(y), 12, MUTED, "middle")
x = 90 + 5 * 112
s += rect(x, uy(68), 84, 480 - uy(68), "none", 'stroke="%s" stroke-width="1" stroke-dasharray="4 3"' % GHOST)
s += text(x + 42, uy(68) + 40, "2023 年起", 11, MUTED, "middle")
s += text(x + 42, uy(68) + 56, "未公布", 11, MUTED, "middle")
s += rect(90, 202, 12, 12, PRIM) + text(108, 213, "城镇", 12, INK) + rect(160, 202, 12, 12, TAUPE) + text(178, 213, "农村", 12, INK)
c += svg(s)
c += figcap(70, 520, 690, "图 5", "城乡成年人图书阅读率（%）", "2022 年人均纸书：城镇 5.61 本，农村 3.77 本。")
c += box(820, 196, 396, 330, "background: %s; box-sizing: border-box; " % SURF, "")
c += svg(icon("baby", 846, 220, 22, BRICK))
c += box(880, 216, 320, 28, font(15, 28, INK, 700), "0 至 17 岁的孩子")
c += box(846, 260, 340, 70, serif(60, 70, BRICK, 700), "86.7%")
c += box(846, 334, 340, 22, font(13, 22, MUTED), "图书阅读率，成年人是 60.0%")
c += box(846, 380, 340, 44, serif(34, 44, INK, 700), '11.72<span style="font-size:14px;font-weight:400;color:%s"> 本</span>' % MUTED)
c += box(846, 428, 340, 22, font(13, 22, MUTED), "人均图书阅读量")
c += box(846, 466, 340, 44, font(12, 20, MUTED, 400, "font-style: italic"), "孩子和大人的「本」口径不同，只比阅读率")
c += source("来源：第 15、17 至 20、23 次全国国民阅读调查")
pages.append(("10 城乡", c))

# 11 the market
c = masthead(11, "书 业")
c += title("书卖得更少也更便宜：码洋只有 2019 年的 86%，平均 5.8 折")
mk = [(2019, 1286), (2020, 1221), (2021, 1241), (2022, 1095), (2023, 1146), (2024, 1129), (2025, 1104)]
def my(v): return 480 - v / 1400 * 260
s = line(80, 480, 780, 480, PRIM)
for i, (y, v) in enumerate(mk):
    x = 100 + i * 96
    col = BRICK if y == 2025 else PRIM
    s += rect(x, my(v), 64, 480 - my(v), col)
    s += text(x + 32, my(v) - 8, str(v), 13, col, "middle", 700)
    s += text(x + 32, 500, str(y), 12, MUTED, "middle")
s += line(132, my(1286) - 28, 132 + 6 * 96, my(1286) - 28, MUTED, 0.8)
s += line(132, my(1286) - 28, 132, my(1286) - 22, MUTED, 0.8) + line(132 + 6 * 96, my(1286) - 28, 132 + 6 * 96, my(1104) - 22, MUTED, 0.8)
s += text(132 + 3 * 96, my(1286) - 34, "−14%", 12, MUTED, "middle", 700)
c += svg(s)
c += box(80, 186, 400, 22, font(11, 22, BRICK, 700, "letter-spacing: 1px"), "企业口径 · 2025 年回溯后的新口径")
c += figcap(80, 516, 700, "图 6", "图书零售码洋（亿元，按定价计）", "旧口径的当年公布值约低 25.7%，不能和这条线相接。")
disc = [("2022", "6.6"), ("2023", "6.1"), ("2025", "5.8"), ("2026 Q1", "5.6")]
c += box(840, 196, 376, 24, font(13, 24, INK, 700), "平均折扣（实付占定价）")
s = ""
for i, (y, d) in enumerate(disc):
    yy = 236 + i * 64
    hot = y == "2025"
    c += box(840, yy, 100, 44, font(13, 44, MUTED), y)
    c += box(940, yy, 200, 44, serif(36 if hot else 28, 44, BRICK if hot else INK, 700), d + '<span style="font-size:13px;font-weight:400;color:%s"> 折</span>' % MUTED)
    s += line(840, yy + 54, 1216, yy + 54, LINE)
c += svg(s)
c += box(840, 500, 376, 44, font(12, 20, MUTED), "2025 年码洋 −2.24%，实洋 −3.80%")
c += source("来源：北京开卷（企业口径），经德国图书信息中心《Buchmarkt China 2024、2025》转述，虎嗅转北京开卷（2026 年一季度）")
pages.append(("11 书业", c))

# 12 where and what
c = masthead(12, "书 业")
c += title("四成的书在内容电商卖出，少儿和教辅占码洋一半多")
ch = [(2022, [45.06, 16.42, 23.22, 15.30]), (2023, [41.46, 26.67, 19.93, 11.93]), (2024, [40.92, 30.38, 14.70, 13.99]), (2025, [32.37, 40.53, 13.44, 13.65])]
names = ["平台电商", "内容电商", "垂直及其他", "实体店"]
cols = [TAUPE, BRICK, GHOST, MOSS]
s = ""
for i, (y, parts) in enumerate(ch):
    x = 90 + i * 124
    yy = 480
    for j, v in enumerate(parts):
        h = v / 100 * 270
        s += rect(x, yy - h, 84, h - 1.5, cols[j])
        if v >= 12:
            s += text(x + 42, yy - h / 2 + 5, "%.1f" % v, 12 if not (j == 1 and y == 2025) else 14, "#FFFFFF" if j in (0, 1, 3) else INK, "middle", 700)
        yy -= h
    s += text(x + 42, 500, str(y), 12, MUTED, "middle")
for j, nm in enumerate(names):
    s += rect(90 + j * 112, 190, 12, 12, cols[j]) + text(108 + j * 112, 201, nm, 12, INK)
c += svg(s)
c += figcap(90, 516, 500, "图 7", "零售码洋渠道结构（%）", "内容电商指抖音、快手、小红书这类平台。")
c += photo("bookshop", 640, 186, 576, 190)
c += photocap(640, 380, 576, "街角的小书店（AI 生成示意）")
cat = [("少儿", 28.79, PRIM), ("教辅", 26.47, TAUPE), ("文学", 8.84, BRICK), ("其他", 35.90, GHOST)]
c += box(640, 410, 576, 22, font(13, 22, INK, 700), "2025 年码洋按品类（%）")
s = ""
x = 640
for nm, v, col in cat:
    w = v / 100 * 576
    s += rect(x, 440, w - 2, 40, col)
    c += box(int(x) + 8, 440, int(w) - 10, 40, font(12, 20, "#FFFFFF" if col in (PRIM, TAUPE, BRICK) else INK, 700, "padding-top: 0"), "%s<br>%.2f" % (nm, v))
    x += w
c = c.replace('<svg width="1280"', '<svg width="1280"', 1)
c = svg(s) + c
c += box(640, 490, 576, 40, font(12, 20, MUTED), "文学只占 8.84%。「其他」由 100 减三类计算。")
c += source("来源：北京开卷（企业口径），经德国图书信息中心转述")
pages.append(("12 渠道品类", c))

# 13 libraries: two small multiples, each on its own axis
c = masthead(13, "图 书 馆")
c += title("去图书馆的人比 2019 年多 63%，借出的书却比上年少了 0.3%")
ly_ = [2019, 2020, 2021, 2022, 2023, 2024, 2025]
visits = [9.01, 5.41, 7.46, 7.90, 11.61, 13.4, 14.7]
loans = [6.14, 4.21, 5.87, 6.07, 7.83, 8.4, 8.3]
s = ""
for k, (vals, top, nm, x0, hot) in enumerate([(visits, 16, "总流通（亿人次）", 80, 6), (loans, 10, "书刊外借（亿册次）", 660, 6)]):
    s += line(x0, 470, x0 + 500, 470, PRIM)
    s += text(x0, 200, nm, 13, INK, "start", 700)
    for i, v in enumerate(vals):
        x = x0 + 10 + i * 70
        h = v / top * 230
        col = BRICK if (k == 1 and i == 6) else PRIM
        s += rect(x, 470 - h, 48, h, col)
        s += text(x + 24, 470 - h - 8, ("%.2f" % v).rstrip("0").rstrip(".") if v < 10 or i < 5 else "%.1f" % v, 13, col, "middle", 700)
        s += text(x + 24, 490, str(ly_[i]), 11, MUTED, "middle")
c += svg(s)
c += figcap(80, 510, 1100, "图 8、图 9", "公共图书馆总流通和书刊外借，各用自己的纵轴", "每个到馆人次借出的书，从 0.68 册降到 0.56 册。城镇成年人里只有 16.2% 用过图书馆。")
c += source("来源：文化和旅游部 2019 至 2025 年文化和旅游发展统计公报，第 23 次全国国民阅读调查")
pages.append(("13 图书馆", c))

# 14 abroad, side by side
c = masthead(14, "别 处")
c += title("别的国家也在问这个问题，但问法不同，只能并排看")
rows = [("美国 · Pew，2025", "过去 12 个月读过至少一本书，读一部分也算", "75%", "2011 年 78%"),
        ("美国 · NEA，2022", "过去一年为兴趣读过书，不含工作和学习用书", "48.5%", "2012 年 54.6%"),
        ("日本 · 文化厅，2024", "16 岁以上，一个月一本书都不读", "62.6%", "调查方式已改，前后不宜比"),
        ("英国 · NLT，2026", "8 至 18 岁，喜欢课余读书", "36.1%", "2025 年 32.7%"),
        ("中国 · 国民阅读调查，2025", "成年人图书阅读率，按该调查口径", "60.0%", "2015 年 58.4%")]
s = line(64, 196, 1216, 196, PRIM, 2)
for x, t_ in [(64, "调查"), (370, "问的是什么"), (900, "结果"), (1030, "早些时候")]:
    c += box(x, 202, 300, 22, font(12, 22, MUTED, 700), t_)
s += line(64, 228, 1216, 228, PRIM, 0.6)
for i, (who, q, v, base) in enumerate(rows):
    y = 232 + i * 64
    s += icon("flag", 64, y + 21, 16, TAUPE)
    c += box(90, y + 18, 280, 26, serif(16, 26, INK, 600), who)
    c += box(370, y + 18, 520, 26, font(14, 26, INK), q)
    c += box(900, y + 14, 120, 34, serif(26, 34, INK, 700), v)
    c += box(1030, y + 18, 186, 26, font(13, 26, MUTED), base)
    s += line(64, y + 64, 1216, y + 64, LINE)
c += svg(s)
c += box(64, 568, 1152, 30, serif(16, 30, BRICK, 600, "font-style: italic"), "问的不是同一个问题。只能并排看，不能排高低。")
c += source("来源：Pew Research Center（2026-04），NEA 2022 艺术参与调查，日本文化厅（2024-09），英国 National Literacy Trust（2025、2026），第 13、23 次全国国民阅读调查")
pages.append(("14 别处", c))

# 15 paper and screen, the effect on one scale
c = masthead(15, "纸 与 屏")
c += title("纸比屏幕读得懂一点，差距是小效应，主要在说明文和限时阅读")
conds = [("总体", -0.21, -0.25), ("说明文", -0.27, -0.32), ("叙事文", 0.01, -0.04), ("限时阅读", -0.26, None), ("自定节奏", -0.09, None)]
ZX = 760; SCX = 1100  # px per unit g
def gx(g): return ZX + g * SCX
s = line(gx(0), 206, gx(0), 520, PRIM, 1.2)
for g in (-0.4, -0.3, -0.2, -0.1, 0.1):
    s += line(gx(g), 206, gx(g), 520, LINE, 1, 'stroke-dasharray="3 4"')
    s += text(gx(g), 540, "%+.1f" % g, 12, MUTED, "middle")
s += text(gx(0), 540, "0", 12, INK, "middle", 700)
s += text(gx(-0.4), 562, "← 屏幕比纸差", 12, MUTED, "start")
s += text(gx(0.1), 562, "纸比屏幕差 →", 12, MUTED, "end")
for i, (nm, d, cl) in enumerate(conds):
    y = 226 + i * 60
    c += box(64, y - 4, 200, 30, serif(17, 30, INK, 600), nm)
    s += line(gx(-0.4), y + 11, gx(0.1), y + 11, LINE, 0.6)
    s += '<circle cx="%.1f" cy="%.1f" r="7" fill="%s"/>' % (gx(d), y + 11, BRICK)
    s += text(gx(d), y - 4, "%+.2f" % d, 12, BRICK, "middle", 700)
    if cl is not None:
        s += '<rect x="%.1f" y="%.1f" width="12" height="12" fill="%s" transform="rotate(45 %.1f %.1f)"/>' % (gx(cl) - 6, y + 5, PRIM, gx(cl), y + 11)
        s += text(gx(cl), y + 34, "%+.2f" % cl, 12, PRIM, "middle", 700)
s += '<circle cx="290" cy="200" r="6" fill="%s"/>' % BRICK + text(302, 204, "Delgado 等 2018", 12, INK)
s += '<rect x="410" y="194" width="11" height="11" fill="%s" transform="rotate(45 415.5 199.5)"/>' % PRIM + text(428, 204, "Clinton 2019", 12, INK)
c += svg(s)
c += box(64, 580, 1152, 30, serif(15, 30, MUTED, 400, "font-style: italic"), "Hedges' g 约 0.2 是小效应，不能读成「理解提高 21%」。读纸的人对自己读懂了多少，判断也更准。")
c += source("来源：Delgado 等（2018），Educational Research Review 25；Clinton（2019），Journal of Research in Reading 42(2)。均为元分析，Clinton 未单列限时和自定节奏".replace("；", "，"))
pages.append(("15 纸与屏", c))

# 16 the long-form page: two columns and a pull quote across them
c = masthead(16, "长 文")
c += title("读者没有离开书，离开的是报刊上那段固定的时间")
colA = "把这些数字放在一起读，编辑部最直接的感受是：读书的人还在。十年里读书的人、读的本数几乎没动，每天读纸书的时间还多了约 5 分钟。少掉的是报刊，是从前每天留给报纸和杂志的那一段时间。"
colB = "一本杂志能做的，是让值得读完的文章更容易被读完：在纸上，在耳机里，在图书馆的长桌上。下一页是编辑部接下来一年的打算，每一条都写了为什么，做到多少，明年这封信里再向你交代。"
c += box(64, 186, 540, 220, serif(20, 38, INK, 400, "text-align: justify"), colA)
c += box(676, 186, 540, 220, serif(20, 38, INK, 400, "text-align: justify"), colB)
c += svg(line(640, 190, 640, 400, LINE))
c += svg(line(64, 420, 1216, 420, PRIM, 1.2) + line(64, 568, 1216, 568, PRIM, 1.2))
c += box(64, 430, 80, 90, serif(90, 90, BRICK, 700), "“")
c += box(150, 452, 1000, 100, serif(32, 50, BRICK, 600), "我们不打算把文章剪短，去和屏幕抢那几秒钟。")
pages.append(("16 长文", c))

# 17 plans, written as plans
c = masthead(17, "编 辑 部 的 打 算")
c += title("接下来一年，编辑部打算做四件事，每件都从这些数字里来")
plans = [("一", "book-open", "每期留一篇能读完的长文", "纸书的时间十年没少，45.9% 的人最想拿一本纸质书读"),
         ("二", "headphones", "重点文章出音频版", "38.7% 的成年人在听书，文章也该能被听完"),
         ("三", "library", "读者会搬进公共图书馆", "到馆人次比 2019 年多 63%，借书却停了"),
         ("四", "pen-line", "每个数字都写明口径", "这封信里的数，几乎每个都要带着口径读")]
s = ""
for i, (n, ic, t_, why) in enumerate(plans):
    y = 192 + i * 92
    c += box(64, y, 60, 60, serif(40, 60, BRICK, 700), n)
    s += icon(ic, 130, y + 18, 22, PRIM)
    c += box(166, y + 8, 560, 32, serif(22, 32, INK, 700), t_)
    c += box(166, y + 44, 560, 22, font(14, 22, MUTED), "为什么：" + why)
    s += line(64, y + 82, 760, y + 82, LINE)
c += svg(s)
c += photo("library", 800, 192, 416, 360)
c += photocap(800, 556, 416, "公共图书馆的阅览区（AI 生成示意）")
c += box(64, 568, 700, 26, serif(14, 26, MUTED, 400, "font-style: italic"), "以上是编辑部的计划，不是已经做到的事。数字来源见前文各页。")
pages.append(("17 打算", c))

# 18 the sign-off
c = masthead(18, "后 记")
c += box(64, 200, 1152, 150, serif(44, 74, INK, 600), "人还在读，只是换了读法。<br>我们也换一种做法，接着陪你读。")
c += svg(line(900, 470, 1216, 470, PRIM, 0.8))
c += box(900, 484, 316, 40, serif(26, 40, INK, 700, "text-align: right; letter-spacing: 6px"), "主编")
c += box(900, 528, 316, 26, serif(15, 26, MUTED, 400, "text-align: right; letter-spacing: 3px"), "二〇二六年十月")
pages.append(("18 落款", c))

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
    cells.append('<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: %s; color: %s; font-family: %s">%s</div>' % (BG, INK, SANS, loc))
    cells.append('<div style="width:1280px;height:720px"><img src="../cur/cur%03d.png" style="width:1280px;height:720px"></div>' % (i + 1))
canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}, "title": "journal 年度长信样例设计稿",
          "launch": {"view": "canvas"}, "pages": [], "boards": boards, "order": order_, "notes": {}, "designSystems": []}
pc = os.path.join(P, 'canvas.json')
if os.path.exists(pc):
    canvas["createdOnFiles"] = json.load(open(pc))["createdOnFiles"]
json.dump(canvas, open(pc, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(L, 'sheet.html'), 'w').write('<!doctype html><meta charset="utf-8"><body style="margin:0;background:#888;display:grid;grid-template-columns:repeat(2,1280px);gap:16px;padding:16px;width:2592px">' + "".join(cells) + '</body>')
print(len(order_))
