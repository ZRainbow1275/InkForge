#!/usr/bin/env python3
"""Assert redacted wechat-draft-preflight/v1 and wechat-fidelity-receipt/v1."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

HEX40 = re.compile(r"^[a-f0-9]{40}$")
HEX64 = re.compile(r"^[a-f0-9]{64}$")
IDENTIFIER = re.compile(r"^[a-z][a-z0-9-]{0,63}$")
COUNT_KEYS = {"draftCreates", "articleImageUploads", "permanentCoverUploads"}
PINNED_CHOICES = {
    "wechat-classic-inline": {"presetId": "report", "enableSvgModules": False, "svgPlan": "disabled"},
    "wechat-flagship-kiln": {"presetId": "flagship-kiln", "enableSvgModules": True, "svgPlan": "application-default"},
    "wechat-flagship-kiln-paste-safe": {"presetId": "flagship-kiln-paste-safe", "enableSvgModules": True, "svgPlan": "application-default"},
}
PREFLIGHT_REASON_CODES = {
    "metadata-invalid", "content-invalid", "dom-unavailable", "article-image-invalid",
    "cover-handle-invalid", "cover-image-missing", "cover-image-invalid",
}
SEMANTIC_NODE_COUNT_KEYS = {
    "elements", "textNodes", "headings", "paragraphs", "blockquotes", "lists",
    "listItems", "tables", "codeBlocks", "formulas", "images", "links", "svgModules",
}
SEMANTIC_TAG_NAMES = {
    "a", "animate", "animatetransform", "article", "aside", "blockquote", "br", "circle",
    "cite", "code", "col", "colgroup", "del", "details", "div", "ellipse", "em", "figcaption", "figure", "footer", "g", "h1",
    "h2", "h3", "h4", "h5", "h6", "header", "hr", "img", "ins", "li", "line", "mark",
    "nav", "ol", "p", "path", "polygon", "polyline", "pre", "rect", "s", "section",
    "set", "span", "strong", "sub", "summary", "sup", "svg", "table", "tbody", "td", "text", "th",
    "thead", "tr", "tspan", "u", "ul",
}
SEMANTIC_ROLE_NAMES = {
    "article", "banner", "button", "caption", "code", "contentinfo", "cover", "divider",
    "doc-endnotes", "doc-noteref", "endmark", "figure", "formula", "heading", "img", "link", "list", "listitem", "main",
    "navigation", "note", "paragraph", "presentation", "quote", "region", "separator",
    "source-owned-cover", "table", "term", "textbox",
}
SEMANTIC_ATTRIBUTE_NAMES = {
    "align", "alt", "aria-hidden", "aria-label", "checked", "class", "colspan", "height", "href", "id", "role",
    "rowspan", "src", "start", "title", "width",
    "data-citation-", "data-citation-id", "data-citation-keys", "data-citation-missing",
    "data-citation-raw", "data-citation-style", "data-emoji-name", "data-footnote-id",
    "data-footnote-index", "data-footnote-ref-index", "data-highlight-color", "data-ink-block",
    "data-ink-module", "data-ink-role", "data-ink-svg", "data-inkforge-latex",
    "data-inkforge-role", "data-wechat-clamp", "data-wikilink-anchor", "data-wikilink-resolved",
    "data-wikilink-target", "lang", "pointer-events", "xmlns",
    "viewbox", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry",
    "d", "points", "fill", "stroke", "stroke-width", "stroke-linecap",
    "stroke-linejoin", "stroke-dasharray", "opacity", "fill-opacity", "stroke-opacity",
    "font-size", "font-family", "font-weight", "letter-spacing", "text-anchor",
    "dominant-baseline", "transform", "attributename", "attributetype", "type", "begin",
    "dur", "from", "to", "values", "keytimes", "keysplines", "calcmode",
    "repeatcount", "restart",
}
SEMANTIC_STYLE_PROPERTY_NAMES = {
    "-moz-osx-font-smoothing", "-webkit-font-smoothing", "-webkit-overflow-scrolling",
    "-webkit-user-select", "background", "background-attachment", "background-clip",
    "background-color", "background-image", "background-origin", "background-position",
    "background-position-x", "background-position-y", "background-repeat", "background-size",
    "border", "border-bottom",
    "border-bottom-color", "border-bottom-left-radius", "border-bottom-right-radius",
    "border-bottom-style", "border-bottom-width", "border-color", "border-image-outset",
    "border-image-repeat", "border-image-slice", "border-image-source", "border-image-width", "border-left",
    "border-left-color", "border-left-style", "border-left-width", "border-radius", "border-right",
    "border-right-color", "border-right-style", "border-right-width", "border-style", "border-top",
    "border-top-color", "border-top-left-radius", "border-top-right-radius", "border-top-style",
    "border-top-width", "border-width", "border-collapse", "box-shadow", "box-sizing", "clear", "color",
    "counter-increment", "counter-reset", "display", "float", "font-family", "font-feature-settings",
    "font-size", "font-style", "font-variant-numeric", "font-weight",
    "height", "left", "line-break",
    "letter-spacing", "line-height", "margin", "margin-bottom", "margin-left", "margin-right",
    "margin-top", "max-height", "max-width", "min-height", "min-width", "opacity", "overflow",
    "overflow-wrap", "overflow-x", "padding", "padding-bottom", "padding-left", "padding-right",
    "padding-top", "position", "scroll-snap-align", "scroll-snap-type", "text-align",
    "text-decoration", "text-indent", "text-justify", "text-overflow", "text-shadow",
    "text-transform", "top", "transform", "vertical-align", "white-space", "width", "word-break",
    "word-wrap", "z-index", "list-style",
}
FORBIDDEN_FINDING_CODES = {
    "dangerous-url", "event-handler", "forbidden-attribute", "forbidden-tag", "literal-backtick",
    "literal-markdown", "literal-strong-marker", "missing-blockquote", "missing-code-block",
    "missing-formula", "missing-heading", "missing-image", "missing-link", "missing-list",
    "missing-list-item", "missing-paragraph", "missing-svg-module", "missing-table", "unsafe-svg",
    "unexpected-external-image",
}
VENDOR_FINDING_CODES = {
    "135-residue", "meibian-residue", "mdnice-residue", "vendor-attribute", "vendor-class",
    "vendor-id", "vendor-url", "xiumi-residue", "yiban-residue",
}
REPOSITORY_ROOT = Path(__file__).resolve().parents[4]
CORPUS_REF = ".trellis/tasks/08-20-mdnice-yiban-meibian-rendering-benchmark/research/wechat-fidelity-corpus.md"
PREFLIGHT_REF = ".trellis/tasks/08-20-mdnice-yiban-meibian-rendering-benchmark/research/wechat-draft-preflight.json"
PHASES = [
    "planned", "approved", "article-images-uploaded", "cover-uploaded",
    "draft-acknowledged", "editor-applied", "host-saved-readback",
    "phone-previewed", "cover-accepted", "cleanup-confirmed",
]
SENSITIVE_KEYS = {
    "accountid", "appid", "appsecret", "browserprofile", "contenthtml",
    "contentsourceurl", "cookie", "coverhandle", "har", "html", "mediaid",
    "rawdom", "remoteurl", "screenshotpath", "token", "url",
}
SENSITIVE_KEY_PARTS = {
    "authorization", "browserprofile", "contenthtml", "contentsourceurl", "cookie",
    "credential", "mediaid", "password", "rawbody", "rawdom", "rawtext",
    "remoteurl", "screenshotpath", "secret", "token", "bodytext",
}


class Invalid(ValueError):
    pass


def need(ok: bool, message: str) -> None:
    if not ok:
        raise Invalid(message)


def obj(value: Any, where: str, keys: set[str] | None = None) -> dict[str, Any]:
    need(isinstance(value, dict), f"{where} must be an object")
    if keys is not None:
        need(set(value) == keys, f"{where} keys differ: expected {sorted(keys)}, got {sorted(value)}")
    return value


def sha(value: Any, where: str, prefixed: bool = False) -> str:
    need(isinstance(value, str), f"{where} must be a string")
    digest = value.removeprefix("sha256:") if prefixed else value
    need(bool(HEX64.fullmatch(digest)), f"{where} must be SHA-256")
    need(not prefixed or value.startswith("sha256:"), f"{where} requires sha256: prefix")
    return digest


def count(value: Any, where: str) -> int:
    need(isinstance(value, int) and not isinstance(value, bool) and value >= 0, f"{where} must be a non-negative integer")
    return value


def canonical_fingerprint(summary: Any) -> str:
    encoded = json.dumps(summary, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()


def git_output(*args: str) -> str:
    result = subprocess.run(
        ["git", *args], cwd=REPOSITORY_ROOT, capture_output=True, text=True,
        encoding="utf-8", errors="strict", check=False,
    )
    need(result.returncode == 0, f"git {' '.join(args)} failed")
    return result.stdout.strip()


def git_bytes(*args: str) -> bytes:
    result = subprocess.run(
        ["git", *args], cwd=REPOSITORY_ROOT, capture_output=True, check=False,
    )
    need(result.returncode == 0, f"git {' '.join(args)} failed")
    return result.stdout


def verify_preflight_provenance(report: dict[str, Any], corpus: dict[str, Any]) -> None:
    need(
        not git_output("status", "--porcelain=v1", "--untracked-files=all"),
        "preflight verification requires a clean Git worktree",
    )
    need(corpus["ref"] == CORPUS_REF, "$.corpus.ref must be the task-owned fixture")
    commit = report["commit"]
    git_output("cat-file", "-e", f"{commit}^{{commit}}")
    ancestor = subprocess.run(
        ["git", "merge-base", "--is-ancestor", commit, "HEAD"],
        cwd=REPOSITORY_ROOT, capture_output=True, check=False,
    )
    need(ancestor.returncode == 0, "$.commit must be an ancestor of the current HEAD")
    tree_entry = git_output("ls-tree", commit, "--", CORPUS_REF)
    need(tree_entry.startswith("100644 blob ") and tree_entry.endswith(f"\t{CORPUS_REF}"), "task corpus must be a regular file in $.commit")
    payload = git_bytes("show", f"{commit}:{CORPUS_REF}")
    need(corpus["bytes"] == len(payload), "$.corpus.bytes does not match the bound Git fixture")
    need(corpus["sha256"] == hashlib.sha256(payload).hexdigest(), "$.corpus.sha256 does not match the bound Git fixture")
    try:
        text = payload.decode("utf-8")
    except UnicodeDecodeError as error:
        raise Invalid("bound task corpus is not UTF-8") from error
    figure = re.findall(
        r"<figure\b[^>]*\bdata-inkforge-role=[\"']source-owned-cover[\"'][^>]*>(.*?)</figure>",
        text, flags=re.IGNORECASE | re.DOTALL,
    )
    need(len(figure) == 1, "task corpus must contain exactly one source-owned cover role")
    encoded = re.findall(r"<img\b[^>]*\bsrc=[\"']data:image/png;base64,([A-Za-z0-9+/=]+)[\"']", figure[0], flags=re.IGNORECASE)
    need(len(encoded) == 1, "source-owned cover role must contain exactly one inline PNG")
    try:
        image_bytes = base64.b64decode(encoded[0], validate=True)
    except ValueError as error:
        raise Invalid("source-owned cover PNG is not valid base64") from error
    need(corpus["sourceOwnedImageSha256"] == hashlib.sha256(image_bytes).hexdigest(), "$.corpus.sourceOwnedImageSha256 does not match the fixture")


def string_list(value: Any, where: str, *, allowed: set[str] | None = None) -> list[str]:
    need(isinstance(value, list), f"{where} must be an array")
    need(all(isinstance(item, str) and bool(IDENTIFIER.fullmatch(item)) for item in value), f"{where} has invalid identifiers")
    need(len(value) == len(set(value)) or allowed is None, f"{where} has duplicate identifiers")
    if allowed is not None:
        need(set(value) <= allowed, f"{where} has unsupported identifiers")
    return value


def verify_choice_options(choice_id: Any, options: Any, where: str, preset_id: Any | None = None) -> str:
    need(isinstance(choice_id, str) and choice_id in PINNED_CHOICES, f"{where}.choiceId is not pinned")
    expected = PINNED_CHOICES[choice_id]
    if preset_id is not None:
        need(preset_id == expected["presetId"], f"{where}.presetId mismatch")
    parsed = obj(options, f"{where}.options", {"enableSvgModules", "svgPlan"})
    need(parsed == {"enableSvgModules": expected["enableSvgModules"], "svgPlan": expected["svgPlan"]}, f"{where}.options mismatch")
    return choice_id


def verify_finding_list(value: Any, where: str, allowed: set[str]) -> None:
    need(isinstance(value, list), f"{where} must be an array")
    codes: list[str] = []
    for index, raw in enumerate(value):
        item = obj(raw, f"{where}[{index}]", {"code", "count"})
        need(item["code"] in allowed, f"{where}[{index}].code is not allowlisted")
        need(count(item["count"], f"{where}[{index}].count") > 0, f"{where}[{index}].count must be positive")
        codes.append(item["code"])
    need(codes == sorted(set(codes)), f"{where} must be unique and sorted by code")


def verify_semantic_names(value: Any, where: str) -> None:
    names = obj(value, where, {"tags", "roles", "attributes", "styleProperties"})
    for key, allowed in {
        "tags": SEMANTIC_TAG_NAMES,
        "roles": SEMANTIC_ROLE_NAMES,
        "attributes": SEMANTIC_ATTRIBUTE_NAMES,
        "styleProperties": SEMANTIC_STYLE_PROPERTY_NAMES,
    }.items():
        items = names[key]
        need(isinstance(items, list), f"{where}.{key} must be an array")
        need(key == "roles" or bool(items), f"{where}.{key} must be a non-empty array")
        need(all(isinstance(item, str) and item in allowed for item in items), f"{where}.{key} contains an unsupported name")
        need(items == sorted(set(items)), f"{where}.{key} must be unique and sorted")


def verify_semantic_summary(value: Any, where: str) -> dict[str, Any]:
    summary = obj(value, where, {
        "tagOrder", "roleOrder", "textSha256", "semanticAttributes", "inlineStyles",
        "nodeCounts", "excludedEditorChromeCount", "excludedHostIdCount",
        "forbiddenFindings", "vendorResidueFindings",
    })
    tags = string_list(summary["tagOrder"], f"{where}.tagOrder")
    roles = string_list(summary["roleOrder"], f"{where}.roleOrder")
    need(set(tags) <= SEMANTIC_TAG_NAMES, f"{where}.tagOrder contains a non-publish tag")
    need(set(roles) <= SEMANTIC_ROLE_NAMES, f"{where}.roleOrder contains an unknown role")
    sha(summary["textSha256"], f"{where}.textSha256")
    counts = obj(summary["nodeCounts"], f"{where}.nodeCounts", SEMANTIC_NODE_COUNT_KEYS)
    for key, value in counts.items():
        count(value, f"{where}.nodeCounts.{key}")
    need(counts["elements"] == len(tags), f"{where}.tagOrder/nodeCounts.elements mismatch")
    for key, tag_names in {
        "headings": {"h1", "h2", "h3", "h4", "h5", "h6"},
        "paragraphs": {"p"}, "blockquotes": {"blockquote"}, "lists": {"ol", "ul"},
        "listItems": {"li"}, "tables": {"table"}, "codeBlocks": {"pre"},
        "images": {"img"}, "links": {"a"}, "svgModules": {"svg"},
    }.items():
        need(counts[key] == sum(tag in tag_names for tag in tags), f"{where}.tagOrder/nodeCounts.{key} mismatch")
    need(len(roles) <= counts["elements"], f"{where}.roleOrder exceeds element count")
    count(summary["excludedEditorChromeCount"], f"{where}.excludedEditorChromeCount")
    count(summary["excludedHostIdCount"], f"{where}.excludedHostIdCount")

    attributes = summary["semanticAttributes"]
    need(isinstance(attributes, list), f"{where}.semanticAttributes must be an array")
    attribute_keys: list[tuple[int, str]] = []
    for index, raw in enumerate(attributes):
        item = obj(raw, f"{where}.semanticAttributes[{index}]", {"nodeIndex", "name", "valueSha256"})
        node_index = count(item["nodeIndex"], f"{where}.semanticAttributes[{index}].nodeIndex")
        need(node_index < counts["elements"], f"{where}.semanticAttributes[{index}].nodeIndex is out of range")
        need(
            isinstance(item["name"], str)
            and item["name"] == item["name"].lower()
            and item["name"] in SEMANTIC_ATTRIBUTE_NAMES,
            f"{where}.semanticAttributes[{index}].name is not a normalized allowlisted name",
        )
        sha(item["valueSha256"], f"{where}.semanticAttributes[{index}].valueSha256")
        attribute_keys.append((node_index, item["name"]))
    need(attribute_keys == sorted(set(attribute_keys)), f"{where}.semanticAttributes must be unique and sorted")

    styles = summary["inlineStyles"]
    need(isinstance(styles, list), f"{where}.inlineStyles must be an array")
    style_nodes: list[int] = []
    for index, raw in enumerate(styles):
        item = obj(raw, f"{where}.inlineStyles[{index}]", {"nodeIndex", "properties"})
        node_index = count(item["nodeIndex"], f"{where}.inlineStyles[{index}].nodeIndex")
        need(node_index < counts["elements"], f"{where}.inlineStyles[{index}].nodeIndex is out of range")
        style_nodes.append(node_index)
        properties = item["properties"]
        need(isinstance(properties, list) and properties, f"{where}.inlineStyles[{index}].properties must be non-empty")
        names: list[str] = []
        for property_index, raw_property in enumerate(properties):
            prop = obj(raw_property, f"{where}.inlineStyles[{index}].properties[{property_index}]", {"name", "valueSha256"})
            need(prop["name"] in SEMANTIC_STYLE_PROPERTY_NAMES, f"{where}.inlineStyles[{index}].properties[{property_index}].name is not allowlisted")
            sha(prop["valueSha256"], f"{where}.inlineStyles[{index}].properties[{property_index}].valueSha256")
            names.append(prop["name"])
        need(names == sorted(set(names)), f"{where}.inlineStyles[{index}].properties must be unique and sorted")
    need(style_nodes == sorted(set(style_nodes)), f"{where}.inlineStyles must be unique and sorted by nodeIndex")

    verify_finding_list(summary["forbiddenFindings"], f"{where}.forbiddenFindings", FORBIDDEN_FINDING_CODES)
    verify_finding_list(summary["vendorResidueFindings"], f"{where}.vendorResidueFindings", VENDOR_FINDING_CODES)
    return summary


def no_secrets(value: Any, where: str = "$") -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            normalized = re.sub(r"[^a-z0-9]", "", key.lower())
            need(
                normalized not in SENSITIVE_KEYS and not any(part in normalized for part in SENSITIVE_KEY_PARTS),
                f"{where}.{key} is forbidden",
            )
            no_secrets(child, f"{where}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            no_secrets(child, f"{where}[{index}]")
    elif isinstance(value, str):
        lower = value.lower()
        need("data:image" not in lower and "wechat_app_secret" not in lower, f"{where} contains sensitive payload")
        need(not re.search(r"(?:https?|blob|file|inkforge-asset)://", lower), f"{where} contains a raw URL")


def strict_json_loads(payload: str) -> Any:
    def unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for key, value in pairs:
            need(key not in result, f"duplicate JSON key: {key}")
            result[key] = value
        return result

    def reject_constant(value: str) -> None:
        raise Invalid(f"non-standard JSON constant: {value}")

    return json.loads(payload, object_pairs_hook=unique_object, parse_constant=reject_constant)


def verify_binding(value: Any, where: str, schema: str) -> dict[str, Any]:
    wrapper = obj(value, where, {"schemaVersion", "summary", "fingerprint"})
    need(wrapper["schemaVersion"] == schema, f"{where}.schemaVersion mismatch")
    summary = verify_semantic_summary(wrapper["summary"], f"{where}.summary")
    sha(wrapper["fingerprint"], f"{where}.fingerprint")
    need(wrapper["fingerprint"] == canonical_fingerprint(summary), f"{where}.fingerprint mismatch")
    return summary


def comparable_semantics(summary: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value for key, value in summary.items()
        if key not in {"excludedEditorChromeCount", "excludedHostIdCount"}
    }


def verify_preflight(report: dict[str, Any]) -> None:
    obj(report, "$", {"schemaVersion", "status", "notProof", "corpus", "commit", "requestedChoices", "cases", "boundary"})
    need(report["schemaVersion"] == "wechat-draft-preflight/v1", "$.schemaVersion mismatch")
    need(report["status"] == "complete" and report["notProof"] is True, "report must be complete local evidence")
    need(isinstance(report["commit"], str) and bool(HEX40.fullmatch(report["commit"])), "$.commit is invalid")

    corpus = obj(report["corpus"], "$.corpus", {"ref", "bytes", "sha256", "sourceOwnedImageSha256"})
    need(isinstance(corpus["ref"], str) and corpus["ref"] and ".." not in Path(corpus["ref"]).parts, "$.corpus.ref is invalid")
    need(count(corpus["bytes"], "$.corpus.bytes") > 0, "$.corpus.bytes must be positive")
    sha(corpus["sha256"], "$.corpus.sha256")
    sha(corpus["sourceOwnedImageSha256"], "$.corpus.sourceOwnedImageSha256")
    verify_preflight_provenance(report, corpus)

    requested, cases = report["requestedChoices"], report["cases"]
    need(requested == list(PINNED_CHOICES), "$.requestedChoices must equal the pinned three-choice matrix")
    need(isinstance(cases, list) and len(cases) == len(requested), "$.cases is incomplete")
    for index, (choice_id, raw_case) in enumerate(zip(requested, cases, strict=True)):
        where = f"$.cases[{index}]"
        case = obj(raw_case, where, {
            "caseId", "choiceId", "presetId", "options", "artifactFingerprint",
            "eligibility", "reasonCodes", "inputFingerprint", "planFingerprint",
            "semanticNames", "limits", "images", "cover", "unverifiedRemote", "sideEffectUpperBounds",
        })
        need(case["choiceId"] == choice_id, f"{where}.choiceId mismatch")
        verify_choice_options(case["choiceId"], case["options"], where, case["presetId"])
        need(case["caseId"] == f"{choice_id}:{corpus['sha256'][:12]}", f"{where}.caseId mismatch")
        sha(case["artifactFingerprint"], f"{where}.artifactFingerprint", True)
        sha(case["inputFingerprint"], f"{where}.inputFingerprint")
        sha(case["planFingerprint"], f"{where}.planFingerprint")
        verify_semantic_names(case["semanticNames"], f"{where}.semanticNames")
        reasons = case["reasonCodes"]
        need(isinstance(reasons, list) and len(reasons) == len(set(reasons)), f"{where}.reasonCodes is invalid")
        need(set(reasons) <= PREFLIGHT_REASON_CODES, f"{where}.reasonCodes has unsupported values")
        need(case["eligibility"] in {"official-draft-eligible", "official-draft-ineligible"}, f"{where}.eligibility is invalid")
        need(bool(reasons) == (case["eligibility"] == "official-draft-ineligible"), f"{where} eligibility/reasons disagree")

        limits = obj(case["limits"], f"{where}.limits", {
            "titleChars", "titleMaxChars", "contentChars", "contentMaxCharsExclusive",
            "contentBytes", "contentMaxBytesExclusive",
        })
        for key, value in limits.items():
            count(value, f"{where}.limits.{key}")
        need(limits["titleMaxChars"] == 32, f"{where}.limits.titleMaxChars mismatch")
        need(limits["contentMaxCharsExclusive"] == 20_000, f"{where}.limits.contentMaxCharsExclusive mismatch")
        need(limits["contentMaxBytesExclusive"] == 1024 * 1024, f"{where}.limits.contentMaxBytesExclusive mismatch")
        need(limits["titleChars"] > 0 and limits["contentChars"] > 0, f"{where} fixed corpus title/content must be non-empty")
        need(limits["contentBytes"] >= limits["contentChars"], f"{where}.limits content bytes/chars are impossible")
        title_over = limits["titleChars"] > limits["titleMaxChars"]
        content_over = (
            limits["contentChars"] >= limits["contentMaxCharsExclusive"]
            or limits["contentBytes"] >= limits["contentMaxBytesExclusive"]
        )
        expected_reasons = {
            *({"metadata-invalid"} if title_over else set()),
            *({"content-invalid"} if content_over else set()),
        }
        need(set(reasons) == expected_reasons, f"{where}.reasonCodes do not match the fixed corpus limits/media state")
        images = obj(case["images"], f"{where}.images", {
            "uniqueNonWechatImageCount", "uniqueWechatHostedImageCount",
            "preparedArticleUploadCount", "preparedLocalArticleSourceCount",
        })
        for key, value in images.items():
            count(value, f"{where}.images.{key}")
        need(images["preparedLocalArticleSourceCount"] <= images["preparedArticleUploadCount"] <= images["uniqueNonWechatImageCount"], f"{where} image counts are impossible")
        need(images == {
            "uniqueNonWechatImageCount": 1,
            "uniqueWechatHostedImageCount": 0,
            "preparedArticleUploadCount": 1,
            "preparedLocalArticleSourceCount": 1,
        }, f"{where} does not match the single source-owned image corpus")

        cover = obj(case["cover"], f"{where}.cover", {"state", "remoteValidityUnverified", "sourceOwnedImageSha256", "coverIntent"})
        sha(cover["sourceOwnedImageSha256"], f"{where}.cover.sourceOwnedImageSha256")
        need(cover["sourceOwnedImageSha256"] == corpus["sourceOwnedImageSha256"] and cover["coverIntent"] is True, f"{where} cover binding mismatch")
        need(cover["state"] == "upload-required" and cover["remoteValidityUnverified"] is False, f"{where}.cover must bind the local source-owned upload")
        bounds = obj(case["sideEffectUpperBounds"], f"{where}.sideEffectUpperBounds", COUNT_KEYS)
        for key, value in bounds.items():
            count(value, f"{where}.sideEffectUpperBounds.{key}")
        need(bounds["draftCreates"] == 1, f"{where} must bound one draft create")
        need(bounds["articleImageUploads"] == images["preparedArticleUploadCount"], f"{where} article upload bound mismatch")
        need(bounds["permanentCoverUploads"] == (1 if cover["state"] == "upload-required" else 0), f"{where} cover upload bound mismatch")
        remote = obj(case["unverifiedRemote"], f"{where}.unverifiedRemote", {
            "httpSourceReachability", "httpSourceMimeTruth", "coverHandleOwnership",
        })
        need(all(value is False for value in remote.values()), f"{where}.unverifiedRemote must be false for the local corpus")

    boundary = obj(report["boundary"], "$.boundary", {
        "noWechatWrite", "noTauriInvoke", "requiresSeparateExternalApproval", "doesNotClaimWechatReadback",
    })
    need(all(value is True for value in boundary.values()), "$.boundary flags must all be true")
    no_secrets(report)


def verify_receipt(report: dict[str, Any], preflight: dict[str, Any]) -> None:
    verify_preflight(preflight)
    obj(report, "$", {"schemaVersion", "status", "cases"})
    need(report["schemaVersion"] == "wechat-fidelity-receipt/v1", "$.schemaVersion mismatch")
    need(report["status"] in {"complete", "blocked"}, "$.status is invalid")
    need(isinstance(report["cases"], list) and report["cases"], "$.cases must be non-empty")
    seen_case_ids: set[str] = set()
    seen_matrix: set[tuple[str, str]] = set()
    batch_corpus: str | None = None
    batch_commit: str | None = None
    case_completion: list[bool] = []
    preflight_cases = {case["choiceId"]: case for case in preflight["cases"]}
    eligible_choices = {
        choice_id for choice_id, case in preflight_cases.items()
        if case["eligibility"] == "official-draft-eligible"
    }
    for index, raw_case in enumerate(report["cases"]):
        where = f"$.cases[{index}]"
        case = obj(raw_case, where, {
            "caseId", "corpusSha256", "boundCommit", "choiceId", "options", "artifactFingerprint",
            "mediaBindingSha256", "channel", "readbacks", "phoneState", "darkModeState",
            "coverState", "draftCleanupState",
        })
        corpus_sha = sha(case["corpusSha256"], f"{where}.corpusSha256")
        sha(case["mediaBindingSha256"], f"{where}.mediaBindingSha256")
        sha(case["artifactFingerprint"], f"{where}.artifactFingerprint", True)
        need(isinstance(case["boundCommit"], str) and bool(HEX40.fullmatch(case["boundCommit"])), f"{where}.boundCommit is invalid")
        choice_id = verify_choice_options(case["choiceId"], case["options"], where)
        preflight_case = preflight_cases[choice_id]
        need(corpus_sha == preflight["corpus"]["sha256"], f"{where}.corpusSha256 does not match the verified preflight")
        need(case["boundCommit"] == preflight["commit"], f"{where}.boundCommit does not match the verified preflight")
        need(case["artifactFingerprint"] == preflight_case["artifactFingerprint"], f"{where}.artifactFingerprint does not match the verified preflight")
        batch_corpus = batch_corpus or corpus_sha
        batch_commit = batch_commit or case["boundCommit"]
        need(corpus_sha == batch_corpus and case["boundCommit"] == batch_commit, f"{where} batch identity mismatch")

        channel = obj(case["channel"], f"{where}.channel", {
            "kind", "inputFingerprint", "planFingerprint", "transientPayloadDigest",
            "normalizedPayload", "accountTarget",
            "approvedUpperBounds", "actualCounts", "lastConfirmedPhase", "residualState",
        })
        kind = channel["kind"]
        need(kind in {"rich-clipboard", "official-draft"}, f"{where}.channel.kind is invalid")
        if kind == "official-draft":
            sha(channel["inputFingerprint"], f"{where}.channel.inputFingerprint")
            sha(channel["planFingerprint"], f"{where}.channel.planFingerprint")
        else:
            need(
                channel["inputFingerprint"] is None and channel["planFingerprint"] is None,
                f"{where} clipboard channel cannot claim a draft publish plan",
            )
        need(case["caseId"] == f"{choice_id}:{corpus_sha[:12]}:{kind}", f"{where}.caseId mismatch")
        need(case["caseId"] not in seen_case_ids and (choice_id, kind) not in seen_matrix, f"{where} duplicates a batch case")
        seen_case_ids.add(case["caseId"])
        seen_matrix.add((choice_id, kind))
        sha(channel["transientPayloadDigest"], f"{where}.channel.transientPayloadDigest")
        payload_summary = verify_binding(
            channel["normalizedPayload"], f"{where}.channel.normalizedPayload", "wechat-semantic-payload/v1",
        )
        need(payload_summary["nodeCounts"]["elements"] > 0, f"{where}.channel.normalizedPayload is empty")
        account = obj(channel["accountTarget"], f"{where}.channel.accountTarget", {"matched", "method"})
        need(isinstance(account["matched"], bool) and account["method"] == "visible-editor-confirmation", f"{where}.channel.accountTarget is invalid")
        phase = channel["lastConfirmedPhase"]
        need(phase in PHASES, f"{where}.channel.lastConfirmedPhase is invalid")
        need(channel["residualState"] in {"no-new-media", "residual-external-media", "residual-external-media-unknown"}, f"{where}.channel.residualState is invalid")
        approved = obj(channel["approvedUpperBounds"], f"{where}.channel.approvedUpperBounds", COUNT_KEYS)
        actual = obj(channel["actualCounts"], f"{where}.channel.actualCounts", COUNT_KEYS)
        if kind == "official-draft":
            need(choice_id in eligible_choices, f"{where} official draft is ineligible in the verified preflight")
            need(approved["draftCreates"] == 1, f"{where} official draft approval must bound one draft")
            for key in {"articleImageUploads", "permanentCoverUploads"}:
                need(
                    count(approved[key], f"{where}.channel.approvedUpperBounds.{key}")
                    <= preflight_case["sideEffectUpperBounds"][key],
                    f"{where} official draft approval exceeds the verified candidate maximum",
                )
        else:
            need(approved == {
                "draftCreates": 1,
                "articleImageUploads": 0,
                "permanentCoverUploads": 0,
            }, f"{where} clipboard approval must bound one disposable draft and no direct API upload")
            need(
                actual["articleImageUploads"] == 0 and actual["permanentCoverUploads"] == 0,
                f"{where} clipboard channel cannot claim direct API uploads",
            )
        unknown_keys: set[str] = set()
        for key in COUNT_KEYS:
            upper = count(approved[key], f"{where}.channel.approvedUpperBounds.{key}")
            if actual[key] == "unknown":
                unknown_keys.add(key)
            else:
                need(count(actual[key], f"{where}.channel.actualCounts.{key}") <= upper, f"{where}.{key} exceeds approval")
        has_unknown = bool(unknown_keys)
        if has_unknown:
            need(channel["residualState"] == "residual-external-media-unknown", f"{where} unknown counts require unknown residual state")
        else:
            need(channel["residualState"] != "residual-external-media-unknown", f"{where} known counts cannot claim unknown residual state")
            if kind == "official-draft":
                uploads = actual["articleImageUploads"] + actual["permanentCoverUploads"]
                expected_residual = "residual-external-media" if uploads > 0 else "no-new-media"
                need(channel["residualState"] == expected_residual, f"{where} residual state disagrees with observable uploads")
        if not account["matched"]:
            need(report["status"] == "blocked" and phase == "planned" and all(value == 0 for value in actual.values()), f"{where} unmatched target cannot advance")
        phase_index = PHASES.index(phase)
        for key, required_phase in {
            "articleImageUploads": "article-images-uploaded",
            "permanentCoverUploads": "cover-uploaded",
            "draftCreates": "draft-acknowledged",
        }.items():
            if isinstance(actual[key], int) and actual[key] > 0:
                need(phase_index >= PHASES.index(required_phase), f"{where}.{key} precedes its confirmed phase")

        readbacks = obj(case["readbacks"], f"{where}.readbacks", {"applied", "saved"})
        applied = verify_binding(readbacks["applied"], f"{where}.readbacks.applied", "wechat-semantic-readback/v1")
        saved = verify_binding(readbacks["saved"], f"{where}.readbacks.saved", "wechat-semantic-readback/v1")
        applied_elements = applied["nodeCounts"]["elements"]
        saved_elements = saved["nodeCounts"]["elements"]
        if phase_index < PHASES.index("editor-applied"):
            need(applied_elements == 0 and saved_elements == 0, f"{where} readback precedes editor application")
        else:
            need(applied_elements > 0, f"{where} editor-applied phase lacks applied readback")
        if phase_index < PHASES.index("host-saved-readback"):
            need(saved_elements == 0, f"{where} saved readback precedes host save")
        else:
            need(saved_elements > 0, f"{where} host-saved phase lacks saved readback")
        need(case["phoneState"] in {"not-run", "blocked", "failed", "verified"}, f"{where}.phoneState is invalid")
        need(case["darkModeState"] in {"not-run", "blocked", "failed", "verified"}, f"{where}.darkModeState is invalid")
        need(case["coverState"] in {"not-run", "blocked", "failed", "accepted"}, f"{where}.coverState is invalid")
        need(case["draftCleanupState"] in {"not-run", "pending", "failed", "confirmed-absent"}, f"{where}.draftCleanupState is invalid")
        if case["phoneState"] == "verified" or case["darkModeState"] == "verified":
            need(phase_index >= PHASES.index("phone-previewed"), f"{where} phone/Dark Mode state precedes phone preview")
        if case["coverState"] == "accepted":
            need(phase_index >= PHASES.index("cover-accepted"), f"{where} cover state precedes cover acceptance")
        need(
            (case["draftCleanupState"] == "confirmed-absent") == (phase == "cleanup-confirmed"),
            f"{where} cleanup state/phase disagree",
        )
        final_states = (
            case["phoneState"], case["darkModeState"], case["coverState"], case["draftCleanupState"],
        ) == ("verified", "verified", "accepted", "confirmed-absent")
        complete_case = not has_unknown and account["matched"] and phase == "cleanup-confirmed" and final_states
        if complete_case:
            semantic_layers = [payload_summary, applied, saved]
            need(
                all(not summary["forbiddenFindings"] and not summary["vendorResidueFindings"] for summary in semantic_layers),
                f"{where} completed case contains forbidden or vendor-residue findings",
            )
            need(
                comparable_semantics(payload_summary) == comparable_semantics(applied)
                == comparable_semantics(saved),
                f"{where} completed case has a payload/applied/saved semantic difference",
            )
        if complete_case and kind == "official-draft":
            need(actual == approved, f"{where} completed official draft counts differ from its exact approved plan")
        if complete_case and kind == "rich-clipboard":
            need(actual["draftCreates"] == 1, f"{where} completed clipboard case lacks one disposable draft")
        case_completion.append(complete_case)
        if report["status"] == "complete":
            need(complete_case, f"{where} complete receipt has unresolved state")
    required_clipboard = {(choice_id, "rich-clipboard") for choice_id in PINNED_CHOICES}
    completed_batch = (
        all(case_completion)
        and required_clipboard <= seen_matrix
        and any(kind == "official-draft" for _, kind in seen_matrix)
    )
    if report["status"] == "blocked":
        need(not completed_batch, "blocked receipt already satisfies the complete batch matrix")
    else:
        need(required_clipboard <= seen_matrix, "complete receipt lacks one or more pinned rich-clipboard cases")
        need(bool(eligible_choices), "complete receipt is impossible because the verified preflight has no eligible official case")
        need(any(kind == "official-draft" for _, kind in seen_matrix), "complete receipt lacks an eligible official-draft case")
    no_secrets(report)


def main() -> int:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--preflight", type=Path)
    group.add_argument("--receipt", type=Path)
    args = parser.parse_args()
    try:
        path = args.preflight or args.receipt
        report = obj(strict_json_loads(path.read_text(encoding="utf-8")), "$")
        if args.preflight:
            verify_preflight(report)
            schema = "wechat-draft-preflight/v1"
        else:
            preflight_path = REPOSITORY_ROOT / PREFLIGHT_REF
            preflight = obj(strict_json_loads(preflight_path.read_text(encoding="utf-8")), "preflight")
            verify_receipt(report, preflight)
            schema = "wechat-fidelity-receipt/v1"
    except (OSError, UnicodeError, json.JSONDecodeError, Invalid) as error:
        print(f"invalid: {error}", file=sys.stderr)
        return 1
    print(f"verified: {schema}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
