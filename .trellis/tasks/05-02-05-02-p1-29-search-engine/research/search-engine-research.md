# Search Engine Research

## MiniSearch API Verification

- Context7 selected /lucaong/minisearch as the authoritative library documentation.
- Official API examples confirm MiniSearch supports fields, storeFields, addAll, search, boost, prefix, fuzzy, and filter options.
- Current installed version after dependency add: minisearch 7.2.0.
- Local type definitions confirm add, addAll, addAllAsync, discard, replace, vacuum, SearchOptions, SearchResult, fields, storeFields, idField, tokenize, processTerm, and searchOptions are available.

## Grok Search Verification

A Grok Search query for current MiniSearch documentation confirmed the official docs and GitHub repository describe the same APIs: addAll for batch indexing, replace for update, discard/vacuum for removal, searchOptions.prefix/fuzzy/boost/filter for query behavior, and first-class TypeScript support.

## Implementation Decision

Use MiniSearch as an in-memory index fed from real IndexedDB Article records via ArticleRepository or caller-provided Article arrays. Keep the index non-persistent for this baseline because repository-backed rebuild is deterministic and avoids stale serialized index drift. Persist only search history through a storage boundary.

## Worker Decision

Spec 29 asks for worker indexing. This slice records worker indexing as pending rather than faking it. The service is isolated behind SearchEngine so a worker adapter can replace the in-process adapter later without changing store callers.

## CJK Decision

MiniSearch default tokenization is not enough for Chinese text. The baseline tokenizer emits normalized Latin tokens plus CJK unigrams and adjacent CJK bigrams to support direct Chinese keyword search while remaining deterministic and cheap.
