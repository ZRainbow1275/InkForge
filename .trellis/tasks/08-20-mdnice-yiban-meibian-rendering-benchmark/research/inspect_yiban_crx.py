#!/usr/bin/env python3
"""Emit a source-free, reproducible receipt for the installed Yiban CRX."""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import struct
import sys
import zipfile
from pathlib import Path


SELECTED_FILES = (
    "content-script.js",
    "mpa-editor.js",
    "editor-bootstrap.js",
    "background-script.js",
    "data-poster.js",
)

PATTERNS = {
    "wechat_editor_api": (b"__MP_Editor_JSAPI__",),
    "insert_html_api": (b"mp_editor_insert_html",),
    "set_content_api": (b"mp_editor_set_content",),
    "markdown_root_marker": (b"data-mpa-md-root",),
    "markdown_apply_marker": (b"data-mpa-apply-md",),
    "markdown_single_style_marker": (b"data-mpa-md-single-style",),
    "markdown_key_marker": (b"data-mpa-md-key",),
    "markdown_content_marker": (b"data-mpa-md-content",),
    "dynamic_material_marker": (b"data-mpa-dynamic-material",),
    "dynamic_material_insert": (b"intertDynamicMaterial",),
    "svg_editor_message": (b"ybSvgEditorMessage",),
    "svg_editor_response": (b"svgEditorResponse",),
    "svg_authoring_path": (b"/h5/svg",),
    "one_click_svg_path": (b"/h5/one_click_svg",),
    "card_workspace_path": (b"/h5/card_workspace",),
    "copy_exec_command": (b'execCommand("copy")', b"execCommand('copy')"),
}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def crx_zip_offset(data: bytes) -> tuple[int, int]:
    if len(data) < 12 or data[:4] != b"Cr24":
        raise ValueError("not a CRX file")
    version = struct.unpack_from("<I", data, 4)[0]
    if version == 3:
        header_size = struct.unpack_from("<I", data, 8)[0]
        offset = 12 + header_size
    elif version == 2:
        if len(data) < 16:
            raise ValueError("truncated CRX2 header")
        public_key_size, signature_size = struct.unpack_from("<II", data, 8)
        offset = 16 + public_key_size + signature_size
    else:
        raise ValueError(f"unsupported CRX version: {version}")
    if offset >= len(data) or data[offset : offset + 2] != b"PK":
        raise ValueError("CRX ZIP payload is missing or truncated")
    return version, offset


def find_selected_entries(names: list[str]) -> dict[str, str]:
    selected: dict[str, str] = {}
    for basename in SELECTED_FILES:
        matches = [name for name in names if name == basename or name.endswith("/" + basename)]
        if len(matches) != 1:
            raise ValueError(f"expected one {basename!r}, found {len(matches)}")
        selected[basename] = matches[0]
    return selected


def offsets(haystack: bytes, needle: bytes) -> list[int]:
    found: list[int] = []
    start = 0
    while True:
        index = haystack.find(needle, start)
        if index < 0:
            return found
        found.append(index)
        start = index + len(needle)


def manifest_summary(manifest: dict[str, object]) -> dict[str, object]:
    scripts = []
    for item in manifest.get("content_scripts", []):
        if not isinstance(item, dict):
            continue
        scripts.append(
            {
                key: item[key]
                for key in ("matches", "js", "run_at", "all_frames")
                if key in item
            }
        )
    background = manifest.get("background", {})
    return {
        "manifest_version": manifest.get("manifest_version"),
        "version": manifest.get("version"),
        "minimum_chrome_version": manifest.get("minimum_chrome_version"),
        "permissions": manifest.get("permissions", []),
        "host_permissions": manifest.get("host_permissions", []),
        "background": background if isinstance(background, dict) else {},
        "content_scripts": scripts,
        "web_accessible_resource_groups": len(manifest.get("web_accessible_resources", [])),
    }


def inspect_crx(path: Path) -> dict[str, object]:
    raw = path.read_bytes()
    version, zip_offset = crx_zip_offset(raw)
    with zipfile.ZipFile(io.BytesIO(raw[zip_offset:])) as archive:
        names = archive.namelist()
        selected_entries = find_selected_entries(names)
        manifest = json.loads(archive.read("manifest.json").decode("utf-8"))
        selected_bytes = {
            basename: archive.read(entry) for basename, entry in selected_entries.items()
        }

    pattern_receipts: dict[str, object] = {}
    for label, needles in PATTERNS.items():
        per_file: dict[str, object] = {}
        total = 0
        for basename, data in selected_bytes.items():
            file_offsets = sorted(
                offset for needle in needles for offset in offsets(data, needle)
            )
            if file_offsets:
                total += len(file_offsets)
                per_file[basename] = {
                    "count": len(file_offsets),
                    "byte_offsets": file_offsets[:20],
                    "offsets_truncated": len(file_offsets) > 20,
                }
        pattern_receipts[label] = {"count": total, "files": per_file}

    return {
        "schema_version": 1,
        "tool": Path(__file__).name,
        "source": {
            "basename": path.name,
            "bytes": len(raw),
            "sha256": sha256(raw),
            "crx_version": version,
            "zip_payload_offset": zip_offset,
            "zip_entry_count": len(names),
        },
        "manifest": manifest_summary(manifest),
        "selected_files": {
            basename: {"archive_path": selected_entries[basename], "bytes": len(data), "sha256": sha256(data)}
            for basename, data in selected_bytes.items()
        },
        "pattern_index": pattern_receipts,
        "privacy": {
            "source_code_persisted": False,
            "snippets_persisted": False,
            "full_source_path_persisted": False,
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("crx", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        receipt = inspect_crx(args.crx.resolve(strict=True))
    except (OSError, ValueError, KeyError, json.JSONDecodeError, zipfile.BadZipFile) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    rendered = json.dumps(receipt, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.write_text(rendered, encoding="utf-8")
    else:
        sys.stdout.write(rendered)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
