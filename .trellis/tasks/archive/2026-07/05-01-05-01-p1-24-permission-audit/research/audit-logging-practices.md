# Audit Logging Practice Notes

## Sources

- OWASP Logging Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- OWASP Developer Guide, Security Logging and Monitoring: https://devguide.owasp.org/en/04-design/02-web-app-checklist/09-logging-monitoring/
- NIST SP 800-92: https://csrc.nist.gov/pubs/sp/800/92/final

## Implementation Guidance Applied To InkForge

- Use a central logging routine, not scattered ad-hoc localStorage writes.
- Log access-control decisions and access-control rule violations, including allow and deny outcomes.
- Include actor, profile, resource, action, timestamp, severity, outcome, reason, and correlation metadata.
- Avoid raw secrets, session tokens, raw document content, and full PII in payloads.
- Add tamper-evident metadata through entry hashes and previous-hash chaining where local storage allows it.
- Keep logging failure from breaking local-first primary flows, but preserve fallback evidence and expose fallback state.
- Support retention cleanup around the Spec 24 90-day rule without blocking app startup.
- Keep local-first limitations explicit. A local audit ledger is tamper-evident, not tamper-proof, until backed by a remote or WORM sink.