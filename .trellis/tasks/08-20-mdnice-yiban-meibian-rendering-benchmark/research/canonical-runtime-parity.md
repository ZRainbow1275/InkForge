# WeChat canonical runtime parity correction

Date: 2026-08-21

## Boundary

This check used the repository-owned fidelity corpus, the local Vite page and the sole persistent CloakBrowser session. It did not copy into WeChat, create or save a draft, upload media, preview on a phone, publish, or group-send.

## Reproduction

Against `948820a06fc12b3f1ac432bfe0f808c790cebfe9`, the old Node preflight used `happy-dom` and did not produce the same canonical artifact as the real browser renderer:

| choice | old `happy-dom` chars | real browser chars |
|---|---:|---:|
| `wechat-classic-inline` | 26,550 | 25,532 |
| `wechat-flagship-kiln` | 40,912 | 39,906 |
| `wechat-flagship-kiln-paste-safe` | 38,624 | 37,618 |

A minimal DOMPurify probe configured to allow only `p` and `span` returned `<details>`, `<summary>` and `<script>` unchanged under `happy-dom`. The real Chromium renderer removed those disallowed nodes and attributes. This made the old preflight artifact fingerprints and semantic-name evidence false for the product runtime.

DOMPurify's current server-side guidance recommends an up-to-date `jsdom` and explicitly says that combining DOMPurify with `happy-dom` is not considered safe: <https://github.com/cure53/DOMPurify#running-dompurify-on-the-server>.

## Narrow correction

- The two StyleProof CLI DOM runtimes now use `jsdom@26.1.0`, which preserves the repository's documented Node.js 18 floor; product rendering still uses the native browser DOM.
- The product sanitizer allowlist is unchanged. Hidden source metadata, `mark`, `cite`, `details`, `summary` and scripts remain absent from the canonical artifact.
- The preflight binds the rendered cover by the exact repository-owned PNG SHA-256 instead of relying on the source role after the sanitizer has removed that role.
- Semantic style names are read through the existing `validateCSS()` declaration parser rather than runtime-specific `CSSStyleDeclaration` expansion.
- DOMPurify was updated from `3.3.1` to `3.4.14`; the canonical output fingerprints below did not change across that dependency correction.

## Browser/CLI parity after the correction

The real CloakBrowser renderer and the `jsdom` preflight produced byte-identical HTML for all three pinned choices:

| choice | chars | UTF-8 bytes | artifact fingerprint |
|---|---:|---:|---|
| `wechat-classic-inline` | 25,532 | 26,278 | `sha256:517175aa6dab6a8520d58f61b996e4d8913960f5c5605be4bbfc7b1fdfdd7e26` |
| `wechat-flagship-kiln` | 39,906 | 40,707 | `sha256:2960b1d79ba2b4f6ab301477e95b4536b28e5af1e6b4cbdd9ecbb5766d0c49c9` |
| `wechat-flagship-kiln-paste-safe` | 37,618 | 38,402 | `sha256:f662fe5d9a7d24144e2f3290ba8799dd9166cdf02c05be18e0f401c28001ad5b` |

Each browser artifact contained exactly one image whose bytes matched the repository-owned source PNG, and zero `mark`, `cite`, `details` or `script` nodes. The fixed semantic-name union has 35 tags, 0 roles, 33 non-style attributes and 54 declared inline-style property names.

All three official-draft candidates remain correctly blocked by `content-invalid` because each canonical artifact is still at or above the `<20,000` character boundary. This correction does not authorize or perform a WeChat write.
