import json, os, re, datetime
ROOT = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(ROOT, 'project'); L = os.path.join(ROOT, 'local')
os.makedirs(P, exist_ok=True); os.makedirs(L, exist_ok=True)

BG = "#ECF0F2"; SURF = "#F9FBFC"; BLUE = "#4A6B8A"; PEN = "#B96A5E"; INK = "#23282E"; MUTED = "#5A6470"; LINE = "#D3DBE0"
GREEN = "#55704A"; AMBER = "#9A7318"; DANGER = "#A04A38"; SAGE = "#7A8B6F"; BOARD = "#3E5A74"; BTINT = "#DCE5EC"; PTINT = "#F3E3DF"; GHOST = "#B9C4CC"
SANS = "'PingFang SC', 'Microsoft YaHei', sans-serif"
IMG = {k: "__%s__" % k for k in ["classroom", "quiz-hand", "quiz-pair", "method-desk", "method-board", "method-redpen"]}
CUR = ["__CUR%02d__" % (i + 1) for i in range(21)]
TOTAL = 21
SEGS = ["目标", "环节一", "小测一", "环节二", "环节三", "小测二", "小结"]

_cat = open(os.path.join(ROOT, '..', '..', '..', 'src', 'icons', 'catalog.ts')).read()


def _icon_svg(name):
    m = re.search(r'^  "%s": (\[.*\]),$' % re.escape(name), _cat, re.M)
    prims = json.loads(m.group(1))
    return ''.join('<%s %s/>' % (tag, ' '.join('%s="%s"' % (k, v) for k, v in attrs.items())) for tag, attrs in prims)


def icon(name, x, y, size=20, color=BLUE, sw=2):
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


def svg(body):
    return '<svg width="1280" height="720" viewBox="0 0 1280 720" style="position: absolute; left: 0; top: 0">' + body + '</svg>\n'


def t(x, y, s, size=14, fill=MUTED, anchor="start", weight=400):
    return '<text x="%.1f" y="%.1f" font-size="%d" fill="%s" text-anchor="%s" font-weight="%d" font-family="PingFang SC, Microsoft YaHei, sans-serif">%s</text>' % (x, y, size, fill, anchor, weight, s)


def rect(x, y, w, h, fill, extra=""):
    return '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s" %s/>' % (x, y, w, h, fill, extra)


def line(x1, y1, x2, y2, color=LINE, w=1, extra=""):
    return '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%.1f" %s/>' % (x1, y1, x2, y2, color, w, extra)


def squiggle(x, y, w, color=PEN, sw=2.5):
    pts = []
    n = int(w / 12)
    d = "M %.1f %.1f" % (x, y)
    for i in range(n):
        x0 = x + i * 12
        d += " Q %.1f %.1f %.1f %.1f" % (x0 + 6, y + (-4 if i % 2 == 0 else 4), x0 + 12, y)
    return '<path d="%s" fill="none" stroke="%s" stroke-width="%.1f" stroke-linecap="round"/>' % (d, color, sw)


def tw(s, cjk=12, lat=7.2):
    return sum(cjk if ord(ch) > 0x2e80 else lat for ch in s)


def tag(x, y, text, color=PEN, size=12, fill="transparent", fc=None):
    w = int(tw(text, size, size * 0.6) + 20)
    return box(x, y, w, 22, "border: 1px solid %s; border-radius: 4px; box-sizing: border-box; text-align: center; white-space: nowrap; background: %s; " % (color, fill) + font(size, 20, fc or color, 700), text)


def progress(seg):
    out = ""
    x = 1216
    widths = [int(tw(s, 12) + 20) for s in SEGS]
    total = sum(widths) + 4 * (len(SEGS) - 1)
    x = 1216 - total
    for i, s in enumerate(SEGS):
        w = widths[i]
        on = s == seg
        quiz = s.startswith("小测")
        out += box(x, 24, w, 22, "border-radius: 11px; box-sizing: border-box; text-align: center; white-space: nowrap; background: %s; border: 1px %s %s; " % (BLUE if on else "transparent", "dashed" if quiz and not on else "solid", BLUE if on else GHOST) + font(12, 20, "#FFFFFF" if on else MUTED, 700 if on else 400), s)
        x += w + 4
    return out


def runhead(pg, seg, unit=None):
    out = progress(seg)
    if unit:
        out += box(64, 24, 520, 22, font(13, 22, BLUE, 700, "letter-spacing: 1px"), unit)
    out += box(64, 686, 600, 18, font(12, 18, MUTED), "培训部 · 全员培训 · 在工作中用好生成式 AI")
    out += box(916, 686, 300, 18, font(12, 18, MUTED, 400, "text-align: right"), "%d / %d" % (pg, TOTAL))
    return out


def head(pg, seg, unit, title, size=30):
    out = runhead(pg, seg, unit)
    out += box(64, 60, 1152, 92, "display: flex; flex-direction: column; justify-content: flex-end; " + font(size, 42, INK, 700), "<div>" + title + "</div>")
    out += svg(squiggle(64, 162, 108))
    return out


def source(t_, y=648):
    return box(64, y, 1152, 32, font(12, 16, MUTED), t_)


def photo(key, x, y, w, h, cap=None, radius=8):
    out = box(x, y, w, h, "border-radius: %dpx; overflow: hidden" % radius, '<img src="' + IMG[key] + '" alt="" style="display: block; width: %dpx; height: %dpx; object-fit: cover">' % (w, h))
    if cap:
        out += box(x, y + h + 6, w, 18, font(12, 18, MUTED), cap)
    return out


def card(x, y, w, h, extra="", content=""):
    return box(x, y, w, h, "background: " + SURF + "; border: 1px solid " + LINE + "; border-radius: 10px; box-sizing: border-box; " + extra, content)


def ruled(x, y, w, h, gap=36, margin=True):
    s = rect(x, y, w, h, SURF, 'rx="10" stroke="%s"' % LINE)
    yy = y + gap
    while yy < y + h - 6:
        s += line(x + 12, yy, x + w - 12, yy, "#E3E9EE", 1)
        yy += gap
    if margin:
        s += line(x + 56, y + 8, x + 56, y + h - 8, "#E8C9C2", 1.5)
    return s


def stamp(x, y, text, color, ic, rot=-6):
    st = "border: 2.5px solid %s; border-radius: 8px; box-sizing: border-box; transform: rotate(%ddeg); text-align: center; " % (color, rot) + font(20, 40, color, 700)
    return box(x, y, 112, 44, st, text)


def chapter(pg, seg, num, title, sub, items):
    c = runhead(pg, seg)
    c += box(0, 120, 1280, 260, "background: " + BOARD)
    c += svg(rect(0, 372, 1280, 8, "#8E7A5E"))
    c += box(64, 148, 200, 30, "border: 2px solid rgba(255,255,255,0.6); border-radius: 6px; box-sizing: border-box; text-align: center; " + font(16, 26, "#FFFFFF", 700, "letter-spacing: 3px"), num)
    c += box(64, 196, 1100, 70, font(46, 64, "#FFFFFF", 700), title)
    c += box(64, 280, 1100, 30, font(18, 30, "#D7E2EA"), sub)
    c += box(64, 420, 400, 22, font(13, 22, BLUE, 700, "letter-spacing: 2px"), "这一环节学什么")
    for i, (ic, it) in enumerate(items):
        x = 64 + i * 392
        c += card(x, 456, 368, 104)
        c += svg(icon(ic, x + 20, 476, 24, BLUE))
        c += box(x + 58, 474, 296, 70, font(16, 26, INK, 700), it)
    return c


pages = []

# 1 cover
c = box(0, 0, 720, 720, "background: " + BOARD)
c += svg(rect(0, 712, 720, 8, "#8E7A5E") + squiggle(64, 452, 180, "#E7B9AF", 3))
c += box(64, 72, 500, 22, font(14, 22, "#D7E2EA", 700, "letter-spacing: 3px"), "培训部 · 全员培训课")
c += box(64, 200, 600, 240, "display: flex; flex-direction: column; justify-content: flex-end; " + font(50, 68, "#FFFFFF", 700), "<div>在工作中安全、有效地用生成式 AI</div>")
c += box(64, 480, 600, 60, font(19, 30, "#D7E2EA"), "哪些活交给它，哪些信息不能给它，交出去之前怎么把关")
chips = ["45 分钟", "3 个环节", "2 次小测", "课后练习"]
x = 64
for ch in chips:
    w = int(tw(ch, 14, 8) + 28)
    c += box(x, 584, w, 30, "border: 1px solid rgba(255,255,255,0.5); border-radius: 15px; box-sizing: border-box; text-align: center; " + font(14, 28, "#FFFFFF", 700), ch)
    x += w + 10
c += box(64, 640, 400, 22, font(14, 22, "#D7E2EA"), "2026 年 10 月")
c += photo("classroom", 720, 0, 560, 720, None, 0)
pages.append(("1 封面", c))

# 2 goals
c = head(2, "目标", None, "学完这节课，你能做到三件事")
c += photo("classroom", 64, 196, 470, 400, "示意图：培训教室（AI 生成）")
goals = [("list-checks", "会挑任务", "说得出 AI 在哪类活上真帮忙，在哪类活上会帮倒忙", "环节一"), ("shield-alert", "会避开风险", "认得出泄露信息、编造事实、版权、对外标识四类风险", "环节二"),
         ("clipboard-check", "会照规则做", "按公司的六条规则用 AI，交出去之前用三个方法把关", "环节三")]
s = ""
for i, (ic, ti, tx, seg) in enumerate(goals):
    y = 196 + i * 136
    c += card(574, y, 642, 124)
    s += rect(598, y + 24, 26, 26, SURF, 'stroke="%s" stroke-width="2" rx="4"' % BLUE) + icon(ic, 652, y + 24, 26, BLUE)
    c += box(694, y + 20, 360, 34, font(23, 34, INK, 700), ti)
    c += box(694, y + 60, 500, 48, font(15, 24, MUTED), tx)
    c += tag(1216 - 20 - int(tw(seg) + 20), y + 24, seg, BLUE)
c += svg(s)
c += box(574, 608, 642, 22, font(13, 22, PEN, 700), "下课前回到这页，在三个方框里打勾")
pages.append(("2 学习目标", c))

# 3 agenda
c = head(3, "目标", None, "三个环节、两次小测，45 分钟讲完")
segs = [("环节一", "它在哪儿帮忙，哪儿帮倒忙", 15, "lightbulb", "会挑任务", ["四项研究", "两种帮倒忙"], "小测一"),
        ("环节二", "三个真实案例", 7, "gavel", "会避开风险", ["三星、律师、航空公司", "47 国员工调查"], None),
        ("环节三", "我们的规则和方法", 15, "clipboard-check", "会照规则做", ["六条规则", "三个方法"], "小测二"),
        ("小结", "板书和课后练习", 5, "notebook-pen", "三个目标回顾", ["八个关键词", "课后三道题"], None)]
x0, x1 = 64, 1216
tot = sum(sg[2] for sg in segs) + 3
k = (x1 - x0) / 42
s = ""
x = x0
for i, (nm, ti, mins, ic, goal, items, quiz) in enumerate(segs):
    w = mins * k - 6
    col = PEN if nm == "环节三" else BLUE
    s += rect(x, 206, w, 14, col if nm != "小结" else SAGE, 'rx="7"')
    s += t(x, 246, "%s · %d 分钟" % (nm, mins), 13, col if nm != "小结" else SAGE, "start", 700)
    if quiz:
        qx = x + w - 30
        s += '<circle cx="%.1f" cy="213" r="13" fill="%s" stroke="%s" stroke-width="2"/>' % (qx, SURF, col) + t(qx, 218, "?", 15, col, "middle", 700)
    cw = max(w, 220)
    x += mins * k
c += svg(s)
s = ""
for i, (nm, ti, mins, ic, goal, items, quiz) in enumerate(segs):
    xx = 64 + i * 292
    col = PEN if nm == "环节三" else (SAGE if nm == "小结" else BLUE)
    c += card(xx, 272, 272, 260, "border-top: 4px solid " + col)
    s += icon(ic, xx + 20, 294, 24, col)
    c += box(xx + 54, 292, 200, 26, font(14, 26, col, 700), nm)
    c += box(xx + 20, 330, 236, 56, font(19, 28, INK, 700), ti)
    for j, it in enumerate(items):
        c += box(xx + 20, 396 + j * 28, 236, 24, font(14, 24, MUTED), "· " + it)
    if quiz:
        c += tag(xx + 20, 460, quiz + " ?", col)
    c += box(xx + 20, 496, 236, 22, font(13, 22, INK, 700), "目标：" + goal)
c += svg(s)
c += box(64, 556, 1152, 60, "background: " + BTINT + "; border-radius: 10px; box-sizing: border-box; padding: 0 20px 0 60px; display: flex; align-items: center; " + font(17, 26, INK), "课堂约定：随时举手提问。两次小测可以和旁边的同事商量。")
c += svg(icon("hand", 82, 574, 24, BLUE))
pages.append(("3 课程目录", c))

# 4 chapter 1
pages.append(("4 环节一", chapter(4, "环节一", "环节一", "它在哪儿帮忙，哪儿帮倒忙", "先看研究：哪些活交给它又快又好，哪些活交给它反而出错",
                                     [("lightbulb", "四项研究：写作、客服、做方案、团队"), ("triangle-alert", "两种帮倒忙：超出能力，内容编造"), ("gauge", "感觉和实测差了 39 个百分点")])))

# 5 studies
c = head(5, "环节一", "环节一 · 它在哪儿帮忙", "写作、客服、做方案，用上 AI 的人又快又好")
st = [("pencil-line", "写作", "−40%", "用时", "质量评分同时高 18%", "453 名专业人员", "同行评审 · 《科学》2023", True),
      ("headset", "客服", "+15%", "每小时解决的问题", "一家企业的客服团队", "5,172 名客服", "同行评审 · 《经济学季刊》2025", False),
      ("briefcase", "做方案", "快 25.1%", "能力范围内的任务", "完成量还多 12.2%", "咨询顾问，18 项任务", "工作论文 · 哈佛商学院 2023", False),
      ("users", "团队", "1 人 ≈ 2 人", "一个人用 AI，赶上两人团队", "用时还少 16.4%", "776 名员工做新产品方案", "工作论文 · NBER 2025", False)]
s = ""
for i, (ic, ttl, v, lab, note, n, typ, em) in enumerate(st):
    x = 64 + i * 292
    c += card(x, 196, 272, 320, "border-top: 4px solid %s" % (PEN if em else BLUE))
    s += icon(ic, x + 20, 218, 24, PEN if em else BLUE)
    c += box(x + 54, 216, 200, 28, font(16, 28, INK, 700), ttl)
    c += box(x + 20, 258, 240, 56, font(44, 56, PEN if em else INK, 700, "white-space: nowrap"), v)
    c += box(x + 20, 318, 236, 24, font(15, 24, INK, 700), lab)
    c += box(x + 20, 346, 236, 24, font(14, 24, MUTED), note)
    c += box(x + 20, 380, 236, 1, "background: " + LINE)
    c += box(x + 20, 394, 236, 22, font(13, 22, MUTED), n)
    c += tag(x + 20, 470, typ, GREEN if typ.startswith("同行") else AMBER)
c += svg(s)
c += box(64, 540, 1152, 56, "border: 1.5px dashed " + PEN + "; border-radius: 10px; box-sizing: border-box; padding: 0 20px 0 56px; display: flex; align-items: center; " + font(16, 24, INK), "四项研究的人群、任务和单位都不同，不能直接比较，也不能相加。")
c += svg(icon("info", 80, 556, 22, PEN))
c += source("来源：《科学》2023-07，《经济学季刊》2025-02，哈佛商学院工作论文 24-013（2023-09），NBER 工作论文 w33641（2025-03）")
pages.append(("5 四项研究", c))

# 6 novice
c = head(6, "环节一", "环节一 · 它在哪儿帮忙", "收益最大的是新手：技能最低的五分之一提高 36%")
s = ""
grp = [("客服，5,172 人", "技能最低的五分之一", 36, "技能最高的五分之一", 0, "几乎没变，质量略降"), ("咨询顾问", "低于平均水平", 43, "高于平均水平", 17, None)]
for i, (nm, a, av, b, bv, bnote) in enumerate(grp):
    y = 200 + i * 150
    s += t(64, y + 18, nm, 16, INK, "start", 700)
    s += t(64, y + 54, a, 14, MUTED) + rect(250, y + 38, av * 9, 26, PEN, 'rx="3"') + t(250 + av * 9 + 10, y + 58, "+%d%%" % av, 18, PEN, "start", 700)
    s += t(64, y + 96, b, 14, MUTED) + (rect(250, y + 80, max(bv * 9, 3), 26, GHOST, 'rx="3"') if True else "") + t(250 + max(bv * 9, 3) + 10, y + 100, ("+%d%%" % bv) if bv else (bnote or ""), 16 if bv else 14, INK if bv else MUTED, "start", 700 if bv else 400)
s += squiggle(250, 200 + 70, 330, PEN, 2) if False else ""
c += svg(s)
c += box(64, 500, 640, 22, font(12, 20, MUTED), "两项研究的分组口径不同：客服按技能五等分，咨询按平均水平上下分")
c += card(760, 196, 456, 270)
c += box(784, 216, 400, 22, font(13, 22, BLUE, 700, "letter-spacing: 2px"), "上手速度")
s = ""
for j, (lab, sub, col) in enumerate([("用 AI 两个月的新人", "2 个月", PEN), ("不用 AI、干了六个月以上的人", "6 个月以上", GHOST)]):
    y = 262 + j * 80
    s += icon("user", 784, y, 30, col if col != GHOST else MUTED)
    c += box(824, y - 2, 360, 24, font(15, 24, INK, 700), lab)
    c += box(824, y + 24, 360, 22, font(13, 22, MUTED), sub)
s += t(800, 336, "≈", 26, INK, "middle", 700)
c += svg(s)
c += box(784, 420, 400, 30, font(15, 24, INK), "表现相当")
c += box(760, 490, 456, 106, "background: %s; border-radius: 10px; box-sizing: border-box; padding: 18px 20px 18px 60px; " % BTINT + font(16, 26, INK), "对新同事，它像一位随时在旁边的带教老师。对老手，提速有限，要盯住质量。")
c += svg(icon("graduation-cap", 780, 508, 24, BLUE))
c += source("来源：Brynjolfsson 等，arXiv 预印本 v2（2024-11），正式版刊于《经济学季刊》2025。哈佛商学院工作论文 24-013（2023-09）")
pages.append(("6 新手获益", c))

# 7 backfire
c = head(7, "环节一", "环节一 · 哪儿帮倒忙", "两种帮倒忙：任务超出它的能力，内容是它编的")
for i, (ic, ttl, how, typ) in enumerate([("triangle-alert", "超出它能力范围的任务", "顾问做一项 AI 能力范围外的分析任务", "工作论文 · 哈佛商学院 2023"), ("file-warning", "它编出来的内容", "让 108 个模型只摘要给定的原文", "厂商测评 · Vectara 2026-09")]):
    x = 64 + i * 592
    c += card(x, 196, 560, 340)
    c += svg(icon(ic, x + 24, 220, 26, PEN))
    c += box(x + 62, 218, 460, 30, font(20, 30, INK, 700), ttl)
    c += box(x + 24, 260, 500, 22, font(13, 22, MUTED), "怎么测的：" + how)
    c += tag(x + 24, 500, typ, AMBER)
s = ""
s += t(88, 316, "正确率", 13, MUTED, "start", 700)
s += t(88, 350, "不用 AI", 14, INK) + rect(180, 334, 84.5 * 3.6, 24, GHOST, 'rx="3"') + t(180 + 84.5 * 3.6 + 8, 352, "84.5%", 16, INK, "start", 700)
s += t(88, 394, "用 AI", 14, PEN, "start", 700) + rect(180, 378, 60 * 3.6, 24, PEN, 'rx="3"') + rect(180 + 60 * 3.6, 378, 10 * 3.6, 24, PTINT, 'rx="3" stroke="%s" stroke-dasharray="3 2"' % PEN) + t(180 + 70 * 3.6 + 8, 396, "约 60% 至 70%", 16, PEN, "start", 700)
c += svg(s)
c += box(88, 424, 500, 60, font(14, 22, MUTED), "看着一样难的任务，可能一个在它能力内，一个在外。没把握的活，先拿答案已知的例子试一次。")
s = ""
gx0 = 680; k2 = 15
s += t(680, 316, "加进原文没有的内容的摘要比例（108 个模型）", 13, MUTED, "start", 700)
s += rect(gx0, 336, 35 * k2, 12, BTINT, 'rx="6"') + rect(gx0 + 1.8 * k2, 336, (24.2 - 1.8) * k2, 12, PEN, 'rx="6"')
s += t(gx0 + 1.8 * k2, 372, "1.8%", 15, PEN, "middle", 700) + t(gx0 + 24.2 * k2, 372, "24.2%", 15, PEN, "middle", 700)
s += t(680, 414, "专业法律研究工具的幻觉率", 13, MUTED, "start", 700) + rect(gx0, 426, 35 * k2, 12, BTINT, 'rx="6"') + rect(gx0 + 17 * k2, 426, (33 - 17) * k2, 12, AMBER, 'rx="6"')
s += t(gx0 + 17 * k2, 462, "17%", 15, AMBER, "middle", 700) + t(gx0 + 33 * k2, 462, "33%", 15, AMBER, "middle", 700)
c += svg(s)
c += box(680, 476, 500, 22, font(14, 22, MUTED), "只给原文，要求找不到就答「待确认」")
c += box(64, 556, 1152, 56, "background: %s; border-radius: 10px; box-sizing: border-box; padding: 0 20px 0 56px; display: flex; align-items: center; " % BTINT + font(17, 26, INK, 700), "两种情况，靠的是同一道保险：交出去之前，由人来核对。")
c += svg(icon("user-check", 80, 572, 24, BLUE))
c += source("来源：哈佛商学院工作论文 24-013（2023-09），Vectara 幻觉排行榜（厂商测评，2026-09-22），《实证法律研究杂志》2025")
pages.append(("7 两种帮倒忙", c))

# 8 feeling vs measured
c = head(8, "环节一", "环节一 · 哪儿帮倒忙", "以为快了 20%，实测慢了 19%：感觉不能当证据")
ax0, ax1, ay = 120, 900, 470
def vx(v): return ax0 + (v + 50) / 80 * (ax1 - ax0)
s = line(ax0, ay, ax1, ay, INK, 1.5)
for v in [-50, -40, -30, -20, -10, 0, 10, 20, 30]:
    s += line(vx(v), ay - 5, vx(v), ay + 5, INK, 1) + t(vx(v), ay + 24, ("%+d%%" % v) if v else "0", 12, MUTED, "middle")
s += line(vx(0), 210, vx(0), ay, INK, 1.2, 'stroke-dasharray="4 3"')
s += t(vx(-25), ay + 52, "← 更快", 13, MUTED, "middle", 700) + t(vx(15), ay + 52, "更慢 →", 13, MUTED, "middle", 700)
pts = [("开发者事前预期", -24, 250), ("经济学专家预测", -39, 300), ("机器学习专家预测", -38, 350), ("开发者事后自评", -20, 400)]
for lab, v, yy in pts:
    s += line(vx(0), yy, vx(v), yy, GHOST, 2) + '<circle cx="%.1f" cy="%d" r="8" fill="%s"/>' % (vx(v), yy, GHOST) + t(vx(v) - 14, yy + 5, "%s %d%%" % (lab, v), 14, MUTED, "end")
s += line(vx(0), 430, vx(19), 430, PEN, 3) + '<circle cx="%.1f" cy="430" r="10" fill="%s"/>' % (vx(19), PEN) + t(vx(19) + 16, 436, "实际测得 +19%", 17, PEN, "start", 700)
s += line(vx(-20), 400, vx(-20), 430, PEN, 1.5, 'stroke-dasharray="3 2"') + line(vx(-20), 430, vx(0), 430, PEN, 1.5, 'stroke-dasharray="3 2"')
c += svg(s)
c += card(950, 196, 266, 300)
c += svg(icon("gauge", 970, 216, 24, PEN))
c += box(970, 252, 230, 70, font(60, 70, PEN, 700), "39")
c += box(970, 324, 230, 22, font(15, 22, INK, 700), "个百分点")
c += box(970, 350, 230, 22, font(14, 22, MUTED), "自评和实测之差")
c += box(970, 388, 226, 90, font(14, 22, INK), "试新用法时，记下用时和返工，别只问感觉。")
c += tag(950, 512, "工作论文 · METR 2025-07", AMBER)
c += source("来源：METR，arXiv 2507.09089（工作论文，2025-07）。16 名资深开源开发者，246 项真实任务，随机分配能否用 AI")
pages.append(("8 感觉与实测", c))

# 9 quiz 1 / 10 answers
def quiz(pg, seg, title, items, img, ans=None, note=None):
    c = head(pg, seg, seg, title)
    if img:
        c += photo(img, 64, 196, 400, 420, "示意图：课堂（AI 生成）")
        x0, w = 494, 722
    else:
        x0, w = 64, 1152
    s = ""
    c += svg("".join(ruled(x0, 196 + i * 142, w, 128, 32) for i in range(len(items))))
    for i, it in enumerate(items):
        y = 196 + i * 142
        s += t(x0 + 28, y + 40, "%d" % (i + 1), 22, PEN, "middle", 700)
        c += box(x0 + 72, y + 14, 120, 24, font(14, 24, BLUE, 700), "情景%s" % "一二三"[i])
        c += box(x0 + 72, y + 42, w - 280 if ans else w - 320, 60, font(17, 30, INK), it)
        if ans:
            a, col, why = ans[i]
            c += stamp(x0 + w - 150, y + 20, a, col, None, [-6, 4, -3][i])
            c += box(x0 + 72, y + 100, w - 120, 22, font(13, 22, col, 700), why)
        else:
            for j, opt in enumerate(["可以", "不行", "先别急"]):
                xx = x0 + w - 230 + j * 74
                s += rect(xx, y + 50, 18, 18, SURF, 'stroke="%s" stroke-width="1.8" rx="3"' % BLUE) + t(xx + 24, y + 64, opt, 13, INK)
    c += svg(s)
    if note:
        c += box(x0, 626 - 6, w, 0, "")
    return c

q1 = ["新同事用公司批准的 AI 工具，把自己写的周报润色一遍，读过再交", "一位老同事让 AI 算出三个季度的同比增长率，没核对就放进给领导的汇报", "一位主管觉得用 AI 写方案快多了，要求部门所有活都先交给 AI 做"]
pages.append(("9 小测一", quiz(9, "小测一", "小测一：这三件事，能不能这样用 AI？", q1, "quiz-hand")))
a1 = [("✓ 可以", GREEN, "写作是它擅长的活，新人获益最大。交之前自己读一遍。见第 5、6 页"), ("✕ 不行", DANGER, "算数和核对事实可能超出它的能力。数字发出前要人核对。见第 7 页"), ("‖ 先别急", AMBER, "感觉快不等于真的快。先挑几类活试，记下用时和返工。见第 8 页")]
c = quiz(10, "小测一", "答案：润色周报可以，数字直接用不行，铺开先别急", q1, None, a1)
c += box(64, 620, 1152, 22, font(14, 22, BLUE, 700), "判断的顺序：先问是不是它擅长的活，再问结果谁来核，最后看数字再推广。")
pages.append(("10 小测一答案", c))

# 11 chapter 2
pages.append(("11 环节二", chapter(11, "环节二", "环节二", "三个真实案例：出了错谁来担", "泄露、编造、说错话，后果都落在用它的人和公司身上",
                                      [("file-warning", "三星：放开不到 20 天，3 起泄露"), ("gavel", "律师和航空公司：编造与说错都要担责"), ("users", "47 国员工调查：风险出在使用习惯")])))

# 12 cases
c = head(12, "环节二", "环节二 · 三个真实案例", "三星、律师、航空公司：担责的是人和公司，不是工具")
cases = [("file-warning", "三星", "2023-03 至 05", "放开公共 AI 工具不到 20 天，员工把源码和会议记录贴了进去，出了 3 起泄露", "公司禁止员工用生成式 AI", "韩国《经济学人》、彭博"),
         ("gavel", "律师", "2023-06-22", "交了 AI 编造的判例，被质疑后仍坚持", "罚 5,000 美元，法院认定主观恶意", "纽约南区联邦法院"),
         ("plane", "航空公司", "2024-02-14", "网站客服机器人说丧亲票可以事后申请，实际不行", "判赔 812.02 加元，「机器人是独立主体」没被采纳", "加拿大民事解决庭")]
s = ""
for i, (ic, nm, d, what, cost, src) in enumerate(cases):
    x = 64 + i * 392
    c += card(x, 196, 368, 330, "border-top: 4px solid " + PEN)
    s += icon(ic, x + 20, 218, 26, PEN)
    c += box(x + 58, 216, 200, 30, font(22, 30, INK, 700), nm)
    c += box(x + 230, 222, 120, 22, font(13, 22, MUTED, 400, "text-align: right"), d)
    c += box(x + 20, 262, 330, 20, font(12, 20, BLUE, 700), "发生了什么")
    c += box(x + 20, 284, 330, 90, font(15, 24, INK), what)
    c += box(x + 20, 382, 330, 1, "background: " + LINE)
    c += box(x + 20, 394, 330, 20, font(12, 20, PEN, 700), "谁担了后果")
    c += box(x + 20, 416, 330, 60, font(16, 26, INK, 700), cost)
    c += box(x + 20, 490, 330, 20, font(12, 20, MUTED), src)
c += svg(s)
c += box(64, 546, 760, 70, "background: %s; border-radius: 10px; box-sizing: border-box; padding: 12px 20px 12px 56px; " % BTINT + font(15, 23, INK), "律师案的法官写得很清楚：用可靠的 AI 工具本身没有不当，把关核实是律师的责任。")
c += svg(icon("message-square-quote", 80, 568, 22, BLUE))
c += card(848, 546, 368, 70)
c += box(868, 552, 150, 40, font(30, 40, PEN, 700), "2,145")
c += box(1004, 556, 200, 52, font(13, 20, INK), "起法庭裁决涉及 AI 编造的内容（截至 2026-10-04）")
c += source("来源：韩国《经济学人》2023-03，彭博 2023-05，纽约南区联邦法院 2023-06-22，加拿大民事解决庭 2024-02-14，Charlotin 案例库", y=632)
pages.append(("12 三个案例", c))

# 13 habits
c = head(13, "环节二", "环节二 · 员工调查", "近一半员工把公司信息传进公共 AI，禁用了反而更多")
hb = [("知道能靠 AI，就少花力气", 72), ("不加评估就用 AI 的输出", 66), ("隐瞒用了 AI，或当成自己写的", 57), ("因为 AI 在工作中犯过错", 56), ("不知道是否允许就用了", 56), ("把公司信息传进公共 AI 工具", 48)]
s = t(64, 206, "在工作中用 AI 的员工里，承认做过的比例", 13, INK, "start", 700)
for i, (lab, v) in enumerate(hb):
    y = 226 + i * 54; em = v == 48
    s += t(300, y + 24, lab, 15, PEN if em else INK, "end", 700 if em else 400) + rect(316, y + 6, v * 4.4, 28, PEN if em else GHOST, 'rx="3"') + t(316 + v * 4.4 + 10, y + 27, "%d%%" % v, 16, PEN if em else INK, "start", 700)
c += svg(s)
c += tag(64, 556, "企业调查 · 员工自报 · 47 国 32,352 人", AMBER)
c += card(800, 196, 416, 400)
c += svg(icon("ban", 824, 218, 24, PEN))
c += box(860, 216, 340, 26, font(16, 26, INK, 700), "传过公司信息的员工，按公司政策分")
s = ""
for i, (lab, v, col) in enumerate([("明令禁用 AI", 67, PEN), ("有使用政策", 56, BLUE), ("没有政策", 33, GHOST)]):
    y = 270 + i * 84
    s += t(824, y + 18, lab, 14, INK, "start", 700) + rect(824, y + 28, v * 4.6, 30, col, 'rx="3"') + t(824 + v * 4.6 + 10, y + 50, "%d%%" % v, 20, col if col != GHOST else MUTED, "start", 700)
c += svg(s)
c += box(824, 530, 370, 52, font(14, 22, MUTED), "光靠禁令不管用，要给工具、给规则、给培训。")
c += source("来源：墨尔本大学与毕马威，《AI 信任、态度与使用：2025 全球研究》（2025-04）")
pages.append(("13 风险行为", c))

# 14 chapter 3
pages.append(("14 环节三", chapter(14, "环节三", "环节三", "我们的规则和方法", "六条规则，每条都有依据。三个方法，交出去之前把好关",
                                      [("clipboard-check", "六条规则和每条的依据"), ("layers", "信息分三级：先分级，再决定"), ("pencil-line", "三个方法：给资料、讲规矩、逐条核")])))

# 15 rules
c = head(15, "环节三", "环节三 · 我们的规则", "我们的六条规则，每一条都有依据")
rules = [("lock", "一、分级使用", "个人信息、商业秘密和未公开的经营材料，不放进公共 AI 工具", "个保法 · 数安法"), ("shield-check", "二、只用批准的工具", "用公司批准的工具和公司账号，不用个人账号处理工作", "个保法第 21 条"),
         ("user-check", "三、人来复核", "事实、数字、引用、代码和对外承诺，发出前由人核对", "治理框架 6.3.1"), ("badge-info", "四、对外标识", "对外发布 AI 生成的内容，主动声明，不删改标识", "标识办法第 10 条"),
         ("history", "五、留存记录", "留着提示词、草稿和修改记录，版权有争议时拿得出来", "张家港法院判例"), ("siren", "六、出错就报", "传错了信息、用错了内容，马上报告，不悄悄改", "数安法第 29 条")]
s = ""
for i, (ic, ti, tx, basis) in enumerate(rules):
    x = 64 + (i % 3) * 392; y = 196 + (i // 3) * 212
    c += card(x, y, 368, 196)
    s += '<circle cx="%d" cy="%d" r="22" fill="%s"/>' % (x + 42, y + 42, BTINT) + icon(ic, x + 30, y + 30, 24, BLUE)
    c += box(x + 78, y + 28, 270, 30, font(20, 30, INK, 700), ti)
    c += box(x + 20, y + 80, 330, 52, font(15, 24, INK), tx)
    c += box(x + 20, y + 150, 50, 22, font(12, 22, MUTED), "依据")
    c += tag(x + 60, y + 150, basis, PEN)
c += svg(s)
c += source("依据：《个人信息保护法》《数据安全法》，《人工智能安全治理框架》2.0（2025-09），《标识办法》（2025-09 施行），张家港法院判例")
pages.append(("15 六条规则", c))

# 16 grading
c = head(16, "环节三", "环节三 · 规则一", "规则一：先看信息是哪一级，再决定能不能交给 AI")
lv = [("个人信息、商业秘密", "不放进公共 AI 工具", "客户名单和电话、源代码、报价、未公开的财务数据", DANGER, "lock"),
      ("内部资料", "只在公司批准的工具里用", "内部流程、会议安排、不含个人信息的草稿", AMBER, "shield-check"),
      ("公开信息", "可以交给公司批准的工具", "官网文章、已发布的报告、公开的法规", GREEN, "globe")]
s = ""
for i, (nm, act, ex, col, ic) in enumerate(lv):
    y = 200 + i * 136
    top_w = 200 + i * 110
    s += '<polygon points="%d,%d %d,%d %d,%d %d,%d" fill="%s"/>' % (320 - top_w / 2, y, 320 + top_w / 2, y, 320 + (top_w + 110) / 2, y + 124, 320 - (top_w + 110) / 2, y + 124, col)
    s += t(320, y + 70, nm, 17, "#FFFFFF", "middle", 700)
    s += line(320 + (top_w + 55) / 2 + 10, y + 62, 600, y + 62, col, 1.5, 'stroke-dasharray="4 3"')
    c += card(610, y, 606, 124, "border-left: 4px solid " + col)
    s += icon(ic, 630, y + 22, 24, col)
    c += box(666, y + 20, 520, 30, font(20, 30, col, 700), act)
    c += box(630, y + 62, 560, 20, font(12, 20, MUTED, 700), "例如")
    c += box(630, y + 82, 560, 30, font(15, 24, INK), ex)
c += svg(s)
c += source("依据：《数据安全法》第 21 条，《个人信息保护法》第 21、23、28 条，英国政府《公务员使用生成式 AI 指南》（2024-01）")
pages.append(("16 信息分级", c))

# 17 methods
c = head(17, "环节三", "环节三 · 三个方法", "三个好用的方法：给足资料、讲清规矩、逐条核对")
md = [("method-desk", "file-text", "1", "给足资料", "贴上资料，要求只用这些"), ("method-board", "message-square-quote", "2", "讲清规矩", "没有就答「待确认」，分清原文和推断"), ("method-redpen", "pencil-line", "3", "逐条核对", "打开原文，一条条对")]
s = ""
for i, (img, ic, n, ti, tx) in enumerate(md):
    x = 64 + i * 392
    c += photo(img, x, 196, 368, 200, None)
    s += '<circle cx="%d" cy="%d" r="20" fill="%s"/>' % (x + 30, 426, PEN) + t(x + 30, 433, n, 18, "#FFFFFF", "middle", 700)
    s += icon(ic, x + 330, 414, 24, BLUE)
    c += box(x + 62, 412, 260, 30, font(21, 30, INK, 700), ti)
    c += box(x + 62, 448, 300, 48, font(15, 24, MUTED), tx)
c += svg(s)
c += box(360, 520, 560, 92, "background: #FBF3D9; box-sizing: border-box; padding: 16px 22px; transform: rotate(-1deg); box-shadow: 0 2px 6px rgba(35,40,46,0.15); " + font(18, 30, INK, 700), "最管用的一句：<br>资料里找不到答案时，请回答「待确认」，不要自己补。")
c += source("来源：英国政府《AI Insights：提示工程》（2026-08 更新），加拿大政府《生成式 AI 使用指南》（2026-09）。图为 AI 生成")
pages.append(("17 三个方法", c))

# 18 quiz 2 / 19 answers
q2 = ["把客户投诉邮件连同姓名、手机号，贴进个人账号的免费 AI 写回复", "用 AI 生成一张活动海报，发到公司公众号之前，把角上的 AI 标识裁掉了", "发现自己上周把一份带客户名单的表格贴进了公共 AI，想着没人知道就算了"]
pages.append(("18 小测二", quiz(18, "小测二", "小测二：这三件事，能不能这样做？", q2, "quiz-pair")))
a2 = [("✕ 不行", DANGER, "规则一、二：个人信息不进公共工具，只用批准的工具"), ("✕ 不行", DANGER, "规则四：对外发布要主动声明，不得删改标识"), ("✕ 不行", DANGER, "规则六：马上报告，越早补救损失越小。这一题最容易做错")]
c = quiz(19, "小测二", "答案：三件都不行，分别对照规则一和二、四、六", q2, None, a2)
c += box(64, 620, 1152, 22, font(14, 22, BLUE, 700), "报告不是认错，是让公司来得及补救。")
c += source("依据：《个人信息保护法》第 21、23、57 条，《标识办法》第 10 条（2025-09-01 施行），《数据安全法》第 29 条", y=650)
pages.append(("19 小测二答案", c))

# 20 board
c = head(20, "小结", "小结 · 板书", "板书上这八个词，下课前抄下来")
c += box(64, 196, 1152, 400, "background: " + BOARD + "; border-radius: 6px; border: 8px solid #8E7A5E; box-sizing: border-box")
pairs = [("list-checks", "挑任务 · 看数字", "写、改、归纳交给它，推广之前记下用时和返工", False), ("lock", "先分级 · 用批准的", "个人信息、商业秘密不进公共工具，只用公司批准的工具", True),
         ("user-check", "人来核 · 对外标", "事实、数字、引用发出前核对，对外发布主动声明", False), ("siren", "留记录 · 错就报", "留着提示词和草稿，出了错马上报告", False)]
s = ""
for i, (ic, w_, tx, em) in enumerate(pairs):
    x = 104 + (i % 2) * 540; y = 236 + (i // 2) * 170
    s += icon(ic, x, y + 6, 30, "#E7B9AF" if em else "#FFFFFF", 2)
    c += box(x + 48, y, 460, 48, font(34, 48, "#FFFFFF", 700, "white-space: nowrap"), w_)
    if em:
        s += squiggle(x + 48, y + 58, 300, "#E7B9AF", 3)
    c += box(x + 48, y + 70, 460, 52, font(15, 24, "#D7E2EA"), tx)
c += svg(s)
c += box(64, 610, 1152, 24, font(14, 24, PEN, 700), "回到第 2 页：三个目标，打勾了吗？")
pages.append(("20 板书", c))

# 21 homework
c = runhead(21, "小结", "小结 · 课后作业")
c += box(64, 64, 900, 60, font(40, 56, INK, 700), "课后作业：三道题")
c += svg(squiggle(64, 132, 108))
c += svg(ruled(64, 168, 760, 420, 64))
s = ""
hw = [("挑一件本周的工作，按三个方法用 AI 做一遍", "给足资料、讲清规矩、逐条核对"), ("对照六条规则自查", "哪一条最容易忘，写下来"), ("记下用时和返工次数", "和不用 AI 时比一比")]
for i, (a, b) in enumerate(hw):
    y = 196 + i * 128
    s += rect(132, y + 6, 26, 26, SURF, 'stroke="%s" stroke-width="2" rx="4"' % BLUE) + t(92, y + 28, "%s" % "一二三"[i], 20, PEN, "middle", 700)
    c += box(176, y + 4, 620, 34, font(22, 34, INK, 700), a)
    c += box(176, y + 50, 620, 26, font(15, 26, MUTED), b)
c += svg(s)
c += box(864, 168, 352, 200, "background: #FBF3D9; box-sizing: border-box; padding: 22px; transform: rotate(1.5deg); box-shadow: 0 2px 6px rgba(35,40,46,0.15)")
c += box(886, 186, 300, 24, font(14, 24, PEN, 700), "交作业")
c += box(886, 216, 300, 72, font(20, 32, INK, 700), "下周三前，把记录交给直属主管")
c += box(886, 300, 300, 50, font(14, 22, MUTED), "拿不准的地方，随时问培训部")
c += stamp(1090, 330, "作业", PEN, None, -8)
c += box(864, 566, 352, 22, font(13, 22, MUTED), "培训部 · 2026 年 10 月")
pages.append(("21 课后作业", c))

boards = {}; order_ = []; cells = []
for i, (title, inner) in enumerate(pages):
    name = "Main.dc.html" if i == 0 else "d%02d.dc.html" % (i + 1)
    open(os.path.join(P, name), 'w').write(page(title, inner))
    boards[name] = {"x": 0, "y": i * 840, "w": 1280, "h": 720, "title": title + " · 设计稿"}; order_.append(name)
    cur = "c%02d.dc.html" % (i + 1)
    open(os.path.join(P, cur), 'w').write(page(title + " 当前", '<img src="' + CUR[i] + '" alt="引擎当前渲染" style="display: block; width: 1280px; height: 720px">'))
    boards[cur] = {"x": 1360, "y": i * 840, "w": 1280, "h": 720, "title": title + " · 引擎当前"}; order_.append(cur)
    loc = inner
    for k_ in IMG:
        loc = loc.replace(IMG[k_], "../up/" + k_ + ".jpg")
    cells.append('<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: %s; color: %s; font-family: %s">%s</div>' % (BG, INK, SANS, loc))
canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}, "title": "homeroom 全员 AI 培训样例设计稿",
          "launch": {"view": "canvas"}, "pages": [], "boards": boards, "order": order_, "notes": {}, "designSystems": []}
pc = os.path.join(P, 'canvas.json')
if os.path.exists(pc):
    canvas["createdOnFiles"] = json.load(open(pc))["createdOnFiles"]
json.dump(canvas, open(pc, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(L, 'sheet.html'), 'w').write('<!doctype html><meta charset="utf-8"><body style="margin:0;background:#888;display:grid;grid-template-columns:repeat(2,1280px);gap:16px;padding:16px;width:2592px">' + "".join(cells) + '</body>')
print(len(order_))
