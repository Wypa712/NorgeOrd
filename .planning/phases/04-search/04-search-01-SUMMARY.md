---
plan: 04-01
phase: 04-search
status: complete
started: 2026-05-27
completed: 2026-05-27
commits:
  - 7b0ac70
  - da43af8
  - dfa8af3
key-files:
  created:
    - frontend/src/hooks/useDebounce.ts
  modified:
    - backend/src/services/words.ts
    - backend/src/routes/words.ts
    - frontend/src/features/words/api/wordsApi.ts
    - frontend/src/features/words/hooks/useWords.ts
    - frontend/src/features/words/components/WordList.tsx
    - frontend/src/pages/WordsPage.tsx
---

## Summary

Implemented full-text search in the Словник tab. All 7 files modified as planned. Norwegian-aware FTS via `pg_catalog.norwegian`, debounced 350ms, wired end-to-end.

## What Was Built

**Backend (Task 1):**
- `listWords(userId, query?)` — hybrid FTS path: `$queryRaw` with `plainto_tsquery('pg_catalog.norwegian', ...)` returns matching IDs, then `findMany` fetches full records with tags. Empty/whitespace query falls through to original `findMany`.
- `GET /api/words?q=` passes `req.query.q` to the service.

**Frontend (Task 2):**
- `useDebounce<T>(value, delay)` — generic hook in `src/hooks/useDebounce.ts`.
- `listWords(query?)` — sends `?q=` param only when query is non-empty.
- `useWords(query?)` — queryKey `['words', query ?? '']` for correct cache separation.
- `WordList` — added `searchQuery?` prop; empty state branches: "Нічого не знайшлося для «X»" when searching with no results, original "Словник порожній" otherwise.

**Frontend (Task 3):**
- `WordsPage` — `searchQuery` state + `debouncedQuery = useDebounce(searchQuery, 350)`. Input above WordList. `useWords(debouncedQuery)`. `searchQuery` (raw) passed to WordList for accurate display in no-results message.

## Decisions Honored

- D-01/D-02: search input embedded in dictionary tab above word list — no new tab
- D-03: empty/whitespace input → full list, no network request
- D-04: queryKey includes query string for correct TanStack Query cache separation
- D-05: backend service receives optional `q` param; FTS is opt-in
- D-08: empty-search branch shows raw query (not debounced) in message
- T-04-01: Prisma tagged template — parameters are bound as positional placeholders, no SQL injection

## Deviations

None. All tasks executed as specified.

## Self-Check: PASSED

- TypeScript: `npx tsc --noEmit` — 0 errors (both workspaces)
- All `must_haves.artifacts` paths exist and contain expected patterns
- All `must_haves.key_links` wired: `useWords(debouncedQuery)` → `listWords(query)` → `req.query.q` → `plainto_tsquery`
