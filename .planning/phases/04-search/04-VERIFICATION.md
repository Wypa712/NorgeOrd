---
phase: 04-search
verified: 2026-05-27T00:00:00Z
status: human_needed
score: 6/6 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Debounce timing — type a partial word, observe list filters after ~350ms, not immediately"
    expected: "List does not update while typing; updates 350ms after typing stops"
    why_human: "Cannot observe setTimeout timing behaviour without a running browser session"
  - test: "Norwegian stemming live — search 'huset' and confirm 'hus' headword appears in results"
    expected: "Inflected form 'huset' resolves to headword 'hus' via pg_catalog.norwegian stemming"
    why_human: "Requires a live PostgreSQL connection with real word data to verify FTS stemming semantics"
  - test: "Empty-search no-network-request — clear the search field, open browser Network tab, confirm no GET /api/words request fires"
    expected: "Query cache serves full list; no network request is sent for empty/whitespace query"
    why_human: "Requires browser Network inspector to observe absence of a request"
---

# Phase 4: Search Verification Report

**Phase Goal:** Full-text search in the Словник tab — users can find words by typing Norwegian headword or translation; debounced, Norwegian-stemming, empty-state handled.
**Verified:** 2026-05-27
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Typing part of a Norwegian word in the Словник tab filters the list in real time (debounced 350ms) | VERIFIED | `WordsPage.tsx:214` — `useDebounce(searchQuery, 350)`; `useWords(debouncedQuery)` at line 215; Input at lines 303-311 |
| 2 | Typing a translation substring also finds matching words | VERIFIED | `words.ts:26` — `to_tsvector` concatenates `headword \|\| ' ' \|\| COALESCE(translation, '')`, so translation is included in the FTS index |
| 3 | Clearing the search field (or leaving it blank/whitespace) returns the full word list without a network request | VERIFIED | `wordsApi.ts:60` — `params: query?.trim() ? { q: query.trim() } : undefined` — no `?q=` param sent for empty/whitespace; TanStack Query cache key `['words', '']` reuses prior full-list response |
| 4 | When the query returns 0 results, the list shows 'Нічого не знайшлося для «X»' where X is the current query | VERIFIED | `WordList.tsx:32-39` — branch `words.length === 0 && searchQuery?.trim()` renders exact Ukrainian text with `{searchQuery}` interpolated; `WordsPage.tsx:317` passes raw `searchQuery` (not debounced) |
| 5 | Search uses pg_catalog.norwegian stemming so inflected forms match the headword | VERIFIED | `words.ts:26-30` — `to_tsvector('pg_catalog.norwegian', ...)` and `plainto_tsquery('pg_catalog.norwegian', ...)` both use the Norwegian dictionary; Prisma tagged template literal used (no `$queryRawUnsafe`) |
| 6 | The skeleton loader appears during any debounce wait / in-flight request (isPending already drives this) | VERIFIED | `WordList.tsx:13-21` — first branch `if (isPending)` renders 5 `animate-pulse` skeleton rows; `useWords` exposes `isPending` from TanStack Query which is `true` while the debounced fetch is in-flight |

**Score:** 6/6 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/hooks/useDebounce.ts` | Generic debounce hook, 350ms default, exports `useDebounce` | VERIFIED | 10-line file; exports `useDebounce<T>(value, delay)` with `useState` + `useEffect` + `clearTimeout` cleanup |
| `backend/src/services/words.ts` | `listWords(userId, query?)` — FTS hybrid path for non-empty query; contains `plainto_tsquery` | VERIFIED | Lines 20-47; hybrid `$queryRaw` → `findMany` path; `plainto_tsquery` present at lines 27 and 30 |
| `backend/src/routes/words.ts` | GET /api/words?q= passes `req.query.q` to `listWords` | VERIFIED | Line 23: `wordsService.listWords(req.user!.userId, req.query.q as string \| undefined)` |
| `frontend/src/features/words/api/wordsApi.ts` | `listWords(query?)` sends `?q=` param | VERIFIED | Lines 58-63; `params: query?.trim() ? { q: query.trim() } : undefined` |
| `frontend/src/features/words/hooks/useWords.ts` | `useWords(query?)` with `queryKey ['words', query]` | VERIFIED | Lines 4-9; `queryKey: ['words', query ?? '']` and `queryFn: () => listWords(query)` |
| `frontend/src/features/words/components/WordList.tsx` | Empty-search branch keyed on `searchQuery` prop; contains 'Нічого не знайшлося' | VERIFIED | Lines 9, 32-39; `searchQuery?: string` in Props; search-empty branch renders correct Ukrainian text |
| `frontend/src/pages/WordsPage.tsx` | Search Input above WordList with debounced state; contains `useDebounce` | VERIFIED | Lines 2, 213-215, 302-317; import present; state wired; Input rendered before `WordList` |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `frontend/src/pages/WordsPage.tsx` | `frontend/src/features/words/hooks/useWords.ts` | `debouncedQuery` passed as query argument | VERIFIED | `useWords(debouncedQuery)` at line 215 |
| `frontend/src/features/words/hooks/useWords.ts` | `frontend/src/features/words/api/wordsApi.ts` | `listWords(query)` call | VERIFIED | `queryFn: () => listWords(query)` at line 7 |
| `backend/src/routes/words.ts` | `backend/src/services/words.ts` | `listWords(userId, q)` | VERIFIED | `wordsService.listWords(req.user!.userId, req.query.q as string \| undefined)` at line 23 |
| `backend/src/services/words.ts` | `prisma.$queryRaw` | FTS hybrid — raw IDs then findMany | VERIFIED | `prisma.$queryRaw<{ id: string }[]>` tagged template at lines 23-32; `plainto_tsquery` present |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `WordList.tsx` | `words` prop | `useWords(debouncedQuery)` → `listWords(query)` → `GET /api/words?q=` → `listWords(userId, query)` in service → `prisma.$queryRaw` + `prisma.word.findMany` | Yes — real DB queries via Prisma ORM with `userId` scoping | FLOWING |
| `WordList.tsx` empty state | `searchQuery` prop | Raw `searchQuery` state from `WordsPage.tsx` useState, passed directly | Yes — user-typed string | FLOWING |

---

## Behavioral Spot-Checks

Step 7b: SKIPPED — verifying server-side FTS behavior requires a live PostgreSQL instance with seed data; no runnable entry point can be invoked without starting backend + frontend servers. Human verification items cover the critical runtime behaviors.

---

## Probe Execution

No conventional probe scripts found in `scripts/*/tests/probe-*.sh`. No probes declared in PLAN frontmatter.

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SRCH-01 | 04-01-PLAN.md | Користувач може знайти слово за пошуком по норвезькому слову або перекладу | SATISFIED | Backend FTS via `pg_catalog.norwegian` in `listWords`; frontend search input wired through `useDebounce` → `useWords` → `wordsApi` → Express route → service |

No orphaned Phase 4 requirements found in REQUIREMENTS.md — SRCH-01 is the only requirement mapped to Phase 4 (traceability table line 71).

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| No blockers found | — | — | — | — |

Scanned all 7 phase-modified files for `TBD`, `FIXME`, `XXX`, `TODO`, `HACK`, `PLACEHOLDER`, stub returns, and hardcoded empty data. Two `placeholder` attribute occurrences in `WordsPage.tsx` (lines 270, 308) are HTML input placeholder text — not stub markers. No debt markers found.

---

## Human Verification Required

### 1. Debounce timing

**Test:** Open the Словник tab in a browser. Type a partial Norwegian word character-by-character at normal speed.
**Expected:** The word list does not update while actively typing. It updates approximately 350ms after the last keystroke. No request fires to `/api/words?q=` until the 350ms window has elapsed.
**Why human:** Timer-based behavior cannot be verified by static code analysis; requires an actual browser session with Network inspector open.

### 2. Norwegian stemming live verification

**Test:** Ensure at least one word with headword `hus` is saved. Type `huset` into the search field and wait for results.
**Expected:** The word `hus` appears in search results, demonstrating that `pg_catalog.norwegian` FTS stemming resolves the inflected form `huset` to the base form `hus`.
**Why human:** Requires a live PostgreSQL connection with real word data. The code uses correct dictionary (`pg_catalog.norwegian`) but the semantic correctness of stemming must be confirmed with actual data.

### 3. Empty search — no network request

**Test:** With words loaded, type a query to filter. Then clear the input entirely. Open the browser Network tab and confirm no GET request to `/api/words` fires after clearing.
**Expected:** Full word list is restored from TanStack Query cache (queryKey `['words', '']` was populated on initial page load). No new network request.
**Why human:** Absence of a network request cannot be verified statically; requires browser Network inspector.

---

## Gaps Summary

No gaps found. All 6 must-have truths are VERIFIED by direct codebase evidence. All 7 required artifacts exist, are substantive, and are fully wired. The data-flow trace confirms real DB queries feed the rendered word list. The 3 human verification items cover runtime/browser behaviors that are structurally correct in code but require a live session to confirm end-to-end.

---

_Verified: 2026-05-27_
_Verifier: Claude (gsd-verifier)_
