"""
CDL Class A Driver Training Manual — body PDF builder (ReportLab).
Produces body.pdf (no cover). Cover is merged separately.

Structure:
  TOC
  Part I  — Core CDL Fundamentals (everyone)
  Part II — Specialty Modules:
     01 Dry Van
     02 Flatbed
     03 Containers / Intermodal
     04 Dump Trucks
     05 Refrigerated (Reefer)
  Appendix — Key regulations quick reference
"""
import os
import hashlib
from PIL import Image as PILImage

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm, mm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    Image, KeepTogether, HRFlowable, CondPageBreak, ListFlowable, ListItem,
    Flowable,
)
from reportlab.platypus.tableofcontents import TableOfContents

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "assets")
OUT = os.path.join(HERE, "body.pdf")

# ── Palette (from palette.cascade) ──
ACCENT      = colors.HexColor("#a4492a")   # burnt orange
ACCENT2     = colors.HexColor("#5aae44")   # green
HEADER      = colors.HexColor("#36454d")   # dark slate
COVER_BLOCK = colors.HexColor("#4e5d65")
ICON        = colors.HexColor("#3c6f89")   # steel blue
BORDER      = colors.HexColor("#b4c2ca")
CARD_BG     = colors.HexColor("#e8eaeb")
PAGE_BG     = colors.HexColor("#f2f3f4")
TEXT        = colors.HexColor("#222526")
MUTED       = colors.HexColor("#7c8386")
SUCCESS     = colors.HexColor("#46915f")
WARNING     = colors.HexColor("#9d8147")
DANGER      = colors.HexColor("#90534d")
TINT_ACCENT = colors.HexColor("#fdf2ec")   # light orange tint
TINT_ICON   = colors.HexColor("#eef4f7")   # light blue tint
TINT_GREEN  = colors.HexColor("#eef6e9")   # light green tint
TINT_RED    = colors.HexColor("#fbeeed")   # light red tint

# ── Font registration (Windows fonts) ──
FONTS = "C:/Windows/Fonts"
pdfmetrics.registerFont(TTFont("Times", os.path.join(FONTS, "times.ttf")))
pdfmetrics.registerFont(TTFont("Times-Bold", os.path.join(FONTS, "timesbd.ttf")))
pdfmetrics.registerFont(TTFont("Times-Italic", os.path.join(FONTS, "timesi.ttf")))
pdfmetrics.registerFont(TTFont("Times-BoldItalic", os.path.join(FONTS, "timesbi.ttf")))
pdfmetrics.registerFont(TTFont("Arial", os.path.join(FONTS, "arial.ttf")))
pdfmetrics.registerFont(TTFont("Arial-Bold", os.path.join(FONTS, "arialbd.ttf")))
pdfmetrics.registerFont(TTFont("Arial-Italic", os.path.join(FONTS, "ariali.ttf")))
pdfmetrics.registerFont(TTFont("Arial-BoldItalic", os.path.join(FONTS, "arialbi.ttf")))
pdfmetrics.registerFont(TTFont("Consola", os.path.join(FONTS, "consola.ttf")))
pdfmetrics.registerFont(TTFont("Consola-Bold", os.path.join(FONTS, "consolab.ttf")))

registerFontFamily("Times", normal="Times", bold="Times-Bold",
                   italic="Times-Italic", boldItalic="Times-BoldItalic")
registerFontFamily("Arial", normal="Arial", bold="Arial-Bold",
                   italic="Arial-Italic", boldItalic="Arial-BoldItalic")
registerFontFamily("Consola", normal="Consola", bold="Consola-Bold")

BODY_FONT = "Times"
HEAD_FONT = "Arial-Bold"
SANS_FONT = "Arial"
MONO_FONT = "Consola"

# ── Page geometry ──
PAGE_W, PAGE_H = A4
L_MARGIN = R_MARGIN = 0.85 * inch
T_MARGIN = 0.95 * inch
B_MARGIN = 0.9 * inch
CONTENT_W = PAGE_W - L_MARGIN - R_MARGIN

# ─────────────────────────────────────────────────────────────
# Styles
# ─────────────────────────────────────────────────────────────
ss = getSampleStyleSheet()

H1 = ParagraphStyle("H1", fontName=HEAD_FONT, fontSize=20, leading=24,
    textColor=HEADER, spaceBefore=4, spaceAfter=6, alignment=TA_LEFT)
H1_KICKER = ParagraphStyle("H1Kicker", fontName=SANS_FONT, fontSize=9.5, leading=12,
    textColor=ACCENT, spaceBefore=0, spaceAfter=2, alignment=TA_LEFT)
H2 = ParagraphStyle("H2", fontName=HEAD_FONT, fontSize=14, leading=18,
    textColor=HEADER, spaceBefore=16, spaceAfter=6, alignment=TA_LEFT)
H3 = ParagraphStyle("H3", fontName=HEAD_FONT, fontSize=11.5, leading=15,
    textColor=ACCENT, spaceBefore=10, spaceAfter=3, alignment=TA_LEFT)
BODY = ParagraphStyle("Body", fontName=BODY_FONT, fontSize=10.5, leading=15.5,
    textColor=TEXT, spaceBefore=0, spaceAfter=7, alignment=TA_JUSTIFY)
BODY_L = ParagraphStyle("BodyL", parent=BODY, alignment=TA_LEFT)
BULLET = ParagraphStyle("Bullet", fontName=BODY_FONT, fontSize=10.5, leading=15,
    textColor=TEXT, leftIndent=16, bulletIndent=2, spaceBefore=1, spaceAfter=2,
    alignment=TA_LEFT)
CAPTION = ParagraphStyle("Caption", fontName=SANS_FONT, fontSize=8.5, leading=11,
    textColor=MUTED, alignment=TA_CENTER, spaceBefore=4, spaceAfter=10)
SMALL = ParagraphStyle("Small", fontName=SANS_FONT, fontSize=8.5, leading=11.5,
    textColor=MUTED, alignment=TA_LEFT)
# table cell styles
TC_HEAD = ParagraphStyle("TCHead", fontName=HEAD_FONT, fontSize=9.5, leading=12,
    textColor=colors.white, alignment=TA_CENTER)
TC_HEAD_L = ParagraphStyle("TCHeadL", parent=TC_HEAD, alignment=TA_LEFT)
TC = ParagraphStyle("TC", fontName=BODY_FONT, fontSize=9.5, leading=12.5,
    textColor=TEXT, alignment=TA_LEFT)
TC_C = ParagraphStyle("TCC", parent=TC, alignment=TA_CENTER)
TC_B = ParagraphStyle("TCB", parent=TC, fontName="Times-Bold")
# callout styles
CALL_TITLE = ParagraphStyle("CallTitle", fontName=HEAD_FONT, fontSize=10, leading=13,
    textColor=HEADER, spaceAfter=2)
CALL_BODY = ParagraphStyle("CallBody", fontName=BODY_FONT, fontSize=9.5, leading=13,
    textColor=TEXT, alignment=TA_LEFT)
TOC_TITLE = ParagraphStyle("TocTitle", fontName=HEAD_FONT, fontSize=22, leading=26,
    textColor=HEADER, spaceAfter=14)

# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────
story = []

def heading(text, style, level=0, kicker=None):
    """Heading with bookmark for TOC + optional kicker line above."""
    key = "h_" + hashlib.md5((text + str(level)).encode()).hexdigest()[:10]
    items = []
    if kicker:
        items.append(Paragraph(kicker.upper(), H1_KICKER))
    p = Paragraph('<a name="%s"/>%s' % (key, text), style)
    p.bookmark_name = text
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    items.append(p)
    if level == 0:
        items.append(HRFlowable(width=CONTENT_W * 0.18, thickness=2.5,
                                color=ACCENT, spaceBefore=2, spaceAfter=8))
    return items

def h1(text, kicker=None):
    # orphan protection: only break if heading would land near bottom
    story.append(CondPageBreak(2.2 * inch))
    story.extend(heading(text, H1, level=0, kicker=kicker))

def h2(text):
    story.extend(heading(text, H2, level=1))

def h3(text):
    story.append(CondPageBreak(1.0 * inch))
    story.append(Paragraph(text, H3))

def para(text):
    story.append(Paragraph(text, BODY))

def bullets(items, style=BULLET):
    flow = ListFlowable(
        [ListItem(Paragraph(t, style), value="•", leftIndent=14) for t in items],
        bulletType="bullet", start="•", leftIndent=8, bulletFontName=BODY_FONT,
        bulletColor=ACCENT, spaceBefore=2, spaceAfter=6,
    )
    story.append(flow)

def numbered(items):
    flow = ListFlowable(
        [ListItem(Paragraph(t, BODY_L), leftIndent=18) for t in items],
        bulletType="1", leftIndent=12, bulletFontName="Times-Bold",
        bulletColor=ACCENT, spaceBefore=3, spaceAfter=8,
    )
    story.append(flow)

def spacer(h=10):
    story.append(Spacer(1, h))

def embed_image(name, max_w=None, max_h=None, caption=None):
    if max_w is None:
        max_w = CONTENT_W
    if max_h is None:
        max_h = PAGE_H * 0.40
    path = os.path.join(ASSETS, name)
    pil = PILImage.open(path)
    ow, oh = pil.size
    rw = max_w / ow if ow > max_w else 1.0
    rh = max_h / oh if oh > max_h else 1.0
    r = min(rw, rh)
    img = Image(path, width=ow * r, height=oh * r)
    img.hAlign = "CENTER"
    block = [Spacer(1, 4), img]
    if caption:
        block.append(Paragraph(caption, CAPTION))
    else:
        block.append(Spacer(1, 8))
    story.append(KeepTogether(block))

def make_table(data, col_ratios, header=True, font_size=9.5, align=None):
    """data: list of rows (list of str or Paragraph). col_ratios sum to 1.0."""
    col_widths = [r * CONTENT_W for r in col_ratios]
    # wrap strings in Paragraphs
    wrapped = []
    for ri, row in enumerate(data):
        wr = []
        for ci, cell in enumerate(row):
            if isinstance(cell, Flowable):
                wr.append(cell)
            else:
                if ri == 0 and header:
                    st = TC_HEAD_L if (align and align[ci] == "L") else TC_HEAD
                else:
                    if align and align[ci] == "C":
                        st = TC_C
                    elif align and align[ci] == "B":
                        st = TC_B
                    else:
                        st = TC
                wr.append(Paragraph(str(cell), st))
        wrapped.append(wr)
    t = Table(wrapped, colWidths=col_widths, hAlign="CENTER", repeatRows=1 if header else 0)
    style = [
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
    ]
    if header:
        style += [
            ("BACKGROUND", (0, 0), (-1, 0), HEADER),
            ("TOPPADDING", (0, 0), (-1, 0), 7),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 7),
        ]
        # zebra striping for body rows
        for ri in range(1, len(data)):
            if ri % 2 == 0:
                style.append(("BACKGROUND", (0, ri), (-1, ri), CARD_BG))
            else:
                style.append(("BACKGROUND", (0, ri), (-1, ri), colors.white))
    t.setStyle(TableStyle(style))
    story.append(Spacer(1, 6))
    story.append(t)
    story.append(Spacer(1, 10))

def callout(title, body_text, kind="info"):
    """Colored callout box. kind: info/ok/warn/danger."""
    palette = {
        "info":   (TINT_ICON,  ICON,    "NOTE"),
        "ok":     (TINT_GREEN, SUCCESS, "BEST PRACTICE"),
        "warn":   (TINT_ACCENT, WARNING, "CAUTION"),
        "danger": (TINT_RED,   DANGER,  "DANGER"),
    }
    bg, bar, tag = palette.get(kind, palette["info"])
    title_p = Paragraph('<font color="%s"><b>%s</b></font>   %s' % (
        bar.hexval(), tag, title), CALL_TITLE)
    body_p = Paragraph(body_text, CALL_BODY)
    inner = Table([[title_p], [body_p]], colWidths=[CONTENT_W - 16])
    inner.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (0, 0), 8),
        ("BOTTOMPADDING", (0, 0), (0, 0), 2),
        ("TOPPADDING", (0, 1), (0, 1), 0),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("LINEBEFORE", (0, 0), (0, -1), 3.5, bar),
    ]))
    story.append(Spacer(1, 4))
    story.append(KeepTogether([inner, Spacer(1, 10)]))

def spec_table(rows):
    """Two-column spec table (label | value)."""
    make_table(rows, col_ratios=[0.34, 0.66], header=False, align=["B", "L"])

# ─────────────────────────────────────────────────────────────
# DocTemplate with TOC + header/footer
# ─────────────────────────────────────────────────────────────
class TocDoc(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, "bookmark_name"):
            level = getattr(flowable, "bookmark_level", 0)
            text = getattr(flowable, "bookmark_text", "")
            key = getattr(flowable, "bookmark_key", "")
            self.notify("TOCEntry", (level, text, self.page, key))

def header_footer(canvas, doc):
    canvas.saveState()
    # header
    canvas.setFont(SANS_FONT, 7.8)
    canvas.setFillColor(MUTED)
    canvas.drawString(L_MARGIN, PAGE_H - T_MARGIN + 26,
                      "CDL CLASS A · DRIVER TRAINING MANUAL")
    canvas.drawRightString(PAGE_W - R_MARGIN, PAGE_H - T_MARGIN + 26,
                           "2026 Edition · Rev. 1")
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(L_MARGIN, PAGE_H - T_MARGIN + 20,
                PAGE_W - R_MARGIN, PAGE_H - T_MARGIN + 20)
    # footer
    canvas.line(L_MARGIN, B_MARGIN - 14, PAGE_W - R_MARGIN, B_MARGIN - 14)
    canvas.setFillColor(MUTED)
    canvas.drawString(L_MARGIN, B_MARGIN - 26, "FMCSA · DOT · 49 CFR compliant")
    canvas.drawRightString(PAGE_W - R_MARGIN, B_MARGIN - 26,
                           "Page %d" % doc.page)
    canvas.restoreState()

doc = TocDoc(
    OUT, pagesize=A4,
    leftMargin=L_MARGIN, rightMargin=R_MARGIN,
    topMargin=T_MARGIN, bottomMargin=B_MARGIN,
    title="CDL Class A Driver Training Manual",
    author="Z.ai", creator="Z.ai",
    subject="Commercial Driver's License Class A training: core fundamentals and specialty equipment modules",
)

# ─────────────────────────────────────────────────────────────
# TOC
# ─────────────────────────────────────────────────────────────
story.append(Paragraph("Table of Contents", TOC_TITLE))
story.append(HRFlowable(width=CONTENT_W * 0.18, thickness=2.5,
                        color=ACCENT, spaceBefore=0, spaceAfter=14))
toc = TableOfContents()
toc.levelStyles = [
    ParagraphStyle("TOC1", fontName=HEAD_FONT, fontSize=11.5, leading=20,
                   textColor=HEADER, leftIndent=0),
    ParagraphStyle("TOC2", fontName=BODY_FONT, fontSize=10, leading=16,
                   textColor=TEXT, leftIndent=22),
]
story.append(toc)
story.append(PageBreak())

# ─────────────────────────────────────────────────────────────
# PART I — CORE CDL FUNDAMENTALS
# ─────────────────────────────────────────────────────────────
h1("Part I — Core CDL Fundamentals", kicker="Every Class A driver · Required for all equipment types")

para(
    "This section covers the universal knowledge every Class A Commercial Driver's License "
    "holder must master before operating any combination vehicle on public roads. These "
    "fundamentals apply regardless of the trailer type you will eventually specialize in. "
    "Study this part thoroughly — every specialty module in Part II builds directly on it."
)

h2("1.1 The Class A License Explained")
para(
    "A <b>Class A CDL</b> authorizes you to operate any combination of vehicles with a "
    "Gross Combination Weight Rating (GCWR) of <b>26,001 pounds or more</b>, provided the "
    "towed vehicle exceeds 10,000 pounds. This is the most versatile commercial license and "
    "covers tractor-trailers (semi-trucks), truck and trailer combinations, and most heavy "
    "equipment transports."
)
spec_table([
    ["License class", "Class A CDL"],
    ["Minimum age", "21 (interstate); 18+ in some states (intrastate only)"],
    ["Vehicle covered", "GCWR ≥ 26,001 lb, towed unit > 10,000 lb"],
    ["Typical vehicles", "Tractor-trailers, flatbeds, tankers, doubles/triples"],
    ["Key endorsement: air brakes", "Required for nearly all Class A work"],
])

h2("1.2 Getting Licensed — The Process")
numbered([
    "<b>Obtain a Commercial Learner's Permit (CLP).</b> Pass the general knowledge, combination vehicle, and air-brake written tests at your state DMV. Hold the CLP for a minimum of 14 days before the skills test.",
    "<b>Complete Entry-Level Driver Training (ELDT).</b> Federal regulations require certified theory and behind-the-wheel (BTW) training from a provider listed in the FMCSA Training Provider Registry before you can take the skills test.",
    "<b>Pass the three-part skills test:</b> (1) Pre-trip vehicle inspection, (2) Basic vehicle control (straight back, offset back, alley dock), and (3) On-road driving.",
    "<b>Add endorsements</b> as needed for your career path: Air Brakes (most Class A), Hazmat (H), Tanker (N), Doubles/Triples (T), Passenger (P), School Bus (S).",
    "<b>Pass a DOT medical exam</b> with a certified Medical Examiner and carry the Medical Examiner's Certificate. Re-certify every 1–2 years depending on health.",
    "<b>Clear the Drug & Alcohol Clearinghouse</b> — a negative pre-employment test is required, and you remain in the random pool afterward.",
])

callout("ELDT is mandatory.",
        "Since February 7, 2022, all new CDL applicants must complete Entry-Level Driver Training "
        "through an FMCSA-listed provider. Your state DMV cannot issue the skills-test results "
        "until the provider reports your completion to the Training Provider Registry.", "info")

h2("1.3 Hours of Service (HOS) — The 14-Hour Clock")
para(
    "The Hours-of-Service rules (49 CFR Part 395) exist to prevent fatigue, the leading "
    "contributor to fatal truck crashes. Master the clocks below — violations carry civil "
    "penalties and place your CDL at risk."
)
make_table([
    ["Rule", "Limit", "What it means"],
    ["Drive time", "11 hours", "Maximum driving after 10 consecutive hours off duty."],
    ["Window", "14 hours", "Once you start (on-duty, not driving counts), you have 14 hours to drive. You cannot drive after the window closes even with breaks."],
    ["Duty cycle (60/70)", "60 hr / 7 days  ·  70 hr / 8 days", "Maximum on-duty time in any 7- or 8-day period, depending on your carrier's operation."],
    ["Rest", "10 hours off", "Required off-duty/sleeper time before restarting the 11/14-hour clocks."],
    ["30-min break", "Required", "If more than 8 hours have passed since your last off-duty period, take a 30-minute break before driving again."],
    ["Restart", "34 hours", "A 34-hour consecutive off-duty reset restarts the 60/70-hour clock."],
], col_ratios=[0.20, 0.24, 0.56])

para(
    "Record your status on an <b>Electronic Logging Device (ELD)</b>. The device automatically "
    "captures driving time through the engine; you must annotate on-duty (not driving), off-duty, "
    "and sleeper-berth status. Never falsify logs — ELDs retain tamper-evident records."
)

h2("1.4 The Pre-Trip Inspection")
para(
    "A thorough pre-trip inspection is your single best defense against roadside breakdowns, "
    "citations, and crashes. It is also the first part of your CDL skills test — fail it and the "
    "test ends immediately. Walk the vehicle in a consistent clockwise pattern so you never skip "
    "an area. The diagram below shows the standard 7-point sequence."
)
embed_image("procedure_pretrip.png", caption="Figure 1.1 — The clockwise 7-point pre-trip walk-around")

h3("Items you must verify (memorize these)")
bullets([
    "<b>Engine compartment (engine off):</b> oil, coolant, power-steering fluid; belts and hoses free of cracks/fraying; leaks on the ground; wiring intact.",
    "<b>Cab (engine on):</b> all gauges in normal range, air pressure builds to 120–140 psi and alarm/buzzer stops; parking brake holds; service brake responds; horn, wipers, washers, lights, defroster, mirrors clean.",
    "<b>Brake check:</b> with full pressure, shut off engine and hold 1 minute — pressure drop must be < 4 psi (single vehicle) or < 6 psi (combination); low-pressure alarm activates at 55–60 psi; spring (parking) brakes pop out at 20–45 psi.",
    "<b>Lights:</b> all clearance, marker, headlight (high/low), turn-signal, brake, and hazard lamps work and lenses are clean and uncracked.",
    "<b>Tires:</b> minimum 4/32-inch tread on steer axle, 2/32 on others; no cuts, bulges, regrooving, or mismatched sizes; inflation to rated pressure.",
    "<b>Wheels/rims:</b> no cracks, missing lug nuts, or rust streaks (a sign of loose/failed lugs).",
    "<b>Suspension:</b> springs not broken or shifted; air bags inflated and not leaking; U-bolts tight.",
    "<b>Coupling:</b> fifth-wheel jaws closed around the kingpin; release arm latched; locking pin in; no space between skid plate and fifth wheel; air and electrical lines connected and undamaged.",
    "<b>Trailer:</b> doors latched and locked; cargo secure; landing gear raised and cranked up; no leaks underneath; glad-hand connections tight.",
    "<b>Paperwork:</b> current registration, insurance, annual DOT inspection sticker, and any required permits (oversize, hazmat, IFTA).",
])

callout("Never skip the pre-trip to save time.",
        "A defect you miss in the yard becomes a roadside violation — or worse, a crash — "
        "on the highway. The 15 minutes you invest can prevent a 6-hour breakdown and a "
        "career-altering accident.", "warn")

h2("1.5 No-Zones — Eliminating Blind-Spot Crashes")
para(
    "Because of the trailer's length and height, a tractor-trailer has enormous blind spots "
    "called <b>No-Zones</b>. A passenger car hidden in a No-Zone is completely invisible to "
    "the driver — not in the mirrors, not in peripheral vision. Roughly one-third of multi-"
    "vehicle truck crashes involve a car traveling in a No-Zone."
)
embed_image("procedure_nozones.png", caption="Figure 1.2 — The four No-Zones around a tractor-trailer")

bullets([
    "<b>Front No-Zone:</b> the long hood blocks vehicles directly ahead and close. Do not tailgate — keep a minimum 4–6 second following distance.",
    "<b>Rear No-Zone (≈200 ft):</b> the trailer hides everything directly behind. If a car is following too closely, you cannot see its headlights; ease off and let it pass.",
    "<b>Left (passenger-side) No-Zone:</b> smaller, but still blind for one lane. Always check the West Coast (large) mirror before merging left.",
    "<b>Right No-Zone (LARGEST):</b> spans up to 3 lanes on the right. <b>Never</b> attempt a right turn while a vehicle is alongside — make wide turns and watch the convex mirror constantly.",
])

callout("The mirror rule.",
        "If you cannot see the driver's face in the truck's mirrors, the driver cannot see you. "
        "For drivers sharing the road with trucks: pass on the left, pass promptly, and never "
        "linger alongside.", "info")

h2("1.6 Coupling & Uncoupling")
para(
    "Connecting and disconnecting the trailer is a task you will perform daily. Done wrong, it "
    "causes <b>dropped trailers</b> — the trailer separates from the tractor, often destroying "
    "the fifth wheel and damaging the landing gear or the trailer itself. The diagram and "
    "checklist below cover the correct sequence."
)
embed_image("procedure_coupling.png", caption="Figure 1.3 — Fifth-wheel and kingpin engagement")

h3("Coupling procedure (never skip the tug test)")
numbered([
    "Position the tractor in line with the trailer; inspect the fifth wheel is greased and the jaws are fully open.",
    "Back slowly until the kingpin engages and locks. You will hear a loud clunk and feel the tractor take the weight.",
    "Get out and <b>visually verify</b> the locking jaw is closed around the kingpin and the release arm is in the locked position.",
    "Perform the <b>tug test</b>: put the tractor in low gear and gently pull forward against the locked fifth wheel. The trailer must NOT separate. If it does, recouple.",
    "Connect the air lines — red (emergency) and blue (service) — to the correct glad hands, and connect the 7-way electrical cord.",
    "Fully raise and stow the landing gear; check the trailer is level with the fifth wheel (kingpin height ≈ flush with the skid plate).",
    "Build air pressure and check for leaks; verify trailer brakes apply and release. You are ready to roll.",
])

callout("The tug test is non-negotiable.",
        "Each year, hundreds of dropped trailers occur because a driver trusted the clunk "
        "sound instead of performing the tug test. A trailer that drops at speed can swing into "
        "oncoming traffic. Always tug-test before you raise the landing gear.", "danger")

h2("1.7 Air Brake System Basics")
para(
    "Nearly every Class A vehicle uses <b>air brakes</b>. Understanding how the system holds and "
    "releases the brakes is essential — a brake failure on a 80,000-lb vehicle is catastrophic."
)
make_table([
    ["Component", "Function", "Critical fact"],
    ["Compressor", "Builds air pressure (driven by the engine)", "Pumps air into the tanks whenever the engine runs."],
    ["Air tanks (wet & dry)", "Store air, drain moisture", "Drain daily; water in the system causes freeze-ups and corrosion."],
    ["Governor", "Cycles the compressor (cut-in ~100 psi, cut-out ~125–135 psi)", "Keeps tank pressure within the safe working range."],
    ["Service brakes", "Foot pedal applies brakes on all wheels", "Air pressure pushes the pushrod, rotating the S-cam to force shoes against the drum."],
    ["Spring (parking) brakes", "Large springs apply the brakes when air is released", "Fail-safe: if air pressure is lost, springs automatically apply the brakes at 20–45 psi."],
    ["Low-pressure alarm", "Warns of pressure loss", "Must activate by 60 psi; if it sounds, stop safely and immediately."],
    ["Tractor protection valve", "Prevents tractor air loss if trailer line breaks", "Closes automatically to preserve tractor brakes."],
], col_ratios=[0.22, 0.30, 0.48])

h2("1.8 Managing Speed, Space, and Turns")
bullets([
    "<b>Following distance:</b> maintain at least 1 second of following distance for every 10 ft of vehicle length at speeds under 40 mph; add 1 second over 40 mph. For a 60-ft combination at 55 mph, that's about 7 seconds.",
    "<b>Speed on curves:</b> posted advisory speeds are for passenger cars. Reduce by 5–10 mph below the advisory; a trailer can roll over (jackknife or rollover) well below the car-safe speed.",
    "<b>Right turns:</b> swing wide left and keep the trailer's rear close to the right curb (off-track). Watch the right convex mirror the entire turn — never turn blind.",
    "<b>Left turns:</b> reach the intersection before turning; keep the trailer's rear to the right of the center line to avoid clipping oncoming traffic.",
    "<b>Downhill braking:</b> select a low gear at the top; use short (snub) brake applications to hold speed rather than constant light braking, which overheats drums and causes fade.",
    "<b>Jackknife prevention:</b> if the trailer starts to swing out, ease off the brake and accelerate slightly to straighten; never stab the brakes.",
])

h2("1.9 Backing & Docking")
para(
    "Backing is the most common maneuver that causes damage. The cardinal rules: <b>Get Out And "
    "Look (GOAL)</b> whenever you are unsure, back slowly, and use a spotter when available. "
    "On the skills test you will demonstrate the <b>alley dock</b> and <b>offset back</b>."
)
bullets([
    "Set up squarely before backing; align the tractor with the space.",
    "Back <b>slowly</b> — never faster than a walking pace — using both mirrors.",
    "Steer toward the mirror where you want the trailer to go (the trailer reverses direction).",
    "Stop and GOAL at the first sign of doubt: dock height, obstacles, pedestrians, other vehicles.",
    "At a dock, ensure the trailer is flush against the bumpers before the forklift boards; never let anyone board a trailer not restrained by a dock lock.",
])

h2("1.10 Hours, Drug Testing & Professional Conduct")
bullets([
    "You are subject to <b>pre-employment, random, post-accident, reasonable-suspicion, and return-to-duty</b> drug & alcohol testing. A positive test suspends your CDL and requires a SAP (Substance Abuse Professional) process to return.",
    "Always carry: CDL, current medical card, registration, proof of insurance, and ELD credentials.",
    "At any weigh station or DOT inspection, cooperate fully; defects found become part of your carrier's CSA (Compliance, Safety, Accountability) score.",
    "Report crashes, injuries, and hazardous spills to DOT (and to your carrier immediately).",
])

# ─────────────────────────────────────────────────────────────
# PART II — SPECIALTY MODULES (intro)
# ─────────────────────────────────────────────────────────────
story.append(PageBreak())
h1("Part II — Specialty Equipment Modules", kicker="Five trailer types · Choose your lane")

para(
    "After mastering Part I, you will specialize in one or more equipment types. Each module "
    "below covers the equipment, typical cargo, key skills, hazards, and daily procedures for "
    "that trailer type. Read every module even if you specialize in one — on the road you will "
    "share lanes with all five, and understanding their behavior keeps you safe around them."
)

make_table([
    ["#", "Equipment", "Typical Cargo", "Signature Skill"],
    ["01", "Dry Van", "Palletized dry freight, boxes", "Dock backing & load distribution"],
    ["02", "Flatbed", "Steel, lumber, machinery", "Cargo securement & tarping"],
    ["03", "Container", "Intermodal port/rail freight", "Chassis handling & twist-locks"],
    ["04", "Dump Truck", "Sand, gravel, asphalt", "Hydraulic dumping & site safety"],
    ["05", "Refrigerated", "Food, produce, pharma", "Temperature control & reefer care"],
], col_ratios=[0.06, 0.18, 0.42, 0.34])

# ═════════════════════════════════════════════════════════════
# MODULE 01 — DRY VAN
# ═════════════════════════════════════════════════════════════
story.append(PageBreak())
h1("Module 01 — Dry Van", kicker="Enclosed van trailer · The industry workhorse")

embed_image("truck_dryvan.png",
            caption="Figure 2.1 — Dry van anatomy: enclosed box, swing rear doors, fifth-wheel coupling")

para(
    "The <b>dry van</b> is the most common trailer on U.S. highways — an enclosed, weather-"
    "tight rectangular box, typically <b>53 feet</b> long, hauled by a day-cab or sleeper "
    "tractor. It protects freight from the elements and is the entry point for most new CDL "
    "drivers. Because the cargo is hidden, your job centers on <b>load distribution</b>, "
    "<b>dock backing</b>, and <b>protecting the freight</b> from shifting and damage."
)

h2("1. Equipment & Specifications")
spec_table([
    ["Trailer length", "53 ft (most common); also 48 ft, 45 ft"],
    ["Interior height", "≈ 110 in (standard); up to 117 in (high-cube)"],
    ["Floor type", "Hardwood or aluminum plank; forklift-rated"],
    ["Doors", "Swing rear doors (two-leaf), occasionally roll-up"],
    ["Securement", "E-track, load bars, shoring beams, dunnage, air bags"],
    ["Empty weight (trailer)", "≈ 14,000–16,000 lb"],
])

h2("2. Typical Cargo")
bullets([
    "Palletized consumer goods, electronics, packaged food, and retail merchandise.",
    "Paper rolls, building materials (drywall, packaged), and non-perishable beverages.",
    "Anything requiring <b>dry, clean</b> transport but no temperature control.",
])

h2("3. Core Skills You Must Master")
h3("3.1 Weight Distribution & Bridge Law")
para(
    "The <b>bridge law</b> (Federal Bridge Formula) limits how much weight you may carry per axle "
    "group based on axle spacing, to protect pavement and bridges. For a standard 5-axle "
    "tractor-trailer the legal cap is <b>80,000 lb GVWR</b> (12,000 steer + 34,000 drives + "
    "34,000 trailer tandems). As a dry-van driver you constantly <b>slide the trailer's tandem "
    "axle</b> and the fifth wheel to balance the load and stay legal on each axle group."
)
callout("Balance the load front-to-rear.",
        "Place the heaviest freight over the drive axles and toward the front of the trailer. "
        "Too much weight on the trailer's rear causes the tractor's steer axle to go light "
        "(loss of steering); too much forward overloads the steer axle.", "warn")

h3("3.2 Dock Backing")
numbered([
    "Approach the dock door slowly, using your mirrors; sound the horn and watch for pedestrians and dock workers.",
    "Align the trailer squarely with the dock; small steering inputs only — backing magnifies every wheel movement.",
    "Back until the trailer's rear is flush against the dock bumpers; set the parking brake before anyone boards.",
    "Confirm the dock lock (or chocks) is engaged before the forklift enters; never move the trailer while it is being loaded.",
    "After loading, re-check axle weights; slide tandems if needed to legal out before departure.",
])

h3("3.3 Load Securement Inside the Van")
bullets([
    "Use <b>load locks / shoring beams</b> across the trailer to prevent pallets from shifting forward under braking.",
    "Stack to the roof only with freight rated for it; band or shrink-wrap unstable loads.",
    "Fill voids with <b>dunnage</b> (air bags, cardboard, lumber) so cargo cannot slide.",
    "Heavy pallets at the bottom; light, fragile goods on top.",
])

h2("4. Hazards & Daily Procedures")
make_table([
    ["Hazard", "Prevention"],
    ["Shifting load → rollover or freight damage", "Lock every load; inspect after first 50 miles and at each stop."],
    ["Slip/trip at the dock", "Chock wheels; use 3-point contact climbing in/out; keep the floor clear."],
    ["Pallet jack / forklift injury during loading", "Stay in the cab or a safe zone; never between trailer and dock."],
    ["Trailer doors jammed / wind-slam", "Use door straps; open both doors fully and secure before backing or leaving."],
    ["Roof leaks damaging freight", "Pre-trip the roof for holes; report any water stains immediately."],
], col_ratios=[0.45, 0.55])

callout("Dry-van daily flow.",
        "Pre-trip → confirm BOL (Bill of Lading) and seal number → load/seal → re-check axle "
        "weights → drive legally → arrive → break seal in front of receiver (or per carrier "
        "policy) → unload → inspect trailer for damage → next load.", "ok")

# ═════════════════════════════════════════════════════════════
# MODULE 02 — FLATBED
# ═════════════════════════════════════════════════════════════
story.append(PageBreak())
h1("Module 02 — Flatbed", kicker="Open deck · Cargo securement is your craft")

embed_image("truck_flatbed.png",
            caption="Figure 2.2 — Flatbed with mixed cargo: steel coil (chained), lumber (tarped), pipe (strapped)")

para(
    "A <b>flatbed</b> is an open deck trailer — no walls, no roof — used for cargo too large, "
    "heavy, or irregular for a van: steel, lumber, machinery, building materials, and oversized "
    "loads. The freight is fully exposed to weather and to the highway, so <b>cargo securement</b> "
    "and <b>tarping</b> are the defining skills of this trade. Flatbed pays more than dry van "
    "precisely because of the physical, technical work involved."
)

h2("1. Equipment & Specifications")
spec_table([
    ["Deck length", "48 ft (standard); also 45 ft, 53 ft"],
    ["Deck type", "Flat, step-deck (drop), RGN (removable gooseneck) for oversize"],
    ["Deck surface", "Apitong hardwood or steel plate"],
    ["Securement hardware", "Chain (Grade 70 transport), ratchet binders, web straps, edge protectors, dunnage"],
    ["Rub rails", "Side rails with stake pockets and anchor points"],
    ["Headache rack", "Steel barrier behind the cab to stop forward-shifting cargo"],
])

h2("2. Typical Cargo")
bullets([
    "Steel coils, beams, plate, and rebar.",
    "Lumber, drywall, roofing materials, and precast concrete.",
    "Heavy machinery, vehicles, transformers, and oversized equipment (often permit loads).",
])

h2("3. Core Skill: Cargo Securement")
embed_image("procedure_securement.png",
            caption="Figure 2.3 — Tie-down fundamentals: WLL rules, anchor points, and the aggregate-WLL calculation")

para(
    "Federal securement rules (49 CFR 393.110) require that tie-downs restrain the cargo against "
    "forward, rearward, sideways, and vertical movement. The key metric is the <b>Working Load "
    "Limit (WLL)</b> — the maximum force a chain, strap, or binder is rated to hold — marked on "
    "every transport chain."
)
h3("The securement math")
numbered([
    "Sum the WLL of all tie-downs to get the <b>aggregate WLL</b>.",
    "<b>Aggregate WLL must be ≥ half (1/2) the cargo weight</b> for general freight. (Some articles require the full weight — check the commodity rules.)",
    "Minimum number of tie-downs: 1 per 10 ft of cargo length; 4 minimum over 10 ft. Cargo ≤ 5 ft long needs ≥ 2; 5–10 ft needs ≥ 2.",
    "Every chain/strap WLL must be ≥ 1,135 lb (500 kg).",
    "Use edge protectors where chain/strap contacts sharp cargo edges — they prevent cutting and load shifting.",
])

callout("The 50-mile re-check.",
        "Within the first 50 miles after loading, stop and re-tighten every binder. Vibration "
        "always loosens chains. Re-check at every stop thereafter. A loose load is a roadside "
        "violation and a crash waiting to happen.", "warn")

h3("3.1 Steel Coil (Suicide / Shotgun Coils)")
para(
    "Steel coils are dangerous: a 20-ton coil that breaks free will demolish the cab. Coil "
    "securement is highly regulated. A coil carried <b>eyes-forward (shotgun)</b> needs cradles "
    "and 4+ chains; <b>eyes-to-the-side (suicide)</b> requires blocking plus chains through the "
    "eye. Always follow the shipper's coil-rack configuration and the Steel Coil Toolkit rules."
)

h3("3.2 Tarping")
bullets([
    "Tarp protects lumber, steel, and dry goods from rain and road grime. Use the correct tarp size and type (lumber, steel, machinery).",
    "Tarp on level ground when possible; never climb on a wet or icy load without fall protection.",
    "Fold and bungee tarp edges to the rub rail to prevent wind from ballooning it (which costs fuel and can tear the tarp).",
    "Tarping is physically demanding — learn to use your legs, not your back, and avoid working in high winds.",
])

h2("4. Hazards & Daily Procedures")
make_table([
    ["Hazard", "Prevention"],
    ["Cargo shifting / falling off deck", "Correct WLL; pre-trip securement; 50-mi re-check; edge protectors."],
    ["Crush injury from coils/machinery", "Never stand in the line of travel; use coil racks; follow shipper rigging plan."],
    ["Fall from the deck / load", "3-point contact; non-slip boots; fall protection above 4 ft (OSHA)."],
    ["Overhead power lines / low bridges", "Know your loaded height; never exceed 13 ft 6 in without a permit; check clearance."],
    ["Tarp wind-tear & fuel loss", "Secure all edges; pull over if wind exceeds ~40 mph to inspect."],
], col_ratios=[0.45, 0.55])

callout("Flatbed daily flow.",
        "Pre-trip deck & headache rack → receive load plan & weights → load per shipper "
        "config → chain/strap to WLL → apply edge protectors & tarp → 50-mile re-tighten → "
        "drive → unload per receiver plan → inspect chains/binders for wear before reuse.", "ok")

# ═════════════════════════════════════════════════════════════
# MODULE 03 — CONTAINER / INTERMODAL
# ═════════════════════════════════════════════════════════════
story.append(PageBreak())
h1("Module 03 — Containers / Intermodal", kicker="ISO shipping containers on chassis")

embed_image("truck_container.png",
            caption="Figure 2.4 — ISO container on a skeletal chassis, locked at the corner castings")

para(
    "<b>Container (intermodal) hauling</b> moves standardized <b>ISO shipping containers</b> "
    "between ports, rail yards, and distribution centers. The container rides on a lightweight "
    "<b>skeletal chassis</b> and locks in place at four corner <b>twist-locks</b>. The work is "
    "fast-paced, schedule-driven, and demands precision backing under overhead gantry cranes "
    "and into tight chassis yards."
)

h2("1. Equipment & Specifications")
spec_table([
    ["Container sizes", "20 ft, 40 ft, 40 ft High-Cube (HC), 45 ft"],
    ["Container weight (empty)", "≈ 4,000 lb (20 ft) · ≈ 8,000 lb (40 ft)"],
    ["Max payload", "≈ 60,000 lb (limited by road laws & chassis)"],
    ["Chassis", "Skeletal steel frame with twist-locks at corner castings"],
    ["Twist-locks", "Quarter-turn locks that engage the container's corner castings"],
    ["Genset (reefer containers)", "Clip-on generator for refrigerated containers on chassis"],
])

h2("2. Typical Cargo")
bullets([
    "Imported consumer goods from ports; exported industrial and agricultural products.",
    "Rail-intermodal freight moving coast-to-coast in containers.",
    "Refrigerated ('reefer') containers carrying produce, seafood, and pharmaceuticals.",
])

h2("3. Core Skills")
h3("3.1 Chassis Inspection — Different From a Van")
para(
    "Intermodal chassis are often <b>interchanged between carriers</b> and can be poorly "
    "maintained. A rigorous chassis inspection is critical. Verify: all four twist-locks are "
    "present and engage fully; landing legs are functional; tires, brakes, lights, and ABS lamp "
    "work; no cracked welds on the frame; glad-hands and the 7-way connect cleanly."
)
h3("3.2 Locking & Verifying the Container")
numbered([
    "Back under the chassis until the fifth wheel engages; perform the tug test.",
    "Confirm all four corner twist-locks are <b>turned and locked</b> — never transport a container with an unlocked corner.",
    "Check the container number and seal match the paperwork; photograph the seal.",
    "For a reefer container, set and verify the genset is running and temperature is on set-point before departure.",
])
h3("3.3 Port & Rail Yard Procedures")
bullets([
    "Follow the terminal's pace and rules strictly — gates, scanners, and queues move on schedule.",
    "Back precisely under gantry cranes / reach stackers; the operator lifts the container off — hold position, brake set.",
    "Maintain your TWIC® card for port access; keep your state-issued CDL and DOT medical current.",
    "Watch container weight — overloaded 'heavy-test' 20-ft boxes can exceed legal axle limits; redistribute or obtain permits.",
])

h2("4. Hazards & Daily Procedures")
make_table([
    ["Hazard", "Prevention"],
    ["Container shifts / unlocks", "Verify all 4 twist-locks every pickup; tug test; never move unlocked."],
    ["Chassis defect (brakes, tires, lights)", "Full chassis pre-trip; reject defective chassis via interchange."],
    ["Crane / reach-stacker collision", "Stay in cab with brake set during lift; obey ground spotters."],
    ["Overweight container", "Weigh at terminal scale; refuse illegal loads; arrange permits or re-stow."],
    ["Reefer temperature excursion", "Set & verify genset; record temp hourly; report deviations immediately."],
], col_ratios=[0.45, 0.55])

callout("Intermodal daily flow.",
        "Pick up chassis at yard → pre-trip chassis → gate-in at terminal → back under crane → "
        "container loaded & twist-locked → verify seal & paperwork → deliver → chassis "
        "interchange inspection at destination → return chassis to pool.", "ok")

# ═════════════════════════════════════════════════════════════
# MODULE 04 — DUMP TRUCK
# ═════════════════════════════════════════════════════════════
story.append(PageBreak())
h1("Module 04 — Dump Trucks", kicker="End-dump, belly-dump, and transfer trailers")

embed_image("truck_dump.png",
            caption="Figure 2.5 — End-dump trailer raised by a hydraulic ram; aggregate discharges at the rear")

para(
    "<b>Dump trucks</b> haul loose material — sand, gravel, asphalt, demolition debris, and coal "
    "— and discharge it by raising the bed with a <b>hydraulic cylinder</b> powered by the "
    "tractor's Power Take-Off (PTO). The raised bed creates a high center of gravity and is the "
    "single greatest source of dump-truck rollovers. This module focuses on the discipline that "
    "keeps these machines upright."
)

h2("1. Equipment & Specifications")
spec_table([
    ["Types", "End-dump (raises & tips rear), belly-dump (bottom dump), transfer (pup) trailer"],
    ["Bed material", "Steel or aluminum; steel for abrasive rock, aluminum for lighter aggregate"],
    ["Lift mechanism", "Front-mounted hydraulic cylinder (end-dump); PTO-driven pump"],
    ["Typical capacity", "20–26 tons (tractor-trailer end-dump)"],
    ["Tarp", "Electric or manual roll-tarp required by most states to prevent spillage"],
    ["Tailgate", "Hinged rear gate opens during dump; latch must release fully before raising"],
])

h2("2. Typical Cargo")
bullets([
    "Construction aggregates: sand, gravel, crushed stone.",
    "Hot-mix asphalt (insulated beds) and concrete materials.",
    "Demolition debris, fill dirt, coal, and agricultural bulk.",
])

h2("3. Core Skill: Safe Dumping")
para(
    "Most dump-truck fatalities occur during the dump. The bed is tall, the truck is unstable, "
    "and wind, slope, or a stuck load can flip the rig in seconds. Follow this sequence exactly."
)
h3("Pre-dump checklist")
numbered([
    "Park on <b>firm, level ground</b> — never on a slope, soft soil, or fill that can give way.",
    "Confirm the area is clear of people, equipment, and <b>overhead power lines</b> (a raised bed contacting a line is lethal).",
    "Open / release the tailgate latch; deploy the tarp.",
    "Raise the bed slowly and smoothly; watch both mirrors and the bed in the rear-view; stop immediately if the truck begins to lean.",
    "Once empty, lower the bed <b>completely</b> and confirm the bed-rest indicator before moving. Never drive with the bed raised.",
])

callout("Power lines kill.",
        "A raised dump bed that contacts an overhead line energizes the entire truck. If it "
        "happens: stay in the cab, call 911, and warn others away. If you must exit (fire), "
        "jump clear without touching truck and ground at the same time, then shuffle away in "
        "small steps.", "danger")

h3("3.1 Belly-Dump (Bottom Dump)")
para(
    "Belly dumps spread material through a bottom gate while moving — used for road base and "
    "windrowing aggregate. The bed never rises, so rollover risk is low, but you must control "
    "the gate precisely to lay an even layer. Practice spreading on a closed surface before "
    "working live construction."
)
h3("3.2 Transfer (Pup) Trailers")
para(
    "A transfer system moves a second dump box from a trailer into the main truck's frame to "
    "dump it. Secure the pup correctly during transport; an unsecured pup can shift into the "
    "tractor during hard braking."
)

h2("4. Hazards & Daily Procedures")
make_table([
    ["Hazard", "Prevention"],
    ["Rollover during dump", "Level ground only; raise slowly; watch mirrors; stop at any lean."],
    ["Overhead power line contact", "Survey lines first; never raise under or near lines; assume all lines are live."],
    ["Bed stuck / material hang-up", "Do not rock the truck with the bed up; lower and loosen the load."],
    ["Driving with bed raised", "Verify bed fully down & indicator on before every move."],
    ["Spillage on the road", "Always cover with the tarp; clean the bed's rear edge before leaving the pit."],
    ["Hot asphalt burn", "Wear PPE; never stand behind the bed during discharge."],
], col_ratios=[0.42, 0.58])

callout("Dump-truck daily flow.",
        "Pre-trip (hydraulics, PTO, bed, gate, cylinder pins) → load at pit/plant → tarp → weigh "
        "→ drive carefully (high CG, slow on turns) → dump on level ground per checklist → "
        "lower bed completely → inspect cylinder & gate before next load.", "ok")

# ═════════════════════════════════════════════════════════════
# MODULE 05 — REFRIGERATED (REEFER)
# ═════════════════════════════════════════════════════════════
story.append(PageBreak())
h1("Module 05 — Refrigerated (Reefer)", kicker="Temperature-controlled freight · Set it, monitor it, prove it")

embed_image("truck_reefer.png",
            caption="Figure 2.6 — Reefer unit (condenser + fan) on the trailer nose; insulated box; thermostat display")

para(
    "A <b>reefer</b> is an insulated van with a self-contained <b>refrigeration unit</b> mounted "
    "on the front that can hold the box anywhere from <b>−20 °F to +70 °F</b>. It hauls food, "
    "produce, and pharmaceuticals — cargo that spoils, freezes, or loses potency when the "
    "temperature drifts. As a reefer driver you are not just moving freight; you are "
    "<b>preserving it</b>, and you will document the temperature continuously to prove it."
)

h2("1. Equipment & Specifications")
spec_table([
    ["Box length", "53 ft (typical); insulated walls (foam core) ≈ 3 in thick"],
    ["Reefer unit", "Carrier Transicold or Thermo King; diesel-driven, thermostat-controlled"],
    ["Temperature range", "−20 °F (deep frozen) to +70 °F (warm produce)"],
    ["Fuel", "Dedicated reefer fuel tank (50–60 gal); separate from the tractor"],
    ["Air chute / bulkhead", "Chute distributes cold air; bulkhead separates zones for multi-temp"],
    ["Data recorder", "Onboard sensor logs temperature; download reports for shippers/receivers"],
])

h2("2. Typical Cargo")
bullets([
    "Frozen: ice cream, meat, seafood, prepared foods (≤ 0 °F, often −10 to −20 °F).",
    "Refrigerated: dairy, deli, produce, beverages (33–40 °F).",
    "Pharmaceuticals & biologics: tightly controlled ranges, often with continuous monitoring.",
])

h2("3. Core Skill: Temperature Control")
h3("3.1 Pre-Cool the Box")
para(
    "Before loading, run the reefer to bring the <b>inside of the trailer</b> to set-point "
    "temperature. Loading warm freight into a warm box overworks the unit and may not recover "
    "in time — a common cause of rejected loads. The shipper will refuse to load into an "
    "un-pre-cooled trailer."
)
h3("3.2 The Continuous Monitor")
numbered([
    "Set the thermostat precisely per the BOL (Bill of Lading) — some loads specify exact °F; never round.",
    "Verify the set-point on the reefer display matches the paperwork before you pull away.",
    "Check the reefer gauge and the temperature reading <b>at every pre-trip, fuel stop, and break</b> — at minimum once every 1–2 hours when stationary.",
    "If the temperature drifts or the reefer alarms, <b>stop and act immediately</b>: diagnose, call breakdown, and record the deviation. An hour of drifting can ruin a full load.",
    "Keep the reefer fueled — running out of reefer fuel mid-trip is a top cause of lost loads.",
])
h3("3.3 Multi-Temp Loads")
para(
    "Some reefers have <b>bulkheads</b> that divide the trailer into 2–3 zones, each at a "
    "different temperature (e.g., frozen in front, fresh in the rear). Confirm each zone's "
    "set-point and that the evap coil and chute serve each zone correctly. Load in zone order "
    "to preserve each product."
)

h2("4. Hazards & Daily Procedures")
make_table([
    ["Hazard", "Prevention"],
    ["Temperature excursion → rejected / spoiled load", "Pre-cool; verify set-point; check hourly; act on any alarm instantly."],
    ["Reefer fuel run-out", "Top off reefer tank every fuel stop; track hours of run-time."],
    ["Condenser airflow blocked", "Keep the nose clear of debris/ice; check the fan turns freely."],
    ["Cross-contamination (odors/bacteria)", "Wash-out the box between loads; sanitize for food."],
    ["Frozen-coil / defrost failure", "Run defrost cycles; inspect coil for ice build-up."],
    ["Hot loading dock → box warms", "Close doors at the dock; do not leave doors open unnecessarily."],
], col_ratios=[0.45, 0.55])

callout("Reefer daily flow.",
        "Pre-trip reefer (fuel, oil, belts, condenser) → pre-cool box to set-point → verify BOL "
        "temperature → load with doors minimized → confirm set-point → drive, monitoring hourly "
        "→ arrive & document temperature (download report) → unload → wash-out for next load.", "ok")

# ─────────────────────────────────────────────────────────────
# APPENDIX — Quick reference
# ─────────────────────────────────────────────────────────────
story.append(PageBreak())
h1("Appendix — Quick Reference", kicker="Key numbers & regulations")

h2("A. Critical Weight & Dimension Limits")
make_table([
    ["Item", "Federal Limit", "Notes"],
    ["Gross weight (5-axle)", "80,000 lb", "12k steer + 34k drives + 34k trailer tandems"],
    ["Single axle", "20,000 lb", "Bridge Formula applies"],
    ["Tandem axle group", "34,000 lb", "Most common group"],
    ["Maximum width", "102 in (8 ft 6 in)", "Excludes mirrors"],
    ["Maximum height", "13 ft 6 in", "Varies by state; measure your loaded height"],
    ["Combination length", "Tractor + 53 ft trailer typical", "Longer combination vehicles need permits"],
    ["Steer tire tread", "4/32 in minimum", "Other tires: 2/32 in minimum"],
], col_ratios=[0.30, 0.30, 0.40])

h2("B. Hours-of-Service Quick Card")
make_table([
    ["Clock", "Limit"],
    ["Drive", "11 hours"],
    ["On-duty window", "14 hours"],
    ["Off-duty before restart", "10 hours"],
    ["30-minute break", "After 8 hours since last off-duty (if driving)"],
    ["Duty cycle", "60 hr / 7 days · 70 hr / 8 days"],
    ["Restart", "34 consecutive hours off"],
], col_ratios=[0.40, 0.60])

h2("C. Pre-Trip Core (memorize)")
bullets([
    "Fluids, belts, hoses, leaks (engine off).",
    "Gauges, build air to cut-out, low-pressure alarm at 55–60 psi, spring brakes pop at 20–45 psi.",
    "All lights & lenses clean and working.",
    "Tires: tread depth, inflation, no cuts/bulges.",
    "Wheels/rims: no cracks, all lug nuts, no rust streaks.",
    "Brakes: pushrod travel, slack adjusters, drums/shoes, no leaks.",
    "Coupling: jaw closed, release arm latched, no gap, tug-tested.",
    "Trailer: doors latched, cargo secure, landing gear up, no leaks.",
    "Paperwork: CDL, medical card, registration, insurance, permits.",
])

h2("D. Securement Formula (Flatbed)")
para(
    "<b>Aggregate Working Load Limit ≥ ½ × cargo weight.</b> Minimum tie-down count: 1 per 10 ft "
    "(4 minimum over 10 ft). Each tie-down WLL ≥ 1,135 lb. Re-tighten within 50 miles."
)

h2("E. Emergency Contacts & Resources")
bullets([
    "<b>FMCSA:</b> fmcsa.dot.gov — regulations, CSA scores, ELD, clearinghouse.",
    "<b>DOT Drug & Alcohol Clearinghouse:</b> clearinghouse.dot.gov.",
    "<b>ELDT Training Provider Registry:</b> tpr.fmcsa.dot.gov.",
    "<b>Highway emergency:</b> 911. Report all crashes with injury or hazmat release to DOT.",
    "<b>Your carrier's safety department</b> — keep the number programmed; call for accidents, breakdowns, and HOS questions.",
])

callout("Final word.",
        "The professional driver's edge is <b>consistency</b>: the same careful pre-trip on day "
        "1,000 as on day 1. Speed and shortcuts kill. Inspect every time, secure every load, "
        "respect every clock — and you will have a long, safe, profitable career behind the "
        "wheel.", "ok")

# ─────────────────────────────────────────────────────────────
# Build
# ─────────────────────────────────────────────────────────────
doc.multiBuild(story, onFirstPage=header_footer, onLaterPages=header_footer)
print("Body PDF written:", OUT, os.path.getsize(OUT), "bytes")
