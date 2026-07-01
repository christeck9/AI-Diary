"""
Generate technical training diagrams (truck schematics + procedure diagrams)
for the CDL Class A Driver Training Manual.
All output as high-resolution PNG (dpi=200) for crisp embedding in ReportLab.
"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import (
    FancyBboxPatch, Rectangle, Polygon, Circle, FancyArrowPatch, Wedge, Ellipse
)
from matplotlib.lines import Line2D
import os

# ── Palette (from palette.cascade) ──
ACCENT       = "#a4492a"   # primary accent (burnt orange)
ACCENT2      = "#5aae44"   # secondary accent (green)
HEADER       = "#36454d"   # dark slate
COVER_BLOCK  = "#4e5d65"
ICON         = "#3c6f89"   # steel blue
BORDER       = "#b4c2ca"
CARD_BG      = "#e8eaeb"
PAGE_BG      = "#f2f3f4"
TEXT         = "#222526"
MUTED        = "#7c8386"
SUCCESS      = "#46915f"
WARNING      = "#9d8147"
DANGER       = "#90534d"

ASSETS = os.path.join(os.path.dirname(__file__), "assets")
os.makedirs(ASSETS, exist_ok=True)

plt.rcParams["font.family"] = "DejaVu Sans"
plt.rcParams["axes.unicode_minus"] = False


def _label(ax, x, y, text, color=TEXT, size=9, weight="normal", ha="center", va="center"):
    ax.text(x, y, text, color=color, fontsize=size, fontweight=weight, ha=ha, va=va, zorder=10)


def _annot(ax, x, y, tx, ty, text, color=ICON, size=8):
    """Annotation with a thin leader line."""
    ax.annotate(
        text, xy=(x, y), xytext=(tx, ty),
        fontsize=size, color=TEXT, ha="center", va="center", zorder=11,
        bbox=dict(boxstyle="round,pad=0.25", fc="white", ec=color, lw=1.0),
        arrowprops=dict(arrowstyle="-", color=color, lw=0.8),
    )


def _setup_ax(figsize=(12, 6)):
    fig, ax = plt.subplots(figsize=figsize, dpi=200)
    ax.set_aspect("equal")
    ax.axis("off")
    return fig, ax


def _ground(ax, y):
    ax.add_line(Line2D([0.5, 11.5], [y, y], color=BORDER, lw=1.2, ls=(0, (6, 4)), zorder=1))


def _wheels(ax, cx_list, y, r=0.28, color=HEADER):
    for cx in cx_list:
        ax.add_patch(Circle((cx, y), r, facecolor=color, edgecolor="black", lw=1.0, zorder=5))
        ax.add_patch(Circle((cx, y), r * 0.45, facecolor=PAGE_BG, edgecolor=MUTED, lw=0.6, zorder=6))


def _titlebar(fig, title, subtitle):
    fig.text(0.5, 0.965, title, ha="center", va="top", fontsize=15,
             fontweight="bold", color=HEADER)
    fig.text(0.5, 0.925, subtitle, ha="center", va="top", fontsize=9.5, color=MUTED)


def save(fig, name):
    path = os.path.join(ASSETS, name)
    fig.savefig(path, dpi=200, bbox_inches="tight", facecolor="white", pad_inches=0.15)
    plt.close(fig)
    print("  saved", name)
    return path


# ─────────────────────────────────────────────────────────────
# 1. DRY VAN  —  enclosed box trailer
# ─────────────────────────────────────────────────────────────
def dry_van():
    fig, ax = _setup_ax((12, 6.2))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 6.4)
    _titlebar(fig, "DRY VAN", "Enclosed, weather-tight van trailer — the industry standard")

    # Tractor (day cab)
    ax.add_patch(FancyBboxPatch((0.7, 0.9), 2.6, 1.9,
                 boxstyle="round,pad=0.02,rounding_size=0.15",
                 fc=HEADER, ec="black", lw=1.2, zorder=3))
    # Hood / engine
    ax.add_patch(Polygon([(0.7, 0.9), (0.7, 1.6), (0.1, 1.55), (0.1, 0.9)],
                 closed=True, fc=COVER_BLOCK, ec="black", lw=1.2, zorder=3))
    # Windshield
    ax.add_patch(Polygon([(2.4, 2.8), (3.3, 2.8), (3.3, 2.2), (2.55, 2.2)],
                 closed=True, fc="#cfe3ee", ec="black", lw=0.8, zorder=4))
    # Exhaust stack
    ax.add_patch(Rectangle((3.05, 2.8), 0.16, 0.7, fc=MUTED, ec="black", lw=0.6, zorder=4))

    # Fifth wheel hitch
    ax.add_patch(Polygon([(3.2, 1.5), (3.7, 1.5), (3.55, 1.15), (3.35, 1.15)],
                 closed=True, fc=ACCENT, ec="black", lw=0.8, zorder=4))

    # ── Van trailer body (box) ──
    ax.add_patch(FancyBboxPatch((3.7, 1.25), 7.9, 2.55,
                 boxstyle="round,pad=0.0,rounding_size=0.08",
                 fc="#f3f0ea", ec="black", lw=1.4, zorder=2))
    # Rivet seam lines
    for sx in (5.6, 7.5, 9.4):
        ax.add_line(Line2D([sx, sx], [1.3, 3.75], color=BORDER, lw=0.5, zorder=3))
    # Rear doors
    ax.add_line(Line2D([11.6, 11.6], [1.3, 3.75], color="black", lw=1.4, zorder=3))
    ax.add_patch(Rectangle((11.55, 1.3), 0.05, 2.45, fc=HEADER, ec="none", zorder=3))
    # Door handle
    ax.add_patch(Rectangle((11.25, 2.35), 0.28, 0.4, fc=ACCENT, ec="black", lw=0.6, zorder=4))

    # Landing gear (retracted on the move — show down position faintly)
    ax.add_patch(Rectangle((4.0, 0.78), 0.12, 0.5, fc=MUTED, ec="black", lw=0.5, zorder=3))

    _wheels(ax, [1.25, 2.6, 4.7, 5.7, 6.7, 9.6, 10.6, 11.3], 0.85)

    _ground(ax, 0.55)

    # Annotations
    _annot(ax, 0.4, 1.25, 0.55, 0.2, "Hood /\nEngine", color=ICON)
    _annot(ax, 2.9, 2.95, 2.9, 3.9, "Day Cab\n(tractor)", color=ICON)
    _annot(ax, 3.55, 1.25, 3.55, 0.15, "Fifth\nWheel", color=ACCENT)
    _annot(ax, 7.6, 2.5, 7.6, 4.6, "Enclosed Van Body\n(53 ft typical)\nweather-tight", color=HEADER)
    _annot(ax, 11.6, 2.5, 11.4, 4.6, "Swing\nrear\ndoors", color=ACCENT)
    _annot(ax, 4.0, 0.78, 4.0, 4.0, "Landing\ngear", color=MUTED)

    fig.text(0.5, 0.03, "Cargo: palletized goods, boxes, dry freight  |  Typical length: 53 ft  |  No temperature control",
             ha="center", fontsize=9, color=MUTED, style="italic")
    return save(fig, "truck_dryvan.png")


# ─────────────────────────────────────────────────────────────
# 2. FLATBED  —  open deck, cargo secured on top
# ─────────────────────────────────────────────────────────────
def flatbed():
    fig, ax = _setup_ax((12, 6.2))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 6.4)
    _titlebar(fig, "FLATBED", "Open flat deck — cargo exposed, must be tarped & tied down")

    # Tractor
    ax.add_patch(FancyBboxPatch((0.7, 0.9), 2.6, 1.9,
                 boxstyle="round,pad=0.02,rounding_size=0.15",
                 fc=HEADER, ec="black", lw=1.2, zorder=3))
    ax.add_patch(Polygon([(0.7, 0.9), (0.7, 1.6), (0.1, 1.55), (0.1, 0.9)],
                 closed=True, fc=COVER_BLOCK, ec="black", lw=1.2, zorder=3))
    ax.add_patch(Polygon([(2.4, 2.8), (3.3, 2.8), (3.3, 2.2), (2.55, 2.2)],
                 closed=True, fc="#cfe3ee", ec="black", lw=0.8, zorder=4))
    ax.add_patch(Rectangle((3.05, 2.8), 0.16, 0.7, fc=MUTED, ec="black", lw=0.6, zorder=4))
    ax.add_patch(Polygon([(3.2, 1.5), (3.7, 1.5), (3.55, 1.15), (3.35, 1.15)],
                 closed=True, fc=ACCENT, ec="black", lw=0.8, zorder=4))

    # Flat deck (thin, long)
    ax.add_patch(Rectangle((3.7, 1.7), 7.9, 0.55, fc="#7d8a90", ec="black", lw=1.4, zorder=2))
    # Deck surface planks
    for sx in range(4, 12, 1):
        ax.add_line(Line2D([sx, sx], [1.72, 2.23], color="#5f6c72", lw=0.4, zorder=3))
    # Headache rack (behind cab)
    ax.add_patch(Rectangle((3.62, 1.7), 0.12, 1.0, fc=ACCENT, ec="black", lw=0.7, zorder=3))

    # ── Cargo: steel coils / lumber bundles on deck ──
    # Steel coil (circle)
    ax.add_patch(Circle((5.3, 2.7), 0.55, fc="#9aa3a8", ec="black", lw=1.0, zorder=4))
    ax.add_patch(Circle((5.3, 2.7), 0.18, fc="#6c757a", ec="black", lw=0.6, zorder=5))
    ax.add_patch(Wedge((5.3, 2.7), 0.55, 30, 120, fc="#aab3b8", ec="none", zorder=5))
    # Lumber stack (rect)
    ax.add_patch(Rectangle((6.4, 2.25), 2.6, 0.9, fc="#c8a87a", ec="black", lw=1.0, zorder=4))
    for sy in (2.5, 2.75, 3.0):
        ax.add_line(Line2D([6.4, 9.0], [sy, sy], color="#9c7d50", lw=0.4, zorder=5))
    # Pipes
    ax.add_patch(Ellipse((10.0, 2.65), 1.5, 0.7, fc="#8a949b", ec="black", lw=1.0, zorder=4))

    # ── Tie-down chains/straps (red accent) ──
    for cx in (5.3, 7.7, 10.0):
        ax.add_patch(Polygon([(cx-0.15, 2.25), (cx+0.15, 2.25), (cx+0.1, 1.7), (cx-0.1, 1.7)],
                     closed=True, fc=ACCENT, ec="black", lw=0.5, zorder=6, alpha=0.85))
    # Tarp over part
    ax.add_patch(Polygon([(6.3, 2.25), (9.1, 2.25), (9.0, 3.3), (6.4, 3.3)],
                 closed=True, fc="#3c6f89", ec="black", lw=0.8, zorder=3.5, alpha=0.35))

    _wheels(ax, [1.25, 2.6, 4.7, 5.7, 6.7, 9.6, 10.6, 11.3], 0.85)
    _ground(ax, 0.55)

    _annot(ax, 0.4, 1.25, 0.55, 0.2, "Hood /\nEngine", color=ICON)
    _annot(ax, 3.68, 2.5, 3.68, 4.7, "Headache\nRack", color=ACCENT)
    _annot(ax, 7.6, 2.0, 7.6, 0.1, "Open Flat Deck\n(48 ft typical)", color=HEADER)
    _annot(ax, 5.3, 3.3, 4.4, 5.2, "Steel coil\n(chained)", color=ACCENT)
    _annot(ax, 7.7, 3.3, 7.7, 5.2, "Lumber\n(tarped)", color=ICON)
    _annot(ax, 10.0, 3.1, 10.6, 5.0, "Pipe load\n(strapped)", color=ACCENT2)

    fig.text(0.5, 0.03, "Cargo: steel, lumber, machinery, building materials  |  Deck: 48 ft  |  Tarping & securement skills required",
             ha="center", fontsize=9, color=MUTED, style="italic")
    return save(fig, "truck_flatbed.png")


# ─────────────────────────────────────────────────────────────
# 3. CONTAINER / INTERMODAL  —  shipping container on chassis
# ─────────────────────────────────────────────────────────────
def container():
    fig, ax = _setup_ax((12, 6.2))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 6.4)
    _titlebar(fig, "CONTAINER / INTERMODAL", "ISO shipping container on a skeletal chassis")

    # Tractor
    ax.add_patch(FancyBboxPatch((0.7, 0.9), 2.6, 1.9,
                 boxstyle="round,pad=0.02,rounding_size=0.15",
                 fc=HEADER, ec="black", lw=1.2, zorder=3))
    ax.add_patch(Polygon([(0.7, 0.9), (0.7, 1.6), (0.1, 1.55), (0.1, 0.9)],
                 closed=True, fc=COVER_BLOCK, ec="black", lw=1.2, zorder=3))
    ax.add_patch(Polygon([(2.4, 2.8), (3.3, 2.8), (3.3, 2.2), (2.55, 2.2)],
                 closed=True, fc="#cfe3ee", ec="black", lw=0.8, zorder=4))
    ax.add_patch(Rectangle((3.05, 2.8), 0.16, 0.7, fc=MUTED, ec="black", lw=0.6, zorder=4))
    ax.add_patch(Polygon([(3.2, 1.5), (3.7, 1.5), (3.55, 1.15), (3.35, 1.15)],
                 closed=True, fc=ACCENT, ec="black", lw=0.8, zorder=4))

    # Skeletal chassis (thin I-beam frame)
    ax.add_patch(Polygon([(3.7, 1.45), (11.6, 1.45), (11.4, 1.2), (3.9, 1.2)],
                 closed=True, fc="#5f6c72", ec="black", lw=1.2, zorder=2))
    # Chassis cross-members
    for sx in (5.2, 7.0, 8.8, 10.4):
        ax.add_patch(Rectangle((sx, 1.22), 0.18, 0.22, fc="#45525a", ec="none", zorder=3))

    # ── ISO Container (corrugated box) ──
    ax.add_patch(Rectangle((3.7, 1.55), 7.9, 2.2, fc=ACCENT2, ec="black", lw=1.4, zorder=2, alpha=0.92))
    # Corrugation vertical lines
    for sx in range(4, 12):
        ax.add_line(Line2D([sx, sx], [1.56, 3.73], color="#3f7d30", lw=0.5, zorder=3))
    # Container end-door frame
    ax.add_patch(Rectangle((11.3, 1.55), 0.3, 2.2, fc="none", ec="black", lw=1.4, zorder=4))
    # Twist-locks (corner castings) — 4 corners shown
    for cx in (3.78, 11.52):
        ax.add_patch(Rectangle((cx-0.08, 1.5), 0.22, 0.12, fc=ACCENT, ec="black", lw=0.5, zorder=5))
        ax.add_patch(Rectangle((cx-0.08, 3.66), 0.22, 0.12, fc=ACCENT, ec="black", lw=0.5, zorder=5))

    # Container ID label
    ax.add_patch(Rectangle((9.0, 2.3), 1.9, 0.55, fc="white", ec="black", lw=0.8, zorder=5))
    _label(ax, 9.95, 2.58, "MSCU 4471 820-3", color=TEXT, size=8, weight="bold")

    _wheels(ax, [1.25, 2.6, 7.0, 8.0, 9.6, 10.6, 11.3], 0.85)
    _ground(ax, 0.55)

    _annot(ax, 0.4, 1.25, 0.55, 0.2, "Hood /\nEngine", color=ICON)
    _annot(ax, 7.6, 1.33, 7.6, 0.15, "Skeletal Chassis\n(20 / 40 ft)", color=HEADER)
    _annot(ax, 3.9, 3.78, 3.9, 5.0, "Corner Casting\n+ Twist-lock", color=ACCENT)
    _annot(ax, 7.6, 3.5, 7.6, 5.2, "ISO Container\n(corrugated steel)", color=ACCENT2)

    fig.text(0.5, 0.03, "Cargo: port/rail intermodal freight  |  Sizes: 20 ft / 40 ft / 40HC  |  Twist-lock securement to chassis",
             ha="center", fontsize=9, color=MUTED, style="italic")
    return save(fig, "truck_container.png")


# ─────────────────────────────────────────────────────────────
# 4. DUMP TRUCK  —  end-dump / belly-dump with tilted bed
# ─────────────────────────────────────────────────────────────
def dump_truck():
    fig, ax = _setup_ax((12, 6.4))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 6.4)
    _titlebar(fig, "DUMP TRUCK (End-Dump Trailer)", "Hydraulic lift tilts the bed to discharge aggregate")

    # Tractor
    ax.add_patch(FancyBboxPatch((0.7, 0.9), 2.6, 1.9,
                 boxstyle="round,pad=0.02,rounding_size=0.15",
                 fc=HEADER, ec="black", lw=1.2, zorder=3))
    ax.add_patch(Polygon([(0.7, 0.9), (0.7, 1.6), (0.1, 1.55), (0.1, 0.9)],
                 closed=True, fc=COVER_BLOCK, ec="black", lw=1.2, zorder=3))
    ax.add_patch(Polygon([(2.4, 2.8), (3.3, 2.8), (3.3, 2.2), (2.55, 2.2)],
                 closed=True, fc="#cfe3ee", ec="black", lw=0.8, zorder=4))
    ax.add_patch(Rectangle((3.05, 2.8), 0.16, 0.7, fc=MUTED, ec="black", lw=0.6, zorder=4))
    ax.add_patch(Polygon([(3.2, 1.5), (3.7, 1.5), (3.55, 1.15), (3.35, 1.15)],
                 closed=True, fc=ACCENT, ec="black", lw=0.8, zorder=4))

    # ── Dump bed — shown TILTED (raised at the front, open at the rear) ──
    # Hinge at rear (~x=11.4, y=1.3); bed rising toward front
    # tilted bed as a trapezoid
    bed_pts = [
        (3.9, 3.2),   # front-top of raised bed
        (11.3, 1.55), # rear-top (tailgate lip)
        (11.3, 1.25), # rear-bottom
        (3.9, 2.6),   # front-bottom
    ]
    ax.add_patch(Polygon(bed_pts, closed=True, fc=ACCENT, ec="black", lw=1.4, zorder=2, alpha=0.9))
    # Bed ribbing
    ax.add_line(Line2D([4.6, 10.9], [2.95, 1.6], color="#7d3418", lw=0.6, zorder=3))
    ax.add_line(Line2D([5.6, 10.9], [2.78, 1.5], color="#7d3418", lw=0.6, zorder=3))

    # Tailgate (rear, open)
    ax.add_patch(Polygon([(11.3, 1.55), (11.3, 1.25), (11.9, 1.15), (11.9, 1.55)],
                 closed=True, fc="#7d3418", ec="black", lw=0.8, zorder=3))

    # Hydraulic cylinder (lift ram) — from chassis to bed front
    ax.add_patch(Rectangle((4.2, 1.3), 0.12, 1.35, fc=ICON, ec="black", lw=0.6, zorder=4))
    ax.add_patch(Rectangle((4.08, 1.3), 0.36, 0.2, fc=COVER_BLOCK, ec="black", lw=0.6, zorder=4))

    # Material falling out (aggregate)
    for (mx, my) in [(11.7, 1.0), (11.95, 0.75), (11.5, 0.65), (12.05, 0.5)]:
        ax.add_patch(Circle((mx, my), 0.07, fc="#8a7a55", ec="none", zorder=4, alpha=0.8))

    # Chassis frame under bed
    ax.add_patch(Rectangle((3.7, 1.05), 7.9, 0.25, fc="#45525a", ec="black", lw=1.0, zorder=1))

    _wheels(ax, [1.25, 2.6, 4.7, 5.7, 6.7, 9.6, 10.6, 11.3], 0.85)
    _ground(ax, 0.4)

    _annot(ax, 0.4, 1.25, 0.55, 0.2, "Hood /\nEngine", color=ICON)
    _annot(ax, 4.3, 2.0, 4.3, 4.7, "Hydraulic\nLift Ram\n(PTO driven)", color=ICON)
    _annot(ax, 7.5, 2.4, 6.0, 5.3, "Tilted Dump Bed\n(raises to discharge)", color=ACCENT)
    _annot(ax, 11.75, 1.2, 11.5, 0.0, "Open\nTailgate", color=ACCENT)
    _annot(ax, 11.95, 0.75, 11.6, -0.35, "Aggregate\n(sand/gravel/asphalt)", color=MUTED)

    fig.text(0.5, 0.03, "Cargo: sand, gravel, asphalt, demolition debris  |  NEVER dump on uneven/sloped ground  |  Beware of overhead power lines",
             ha="center", fontsize=9, color=DANGER, style="italic")
    return save(fig, "truck_dump.png")


# ─────────────────────────────────────────────────────────────
# 5. REEFER  —  refrigerated van with reefer unit + fuel tank
# ─────────────────────────────────────────────────────────────
def reefer():
    fig, ax = _setup_ax((12, 6.2))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 6.4)
    _titlebar(fig, "REFRIGERATED VAN (Reefer)", "Insulated box trailer with front-mounted refrigeration unit")

    # Tractor
    ax.add_patch(FancyBboxPatch((0.7, 0.9), 2.6, 1.9,
                 boxstyle="round,pad=0.02,rounding_size=0.15",
                 fc=HEADER, ec="black", lw=1.2, zorder=3))
    ax.add_patch(Polygon([(0.7, 0.9), (0.7, 1.6), (0.1, 1.55), (0.1, 0.9)],
                 closed=True, fc=COVER_BLOCK, ec="black", lw=1.2, zorder=3))
    ax.add_patch(Polygon([(2.4, 2.8), (3.3, 2.8), (3.3, 2.2), (2.55, 2.2)],
                 closed=True, fc="#cfe3ee", ec="black", lw=0.8, zorder=4))
    ax.add_patch(Rectangle((3.05, 2.8), 0.16, 0.7, fc=MUTED, ec="black", lw=0.6, zorder=4))
    ax.add_patch(Polygon([(3.2, 1.5), (3.7, 1.5), (3.55, 1.15), (3.35, 1.15)],
                 closed=True, fc=ACCENT, ec="black", lw=0.8, zorder=4))

    # ── Reefer unit (front nose of trailer) ──
    ax.add_patch(FancyBboxPatch((3.7, 1.25), 1.0, 2.55,
                 boxstyle="round,pad=0.0,rounding_size=0.08",
                 fc=ICON, ec="black", lw=1.4, zorder=2))
    # Reefer grille / fan
    ax.add_patch(Circle((4.2, 3.1), 0.32, fc="white", ec="black", lw=1.0, zorder=3))
    for ang in range(0, 360, 45):
        ax.add_patch(Wedge((4.2, 3.1), 0.32, ang, ang+22, fc="#dde6ec", ec="none", zorder=4))
    ax.add_patch(Circle((4.2, 3.1), 0.08, fc=HEADER, ec="black", lw=0.5, zorder=5))
    # Display / thermostat
    ax.add_patch(Rectangle((4.0, 2.15), 0.5, 0.3, fc=PAGE_BG, ec="black", lw=0.6, zorder=3))
    _label(ax, 4.25, 2.3, "34°F", color=ACCENT, size=6.5, weight="bold")
    # Reefer fuel tank
    ax.add_patch(Ellipse((4.2, 1.4), 0.5, 0.2, fc=HEADER, ec="black", lw=0.6, zorder=3))

    # ── Insulated van body ──
    ax.add_patch(FancyBboxPatch((4.7, 1.25), 6.9, 2.55,
                 boxstyle="round,pad=0.0,rounding_size=0.08",
                 fc="#eef4f6", ec="black", lw=1.4, zorder=2))
    # Insulation hatch lines (showing thick walls)
    ax.add_line(Line2D([4.78, 4.78], [1.3, 3.75], color=ICON, lw=2.2, zorder=3))
    ax.add_line(Line2D([11.52, 11.52], [1.3, 3.75], color=ICON, lw=2.2, zorder=3))
    ax.add_line(Line2D([4.78, 11.52], [3.72, 3.72], color=ICON, lw=1.6, zorder=3))
    # "Refrigerated" markings
    ax.add_patch(Rectangle((7.3, 2.2), 2.0, 0.7, fc="white", ec=ICON, lw=1.0, zorder=3))
    _label(ax, 8.3, 2.66, "❄ FROZEN / FRESH", color=ICON, size=8.5, weight="bold")
    _label(ax, 8.3, 2.34, "Temp-controlled", color=MUTED, size=7)
    # Rear doors
    ax.add_line(Line2D([11.6, 11.6], [1.3, 3.75], color="black", lw=1.4, zorder=3))
    ax.add_patch(Rectangle((11.25, 2.35), 0.28, 0.4, fc=ACCENT, ec="black", lw=0.6, zorder=4))

    _wheels(ax, [1.25, 2.6, 5.7, 6.7, 7.7, 9.6, 10.6, 11.3], 0.85)
    _ground(ax, 0.55)

    _annot(ax, 0.4, 1.25, 0.55, 0.2, "Hood /\nEngine", color=ICON)
    _annot(ax, 4.2, 3.45, 4.2, 5.0, "Reefer Unit\n(condenser + fan)", color=HEADER)
    _annot(ax, 4.2, 2.3, 2.9, 4.7, "Thermostat\nset-point", color=ACCENT)
    _annot(ax, 4.2, 1.4, 2.6, 3.4, "Reefer\nfuel tank", color=MUTED)
    _annot(ax, 7.6, 3.78, 7.6, 5.2, "Insulated Walls\n(foam core)", color=ICON)

    fig.text(0.5, 0.03, "Cargo: food, pharmaceuticals, produce  |  Range: -20°F to +70°F  |  Pre-cool the box & monitor reefer hourly",
             ha="center", fontsize=9, color=ICON, style="italic")
    return save(fig, "truck_reefer.png")


# ─────────────────────────────────────────────────────────────
# 6. PRE-TRIP INSPECTION — 7-point walk-around map
# ─────────────────────────────────────────────────────────────
def pretrip():
    fig, ax = plt.subplots(figsize=(11, 7.5), dpi=200)
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 8)
    ax.set_aspect("equal")
    ax.axis("off")
    _titlebar(fig, "PRE-TRIP INSPECTION — CAB + TRAILER", "The 7-step clockwise walk-around (DOT-required, every shift)")

    # Simplified truck (top-down-ish schematic) centered
    # Tractor
    ax.add_patch(FancyBboxPatch((4.4, 5.2), 2.2, 1.6,
                 boxstyle="round,pad=0.02,rounding_size=0.1",
                 fc=HEADER, ec="black", lw=1.2, zorder=2))
    _label(ax, 5.5, 6.0, "TRACTOR", color="white", size=9, weight="bold")
    # Trailer
    ax.add_patch(FancyBboxPatch((4.4, 1.0), 2.2, 4.0,
                 boxstyle="round,pad=0.02,rounding_size=0.08",
                 fc="#f3f0ea", ec="black", lw=1.2, zorder=2))
    _label(ax, 5.5, 3.0, "TRAILER", color=HEADER, size=9, weight="bold")

    # Inspection points (numbered 1..7) positioned clockwise
    pts = [
        (1, "Cab Interior",        (5.5, 6.85), (8.6, 7.4),  ACCENT),
        (2, "Engine Compartment",  (4.2, 6.85), (1.6, 7.4),  ACCENT),
        (3, "Front of Cab / Lights",(3.9, 6.0), (0.9, 6.4),  ICON),
        (4, "Left Side (driver)",  (4.2, 3.0),  (0.9, 3.4),  ICON),
        (5, "Rear of Trailer",     (5.5, 1.0),  (8.6, 0.5),  ACCENT),
        (6, "Right Side",          (6.8, 3.0),  (9.9, 3.4),  ICON),
        (7, "Front-Right & Brake Check",(6.8, 6.0),(9.9, 6.4),ACCENT),
    ]
    for num, name, xy, xytext, col in pts:
        ax.annotate(
            "", xy=xy, xytext=xytext,
            arrowprops=dict(arrowstyle="->", color=col, lw=1.6),
            zorder=5,
        )
        # number badge
        ax.add_patch(Circle(xytext, 0.32, fc=col, ec="black", lw=1.0, zorder=6))
        _label(ax, xytext[0], xytext[1], str(num), color="white", size=12, weight="bold")
        # name label
        ha = "left" if xytext[0] > 5.5 else "right"
        tx = xytext[0] + (0.45 if ha == "left" else -0.45)
        ax.text(tx, xytext[1] + (0.0), name, color=TEXT, fontsize=8.5,
                ha=ha, va="center", zorder=7,
                bbox=dict(boxstyle="round,pad=0.2", fc="white", ec=col, lw=0.8))

    # Direction arrow (clockwise)
    arc = FancyArrowPatch((1.7, 7.0), (9.3, 0.9),
                          connectionstyle="arc3,rad=-0.32",
                          arrowstyle="-|>", mutation_scale=18,
                          color=MUTED, lw=1.2, ls=(0, (5, 4)), zorder=1)
    ax.add_patch(arc)
    ax.text(5.5, 0.25, "Clockwise flow", ha="center", color=MUTED, fontsize=8, style="italic")

    # Key checks footer box
    footer = "Key items:  tires & pressure · wheels/rims · brakes/hoses · lights/lenses · suspension/air bags · fluid leaks · coupling · doors/latches · registration & permits"
    fig.text(0.5, 0.025, footer, ha="center", fontsize=8, color=HEADER,
             bbox=dict(boxstyle="round,pad=0.4", fc=PAGE_BG, ec=BORDER, lw=0.8))
    return save(fig, "procedure_pretrip.png")


# ─────────────────────────────────────────────────────────────
# 7. NO-ZONES / BLIND SPOTS around a tractor-trailer
# ─────────────────────────────────────────────────────────────
def nozones():
    fig, ax = plt.subplots(figsize=(11, 6.8), dpi=200)
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 7)
    ax.set_aspect("equal")
    ax.axis("off")
    _titlebar(fig, "NO-ZONES — TRUCK BLIND SPOTS", "Where your trailer cannot see a car. Stay out of these zones.")

    # Truck (top-down)
    # Tractor
    ax.add_patch(FancyBboxPatch((4.6, 4.6), 1.8, 1.3,
                 boxstyle="round,pad=0.02,rounding_size=0.1",
                 fc=HEADER, ec="black", lw=1.2, zorder=3))
    # Trailer
    ax.add_patch(Rectangle((4.6, 1.3), 1.8, 3.2, fc="#f3f0ea", ec="black", lw=1.2, zorder=3))
    # Mirrors
    ax.add_patch(Rectangle((4.3, 5.5), 0.3, 0.2, fc=ACCENT, ec="black", lw=0.6, zorder=4))
    ax.add_patch(Rectangle((6.4, 5.5), 0.3, 0.2, fc=ACCENT, ec="black", lw=0.6, zorder=4))
    _label(ax, 5.5, 5.25, "CAB", color="white", size=8, weight="bold")

    # No-zones (red shaded)
    # Front no-zone (ahead of cab)
    ax.add_patch(Polygon([(4.6,5.9),(6.4,5.9),(6.0,6.7),(5.0,6.7)],
                 closed=True, fc=DANGER, ec="black", lw=0.8, zorder=2, alpha=0.55))
    # Rear no-zone
    ax.add_patch(Rectangle((4.6, 0.2), 1.8, 1.1, fc=DANGER, ec="black", lw=0.8, zorder=2, alpha=0.55))
    # Left side no-zone
    ax.add_patch(Polygon([(4.6,5.9),(4.6,1.3),(3.0,4.0),(3.0,5.0)],
                 closed=True, fc=DANGER, ec="black", lw=0.8, zorder=2, alpha=0.55))
    # Right side no-zone (MUCH larger)
    ax.add_patch(Polygon([(6.4,5.9),(6.4,1.3),(8.6,2.0),(8.6,5.2)],
                 closed=True, fc=DANGER, ec="black", lw=0.8, zorder=2, alpha=0.55))

    # Labels
    _label(ax, 5.5, 6.3, "FRONT\nNo-Zone", color=DANGER, size=8.5, weight="bold")
    _label(ax, 5.5, 0.75, "REAR\nNo-Zone\n(200 ft)", color=DANGER, size=8.5, weight="bold")
    _label(ax, 3.5, 4.6, "LEFT\nsmall", color=DANGER, size=8, weight="bold")
    _label(ax, 7.8, 3.6, "RIGHT\nLARGEST\nNo-Zone", color=DANGER, size=9, weight="bold")

    # Car icons in danger zone
    def car(ax, x, y, col):
        ax.add_patch(FancyBboxPatch((x-0.18,y-0.1),0.36,0.2,
                     boxstyle="round,pad=0.01,rounding_size=0.05",fc=col,ec="black",lw=0.5,zorder=5))
    car(ax, 5.5, 6.45, ICON)
    car(ax, 5.5, 0.6, ICON)
    car(ax, 3.4, 4.6, ICON)
    car(ax, 8.2, 3.0, ICON)

    fig.text(0.5, 0.03,
             "Rule of thumb:  If you can't see the driver's face in the truck's mirrors, the driver CANNOT see you.",
             ha="center", fontsize=9.5, color=DANGER, style="italic", weight="bold")
    return save(fig, "procedure_nozones.png")


# ─────────────────────────────────────────────────────────────
# 8. COUPLING & UNCOUPLING — fifth-wheel process
# ─────────────────────────────────────────────────────────────
def coupling():
    fig, ax = plt.subplots(figsize=(11, 6.8), dpi=200)
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 7)
    ax.set_aspect("equal")
    ax.axis("off")
    _titlebar(fig, "COUPLING — FIFTH WHEEL & KINGPIN", "How the tractor locks onto the trailer")

    # Fifth wheel (top view) — the horseshoe plate
    ax.add_patch(Polygon([
        (3.5, 4.8), (3.5, 3.0), (4.2, 2.6), (4.6, 2.8),  # open jaw front
        (5.0, 3.0), (5.0, 4.8), (3.5, 4.8)],
        closed=True, fc=ICON, ec="black", lw=1.4, zorder=2))
    # Jaw opening (slot)
    ax.add_patch(Polygon([(4.2,2.6),(4.6,2.8),(4.6,3.4),(4.2,3.4)],
                 closed=True, fc=PAGE_BG, ec="black", lw=1.0, zorder=3))
    # Kingpin (going into the slot)
    ax.add_patch(Circle((4.4, 4.0), 0.16, fc=ACCENT, ec="black", lw=0.8, zorder=5))
    ax.add_patch(Rectangle((4.3, 4.16), 0.2, 0.7, fc=ACCENT, ec="black", lw=0.8, zorder=4))

    # Locking jaw (closed)
    ax.add_patch(Wedge((4.4, 3.2), 0.55, 200, 340, fc=COVER_BLOCK, ec="black", lw=0.8, zorder=4))

    # Trailer plate (skid plate)
    ax.add_patch(Rectangle((3.0, 4.6), 3.0, 0.25, fc="#888888", ec="black", lw=1.0, zorder=1))

    _annot(ax, 4.4, 4.0, 7.2, 5.6, "Kingpin\n(welded to trailer)", color=ACCENT)
    _annot(ax, 4.4, 3.2, 2.0, 1.6, "Locking Jaw\n(must CLOSE\nfully around pin)", color=COVER_BLOCK)
    _annot(ax, 4.4, 4.72, 7.5, 6.4, "Trailer Skid Plate\nrests on fifth wheel", color=HEADER)
    _annot(ax, 4.7, 2.7, 1.7, 5.8, "Fifth-Wheel Plate\n(mounted on tractor)", color=ICON)

    # Right side: numbered checklist
    steps = [
        "1. Back slowly — align tractor under trailer",
        "2. Listen / feel for the kingpin to engage",
        "3. Check jaw is CLOSED (visual + tactile)",
        "4. Do a TUG TEST — pull forward in low gear",
        "5. Connect air lines (red = emergency, blue = service)",
        "6. Connect electrical cord (7-way)",
        "7. Raise landing gear; check trailer height",
        "8. Verify air pressure builds & no leaks",
    ]
    bx0, by0 = 0.5, 6.0
    ax.add_patch(FancyBboxPatch((0.3, 0.4), 2.9, 6.4,
                 boxstyle="round,pad=0.05,rounding_size=0.1",
                 fc=PAGE_BG, ec=BORDER, lw=1.0, zorder=0))
    _label(ax, 1.75, 6.5, "COUPLING CHECKLIST", color=HEADER, size=9.5, weight="bold")
    for i, s in enumerate(steps):
        ax.text(0.5, 5.9 - i * 0.62, s, fontsize=7.8, color=TEXT, va="center", zorder=2)

    fig.text(0.5, 0.025,
             "A failed tug test = the kingpin is NOT locked. The trailer can drop onto the fifth wheel (a 'dropped trailer').",
             ha="center", fontsize=8.5, color=DANGER, style="italic")
    return save(fig, "procedure_coupling.png")


# ─────────────────────────────────────────────────────────────
# 9. CARGO SECUREMENT — WLL & tie-down math (flatbed focus)
# ─────────────────────────────────────────────────────────────
def securement():
    fig, ax = plt.subplots(figsize=(11, 6.6), dpi=200)
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 6.6)
    ax.set_aspect("equal")
    ax.axis("off")
    _titlebar(fig, "CARGO SECUREMENT — TIE-DOWN FUNDAMENTALS", "FMCSA 393.110: Working Load Limit (WLL) rules")

    # Flatbed deck
    ax.add_patch(Rectangle((1.0, 2.4), 9.0, 0.4, fc="#7d8a90", ec="black", lw=1.2, zorder=2))
    # Cargo block
    ax.add_patch(Rectangle((4.5, 2.8), 2.0, 1.6, fc="#c8a87a", ec="black", lw=1.2, zorder=3))
    _label(ax, 5.5, 3.6, "CARGO", color=TEXT, size=9, weight="bold")

    # Tie-downs (chains) over cargo — anchored to rub rails
    for x in (4.8, 6.2):
        ax.add_patch(Polygon([(x-0.12,4.4),(x+0.12,4.4),(x+0.08,2.4),(x-0.08,2.4)],
                     closed=True, fc=ACCENT, ec="black", lw=0.5, zorder=5))
        # ratchet binder
        ax.add_patch(Rectangle((x-0.16, 3.4), 0.32, 0.22, fc=HEADER, ec="black", lw=0.5, zorder=6))
    # Rub rails on deck edges
    ax.add_patch(Rectangle((1.0, 2.62), 9.0, 0.06, fc=ACCENT2, ec="none", zorder=4))
    # Anchor points
    for x in (4.8, 6.2):
        ax.add_patch(Circle((x, 2.4), 0.08, fc=ACCENT, ec="black", lw=0.4, zorder=5))

    _annot(ax, 5.5, 4.4, 8.6, 5.4, "Chain / Strap\n(wrapped over cargo)", color=ACCENT)
    _annot(ax, 4.8, 3.5, 1.7, 4.6, "Ratchet\nBinder", color=HEADER)
    _annot(ax, 1.5, 2.65, 1.4, 1.4, "Rub Rail\n& anchor\npoint", color=ACCENT2)

    # Right-side rule panel
    ax.add_patch(FancyBboxPatch((7.7, 0.5), 3.0, 5.0,
                 boxstyle="round,pad=0.05,rounding_size=0.1",
                 fc=PAGE_BG, ec=BORDER, lw=1.0, zorder=0))
    _label(ax, 9.2, 5.2, "SECUREMENT RULES", color=HEADER, size=9.5, weight="bold")
    rules = [
        "WLL ≥ cargo weight",
        "",
        "Aggregate WLL ≥ 1/2 of cargo",
        "weight (general freight)",
        "",
        "≥ 2 tie-downs for ≤ 5 ft cargo",
        "≥ 4 tie-downs for > 10 ft cargo",
        "+1 per extra 10 ft",
        "",
        "Min WLL per tie-down: 1,135 lb",
        "",
        "Front: 1 + rear: 1 (minimum)",
    ]
    for i, r in enumerate(rules):
        ax.text(7.85, 4.7 - i * 0.36, r, fontsize=7.6, color=TEXT, va="center", zorder=2)

    # Example calc box
    ax.add_patch(FancyBboxPatch((0.6, 0.4), 6.7, 1.6,
                 boxstyle="round,pad=0.05,rounding_size=0.1",
                 fc="#fdf6f1", ec=ACCENT, lw=1.0, zorder=0))
    ax.text(0.8, 1.7, "EXAMPLE", fontsize=8.5, color=ACCENT, weight="bold", va="center")
    ax.text(0.8, 1.3,
            "Cargo weight = 20,000 lb  →  Need aggregate WLL ≥ 10,000 lb\n"
            "Using 4 chains rated 4,000 lb WLL each = 16,000 lb  ✓  (exceeds 10,000 lb minimum)\n"
            "Always inspect hooks, binders & chain links for cracks, stretch or wear.",
            fontsize=8, color=TEXT, va="center", zorder=2, linespacing=1.5)
    return save(fig, "procedure_securement.png")


if __name__ == "__main__":
    print("Generating CDL training diagrams...")
    dry_van()
    flatbed()
    container()
    dump_truck()
    reefer()
    pretrip()
    nozones()
    coupling()
    securement()
    print("\nAll diagrams generated in:", ASSETS)
