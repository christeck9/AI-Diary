"""Merge cover.pdf (page 0) + body.pdf into the final manual PDF."""
import os
from pypdf import PdfReader, PdfWriter, Transformation

HERE = os.path.dirname(os.path.abspath(__file__))
COVER = os.path.join(HERE, "cover.pdf")
BODY = os.path.join(HERE, "body.pdf")
OUT = os.path.join(HERE, "CDL_Class_A_Driver_Training_Manual.pdf")

A4_W, A4_H = 595.2756, 841.8898  # A4 in points

def normalize(page):
    box = page.mediabox
    w, h = float(box.width), float(box.height)
    if abs(w - A4_W) > 2 or abs(h - A4_H) > 2:
        sx, sy = A4_W / w, A4_H / h
        page.add_transformation(Transformation().scale(sx=sx, sy=sy))
        page.mediabox.lower_left = (0, 0)
        page.mediabox.upper_right = (A4_W, A4_H)
    return page

writer = PdfWriter()
# Cover = page 1
cover = PdfReader(COVER)
writer.add_page(normalize(cover.pages[0]))
# Body pages follow
body = PdfReader(BODY)
for p in body.pages:
    writer.add_page(normalize(p))

writer.add_metadata({
    "/Title": "CDL Class A Driver Training Manual",
    "/Author": "Z.ai",
    "/Creator": "Z.ai",
    "/Subject": "Commercial Driver's License Class A training: core fundamentals and specialty equipment modules (Dry Van, Flatbed, Container, Dump, Reefer)",
    "/Keywords": "CDL, Class A, truck driver training, dry van, flatbed, container, dump truck, reefer, FMCSA, DOT",
})

with open(OUT, "wb") as f:
    writer.write(f)

print("Final PDF written:", OUT)
print("Size:", os.path.getsize(OUT), "bytes")
print("Total pages:", len(writer.pages))
