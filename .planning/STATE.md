# Project State: Norwegian Learning Hub

## Project Reference

**Core Value:** Одне поле вводу → AI заповнює все → слово збережено назавжди зі всіма формами і контекстом.
**Full context:** See `.planning/PROJECT.md`
**Requirements:** See `.planning/REQUIREMENTS.md`
**Roadmap:** See `.planning/ROADMAP.md`

---

## Current Position

**Phase:** 2 — Core Word CRUD
**Plan:** Not started — run `/gsd-plan-phase 2`
**Status:** Phase 1 complete ✓

```
Progress: [██████████] Phase 1 ✓ → Phase 2 [current] → Phase 3 → Phase 4
```

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases total | 4 |
| Phases complete | 1 |
| Plans complete | 1 |
| Requirements mapped | 10/10 |
| Requirements complete | 4/10 (AUTH-01..04) |

---

## Accumulated Context

### Key Decisions Logged
- Stack: React + Vite + Tailwind + DaisyUI 4 + Zustand (frontend); Node.js + Express 5 + PostgreSQL (Neon) + Prisma 6 + JWT (backend)
- AI: OpenAI API — `gpt-4o-mini` for auto-fill
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
- AI returning Bokmål instead of Nynorsk (CRITICAL — Phase 3 canary test required)
- OpenAI costs without `max_tokens` guard (HIGH — Phase 3)

### Blockers
None.

### TODOs
- [x] Create Phase 1 plan (`/gsd-plan-phase 1`)
- [x] Execute Phase 1 (`/gsd-execute-phase 1`)
- [ ] Plan Phase 2 (`/gsd-plan-phase 2`)
- [ ] Execute Phase 2 (`/gsd-execute-phase 2`)

---

## Session Continuity

**Last updated:** 2026-05-27
**Last action:** Phase 1 executed and verified — auth works E2E, UI polished (toast, container)
**Next action:** Plan Phase 2 — `/gsd-plan-phase 2`
