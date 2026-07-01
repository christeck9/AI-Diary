"""Render the cover HTML to a single-page A4 PDF via Playwright (vector output)."""
from playwright.sync_api import sync_playwright
import os

HERE = os.path.dirname(os.path.abspath(__file__))
HTML = os.path.join(HERE, "cover.html")
OUT = os.path.join(HERE, "cover.pdf")

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto("file:///" + HTML.replace("\\", "/"))
    # wait for fonts
    page.wait_for_load_state("networkidle")
    try:
        page.evaluate("document.fonts.ready")
    except Exception:
        pass
    page.pdf(
        path=OUT,
        width="210mm",
        height="297mm",
        print_background=True,
        margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
        prefer_css_page_size=True,
    )
    browser.close()

print("Cover PDF written:", OUT, os.path.getsize(OUT), "bytes")
