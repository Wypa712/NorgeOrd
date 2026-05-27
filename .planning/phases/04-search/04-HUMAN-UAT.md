---
status: partial
phase: 04-search
source: [04-VERIFICATION.md]
started: 2026-05-27T00:00:00Z
updated: 2026-05-27T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Debounce timing
expected: List does not update while typing; updates 350ms after typing stops. No GET /api/words?q= fires until debounce elapses.
result: [pending]

### 2. Norwegian stemming live — type 'huset', confirm 'hus' appears
expected: Inflected form 'huset' resolves to headword 'hus' via pg_catalog.norwegian stemming
result: [pending]

### 3. Empty-search — no network request
expected: Clear the search field; full word list restored from cache, no GET /api/words fires (observe Network tab)
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
