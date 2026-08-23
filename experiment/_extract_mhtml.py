#!/usr/bin/env python3
"""Extract decoded HTML body from MHTML and analyze SVG patterns."""
import quopri
import re
import sys
import os
import json
from pathlib import Path

MHTML_PATH = r"D:/Desktop/Inkforge/experiment/清明，烧Token，祭图灵.mhtml"
OUT_HTML = r"D:/Desktop/Inkforge/experiment/_decoded_main.html"
OUT_SVG_DUMP = r"D:/Desktop/Inkforge/experiment/_svg_dump.json"

def main():
    with open(MHTML_PATH, "rb") as f:
        raw = f.read()
    text = raw.decode("utf-8", errors="replace")
    lines = text.splitlines(keepends=False)

    # Find first multipart boundary (after the headers)
    boundary_marker = "------MultipartBoundary--hWSUOIMYatXrwdWW1OLDm9WCdaI8cnEmItiirwZbXh----"

    # The first HTML part starts at line 12 (boundary) and the content begins after blank line.
    # Content ends at next boundary marker.
    start_idx = None
    end_idx = None
    for i, line in enumerate(lines):
        if line.strip() == boundary_marker:
            if start_idx is None:
                start_idx = i
            elif end_idx is None:
                end_idx = i
                break

    # The body is between start_idx and end_idx; skip headers within the part
    part = lines[start_idx + 1:end_idx]
    # Find blank line that separates headers from body
    blank_idx = None
    for i, line in enumerate(part):
        if line.strip() == "":
            blank_idx = i
            break
    body_lines = part[blank_idx + 1:]
    body_qp = "\n".join(body_lines)

    # Decode quoted-printable
    decoded_bytes = quopri.decodestring(body_qp.encode("utf-8"))
    html = decoded_bytes.decode("utf-8", errors="replace")

    with open(OUT_HTML, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Wrote decoded HTML: {OUT_HTML} ({len(html)} chars)")

    # Now extract all SVG elements - need to handle nested elements carefully
    # Find all <svg ...>...</svg> blocks
    svg_pattern = re.compile(r'<svg\b[^>]*>.*?</svg>', re.DOTALL | re.IGNORECASE)
    svgs = svg_pattern.findall(html)
    print(f"Found {len(svgs)} SVG blocks")

    # Save a structured dump
    svg_records = []
    for idx, s in enumerate(svgs):
        # Extract viewBox
        vb_m = re.search(r'viewBox=["\']([^"\']+)["\']', s, re.IGNORECASE)
        w_m = re.search(r'\bwidth=["\']([^"\']+)["\']', s, re.IGNORECASE)
        h_m = re.search(r'\bheight=["\']([^"\']+)["\']', s, re.IGNORECASE)
        # Look for interactivity
        has_animate = bool(re.search(r'<animate\b', s, re.IGNORECASE))
        has_animate_transform = bool(re.search(r'<animateTransform\b', s, re.IGNORECASE))
        has_set = bool(re.search(r'<set\b', s, re.IGNORECASE))
        # begin= occurrences
        begin_matches = re.findall(r'begin=["\']([^"\']+)["\']', s, re.IGNORECASE)
        # restart= occurrences
        restart_matches = re.findall(r'restart=["\']([^"\']+)["\']', s, re.IGNORECASE)
        fill_matches = re.findall(r'\bfill=["\']([^"\']+)["\']', s, re.IGNORECASE)
        # Count <text> elements
        text_count = len(re.findall(r'<text\b', s, re.IGNORECASE))
        # Approx char length
        length = len(s)
        svg_records.append({
            "idx": idx,
            "viewBox": vb_m.group(1) if vb_m else None,
            "width": w_m.group(1) if w_m else None,
            "height": h_m.group(1) if h_m else None,
            "has_animate": has_animate,
            "has_animateTransform": has_animate_transform,
            "has_set": has_set,
            "begin_values": begin_matches,
            "restart_values": restart_matches,
            "text_count": text_count,
            "length": length,
            "preview_head": s[:200],
            "preview_tail": s[-200:] if len(s) > 200 else "",
        })

    with open(OUT_SVG_DUMP, "w", encoding="utf-8") as f:
        json.dump(svg_records, f, indent=2, ensure_ascii=False)
    print(f"Wrote SVG dump: {OUT_SVG_DUMP}")

    # Save each SVG individually for easy reading
    svg_dir = r"D:/Desktop/Inkforge/experiment/_svg_individual"
    os.makedirs(svg_dir, exist_ok=True)
    for idx, s in enumerate(svgs):
        with open(os.path.join(svg_dir, f"svg_{idx:03d}.svg"), "w", encoding="utf-8") as f:
            f.write(s)
    print(f"Wrote {len(svgs)} individual SVG files to {svg_dir}")


if __name__ == "__main__":
    main()
