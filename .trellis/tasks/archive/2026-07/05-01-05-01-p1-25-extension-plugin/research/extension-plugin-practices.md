# Extension Plugin Practices Research

## Sources consulted

- Grok search, 2026-05-01: Web Worker plugin sandbox permissions app extension host best practices.
- Grok search, 2026-05-01: plugin manifest permissions storage namespace app plugin architecture best practices.
- DeepWiki: microsoft/vscode extension system architecture.
- Context7: Zod strict object / enum / safeParse patterns for manifest validation.

## Implementation constraints for InkForge baseline

- Use declarative manifest records first; host must validate id, version, entry, permissions, sandbox level, network origins and config shape before any runtime activation.
- Follow least privilege: requested permissions and granted permissions are separate; commands or API calls must check granted permissions, not merely declared permissions.
- Use local-first durable state in Dexie. Extension data must be namespace-isolated under extension id and profile id.
- Do not execute arbitrary third-party code in the baseline unless a real Worker sandbox and message protocol are present. If runtime activation is not implemented, fail closed and audit the blocked activation.
- Web Worker / extension-host isolation is the correct later execution model: no DOM access, JSON-message boundary, timeout/error isolation, worker lifecycle cleanup.
- Network access must be origin allowlist based. No broad wildcard network grants.
- Command contribution should reuse existing `CommandRegistry.registerExtension()` and the existing command permission check.
- All install/toggle/uninstall/activation failure decisions should be audited through Spec 24.

## Baseline decision

This task will implement a compatible local manifest registry and permission-gated command contribution baseline, not a fake online marketplace and not fake plugin code execution. It will add durable extension records, storage namespace APIs, strict Zod validation, audit-backed lifecycle actions, a Pinia store, Settings visibility, and tests.
