#!/usr/bin/env python3
"""Dump individual top-level layers as separate SVG files."""
import re
import os

svg_path = r"D:/Desktop/Inkforge/experiment/_svg_individual/svg_000.svg"
with open(svg_path, 'r', encoding='utf-8') as f:
    svg = f.read()

# Extract the opening <svg ...> tag for wrapping
svg_open_m = re.match(r'^(<svg[^>]*>)', svg)
svg_open = svg_open_m.group(1)

# Strip wrapper
inner = re.sub(r'^<svg[^>]*>', '', svg, count=1)
inner = re.sub(r'</svg>$', '', inner, count=1)

# Tokenize as before
def tokenize_top(s):
    out = []
    i = 0
    n = len(s)
    while i < n:
        while i < n and s[i].isspace():
            i += 1
        if i >= n:
            break
        if s[i] != '<':
            i += 1
            continue
        m = re.match(r'<([a-zA-Z][a-zA-Z0-9]*)', s[i:])
        if not m:
            i += 1
            continue
        tag = m.group(1)
        end_open = s.find('>', i)
        if s[end_open - 1] == '/':
            out.append((tag, s[i:end_open + 1]))
            i = end_open + 1
            continue
        depth = 1
        j = end_open + 1
        while j < n and depth > 0:
            if s[j] == '<':
                if s[j + 1] == '/':
                    close_m = re.match(r'</([a-zA-Z][a-zA-Z0-9]*)\s*>', s[j:])
                    if close_m and close_m.group(1) == tag:
                        depth -= 1
                        if depth == 0:
                            end = j + len(close_m.group(0))
                            out.append((tag, s[i:end]))
                            i = end
                            break
                        j += len(close_m.group(0))
                    else:
                        j += 1
                else:
                    open_m = re.match(r'<([a-zA-Z][a-zA-Z0-9]*)([^>]*)>', s[j:])
                    if open_m:
                        otag = open_m.group(1)
                        rest = open_m.group(2)
                        if otag == tag:
                            if not rest.endswith('/'):
                                depth += 1
                        j += len(open_m.group(0))
                    else:
                        j += 1
            else:
                j += 1
        else:
            i = j
            continue
    return out

top = tokenize_top(inner)
out_dir = r"D:/Desktop/Inkforge/experiment/_svg_layers"
os.makedirs(out_dir, exist_ok=True)
for idx, (tag, content) in enumerate(top):
    fname = f"{idx:02d}_{tag}.svg"
    # Wrap in svg with viewBox so it can be viewed in isolation
    out = svg_open + content + "</svg>"
    with open(os.path.join(out_dir, fname), 'w', encoding='utf-8') as f:
        f.write(out)
print(f"Wrote {len(top)} layer files to {out_dir}")
