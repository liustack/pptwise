import json, os, re, datetime, math
ROOT = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(ROOT, 'project'); L = os.path.join(ROOT, 'local')
os.makedirs(P, exist_ok=True); os.makedirs(L, exist_ok=True)

# lecture: a dark green board after the lights go down, one stroke of yellow chalk under the thing that matters.
BG = "#1C2823"; SURF = "#26342E"; PANEL = "#22302A"; CHALK = "#EFF3EC"; YELLOW = "#E9C46A"; MUTED = "#A9BCAF"; LINE = "#3A4A42"; DIM = "#7F9488"; WOOD = "#5A4632"
SERIF = "'Songti SC', 'STSong', 'Noto Serif SC', Georgia, serif"
SANS = "'PingFang SC', 'Microsoft YaHei', sans-serif"
KEYS = ["tax-apartment", "tax-building", "tax-classroom", "tax-desk2", "tax-hands"]
IMG = {k: "__%s__" % k.replace("-", "_") for k in KEYS}
CUR = ["__CUR%02d__" % (i + 1) for i in range(18)]
TOTAL = 18
CLASS = "青年夜校 · 一节课学会个税年度汇算"

_cat = open('/Users/leon/projects/pptwise/src/icons/catalog.ts').read()


def _icon_svg(name):
    m = re.search(r'^  "%s": (\[.*\]),$' % re.escape(name), _cat, re.M)
    prims = json.loads(m.group(1))
    return ''.join('<%s %s/>' % (tag, ' '.join('%s="%s"' % (k, v) for k, v in attrs.items())) for tag, attrs in prims)


def icon(name, x, y, size=20, color=CHALK, sw=1.6):
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
<div style="position: relative; width: """ + str(w) + "px; height: " + str(h) + "px; overflow: hidden; background: " + BG + "; color: " + CHALK + "; font-family: " + SANS + """">
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


def font(size, lh, color=CHALK, weight=400, extra="", family=SANS):
    return "font-family: %s; font-size: %dpx; line-height: %dpx; color: %s; font-weight: %d; %s" % (family, size, lh, color, weight, extra)


def serif(size, lh, color=CHALK, weight=400, extra=""):
    return font(size, lh, color, weight, extra, SERIF)


def svg(body):
    return '<svg width="1280" height="720" viewBox="0 0 1280 720" style="position: absolute; left: 0; top: 0">' + body + '</svg>\n'


def line(x1, y1, x2, y2, c=LINE, w=1, dash=None):
    d = ' stroke-dasharray="%s"' % dash if dash else ''
    return '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%.2f" stroke-linecap="round"%s/>' % (x1, y1, x2, y2, c, w, d)


def text(x, y, s, size=12, fill=MUTED, anchor="start", weight=400, fam="PingFang SC, sans-serif"):
    return '<text x="%.1f" y="%.1f" font-size="%d" fill="%s" text-anchor="%s" font-weight="%d" font-family="%s">%s</text>' % (x, y, size, fill, anchor, weight, fam, s)


def chalk_under(x1, y, x2, c=YELLOW, w=5):
    """One stroke of chalk: a slightly bowed line laid twice, the second thinner and broken, the way chalk skips on a board."""
    return ('<path d="M %.1f %.1f Q %.1f %.1f %.1f %.1f" stroke="%s" stroke-width="%.1f" fill="none" stroke-linecap="round" opacity="0.95"/>' % (x1, y + 1, (x1 + x2) / 2, y - 3, x2, y, c, w)
            + '<path d="M %.1f %.1f Q %.1f %.1f %.1f %.1f" stroke="%s" stroke-width="%.1f" fill="none" stroke-linecap="round" stroke-dasharray="14 6 30 5" opacity="0.5"/>' % (x1 + 6, y + 4, (x1 + x2) / 2, y + 1, x2 - 4, y + 3, c, w * 0.5))


def chalk_ring(cx, cy, rx, ry, c=YELLOW):
    return '<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="none" stroke="%s" stroke-width="2.6" stroke-dasharray="60 4 30 3" transform="rotate(-4 %.1f %.1f)"/>' % (cx, cy, rx, ry, c, cx, cy)


def brace(x1, x2, y, c=MUTED):
    """A curly brace under a term, opening downward, tip at the middle."""
    m = (x1 + x2) / 2
    return '<path d="M %.1f %.1f Q %.1f %.1f %.1f %.1f L %.1f %.1f Q %.1f %.1f %.1f %.1f Q %.1f %.1f %.1f %.1f L %.1f %.1f Q %.1f %.1f %.1f %.1f" fill="none" stroke="%s" stroke-width="2" stroke-linecap="round"/>' % (
        x1, y, x1, y + 10, x1 + 12, y + 10, m - 10, y + 10, m, y + 10, m, y + 20, m, y + 10, m + 10, y + 10, x2 - 12, y + 10, x2, y + 10, x2, y, c)


def board(pg, step):
    """The board itself: a wooden frame with a chalk ledge, the lesson step written small top left, the page as the period number top right."""
    s = '<rect x="10" y="10" width="1260" height="700" fill="none" stroke="%s" stroke-width="2"/>' % WOOD
    s += '<rect x="10" y="684" width="1260" height="26" fill="%s"/>' % WOOD
    s += '<rect x="10" y="684" width="1260" height="3" fill="#6E5A44"/>'
    s += '<rect x="1120" y="690" width="44" height="9" rx="3" fill="%s" opacity="0.92"/>' % CHALK + '<rect x="1176" y="691" width="30" height="8" rx="3" fill="%s" opacity="0.9"/>' % YELLOW
    s += '<rect x="80" y="692" width="70" height="12" rx="2" fill="#3B3A36"/>' + '<rect x="80" y="692" width="70" height="4" rx="1" fill="#8C7A60"/>'
    out = svg(s)
    if step:
        out += box(64, 34, 700, 18, font(12, 18, MUTED, 500, "letter-spacing: 3px"), step)
    out += box(1100, 30, 116, 24, serif(15, 24, MUTED, 400, "text-align: right"), "%d / %d" % (pg, TOTAL))
    out += box(170, 690, 600, 16, font(10, 16, "#C8B89C", 400, "letter-spacing: 2px"), CLASS)
    return out


def title(t_, y=62, h=80, x=64, w=1152, size=34):
    return box(x, y, w, h, "display: flex; flex-direction: column; justify-content: flex-end; " + serif(size, size + 12, CHALK, 400), "<div>" + t_ + "</div>")


def source(t_, y=646, x=64, w=1152, align="left"):
    return box(x, y, w, 30, font(11, 15, DIM, 400, "text-align: %s" % align), t_)


def photo(key, x, y, w, h, pos="50% 50%"):
    return box(x, y, w, h, "overflow: hidden; ", '<img src="' + IMG[key] + '" alt="" style="display: block; width: %dpx; height: %dpx; object-fit: cover; object-position: %s">' % (w, h, pos))


def cap(x, y, w, t_, align="left"):
    return box(x, y, w, 16, font(10, 16, DIM, 400, "text-align: %s" % align), t_)


def example_tag(x, y):
    return box(x, y, 150, 24, "border: 1.5px dashed %s; border-radius: 4px; text-align: center; " % YELLOW + font(12, 21, YELLOW, 600), "例题 · 数字为虚构")


pages = []

# 1 cover: the board with the title in chalk, one yellow stroke under the subject
c = board(1, None)
c += box(64, 64, 600, 20, font(13, 20, MUTED, 500, "letter-spacing: 6px"), "青年夜校　第 1 讲")
c += box(64, 190, 1100, 100, serif(84, 100, CHALK, 400), "一节课学会")
c += box(64, 290, 1100, 120, serif(104, 120, YELLOW, 400), "个税年度汇算")
c += svg(chalk_under(70, 428, 720, YELLOW, 6))
c += box(64, 460, 1000, 34, serif(24, 34, MUTED, 400), "把全年的账重算一遍，多交的退回来，少交的按时补上")
c += box(64, 580, 600, 24, font(14, 24, DIM, 400, "letter-spacing: 3px"), "下课前，你能自己算出是退还是补")
pages.append(("1 封面", c))

# 2 tonight: three chalk boxes, one, two, three
c = board(2, "本节课")
c += title("今晚学会三件事：看懂、算对、自己去办")
s = ""
for i, (n, ic, t_, d_) in enumerate((("一", "book-open", "看懂", "每月都扣了税，为什么年底还要再算一遍"), ("二", "calculator", "算对", "跟着一道例题，从全年收入一路算到退税"), ("三", "smartphone", "去办", "判断自己要不要办，什么时候、在哪儿办"))):
    x = 64 + i * 392
    s += '<rect x="%d" y="210" width="368" height="300" fill="none" stroke="%s" stroke-width="2" stroke-dasharray="80 4 40 3"/>' % (x, MUTED)
    c += box(x + 28, 228, 80, 80, serif(64, 80, YELLOW if i == 1 else CHALK, 400), n)
    s += icon(ic, x + 300, 240, 36, MUTED, 1.6)
    c += box(x + 28, 330, 312, 46, serif(34, 46, CHALK, 400), t_)
    c += box(x + 28, 392, 312, 80, font(16, 28, MUTED), d_)
c += svg(s + chalk_under(392 + 64 + 28, 384, 392 + 64 + 104, YELLOW, 4))
c += box(64, 560, 1152, 26, font(15, 26, MUTED), "例题里的人和数字都是虚构的。规则都标了出处，写在每页底部")
pages.append(("2 三件事", c))

# 3 why: two ways of withholding drawn as two chalk paths that meet at the year-end recount
c = board(3, "一　看懂") + "<!--UNDER-->"
c += title("每月扣了税还要汇算，因为平时是分开预扣的")
c += photo("tax-desk2", 64, 180, 400, 300)
c += cap(64, 488, 400, "示意图（AI 生成）")
s = ""
for i, (nm, d_, y) in enumerate((("工资", "单位按月预扣，只看本单位，每月减 5000 元", 196), ("劳务、稿酬", "支付方按次预扣，预扣率 20% 起，不减 6 万元，也不减专项附加扣除", 340))):
    s += '<rect x="510" y="%d" width="380" height="110" fill="%s" stroke="%s" stroke-width="1.5"/>' % (y, PANEL, MUTED)
    c += box(530, y + 16, 340, 30, serif(22, 30, CHALK, 400), nm)
    c += box(530, y + 52, 340, 50, font(14, 22, MUTED), d_)
    s += '<path d="M 890 %d C 930 %d, 930 %d, 970 %d" fill="none" stroke="%s" stroke-width="2.4" stroke-linecap="round"/>' % (y + 55, y + 55, 323, 323, CHALK)
s += '<path d="M 962 316 L 972 323 L 962 330" fill="none" stroke="%s" stroke-width="2.4" stroke-linecap="round"/>' % CHALK
s += '<rect x="980" y="250" width="236" height="150" fill="none" stroke="%s" stroke-width="2.6" stroke-dasharray="80 4 40 3"/>' % YELLOW
c = c.replace("<!--UNDER-->", svg(s))
c += box(1000, 268, 200, 36, serif(26, 36, YELLOW, 400), "年度汇算")
c += box(1000, 312, 200, 80, font(15, 25, CHALK), "四项合起来<br>按全年重算<br>多退少补")
c += source("来源：国家税务总局公告 2018 年第 61 号第六、八条，国家税务总局令第 57 号第三条")
pages.append(("3 为什么", c))

# 4 the formula, with a brace under each term saying where it comes from
c = board(4, "二　算对")
c += box(64, 160, 1152, 30, font(18, 30, MUTED, 400, "letter-spacing: 4px"), "今晚只要记住一个式子")
terms = [("应纳税额", 192, CHALK), ("＝", 48, MUTED), ("应纳税所得额", 288, CHALK), ("×", 48, MUTED), ("税率", 96, CHALK), ("−", 48, MUTED), ("速算扣除数", 240, YELLOW)]
x = 88
pos = []
for t_, w, col in terms:
    c += box(x, 236, w, 64, serif(48, 64, col, 400, "text-align: center"), t_)
    pos.append((x, w))
    x += w + 24
(ax, aw), (bx, bw), (cx_, cw) = pos[2], pos[4], pos[6]
s = brace(ax, ax + aw, 312) + brace(bx, bx + bw, 312) + brace(cx_, cx_ + cw, 312) + chalk_under(cx_, 304, cx_ + cw, YELLOW, 5)
c += svg(s)
for (px, pw), t_ in (((ax, aw), "全年收入额 − 6 万元 − 各项扣除<br>第 6 到 8 页"), ((bx, bw), "查税率表<br>第 9 页"), ((cx_, cw), "跟税率配套<br>算起来省事")):
    w2 = max(pw, 260)
    c += box(int(px + pw / 2 - w2 / 2), 350, w2, 70, font(15, 25, MUTED, 400, "text-align: center"), t_)
c += source("来源：国家税务总局令第 57 号第三条，个人所得税法附税率表一")
pages.append(("4 公式", c))

# 5 who: a chalk decision tree, four leaves
c = board(5, "三　去办")
c += title("想退税就得自己办，补税不多的可以不办")
s = ""
def node(x, y, w, t_, sub, hot=False):
    global c
    c += box(x, y, w, 30, serif(22 if not sub else 20, 30, YELLOW if hot else CHALK, 400), t_)
    if sub:
        c += box(x, y + 32, w, 22, font(13, 22, MUTED), sub)
c += box(64, 330, 220, 34, serif(24, 34, CHALK, 400), "算下来是哪一种？")
s += line(280, 346, 330, 346, CHALK, 2) + line(330, 250, 330, 450, CHALK, 2) + line(330, 250, 370, 250, CHALK, 2) + line(330, 450, 370, 450, CHALK, 2)
node(380, 234, 160, "多交了", "")
node(380, 434, 160, "少交了", "")
s += line(490, 250, 540, 250, CHALK, 2) + line(540, 200, 540, 300, CHALK, 2) + line(540, 450, 590, 450, CHALK, 2) + line(590, 400, 590, 500, CHALK, 2)
for y, lab, res, sub, hot, x0 in ((200, "想拿回来", "要办", "不申请，就不会退", True, 540), (300, "不申请", "可以不办", "等于放弃这笔退税", False, 540), (400, "补得不多", "可以不办", "年收入 ≤ 12 万元，或补税 ≤ 400 元", False, 590), (500, "补得多", "要办", "6 月 30 日前申报并缴清", False, 590)):
    s += line(x0, y, 700, y, CHALK, 2)
    s += text(x0 + 14, y - 8, lab, 13, MUTED)
    node(716, y - 16, 480, res, sub, hot)
s += chalk_ring(744, 200, 46, 24)
c += svg(s)
c += box(64, 580, 1152, 26, font(15, 26, CHALK), '注意：<span style="color:%s">12 万元看税前收入</span>。单位没依法预扣的，不能免办' % YELLOW)
c += source("来源：国家税务总局令第 57 号第六、七条，财政部 税务总局公告 2023 年第 32 号（适用 2024 年至 2027 年取得的综合所得）")
pages.append(("5 谁要办", c))

# 6 four incomes, each with its chalk multiplier
c = board(6, "二　算对")
c += title("四项收入合起来算：劳务和特许权打八折，稿酬再乘七成")
rows = [("briefcase", "工资薪金", "工资、奖金、津贴、补贴", "× 100%", False), ("pen-tool", "劳务报酬", "设计、咨询、讲学、翻译", "× 80%", True), ("book-open", "稿酬", "作品出版、发表", "× 80% × 70%", False), ("key-round", "特许权使用费", "专利、商标、著作权等", "× 80%", False)]
s = ""
for i, (ic, nm, d_, k, hot) in enumerate(rows):
    y = 190 + i * 90
    s += icon(ic, 64, y + 8, 28, MUTED, 1.6)
    c += box(108, y, 280, 40, serif(26, 40, CHALK, 400), nm)
    c += box(108, y + 42, 420, 22, font(14, 22, MUTED), d_)
    c += box(620, y - 2, 400, 54, serif(40, 54, YELLOW if hot else CHALK, 400), k)
    s += line(64, y + 76, 1216, y + 76, LINE, 1)
s += line(560, 190, 560, 540, LINE, 1, "4 6")
c += svg(s)
c += box(64, 560, 1152, 30, font(16, 30, CHALK), "例：稿酬 10000 元，年度收入额 = 10000 × 80% × 70% = 5600 元")
c += source("来源：个人所得税法第二、六条，个人所得税法实施条例第六条，国家税务总局公告 2018 年第 61 号第八条")
pages.append(("6 四项收入", c))

# 7 subtract step by step: four chalk minus signs in a row
c = board(7, "二　算对")
c += title("6 万元全年只减一次，再减三险一金、专项附加和其他扣除")
items = [("wallet", "基本减除费用", "每年 60000 元", "两处工资也只减一次", True), ("receipt", "专项扣除", "三险一金个人实缴", "以工资条为准", False), ("list-checks", "专项附加扣除", "七项", "下一页逐项看", False), ("piggy-bank", "其他扣除", "个人养老金每年最多 12000 元", "", False)]
s = ""
for i, (ic, nm, v, d_, hot) in enumerate(items):
    x = 64 + i * 292
    c += box(x, 196, 60, 70, serif(64, 70, YELLOW if i == 0 else MUTED, 400), "−")
    s += icon(ic, x + 64, 216, 30, CHALK, 1.6)
    c += box(x, 290, 270, 34, serif(24, 34, CHALK, 400), nm)
    c += box(x, 330, 260, 52, font(16, 26, YELLOW if hot else CHALK, 500 if hot else 400), v)
    if d_:
        c += box(x, 386, 260, 22, font(13, 22, MUTED), d_)
c += svg(s + chalk_under(64, 362, 210, YELLOW, 4))
s2 = '<rect x="64" y="460" width="1152" height="70" fill="%s" stroke="%s" stroke-width="1.5" stroke-dasharray="6 4"/>' % (PANEL, MUTED) + icon("alert-triangle", 84, 482, 26, YELLOW, 1.8)
c += svg(s2)
c += box(124, 474, 1060, 40, font(18, 40, CHALK), "扣除额不等于退税额：多扣 12000 元，在 10% 那一档只少交 1200 元")
c += box(64, 556, 1152, 24, font(14, 24, MUTED), "这几项扣除都以当年应纳税所得额为限，扣不完不结转到下一年")
c += source("来源：个人所得税法第六条，个人所得税法实施条例第十三条，财政部 税务总局公告 2024 年第 21 号")
pages.append(("7 减扣", c))

# 8 seven deductions: seven chalk cards, three circled as raised in 2023
c = board(8, "二　算对") + "<!--UNDER-->"
c += title("专项附加扣除有七项，2023 年只提高了其中三项")
cards = [("baby", "3 岁以下婴幼儿照护", "每孩每月 2000 元", "原来 1000", True), ("graduation-cap", "子女教育", "每孩每月 2000 元", "原来 1000", True), ("hand-heart", "赡养老人", "每月 3000 元", "非独生子女每人最多 1500，原来 2000", True),
         ("book-open", "继续教育", "学历每月 400 元", "取证当年 3600 元", False), ("heart-pulse", "大病医疗", "自付超 15000 元的部分", "每年限 80000 元", False), ("house", "住房贷款利息", "首套每月 1000 元", "", False), ("house", "住房租金", "每月 1500、1100 或 800 元", "按城市", False)]
s = ""
for i, (ic, nm, v, d_, hot) in enumerate(cards):
    if i < 3:
        x, y, w, h = 64 + i * 392, 186, 368, 190
    else:
        x, y, w, h = 64 + (i - 3) * 292, 400, 272, 170
    s += '<rect x="%d" y="%d" width="%d" height="%d" fill="%s" stroke="%s" stroke-width="1.5"/>' % (x, y, w, h, PANEL, YELLOW if hot else LINE)
    s += icon(ic, x + 20, y + 20, 26, YELLOW if hot else MUTED, 1.6)
    c += box(x + 58, y + 18, w - 70, 30, serif(20 if hot else 18, 30, CHALK, 400), nm)
    c += box(x + 20, y + 62, w - 40, 40, serif(26 if hot else 20, 40, YELLOW if hot else CHALK, 400), v)
    if d_:
        c += box(x + 20, y + 106, w - 40, 44, font(13, 22, MUTED), d_)
    if hot:
        s += chalk_ring(x + w - 46, y + 34, 34, 18)
        c += box(x + w - 80, y + 23, 68, 22, font(14, 22, YELLOW, 700, "text-align: center"), "提高")
c = c.replace("<!--UNDER-->", svg(s))
c += source("来源：国发〔2018〕41 号，国发〔2022〕8 号，国发〔2023〕13 号（2023 年 1 月 1 日起实施）", y=640)
pages.append(("8 七项扣除", c))

# 9 the rate table drawn as a staircase, the 10% step circled for the example
c = board(9, "二　算对")
c += title("税率表看的是扣完之后的全年应纳税所得额，不是年薪")
rows = [("不超过 3.6 万", 3, 0), ("3.6 万至 14.4 万", 10, 2520), ("14.4 万至 30 万", 20, 16920), ("30 万至 42 万", 25, 31920), ("42 万至 66 万", 30, 52920), ("66 万至 96 万", 35, 85920), ("超过 96 万", 45, 181920)]
s = ""
base = 560
for i, (rng, r, q) in enumerate(rows):
    x = 64 + i * 162
    h = r / 45 * 300
    hot = r == 10
    s += '<rect x="%d" y="%.1f" width="150" height="%.1f" fill="%s" stroke="%s" stroke-width="1.5"/>' % (x, base - h, h, YELLOW if hot else PANEL, YELLOW if hot else MUTED)
    s += text(x + 75, base - h - 14, "%d%%" % r, 28 if hot else 22, YELLOW if hot else CHALK, "middle", 500, "Songti SC, serif")
    s += text(x + 75, base + 24, rng, 12, CHALK if hot else MUTED, "middle")
    s += text(x + 75, base + 44, "扣 %s" % ("{:,}".format(q) if q else "0"), 12, DIM, "middle")
s += line(64, base, 1196, base, CHALK, 2)
c += svg(s)
c += box(64, 610, 1152, 26, font(15, 26, CHALK), "速算扣除数是省事用的：36000 × (10% − 3%) = 2520。例题落在 10% 这一级")
c += source("来源：个人所得税法附税率表一，国家税务总局公告 2024 年第 2 号附件 1。各档含上限，不含下限", y=644)
pages.append(("9 税率表", c))

# 10 the example: the person on the left as a chalk list, two photos on the right
c = board(10, "二　算对")
c += title("例题：月薪 15000 元，租房，赡养父母，8 月接了一单设计")
c += svg(example_tag(64, 0).replace("", "") if False else "")
c += example_tag(64, 172)
facts = [("工资", "每月应发 15000 元，三险一金个人每月 2700 元"), ("租房", "省会城市，住房租金每月扣 1500 元，年初已报给单位"), ("赡养", "和兄弟均摊，每人每月扣 1500 元"), ("设计", "8 月接了一单，税前 10000 元，对方按次预扣")]
s = ""
for i, (k, v) in enumerate(facts):
    y = 220 + i * 84
    c += box(64, y, 110, 40, serif(26, 40, YELLOW, 400), k)
    c += box(180, y + 6, 500, 60, font(17, 28, CHALK), v)
    s += line(64, y + 72, 680, y + 72, LINE, 1, "4 5")
c += svg(s)
c += photo("tax-apartment", 730, 172, 486, 200)
c += photo("tax-hands", 730, 384, 486, 200)
c += cap(730, 592, 486, "示意图（AI 生成）", "right")
c += source("例题，数字为虚构。三险一金按例题设定，实际以工资条为准")
pages.append(("10 例题", c))

# 11 the derivation, written on the board line by line, equals signs aligned, the answer underlined in yellow
c = board(11, "二　算对")
c += title("一步步算：全年应纳 3440 元，已预缴 4240 元，应退 800 元")
c += example_tag(1066, 74)
lines_ = [("收入额", "180000 + 10000 × 80%", "188000"), ("扣除", "60000 + 32400 + 36000", "128400"), ("应纳税所得额", "188000 − 128400", "59600"), ("应纳税额", "59600 × 10% − 2520", "3440"), ("应退", "已预缴 4240 − 3440", "800 元")]
s = ""
for i, (k, f, r) in enumerate(lines_):
    y = 190 + i * 72
    last = i == 4
    c += box(64, y, 60, 50, serif(26, 50, MUTED, 400), "%d." % (i + 1))
    c += box(110, y, 230, 50, serif(30, 50, CHALK, 400, "text-align: right"), k)
    c += box(352, y, 40, 50, serif(30, 50, MUTED, 400, "text-align: center"), "＝")
    c += box(400, y, 470, 50, serif(30, 50, CHALK, 400), f)
    c += box(870, y, 40, 50, serif(30, 50, MUTED, 400, "text-align: center"), "＝")
    c += box(920, y, 260, 50, serif(36 if last else 30, 50, YELLOW if last else CHALK, 400), r)
s += chalk_under(920, 528, 1070, YELLOW, 6)
c += svg(s)
c += box(64, 566, 1152, 24, font(14, 24, MUTED), "三险一金 2700 × 12 = 32400，专项附加 (1500 + 1500) × 12 = 36000，已预缴 4240 = 工资全年预扣 2640 + 劳务预扣 1600")
c += source("依据：国家税务总局令第 57 号第三条，国家税务总局公告 2018 年第 61 号第六、八条")
pages.append(("11 推导", c))

# 12 where the 800 comes from: a chalk waterfall, 1600 down to 800
c = board(12, "二　算对")
c += title("这 800 元退税，全是设计费多预扣的")
c += example_tag(1066, 74)
base = 560; K = 260 / 1600
s = line(140, base, 1100, base, CHALK, 2)
bars = [(200, 1600, 1600, "预扣：8000 × 20%", CHALK, "1600"), (520, 800, 800, "全年只该交：8000 × 10%", MUTED, "800"), (840, 1600, 800, "多扣的，汇算时退回", YELLOW, "800")]
for x, top, h_, lab, col, v in bars:
    y_top = base - top * K
    s += '<rect x="%d" y="%.1f" width="200" height="%.1f" fill="%s" stroke="%s" stroke-width="2"%s/>' % (x, y_top, h_ * K, PANEL if col != YELLOW else "none", col, ' stroke-dasharray="8 5"' if col == YELLOW else "")
    s += text(x + 100, y_top - 16, v, 40, col, "middle", 400, "Songti SC, serif")
    s += text(x + 100, base + 30, lab, 15, CHALK, "middle")
s += line(400, base - 800 * K, 520, base - 800 * K, MUTED, 1.5, "4 4") + line(720, base - 1600 * K, 840, base - 1600 * K, MUTED, 1.5, "4 4")
c += svg(s)
c += box(140, 608, 1000, 26, font(15, 26, MUTED, 400, "text-align: center"), "这单设计费的收入额 8000 元，平时按 20% 预扣，年度汇算时落在 10% 那一档")
c += source("来源：国家税务总局公告 2018 年第 61 号第八条及预扣率表二", y=646)
pages.append(("12 800 元", c))

# 13 practice: three problems on the board, answer space left blank
c = board(13, "当场练")
c += title("当场练：三道变式，先自己算，五分钟后对答案")
c += photo("tax-classroom", 828, 172, 388, 260)
c += cap(828, 440, 388, "示意图（AI 生成）", "right")
probs = [("A", "漏报租金", "租金年中没报给单位，汇算时才补填。能退多少？"), ("B", "两处工资", "没接设计单，兼职每月 3000 元，全年预扣 0 元。要补多少？"), ("C", "小额劳务", "一次劳务 3000 元，预扣多少？汇算计入多少？")]
s = ""
for i, (n, nm, q) in enumerate(probs):
    y = 180 + i * 140
    s += '<circle cx="96" cy="%d" r="28" fill="none" stroke="%s" stroke-width="2.4"/>' % (y + 30, YELLOW)
    c += box(68, y + 6, 56, 48, serif(32, 48, YELLOW, 400, "text-align: center"), n)
    c += box(146, y, 640, 34, serif(24, 34, CHALK, 400), nm)
    c += box(146, y + 38, 640, 48, font(16, 26, MUTED), q)
    s += line(146, y + 108, 760, y + 108, LINE, 1.5, "2 8")
    s += text(146, y + 102, "答：", 14, DIM)
c += svg(s)
c += example_tag(828, 470)
c += box(828, 506, 388, 48, font(13, 22, MUTED), "没写到的条件都和主例题一样")
pages.append(("13 当场练", c))

# 14 answers: three columns, each worked down to its result in yellow
c = board(14, "当场练")
c += title("对答案：漏报租金退 2600 元，两处工资补 3600 元")
cols = [("A", "漏报租金", ["已预缴　4440 + 1600 = 6040", "全年仍应纳　3440"], "退 2600 元", "多退的 1800 = 18000 × 10%"), ("B", "两处工资", ["已预缴　2640 + 0 = 2640", "全年　87600 × 10% − 2520 = 6240"], "补 3600 元", "6 万元被减了两次"),
        ("C", "小额劳务", ["预扣　(3000 − 800) × 20% = 440", "汇算计入　3000 × 80% = 2400"], "两套规则", "800 元减除不带进汇算")]
s = ""
for i, (n, nm, ls, res, why) in enumerate(cols):
    x = 64 + i * 392
    if i:
        s += line(x - 12, 186, x - 12, 600, LINE, 1)
    c += box(x, 186, 368, 40, serif(26, 40, CHALK, 400), n + "　" + nm)
    for j, l_ in enumerate(ls):
        c += box(x, 244 + j * 44, 368, 34, font(16, 34, MUTED), l_)
    c += box(x, 352, 368, 70, serif(48, 70, YELLOW, 400), res)
    s += chalk_under(x, 428, x + 220, YELLOW, 5)
    c += box(x, 452, 368, 50, font(15, 25, CHALK), "为什么：" + why)
c += svg(s)
c += source("例题，数字为虚构。依据：国家税务总局公告 2018 年第 61 号第六、八条，个人所得税法第六条，个人所得税法实施条例第二十五条")
pages.append(("14 对答案", c))

# 15 traps: four lines struck with a chalk cross
c = board(15, "三　去办")
c += title("四个常见的坑，踩中就可能多交或交晚")
traps = [("smartphone", "平台兼职不再一律按次扣 20%", "2025 年 10 月 1 日起，从互联网平台取得的劳务报酬，由平台按累计预扣法预扣"), ("baby", "育儿补贴不是婴幼儿照护扣除", "育儿补贴自 2025 年起免征个税，照护扣除每孩每月 2000 元，两样可以同时有"),
         ("ban", "「年收入不到 12 万不用办」只对一半", "只免补税的那一种，想退税还得办"), ("alert-triangle", "补税拖过 6 月 30 日", "7 月 1 日起按日加收万分之五滞纳金：3600 元晚交 30 天，多交 54 元")]
s = ""
for i, (ic, t_, d_) in enumerate(traps):
    y = 186 + i * 104
    s += '<path d="M 70 %d L 98 %d M 98 %d L 70 %d" stroke="%s" stroke-width="3.4" stroke-linecap="round"/>' % (y + 8, y + 36, y + 8, y + 36, YELLOW)
    s += icon(ic, 120, y + 8, 26, MUTED, 1.6)
    c += box(162, y + 2, 1000, 36, serif(24, 36, CHALK, 400), t_)
    c += box(162, y + 42, 1050, 26, font(15, 26, MUTED), d_)
    s += line(64, y + 88, 1216, y + 88, LINE, 1, "4 5")
c += svg(s)
c += source("来源：税务总局公告 2025 年第 16 号，财政部 税务总局公告 2025 年第 6 号、2023 年第 32 号，总局令第 57 号，征管法第三十二条，征管法实施细则第七十五条")
pages.append(("15 四个坑", c))

# 16 the national figures, chalked large, with the 1.26 hundred million crossed out as the wrong number
c = board(16, "三　去办")
c += title("2025 年度超过 2 亿人办了汇算，超过 1 亿人申报退税")
figs = [("超过 2 亿", "人", "办理汇算申报，同比增长 4.38%", CHALK), ("超过 1 亿", "人", "申报退税", YELLOW), ("超过 1500 亿", "元", "退税总金额", CHALK)]
s = ""
for i, (v, u, d_, col) in enumerate(figs):
    x = 64 + i * 392
    c += box(x, 196, 368, 90, serif(54, 90, col, 400, "white-space: nowrap"), v + '<span style="font-size:22px"> %s</span>' % u)
    c += box(x, 292, 368, 26, font(16, 26, MUTED), d_)
s += chalk_under(456, 290, 660, YELLOW, 5)
s += '<rect x="64" y="388" width="1152" height="96" fill="%s" stroke="%s" stroke-width="1.5" stroke-dasharray="6 4"/>' % (PANEL, MUTED)
c += svg(s)
c += box(88, 404, 380, 60, serif(44, 60, DIM, 400, "text-decoration: line-through; text-decoration-color: %s" % YELLOW), "1.26 亿")
c += box(440, 408, 760, 60, font(16, 28, CHALK), "常被引用的这个数，是 2026 年上半年享受专项附加扣除的人数，不是退税人数")
c += box(64, 520, 1152, 26, font(15, 26, MUTED), "上一次（2024 年度）：超过 1 亿人申请退税 1300 多亿元，700 多万人申报补税 480 余亿元")
c += source("来源：国务院新闻办公室新闻发布会（2026-07-28 公布 2025 年度，2025-07-28 公布 2024 年度）。原话为「超过」「多」「余」，不是精确数")
pages.append(("16 全国", c))

# 17 the calendar: a chalk line to scale, this year's window done, next year's ahead in yellow
c = board(17, "三　去办")
c += title("下一次汇算：2027 年 3 月 1 日至 6 月 30 日")
x0, x1 = 100, 1180
d0, d1 = 2026 + 1.5 / 12, 2027 + 7.5 / 12
xof = lambda y, m, d: x0 + ((y + (m - 1) / 12 + (d - 1) / 365) - d0) / (d1 - d0) * (x1 - x0)
s = line(x0, 340, x1, 340, MUTED, 2)
s += '<rect x="%.1f" y="326" width="%.1f" height="28" fill="%s" opacity="0.6"/>' % (xof(2026, 3, 1), xof(2026, 6, 30) - xof(2026, 3, 1), PANEL)
s += '<rect x="%.1f" y="322" width="%.1f" height="36" fill="none" stroke="%s" stroke-width="2.4" stroke-dasharray="40 4"/>' % (xof(2027, 3, 1), xof(2027, 6, 30) - xof(2027, 3, 1), YELLOW)
for y, m in ((2026, 3), (2026, 6), (2026, 9), (2026, 12), (2027, 3), (2027, 6)):
    s += text(xof(y, m, 1), 386, "%d.%d" % (y, m), 12, DIM, "middle")
ev = [(2026, 2, 25, "App 开放预约", "2025 年度那一次", True, MUTED), (2026, 3, 1, "开始办理", "1 日至 20 日要预约", False, MUTED), (2026, 6, 30, "最后一天", "补税也要缴清", True, MUTED), (2026, 7, 1, "滞纳金起算", "按日万分之五", False, MUTED),
      (2027, 3, 1, "2026 年度开始", "预约日期尚未公布", True, YELLOW), (2027, 6, 30, "2026 年度截止", "补税也要缴清", False, YELLOW)]
for y, m, d, nm, sub, up, col in ev:
    x = xof(y, m, d)
    s += '<circle cx="%.1f" cy="340" r="6" fill="%s"/>' % (x, col)
    ty = 210 if up else 410
    s += line(x, 340 + (-8 if up else 8), x, ty + (78 if up else -2), LINE, 1)
    c += box(int(x - 100), ty, 200, 20, font(12, 20, col, 500, "text-align: center"), "%d-%02d-%02d" % (y, m, d))
    c += box(int(x - 100), ty + 22, 200, 28, serif(18, 28, YELLOW if col == YELLOW else CHALK, 400, "text-align: center"), nm)
    c += box(int(x - 100), ty + 50, 200, 22, font(12, 22, MUTED, 400, "text-align: center"), sub)
c += svg(s)
c += box(64, 560, 1152, 50, font(15, 25, CHALK), "在哪办：个税 App 或自然人电子税务局网站自己办，也可以确认后请单位代办，或委托他人")
c += source("来源：国家税务总局通告 2026 年第 1 号，个人所得税法第十一条，国家税务总局令第 57 号第五、十四、十五条，税收征收管理法实施细则第七十五条")
pages.append(("17 时间", c))

# 18 homework and dismissal: the lit building at night, two tasks chalked on the board
c = photo("tax-building", 0, 0, 1280, 720)
c += box(0, 0, 1280, 720, "background: linear-gradient(90deg, rgba(28,40,35,0.97) 0%, rgba(28,40,35,0.85) 50%, rgba(28,40,35,0.3) 100%)")
c += board(18, None)
c += box(64, 72, 400, 30, font(16, 30, YELLOW, 500, "letter-spacing: 8px"), "课后作业")
s = chalk_under(64, 108, 210, YELLOW, 4)
for i, (t_, d_) in enumerate((("核对 App 里今年填的专项附加扣除", "租房、赡养、子女，有没有漏填或填错"), ("用今晚的公式，估一估自己是退还是补", "应纳税额 ＝ 应纳税所得额 × 税率 − 速算扣除数"))):
    y = 160 + i * 130
    s += '<rect x="64" y="%d" width="34" height="34" fill="none" stroke="%s" stroke-width="2.4"/>' % (y + 6, CHALK)
    c += box(120, y, 760, 46, serif(32, 46, CHALK, 400), t_)
    c += box(120, y + 52, 760, 26, font(16, 26, MUTED), d_)
c += svg(s)
c += box(64, 430, 760, 40, serif(26, 40, CHALK, 400), '下次窗口：<span style="color:%s">2027 年 3 月 1 日至 6 月 30 日</span>' % YELLOW)
c += box(64, 520, 760, 70, serif(52, 70, CHALK, 400), "下课。")
c += box(64, 610, 760, 40, font(13, 20, MUTED), "本课是科普教学，不构成个人税务建议，具体以个税 App 和主管税务机关为准")
c += cap(980, 660, 236, "示意图（AI 生成）", "right")
pages.append(("18 下课", c))

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
    cells.append('<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: %s; color: %s; font-family: %s">%s</div>' % (BG, CHALK, SANS, loc))
    cells.append('<div style="width:1280px;height:720px"><img src="../cur/cur%03d.png" style="width:1280px;height:720px"></div>' % (i + 1))
canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}, "title": "lecture 个税汇算夜校课样例设计稿",
          "launch": {"view": "canvas"}, "pages": [], "boards": boards, "order": order_, "notes": {}, "designSystems": []}
pc = os.path.join(P, 'canvas.json')
if os.path.exists(pc):
    canvas["createdOnFiles"] = json.load(open(pc))["createdOnFiles"]
json.dump(canvas, open(pc, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(L, 'sheet.html'), 'w').write('<!doctype html><meta charset="utf-8"><body style="margin:0;background:#888;display:grid;grid-template-columns:repeat(2,1280px);gap:16px;padding:16px;width:2592px">' + "".join(cells) + '</body>')
print(len(order_))
