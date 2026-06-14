#!/usr/bin/env python3
"""
QuizHub AI — Annotate screenshots with red arrows & callout boxes
Like the example: red arrow pointing to a specific UI element with a label.
"""

import os
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

SS  = Path("/Users/veera.konjeti/Desktop/hack-n-stack/screenshots")
OUT = Path("/Users/veera.konjeti/Desktop/hack-n-stack/screenshots/annotated")
OUT.mkdir(exist_ok=True)

RED    = (220, 30,  30,  255)
RED_BG = (220, 30,  30,  200)
WHITE  = (255, 255, 255, 255)
YELLOW = (255, 220,  30, 255)
YEL_BG = (180, 130,   0, 200)

def load_font(size):
    """Load a reasonable font, fall back to default."""
    for name in [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
    ]:
        if os.path.exists(name):
            try:
                return ImageFont.truetype(name, size)
            except:
                pass
    return ImageFont.load_default()

def arrow(draw, x1, y1, x2, y2, color=RED, width=5, head=22):
    """Draw a filled arrow from (x1,y1) → (x2,y2)."""
    draw.line([(x1, y1), (x2, y2)], fill=color, width=width)
    angle = math.atan2(y2 - y1, x2 - x1)
    for side in [+0.45, -0.45]:
        ax = x2 - head * math.cos(angle - side)
        ay = y2 - head * math.sin(angle - side)
        draw.line([(x2, y2), (ax, ay)], fill=color, width=width)

def label(draw, x, y, text, font, bg=RED_BG, fg=WHITE, pad=10, anchor="tl"):
    """Draw a filled rounded-rect label at (x,y)."""
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    if anchor == "tr":   x -= tw + pad * 2
    elif anchor == "br": x -= tw + pad * 2; y -= th + pad * 2
    elif anchor == "bl": y -= th + pad * 2
    rx0, ry0 = x - pad, y - pad
    rx1, ry1 = x + tw + pad, y + th + pad
    draw.rounded_rectangle([rx0, ry0, rx1, ry1], radius=8, fill=bg)
    draw.text((x, y), text, font=font, fill=fg)

def annotate(filename, annotations, scale=1.0):
    """
    annotations = list of dicts:
      { "arrow": (x1,y1,x2,y2), "label": (lx,ly,text), "anchor": "tl" }
    scale: resize factor for output (0.5 = half size)
    """
    src = SS / filename
    if not src.exists():
        print(f"  MISSING: {filename}")
        return None

    img = Image.open(src).convert("RGBA")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    font_lg = load_font(28)
    font_sm = load_font(22)

    for ann in annotations:
        ax1, ay1, ax2, ay2 = ann["arrow"]
        arrow(draw, ax1, ay1, ax2, ay2)
        lx, ly, txt = ann["label"]
        font = font_lg if ann.get("large") else font_sm
        bg = YEL_BG if ann.get("yellow") else RED_BG
        fg = YELLOW if ann.get("yellow") else WHITE
        anchor = ann.get("anchor", "tl")
        label(draw, lx, ly, txt, font, bg=bg, fg=fg, anchor=anchor)

    out_img = Image.alpha_composite(img, overlay).convert("RGB")

    if scale != 1.0:
        nw = int(out_img.width * scale)
        nh = int(out_img.height * scale)
        out_img = out_img.resize((nw, nh), Image.LANCZOS)

    out_path = OUT / filename
    out_img.save(str(out_path))
    print(f"  ✅ {filename}")
    return out_path


# ══════════════════════════════════════════════════════════
#  01. LOGIN PAGE
# ══════════════════════════════════════════════════════════
annotate("login_desktop.png", [
    {   # Demo credentials panel
        "arrow": (310, 480, 220, 540),
        "label": (320, 450, "1-Click Demo Autofill Panel"),
        "anchor": "tl",
    },
    {   # Sign In button
        "arrow": (230, 460, 230, 435),
        "label": (80, 465, "JWT Sign In"),
        "anchor": "tl",
    },
    {   # AI Chatbot
        "arrow": (1200, 835, 1295, 825),
        "label": (1020, 810, "AI Collab Hub"),
        "anchor": "tl",
    },
    {   # Role-based login hint
        "arrow": (90, 165, 90, 220),
        "label": (30, 130, "Enterprise ID Login"),
        "anchor": "tl",
    },
])

# ══════════════════════════════════════════════════════════
#  02. ADMIN DASHBOARD
# ══════════════════════════════════════════════════════════
annotate("admin_dashboard_desktop.png", [
    {   # Sidebar nav
        "arrow": (105, 130, 105, 300),
        "label": (15, 95, "Full Navigation Sidebar"),
        "anchor": "tl",
    },
    {   # KPI stat cards
        "arrow": (450, 195, 450, 230),
        "label": (230, 155, "Live KPI Stat Cards"),
        "anchor": "tl",
    },
    {   # MCQ by Tech Stack chart
        "arrow": (470, 290, 470, 340),
        "label": (230, 255, "MCQs by Tech Stack Chart"),
        "anchor": "tl",
    },
    {   # Performance Overview donuts
        "arrow": (850, 290, 800, 330),
        "label": (730, 255, "Approval Donut Charts"),
        "anchor": "tl",
    },
    {   # Platform Insights
        "arrow": (850, 470, 800, 510),
        "label": (730, 435, "Platform Insights (Quality, SLA)"),
        "anchor": "tl",
    },
    {   # Top Reviewers
        "arrow": (900, 660, 850, 700),
        "label": (730, 630, "Top Reviewers Leaderboard"),
        "anchor": "tl",
    },
    {   # Add Question button
        "arrow": (1100, 120, 1070, 118),
        "label": (1110, 105, "+ Add Question"),
        "anchor": "tl",
        "yellow": True,
    },
])

# ══════════════════════════════════════════════════════════
#  03. KANBAN BOARD
# ══════════════════════════════════════════════════════════
annotate("kanban_board_desktop.png", [
    {   # Draft column
        "arrow": (360, 270, 360, 300),
        "label": (235, 240, "DRAFT Lane"),
        "anchor": "tl",
    },
    {   # Ready for Review column
        "arrow": (622, 270, 622, 300),
        "label": (490, 240, "READY FOR REVIEW Lane"),
        "anchor": "tl",
    },
    {   # Under Review column
        "arrow": (890, 270, 890, 300),
        "label": (760, 240, "UNDER REVIEW Lane"),
        "anchor": "tl",
    },
    {   # Approved column
        "arrow": (1150, 270, 1150, 300),
        "label": (1020, 240, "APPROVED Lane"),
        "anchor": "tl",
    },
    {   # AI Quality Score badge
        "arrow": (305, 510, 305, 530),
        "label": (200, 475, "AI Quality Score 75/100", ),
        "anchor": "tl",
        "yellow": True,
    },
    {   # Tech stack chip
        "arrow": (290, 460, 270, 480),
        "label": (95, 435, "Tech Stack Chip"),
        "anchor": "tl",
    },
    {   # Progress bar summary at top
        "arrow": (700, 190, 700, 200),
        "label": (560, 155, "Pipeline Progress Bar"),
        "anchor": "tl",
    },
])

# ══════════════════════════════════════════════════════════
#  04. AI STUDIO
# ══════════════════════════════════════════════════════════
annotate("ai_studio_desktop.png", [
    {   # Title
        "arrow": (700, 100, 700, 130),
        "label": (540, 65, "AI Studio — MCQ Generator"),
        "anchor": "tl",
        "yellow": True,
    },
])

# ══════════════════════════════════════════════════════════
#  05. LIVE QUIZ
# ══════════════════════════════════════════════════════════
annotate("live_quiz_desktop.png", [
    {   # Live quiz header
        "arrow": (700, 100, 700, 130),
        "label": (480, 65, "Real-Time Multiplayer Live Quiz"),
        "anchor": "tl",
        "yellow": True,
    },
])

# ══════════════════════════════════════════════════════════
#  06. LEADERBOARD
# ══════════════════════════════════════════════════════════
annotate("leaderboard_desktop.png", [
    {   # Leaderboard header
        "arrow": (700, 100, 700, 130),
        "label": (500, 65, "Gamified Leaderboard"),
        "anchor": "tl",
        "yellow": True,
    },
])

# ══════════════════════════════════════════════════════════
#  07. BULK UPLOAD
# ══════════════════════════════════════════════════════════
annotate("bulk_upload_desktop.png", [
    {   # Upload area
        "arrow": (700, 200, 700, 250),
        "label": (480, 165, "Drag-and-Drop CSV/Excel Upload"),
        "anchor": "tl",
        "yellow": True,
    },
])

# ══════════════════════════════════════════════════════════
#  08. REVIEWER DASHBOARD
# ══════════════════════════════════════════════════════════
annotate("reviewer_dashboard_desktop.png", [
    {   # SLA metrics
        "arrow": (700, 150, 700, 200),
        "label": (480, 115, "SLA Breach Tracking & Metrics"),
        "anchor": "tl",
        "yellow": True,
    },
])

# ══════════════════════════════════════════════════════════
#  09. MY QUESTIONS — status tabs
# ══════════════════════════════════════════════════════════
annotate("my_questions_desktop.png", [
    {   # Status tabs
        "arrow": (500, 140, 500, 175),
        "label": (230, 105, "Status Filter Tabs with Live Counts"),
        "anchor": "tl",
    },
])

# ══════════════════════════════════════════════════════════
#  10. PENDING REVIEWS
# ══════════════════════════════════════════════════════════
annotate("pending_reviews_desktop.png", [
    {   # Review queue
        "arrow": (700, 150, 700, 200),
        "label": (480, 115, "Reviewer Queue — Approve / Reject / Request Changes"),
        "anchor": "tl",
    },
])

print("\n✅  All annotated screenshots saved to screenshots/annotated/")
