#!/usr/bin/env python3
"""Detailed analysis of the single big SVG."""
import re
import json

svg_path = r"D:/Desktop/Inkforge/experiment/_svg_individual/svg_000.svg"
with open(svg_path, 'r', encoding='utf-8') as f:
    svg = f.read()

# Identify <g> top-level groups inside root <svg>
# The SVG structure: 7 stacked <g> elements (the 7 burning layers)
# Plus initial root-level rect/circle/text decoration

# Strip the opening <svg ...> and closing </svg>
inner = re.sub(r'^<svg[^>]*>', '', svg, count=1)
inner = re.sub(r'</svg>$', '', inner, count=1)

# Walk top-level elements: find <g> blocks at root level
# Each layer is a <g> ... </g> block. But the first elements are root-level rect/circle/text
# (the visible "top" layer composition that includes its own embedded <g>s).

# Simple approach: find all top-level <g> tags by counting nesting depth
def split_top_level(s):
    out = []
    i = 0
    depth = 0
    start = 0
    cur_tag = None
    # Track sequential top-level nodes
    while i < len(s):
        if s[i] == '<' and s[i+1] != '/':
            # opening tag
            tag_m = re.match(r'<([a-zA-Z]+)', s[i:])
            if tag_m:
                tag_name = tag_m.group(1)
                if depth == 0:
                    # start a new top-level node
                    start = i
                    cur_tag = tag_name
                # find end of opening tag
                end_open = s.find('>', i)
                self_close = s[end_open-1] == '/'
                if not self_close:
                    depth += 1
                i = end_open + 1
                if self_close and depth == 0:
                    out.append((cur_tag, s[start:i]))
                continue
        elif s[i:i+2] == '</':
            # closing tag
            end_close = s.find('>', i)
            depth -= 1
            i = end_close + 1
            if depth == 0:
                out.append((cur_tag, s[start:i]))
                cur_tag = None
            continue
        else:
            i += 1
    return out

# More robust: simple state machine for tag depth
def tokenize_top(s):
    out = []
    i = 0
    n = len(s)
    while i < n:
        # Skip whitespace
        while i < n and s[i].isspace():
            i += 1
        if i >= n:
            break
        if s[i] != '<':
            # text node
            i += 1
            continue
        # opening element
        # find tag name
        m = re.match(r'<([a-zA-Z][a-zA-Z0-9]*)', s[i:])
        if not m:
            i += 1
            continue
        tag = m.group(1)
        # find matching end (depth-balanced) or self-close
        end_open = s.find('>', i)
        if s[end_open - 1] == '/':
            # self-closing
            out.append((tag, s[i:end_open + 1]))
            i = end_open + 1
            continue
        # Need to find matching close at depth 0
        depth = 1
        j = end_open + 1
        while j < n and depth > 0:
            if s[j] == '<':
                if s[j + 1] == '/':
                    # closing
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
                    # opening tag of any kind
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
print(f"Total top-level elements: {len(top)}")
for idx, (tag, content) in enumerate(top):
    label = tag
    # First 80 chars
    head = re.sub(r'\s+', ' ', content[:120])
    print(f"  [{idx}] <{tag}> len={len(content)} :: {head}")

# Save a structured breakdown
out_data = []
for idx, (tag, content) in enumerate(top):
    record = {'idx': idx, 'tag': tag, 'length': len(content)}
    # Find what's inside (for <g> layers)
    if tag == 'g':
        # Extract animateTransform begin/restart from this g's direct children only (not deep)
        # Look for the .sh filename
        sh_m = re.search(r'>([\w_]+\.sh)<', content)
        if sh_m:
            record['filename'] = sh_m.group(1)
        # Find click-to-burn pattern
        if 'click+0.3s' in content:
            record['burn_pattern'] = True
        if 'fill="freeze"' in content:
            record['has_freeze'] = True
        # Count direct text elements
        record['text_count'] = len(re.findall(r'<text\b', content))
        # Begin values
        record['begins'] = re.findall(r'begin="([^"]+)"', content)[:5]
    out_data.append(record)

with open(r'D:/Desktop/Inkforge/experiment/_svg_structure.json', 'w', encoding='utf-8') as f:
    json.dump(out_data, f, indent=2, ensure_ascii=False)
print("Saved structure analysis")

# Now check font-size distribution to understand text hierarchy
font_sizes = re.findall(r'font-size="(\d+)"', svg)
from collections import Counter
fs_counter = Counter(int(s) for s in font_sizes)
print(f"\nFont-size distribution: {dict(sorted(fs_counter.items()))}")

# Check fill color palette
fills = re.findall(r'fill="(#[0-9a-fA-F]+)"', svg)
fc = Counter(fills)
print(f"\nColor palette ({len(set(fills))} unique): {dict(fc.most_common())}")

# Check text colors
text_fills_with_size = re.findall(r'<text[^>]*fill="(#[0-9a-fA-F]+)"[^>]*font-size="(\d+)"', svg)
print(f"\nText (fill, size) pairs: {Counter(text_fills_with_size).most_common(10)}")
