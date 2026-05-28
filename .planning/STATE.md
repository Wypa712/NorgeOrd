# Project State: Norwegian Learning Hub

## Project Reference

**Core Value:** Одне поле вводу → AI заповнює все → слово збережено назавжди зі всіма формами і контекстом.
**Full context:** See `.planning/PROJECT.md`
**Requirements:** See `.planning/REQUIREMENTS.md`
**Roadmap:** See `.planning/ROADMAP.md`

---

## Current Position

**Phase:** 6 — Polish & Audit
**Status:** Planning

```
Progress: [████████████████████░░░░░] Phase 1 ✓ → Phase 2 ✓ → Phase 3 ✓ → Phase 4 ✓ → Phase 5 ✓ → Phase 6 ◆
```

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases total | 4 |
| Phases complete | 5 |
| Plans complete | 11 |
| Requirements mapped | 10/10 |
| Requirements complete | 10/10 |

---

## Accumulated Context

### Key Decisions Logged
- Stack: React + Vite + Tailwind + DaisyUI 4 + Zustand (frontend); Node.js + Express 5 + PostgreSQL (Neon) + Prisma 6 + JWT (backend)
- AI: Groq via Vercel AI SDK — `llama-3.3-70b-versatile` for Phase 3 auto-fill
- Nynorsk only — no Bokmål mixing; `feminine` gender enum value is mandatory (3-value enum)
- GIN index for FTS using `pg_catalog.norwegian` — applied in migration `20260527115317_add_fts_gin_index`
- Feature folder structure: `src/features/{auth,words,search}/` from day one
- Toast notifications (top-right, 10s) via `useToastStore` — no inline error banners
- AppShell: `max-w-7xl mx-auto` for both navbar and main content
- Prisma 6 generates `prisma.config.ts` — env vars must be read lazily inside functions (not at module level)

### Phase 1 Handoff — Available for Phase 2
- `requireAuth` middleware — `backend/src/middleware/auth.ts`
- `prisma` singleton — `backend/src/lib/prisma.ts`
- `req.user.userId` on all protected routes
- `api` Axios instance with JWT interceptors — `frontend/src/lib/api.ts`
- `useAuthStore` — `frontend/src/features/auth/authStore.ts`
- `toast` helper — `frontend/src/lib/toastStore.ts`
- All Prisma models and enums from `@prisma/client`

### Active Risks
None — all 4 phases complete.

### Blockers
None.

### Phase 2 Handoff — Available for Phase 3
- `listWords`, `createWord`, `getWordForUser`, `updateWord`, `deleteWord` — `backend/src/services/words.ts`
- `wordsRouter` — `backend/src/routes/words.ts` (mounted at /api/words behind requireAuth)
- `Word`, `CreateWordInput`, `UpdateWordInput` — `frontend/src/features/words/api/wordsApi.ts`
- `useWords`, `useWord`, `useCreateWord`, `useUpdateWord`, `useDeleteWord` — `frontend/src/features/words/hooks/`
- `WordList`, `WordListRow`, `WordDetailDrawer`, `AddWordDrawer`, `FAB`, `SelectField`, `WordClassBadge`, `GenderBadge` — `frontend/src/features/words/components/`
- `WordsPage` — `frontend/src/pages/WordsPage.tsx`

### TODOs
- [x] Create Phase 1 plan (`/gsd-plan-phase 1`)
- [x] Execute Phase 1 (`/gsd-execute-phase 1`)
- [x] Plan Phase 2 (`/gsd-plan-phase 2`)
- [x] Execute Phase 2 (`/gsd-execute-phase 2`)
- [x] UAT checkpoint Phase 2 ✓
- [x] Execute Phase 3 gap plans (`/gsd-execute-phase 3 --gaps-only`)
- [x] Live Groq Nynorsk canary verification (`hus` → `husa`, `ikkje`, `eg`)

---

## Session Continuity

**Last updated:** 2026-05-28
**Last action:** Phase 6 planned — project-wide audit, 24 findings categorized, 06-01-PLAN.md created (5 tasks: FAB wiring, edit form expansion, delete confirm, backend hardening, translator polish).
**Next action:** `/gsd-execute-phase 6`
