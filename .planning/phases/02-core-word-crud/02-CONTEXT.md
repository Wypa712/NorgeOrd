# Phase 2: Core Word CRUD - Context

**Gathered:** 2026-05-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Full word lifecycle — add, list (view), detail (view+edit), delete — end-to-end without any AI dependency. Tags and `forms` field deferred to Phase 3 (AI auto-fill handles them). No FTS search (Phase 4).

</domain>

<decisions>
## Implementation Decisions

### Word List (/words page)
- **D-01:** Compact list layout (flex rows), NOT cards or grid.
- **D-02:** Each row shows: headword, translation, gender badge (conditional — only if set), wordClass badge (always).
- **D-03:** Badges via DaisyUI `badge` component. wordClass shown for all word types (noun, verb, adjective, adverb, other). Gender shown only when `gender != null` (nouns only in practice, but any word with gender set).
- **D-04:** Click on a row opens the word detail drawer.

### Add Word Form
- **D-05:** Trigger: FAB "+" button on /words page → opens modal drawer.
- **D-06:** Minimal field set: headword (required), translation, gender (select), wordClass (select), notes (textarea).
- **D-07:** `forms` (Json) field — skip entirely in Phase 2. Stays null until Phase 3 AI fills it.
- **D-08:** `examples[]` field — skip in Phase 2 (same reason as forms).
- **D-09:** `difficulty`, `personalNote` — skip in Phase 2 manual form. Can be set in edit mode.
- **D-10:** Tags — skip in Phase 2 (see Deferred).

### Detail / Edit (Word drawer)
- **D-11:** Detail opens as modal drawer (DaisyUI modal or drawer). URL does NOT change.
- **D-12:** Default mode: view. Shows all non-null fields (headword, translation, gender, wordClass, difficulty, notes, personalNote, forms if set, examples if set).
- **D-13:** "Редагувати" button switches to edit-mode within the same drawer — same component, different render state.
- **D-14:** Edit form includes same minimal fields as add form + difficulty + personalNote (fields that may be set after AI fill in Phase 3).
- **D-15:** Saving edit → toast notification via existing `useToastStore`.

### Delete
- **D-16:** Confirm dialog before deleting: "Видалити '{headword}'?" with Cancel / Delete buttons.
- **D-17:** Delete button visible in detail drawer (view-mode).
- **D-18:** After delete → close drawer → word removed from list (TanStack Query invalidation).

### API Design
- **D-19:** REST endpoints needed: `GET /words`, `POST /words`, `GET /words/:id`, `PATCH /words/:id`, `DELETE /words/:id`.
- **D-20:** All endpoints protected via existing `requireAuth` middleware. `userId` from `req.user.userId`.
- **D-21:** Uniqueness constraint already in schema: `@@unique([userId, headword])` — API must return 409 if duplicate headword for same user.

### Frontend State
- **D-22:** Use TanStack Query v5 for server state (list + individual word). Invalidate `['words']` query on create/update/delete.
- **D-23:** Drawer open/closed state → local React state (not Zustand, not URL).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema & Migrations
- `backend/prisma/schema.prisma` — Word model, Gender enum (masculine/feminine/neuter), WordClass enum, Difficulty enum. `@@unique([userId, headword])` constraint.
- `backend/prisma/migrations/20260527115230_init/migration.sql` — Initial schema migration.

### Existing Backend
- `backend/src/middleware/auth.ts` — `requireAuth` middleware. Attaches `req.user.userId`.
- `backend/src/lib/prisma.ts` — Prisma singleton. Must be imported lazily (env vars read at module level issue documented in STATE.md).
- `backend/src/routes/auth.ts` — Pattern for route structure and error handling.

### Existing Frontend
- `frontend/src/lib/api.ts` — Axios instance with JWT interceptors. Use for all API calls.
- `frontend/src/features/auth/authStore.ts` — Zustand pattern. Follow same pattern for any new stores.
- `frontend/src/lib/toastStore.ts` — Toast helper. Use for success/error feedback.
- `frontend/src/components/Button.tsx` — Reusable button (primary/ghost/error variants, loading state).
- `frontend/src/components/Input.tsx` — Reusable input with label, error, accessibility.
- `frontend/src/components/AppShell.tsx` — Layout wrapper (max-w-7xl mx-auto). All pages render inside it.

### Project Constraints
- `.planning/REQUIREMENTS.md` — WORD-02..WORD-05 requirements for this phase.
- `CLAUDE.md` — Key constraints: mobile-first, gender enum = 3 values (feminine mandatory), frontend structure `src/features/{auth,words}/`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Button` component: primary/ghost/error variants + `loading` prop. Use for form submit, delete, cancel.
- `Input` component: label + error + accessibility built-in. Use for headword, translation, notes fields.
- `api` Axios instance: JWT already injected. Use for all `/words` requests.
- `useToastStore`: success/error toast. Use after create, update, delete.
- `useAuthStore`: has `token` and `userId` if needed on frontend.

### Established Patterns
- Zustand for global/persistent state (auth). For drawer open/close → local `useState` is enough.
- TanStack Query v5 is in the stack but not yet used — Phase 2 is first use. Pattern: `useQuery` for list/detail, `useMutation` + invalidation for write ops.
- Mobile-first: AppShell `max-w-7xl mx-auto` container. DaisyUI components.
- Error feedback: toast (top-right, 10s) — NOT inline banners (established in Phase 1).

### Integration Points
- `frontend/src/pages/WordsPage.tsx` — currently a placeholder. Phase 2 replaces it with list + FAB.
- `frontend/src/App.tsx` — routing is defined here. May need `/words/:id` route if drawer approach changes (but it won't — drawer is local state).
- `backend/src/index.ts` — words router must be registered here.

### Feature Folder
- New code goes in `frontend/src/features/words/` (established pattern from CLAUDE.md).
- Backend: `backend/src/routes/words.ts`, `backend/src/services/words.ts`.

</code_context>

<specifics>
## Specific Ideas

- wordClass badge always visible in list row — important because not all words have gender (verbs, adjectives, adverbs have no gender). Rід badge appears only when gender is set.
- Drawer instead of page for detail/edit — keeps /words URL stable, faster UX on mobile.
- FAB "+" button pattern for add — mobile-first, does not clutter the list header.

</specifics>

<deferred>
## Deferred Ideas

- **Теги (Tag input)** — Schema ready (WordTag many-to-many), but input deferred to Phase 3. AI will auto-suggest tags; manual tag input can be added alongside AI fill.
- **`forms` field UI** — JSON inflection table. Deferred to Phase 3 (AI fills it). In Phase 2 the field stays null.
- **`examples[]` field UI** — Deferred to Phase 3. AI generates examples.
- **`difficulty` in add form** — Can be set in edit mode manually, but not required in the add form.
- **Search/filtering** — Phase 4.

</deferred>

---

*Phase: 2-Core Word CRUD*
*Context gathered: 2026-05-27*
