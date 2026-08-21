from __future__ import annotations

import copy
import importlib.util
import unittest
from pathlib import Path
from unittest.mock import patch


SCRIPT = Path(__file__).with_name("verify-wechat-fidelity-receipt.py")
SPEC = importlib.util.spec_from_file_location("wechat_receipt_verifier", SCRIPT)
assert SPEC and SPEC.loader
verifier = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(verifier)
verify_preflight_provenance = verifier.verify_preflight_provenance
verifier.verify_preflight_provenance = lambda report, corpus: None

ZERO = "0" * 64
ONE = "1" * 64
COMMIT = "0" * 40


def semantic_names() -> dict:
    return {
        "tags": ["article", "img", "p", "path", "svg"],
        "roles": ["doc-noteref", "source-owned-cover"],
        "attributes": ["class", "d", "data-inkforge-role", "fill", "viewbox"],
        "styleProperties": ["-webkit-font-smoothing", "border-image-source", "font-feature-settings"],
    }


def semantic_summary() -> dict:
    counts = {key: 0 for key in verifier.SEMANTIC_NODE_COUNT_KEYS}
    counts.update({"elements": 5, "textNodes": 1, "paragraphs": 1, "images": 1, "svgModules": 1})
    return {
        "tagOrder": ["article", "svg", "path", "img", "p"],
        "roleOrder": ["source-owned-cover", "doc-noteref"],
        "textSha256": ZERO,
        "semanticAttributes": [
            {"nodeIndex": 2, "name": "class", "valueSha256": ZERO},
            {"nodeIndex": 2, "name": "d", "valueSha256": ZERO},
            {"nodeIndex": 2, "name": "data-inkforge-role", "valueSha256": ZERO},
            {"nodeIndex": 2, "name": "fill", "valueSha256": ZERO},
            {"nodeIndex": 2, "name": "viewbox", "valueSha256": ZERO},
        ],
        "inlineStyles": [{
            "nodeIndex": 2,
            "properties": [
                {"name": "-webkit-font-smoothing", "valueSha256": ZERO},
                {"name": "border-image-source", "valueSha256": ZERO},
                {"name": "font-feature-settings", "valueSha256": ZERO},
            ],
        }],
        "nodeCounts": counts,
        "excludedEditorChromeCount": 0,
        "excludedHostIdCount": 0,
        "forbiddenFindings": [],
        "vendorResidueFindings": [],
    }


def binding(schema: str, summary: dict | None = None) -> dict:
    value = copy.deepcopy(summary or semantic_summary())
    return {
        "schemaVersion": schema,
        "summary": value,
        "fingerprint": verifier.canonical_fingerprint(value),
    }


def preflight(*, eligible: bool = True) -> dict:
    cases = []
    for choice_id, expected in verifier.PINNED_CHOICES.items():
        cases.append({
            "caseId": f"{choice_id}:{ZERO[:12]}",
            "choiceId": choice_id,
            "presetId": expected["presetId"],
            "options": {
                "enableSvgModules": expected["enableSvgModules"],
                "svgPlan": expected["svgPlan"],
            },
            "artifactFingerprint": f"sha256:{ZERO}",
            "eligibility": "official-draft-eligible" if eligible else "official-draft-ineligible",
            "reasonCodes": [] if eligible else ["content-invalid"],
            "inputFingerprint": ZERO,
            "planFingerprint": ZERO,
            "semanticNames": semantic_names(),
            "limits": {
                "titleChars": 12,
                "titleMaxChars": 32,
                "contentChars": 100 if eligible else 20_000,
                "contentMaxCharsExclusive": 20_000,
                "contentBytes": 200 if eligible else 20_000,
                "contentMaxBytesExclusive": 1024 * 1024,
            },
            "images": {
                "uniqueNonWechatImageCount": 1,
                "uniqueWechatHostedImageCount": 0,
                "preparedArticleUploadCount": 1,
                "preparedLocalArticleSourceCount": 1,
            },
            "cover": {
                "state": "upload-required",
                "remoteValidityUnverified": False,
                "sourceOwnedImageSha256": ZERO,
                "coverIntent": True,
            },
            "unverifiedRemote": {
                "httpSourceReachability": False,
                "httpSourceMimeTruth": False,
                "coverHandleOwnership": False,
            },
            "sideEffectUpperBounds": {
                "draftCreates": 1,
                "articleImageUploads": 1,
                "permanentCoverUploads": 1,
            },
        })
    return {
        "schemaVersion": "wechat-draft-preflight/v1",
        "status": "complete",
        "notProof": True,
        "corpus": {
            "ref": verifier.CORPUS_REF,
            "bytes": 1,
            "sha256": ZERO,
            "sourceOwnedImageSha256": ZERO,
        },
        "commit": COMMIT,
        "requestedChoices": list(verifier.PINNED_CHOICES),
        "cases": cases,
        "boundary": {
            "noWechatWrite": True,
            "noTauriInvoke": True,
            "requiresSeparateExternalApproval": True,
            "doesNotClaimWechatReadback": True,
        },
    }


def receipt_case(plan: dict, choice_id: str, kind: str) -> dict:
    candidate = next(case for case in plan["cases"] if case["choiceId"] == choice_id)
    counts = {"draftCreates": 1, "articleImageUploads": 0, "permanentCoverUploads": 0}
    return {
        "caseId": f"{choice_id}:{ZERO[:12]}:{kind}",
        "corpusSha256": ZERO,
        "boundCommit": COMMIT,
        "choiceId": choice_id,
        "options": copy.deepcopy(candidate["options"]),
        "artifactFingerprint": candidate["artifactFingerprint"],
        "mediaBindingSha256": ZERO,
        "channel": {
            "kind": kind,
            "inputFingerprint": ZERO if kind == "official-draft" else None,
            "planFingerprint": ZERO if kind == "official-draft" else None,
            "transientPayloadDigest": ZERO,
            "normalizedPayload": binding("wechat-semantic-payload/v1"),
            "accountTarget": {"matched": True, "method": "visible-editor-confirmation"},
            "approvedUpperBounds": copy.deepcopy(counts),
            "actualCounts": copy.deepcopy(counts),
            "lastConfirmedPhase": "cleanup-confirmed",
            "residualState": "no-new-media",
        },
        "readbacks": {
            "applied": binding("wechat-semantic-readback/v1"),
            "saved": binding("wechat-semantic-readback/v1"),
        },
        "phoneState": "verified",
        "darkModeState": "verified",
        "coverState": "accepted",
        "draftCleanupState": "confirmed-absent",
    }


def receipt(plan: dict, *, status: str = "complete") -> dict:
    cases = [receipt_case(plan, choice_id, "rich-clipboard") for choice_id in verifier.PINNED_CHOICES]
    cases.append(receipt_case(plan, next(iter(verifier.PINNED_CHOICES)), "official-draft"))
    return {"schemaVersion": "wechat-fidelity-receipt/v1", "status": status, "cases": cases}


class WechatFidelityReceiptVerifierTest(unittest.TestCase):
    def assert_invalid(self, callback, message: str) -> None:
        with self.assertRaisesRegex(verifier.Invalid, message):
            callback()

    def test_real_renderer_name_union_is_expressible(self) -> None:
        actual_styles = set("""-moz-osx-font-smoothing
-webkit-font-smoothing
background-attachment
background-clip
background-color
background-image
background-origin
background-position-x
background-position-y
background-repeat
background-size
border-bottom-color
border-bottom-left-radius
border-bottom-right-radius
border-bottom-style
border-bottom-width
border-collapse
border-image-outset
border-image-repeat
border-image-slice
border-image-source
border-image-width
border-left-color
border-left-style
border-left-width
border-right-color
border-right-style
border-right-width
border-top-color
border-top-left-radius
border-top-right-radius
border-top-style
border-top-width
box-shadow
box-sizing
color
counter-increment
counter-reset
display
float
font-family
font-feature-settings
font-size
font-style
font-variant-numeric
font-weight
height
letter-spacing
line-break
line-height
list-style
margin-bottom
margin-left
margin-right
margin-top
max-width
min-width
opacity
overflow
overflow-x
padding-bottom
padding-left
padding-right
padding-top
position
text-align
text-decoration
text-indent
text-justify
text-transform
top
vertical-align
width
word-break""".splitlines())
        self.assertEqual(len(actual_styles), 74)
        self.assertLessEqual(actual_styles, verifier.SEMANTIC_STYLE_PROPERTY_NAMES)
        self.assertLessEqual(
            {"cite", "col", "colgroup", "details", "summary"},
            verifier.SEMANTIC_TAG_NAMES,
        )
        self.assertLessEqual(
            {"doc-endnotes", "doc-noteref", "source-owned-cover"},
            verifier.SEMANTIC_ROLE_NAMES,
        )
        self.assertLessEqual(
            {"d", "data-inkforge-role", "fill", "id", "viewbox"},
            verifier.SEMANTIC_ATTRIBUTE_NAMES,
        )

    def test_preflight_provenance_rejects_a_dirty_worktree(self) -> None:
        with patch.object(verifier, "git_output", return_value=" M inkforge/example.ts"):
            self.assert_invalid(
                lambda: verify_preflight_provenance({}, {}),
                "requires a clean Git worktree",
            )

    def test_strict_json_and_preflight_schema_fail_closed(self) -> None:
        self.assert_invalid(lambda: verifier.strict_json_loads('{"a":1,"a":2}'), "duplicate JSON key")
        self.assert_invalid(lambda: verifier.strict_json_loads('{"a":NaN}'), "non-standard JSON constant")
        candidate = preflight()
        verifier.verify_preflight(candidate)
        candidate["cases"][0]["semanticNames"]["roles"] = []
        verifier.verify_preflight(candidate)
        for key in ("tags", "attributes", "styleProperties"):
            bad = copy.deepcopy(candidate)
            bad["cases"][0]["semanticNames"][key] = []
            self.assert_invalid(lambda: verifier.verify_preflight(bad), "non-empty array")
        bad = copy.deepcopy(candidate)
        bad["cases"][0]["semanticNames"]["tags"].append("wx" + "abcdef1234567890")
        self.assert_invalid(lambda: verifier.verify_preflight(bad), "unsupported name")
        bad = copy.deepcopy(candidate)
        bad["cases"][0]["reasonCodes"] = ["cover-handle-invalid"]
        bad["cases"][0]["eligibility"] = "official-draft-ineligible"
        self.assert_invalid(lambda: verifier.verify_preflight(bad), "fixed corpus limits/media state")

    def test_complete_matrix_and_negative_receipts(self) -> None:
        candidate = preflight()
        complete = receipt(candidate)
        verifier.verify_receipt(complete, candidate)

        missing = copy.deepcopy(complete)
        missing["cases"].pop(0)
        self.assert_invalid(lambda: verifier.verify_receipt(missing, candidate), "lacks one or more pinned")

        bad_hash = copy.deepcopy(complete)
        bad_hash["cases"][0]["channel"]["normalizedPayload"]["summary"]["textSha256"] = ONE
        self.assert_invalid(lambda: verifier.verify_receipt(bad_hash, candidate), "fingerprint mismatch")

        impossible_count = copy.deepcopy(complete)
        payload = impossible_count["cases"][0]["channel"]["normalizedPayload"]
        payload["summary"]["nodeCounts"]["images"] += 1
        payload["fingerprint"] = verifier.canonical_fingerprint(payload["summary"])
        self.assert_invalid(lambda: verifier.verify_receipt(impossible_count, candidate), "tagOrder/nodeCounts.images mismatch")

        semantic_loss = copy.deepcopy(complete)
        saved = semantic_loss["cases"][0]["readbacks"]["saved"]
        saved["summary"]["tagOrder"].append("blockquote")
        saved["summary"]["nodeCounts"]["elements"] += 1
        saved["summary"]["nodeCounts"]["blockquotes"] += 1
        saved["fingerprint"] = verifier.canonical_fingerprint(saved["summary"])
        self.assert_invalid(lambda: verifier.verify_receipt(semantic_loss, candidate), "semantic difference")

        finding = copy.deepcopy(complete)
        saved = finding["cases"][0]["readbacks"]["saved"]
        saved["summary"]["forbiddenFindings"] = [{"code": "missing-image", "count": 1}]
        saved["fingerprint"] = verifier.canonical_fingerprint(saved["summary"])
        self.assert_invalid(lambda: verifier.verify_receipt(finding, candidate), "forbidden or vendor-residue")

        over_count = copy.deepcopy(complete)
        over_count["cases"][-1]["channel"]["actualCounts"]["draftCreates"] = 2
        self.assert_invalid(lambda: verifier.verify_receipt(over_count, candidate), "exceeds approval")

        unknown = copy.deepcopy(complete)
        unknown["cases"][-1]["channel"]["actualCounts"]["articleImageUploads"] = "unknown"
        self.assert_invalid(lambda: verifier.verify_receipt(unknown, candidate), "unknown counts require")

        early_phase = copy.deepcopy(complete)
        early_phase["cases"][-1]["channel"]["lastConfirmedPhase"] = "planned"
        self.assert_invalid(lambda: verifier.verify_receipt(early_phase, candidate), "precedes its confirmed phase")

        over_plan = copy.deepcopy(complete)
        over_plan["cases"][-1]["channel"]["approvedUpperBounds"]["articleImageUploads"] = 2
        self.assert_invalid(lambda: verifier.verify_receipt(over_plan, candidate), "candidate maximum")

        self.assert_invalid(
            lambda: verifier.verify_receipt(complete, preflight(eligible=False)),
            "official draft is ineligible",
        )

    def test_privacy_denylist_rejects_keys_and_raw_values(self) -> None:
        self.assert_invalid(lambda: verifier.no_secrets({"bodyText": "private"}), "forbidden")
        self.assert_invalid(lambda: verifier.no_secrets({"safe": "https://private.example"}), "raw URL")


if __name__ == "__main__":
    unittest.main()
