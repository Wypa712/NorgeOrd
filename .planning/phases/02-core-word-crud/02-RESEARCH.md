# Phase 2: Core Word CRUD - Research

**Researched:** 2026-05-27
**Domain:** TanStack Query v5 + Express 5 REST CRUD + DaisyUI 4 modal + Prisma 6
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Compact list layout (flex rows), NOT cards or grid.
- **D-02:** Each row shows: headword, translation, gender badge (conditional), wordClass badge (always).
- **D-03:** Badges via DaisyUI `badge`. wordClass badge for all; gender badge only when `gender != null`.
- **D-04:** Click on a row opens the word detail drawer.
- **D-05:** FAB "+" button on /words page opens AddWordDrawer (modal).
- **D-06:** Minimal fields: headword (required), translation, gender (select), wordClass (select), notes (textarea).
- **D-07:** `forms` (Json) — skip in Phase 2.
- **D-08:** `examples[]` — skip in Phase 2.
- **D-09:** `difficulty`, `personalNote` — skip in add form; can be set in edit mode.
- **D-10:** Tags — skip in Phase 2.
- **D-11:** Detail opens as modal drawer. URL does NOT change.
- **D-12:** Default mode: view. Shows all non-null fields.
- **D-13:** "Редагувати" button switches to edit-mode within same drawer.
- **D-14:** Edit form includes same minimal fields as add form + difficulty + personalNote.
- **D-15:** Saving edit → toast notification via existing `useToastStore`.
- **D-16:** Confirm dialog before deleting: "Видалити '{headword}'?" with Cancel / Delete buttons.
- **D-17:** Delete button visible in detail drawer (view-mode).
- **D-18:** After delete → close drawer → word removed from list (TanStack Query invalidation).
- **D-19:** REST endpoints: `GET /words`, `POST /words`, `GET /words/:id`, `PATCH /words/:id`, `DELETE /words/:id`.
- **D-20:** All endpoints protected via `requireAuth`. `userId` from `req.user.userId`.
- **D-21:** 409 if duplicate headword for same user (`@@unique([userId, headword])`).
- **D-22:** TanStack Query v5 for server state. Invalidate `['words']` on create/update/delete.
- **D-23:** Drawer open/closed state → local React state (not Zustand, not URL).

### Claude's Discretion
(None specified in context — all decisions locked.)

### Deferred Ideas (OUT OF SCOPE)
- Tag input (WordTag many-to-many) — Phase 3
- `forms` field UI — Phase 3
- `examples[]` field UI — Phase 3
- `difficulty` in add form — can be set in edit mode only
- Search/filtering — Phase 4
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WORD-02 | Користувач може переглянути список всіх збережених слів | `GET /words` endpoint + `useQuery(['words'])` + WordList/WordListRow components |
| WORD-03 | Користувач може відкрити детальну картку слова з усією інформацією | `GET /words/:id` + WordDetailDrawer view-mode |
| WORD-04 | Користувач може відредагувати будь-яке поле збереженого слова | `PATCH /words/:id` + useMutation + edit-mode in WordDetailDrawer |
| WORD-05 | Користувач може видалити слово зі словника | `DELETE /words/:id` + useMutation + DeleteConfirmDialog |
</phase_requirements>

---

## Summary

Phase 2 adds the complete word lifecycle to the application: list, detail view, edit, and delete. The backend needs five REST endpoints mounted on `POST /api/words` (and `/api/words/:id` variants), all behind `requireAuth`. The frontend introduces TanStack Query v5 as the server-state layer for the first time — the `QueryClientProvider` is **already present in `main.tsx`** so no provider setup is needed; hooks are ready to use immediately.

The modal pattern for DaisyUI 4 uses the native `<dialog>` element with `dialogRef.current.showModal()` / `dialogRef.current.close()` called via `useEffect` reacting to a boolean prop. This is the DaisyUI v4 idiomatic approach (checkbox-hack is deprecated). The UI spec describes two modals (`AddWordDrawer`, `WordDetailDrawer`) sharing the same class structure but different content; the detail modal has a three-state internal machine (view → edit → confirm-delete).

The Prisma schema is already complete and migrated — no schema work is needed in Phase 2. The `@@unique([userId, headword])` constraint means the backend MUST handle the Prisma `P2002` error and return 409. Express 5 (already in use) propagates async errors automatically without `try/catch` wrappers in each handler, but Prisma unique-violation errors need explicit detection because they are not thrown as HTTP errors.

**Primary recommendation:** Build backend service layer first (words.service.ts) with isolated Prisma calls, thin Express route handlers that catch P2002, then build frontend hooks (useWords.ts, useWord.ts, useCreateWord.ts, useUpdateWord.ts, useDeleteWord.ts), then compose the UI components from the bottom up (badges → row → list → drawers → page).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Word list data fetching | API / Backend | — | `GET /words` filtered by userId; database query |
| Word list display | Browser / Client | — | React renders list with local selected-word state |
| Create word | API / Backend | Browser / Client | POST /words validates + persists; frontend calls via mutation |
| Edit word | API / Backend | Browser / Client | PATCH /words/:id; frontend mutation + invalidation |
| Delete word | API / Backend | Browser / Client | DELETE /words/:id; frontend mutation + cache removal |
| Modal open/close state | Browser / Client | — | Local useState in WordsPage — D-23 explicit |
| Edit mode toggle | Browser / Client | — | Local useState inside WordDetailDrawer |
| Auth enforcement | API / Backend | — | requireAuth middleware — ALL /words routes |
| Uniqueness constraint | Database / Storage | API / Backend | @@unique enforced by Postgres; API catches P2002 and returns 409 |
| Toast feedback | Browser / Client | — | useToastStore.getState().addToast — existing pattern |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-query` | ^5.100.14 (installed) | Server state management, caching, mutations | Already in package.json; QueryClientProvider in main.tsx |
| `@prisma/client` | ^6.19.3 (installed) | Database ORM; Word CRUD queries | Already migrated; Word model complete |
| `express` | ^5.2.1 (installed) | REST routing | Already in use for auth routes |
| `axios` | ^1.16.1 (installed) | HTTP client | `api.ts` instance with JWT interceptors exists |
| `daisyui` | ^4.12.24 (installed) | UI components — modal, badge, btn, form-control | Already in tailwind.config; nord theme active |
| `zustand` | ^5.0.13 (installed) | Global state | useToastStore, useAuthStore — established pattern |

[VERIFIED: frontend/package.json, backend/package.json — all packages confirmed installed at these versions]

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react` | ^19.2.6 | Component rendering, useRef for dialog control | useRef needed for `dialogRef.current.showModal()` |
| `typescript` | ~6.0.2 (frontend), ^5.9.3 (backend) | Type safety | All new files must be `.ts` / `.tsx` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TanStack Query useMutation | Plain axios calls + useState | Less cache coherence, no loading state management — TanStack Query is already installed and QueryClientProvider is set up |
| DaisyUI `<dialog>` native API | `modal-open` CSS class toggle | CSS class toggle requires SSR-safe guard and doesn't integrate with ESC key or backdrop-click natively — `showModal()` / `close()` is DaisyUI v4 official pattern |
| Service layer (words.service.ts) | Inline Prisma in route handlers | Inline Prisma makes P2002 handling messy and routes untestable — service separation follows auth.ts established pattern |

**No new `npm install` needed** — all required packages are installed.

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (WordsPage)
  │
  ├── useQuery(['words'])
  │     │
  │     └── api.get('/words')  ──→  GET /api/words
  │                                  │  requireAuth
  │                                  │  wordsService.listWords(userId)
  │                                  └──→  prisma.word.findMany({ where: { userId } })
  │
  ├── FAB click → addDrawerOpen=true
  │     └── AddWordDrawer (modal)
  │           └── useMutation(createWord)
  │                 │
  │                 └── api.post('/words', data)  ──→  POST /api/words
  │                       on success: invalidate ['words']   │  requireAuth
  │                                                          │  wordsService.createWord(userId, data)
  │                                                          │  catches P2002 → 409
  │                                                          └──→  prisma.word.create(...)
  │
  ├── Row click → selectedWordId=id → WordDetailDrawer
  │     │
  │     ├── [view mode]
  │     │     ├── "Редагувати" → editMode=true
  │     │     └── "Видалити" → drawerState='confirm-delete'
  │     │
  │     ├── [edit mode]
  │     │     └── useMutation(updateWord)
  │     │           └── api.patch('/words/:id', data)  ──→  PATCH /api/words/:id
  │     │                 on success: invalidate ['words']   │  requireAuth + ownership check
  │     │                                                    └──→  prisma.word.update(...)
  │     │
  │     └── [confirm-delete mode]
  │           └── useMutation(deleteWord)
  │                 └── api.delete('/words/:id')  ──→  DELETE /api/words/:id
  │                       on success: close + invalidate ['words']  │  requireAuth + ownership check
  │                                                                  └──→  prisma.word.delete(...)
  │
  └── Toaster (already in App.tsx)
        └── useToastStore — toast.success / toast.error
```

### Recommended Project Structure

```
backend/src/
├── routes/
│   ├── auth.ts          (existing)
│   └── words.ts         (NEW — thin handlers, delegates to service)
├── services/
│   ├── auth.ts          (existing)
│   └── words.ts         (NEW — Prisma queries, P2002 detection)
├── middleware/
│   └── auth.ts          (existing — requireAuth)
├── lib/
│   └── prisma.ts        (existing — singleton)
└── index.ts             (register wordsRouter: app.use('/api/words', requireAuth, wordsRouter))

frontend/src/
├── features/
│   ├── auth/            (existing)
│   └── words/           (NEW)
│       ├── api/
│       │   └── wordsApi.ts        (axios calls: listWords, getWord, createWord, updateWord, deleteWord)
│       ├── hooks/
│       │   ├── useWords.ts        (useQuery ['words'])
│       │   ├── useWord.ts         (useQuery ['words', id])
│       │   ├── useCreateWord.ts   (useMutation)
│       │   ├── useUpdateWord.ts   (useMutation)
│       │   └── useDeleteWord.ts   (useMutation)
│       └── components/
│           ├── WordList.tsx
│           ├── WordListRow.tsx
│           ├── WordClassBadge.tsx
│           ├── GenderBadge.tsx
│           ├── AddWordDrawer.tsx
│           ├── WordDetailDrawer.tsx
│           ├── SelectField.tsx
│           └── FAB.tsx
├── pages/
│   └── WordsPage.tsx    (replace placeholder — composes all features/words components)
```

### Pattern 1: TanStack Query v5 — useQuery for word list

**What:** Fetch and cache the words list; components subscribe to cache.
**When to use:** Any read operation that should be cached and auto-refreshed after mutations.

```tsx
// Source: https://github.com/tanstack/query/blob/main/docs/framework/react/quick-start.md
// frontend/src/features/words/hooks/useWords.ts
import { useQuery } from '@tanstack/react-query';
import { listWords } from '../api/wordsApi';

export function useWords() {
  return useQuery({
    queryKey: ['words'],
    queryFn: listWords,
  });
}

// Usage in component:
const { data: words, isPending, isError } = useWords();
```

[VERIFIED: Context7 /tanstack/query — quick-start.md, queries.md]

### Pattern 2: TanStack Query v5 — useMutation + invalidation

**What:** Write operations that update server state and invalidate cache.
**When to use:** create, update, delete operations.

```tsx
// Source: https://github.com/tanstack/query/blob/main/docs/framework/react/guides/mutations.md
// frontend/src/features/words/hooks/useCreateWord.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createWord } from '../api/wordsApi';
import { toast } from '../../../lib/toastStore';

export function useCreateWord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['words'] });
      toast.success('Слово збережено');
    },
    onError: (err: any) => {
      if (err.response?.status === 409) {
        toast.error(`Слово «${err.config?.data ? JSON.parse(err.config.data).headword : ''}» вже є у вашому словнику`);
      } else {
        toast.error('Не вдалося зберегти слово. Спробуйте ще раз.');
      }
    },
  });
}

// Usage: mutation.mutate(data); mutation.isPending → Button loading prop
```

[VERIFIED: Context7 /tanstack/query — mutations.md, invalidations-from-mutations.md]

### Pattern 3: DaisyUI 4 modal with useRef + useEffect (React-controlled)

**What:** Open/close `<dialog>` element imperatively via ref, controlled by a boolean prop.
**When to use:** Any DaisyUI modal in this project (AddWordDrawer, WordDetailDrawer).

```tsx
// Source: https://github.com/saadeghi/daisyui/blob/master/packages/docs/src/routes/(routes)/components/modal/+page.md
import { useRef, useEffect } from 'react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function DrawerBase({ open, onClose, children }: DrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="modal modal-bottom sm:modal-middle"
      onClose={onClose}   // fires on ESC key and form[method=dialog] close
    >
      <div className="modal-box max-w-lg w-full mx-auto">
        {children}
      </div>
      {/* Backdrop click closes */}
      <form method="dialog" className="modal-backdrop">
        <button type="submit" onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
```

[VERIFIED: Context7 /saadeghi/daisyui — modal documentation]

### Pattern 4: WordDetailDrawer — three-state internal machine

**What:** Single modal component with three render states: view / edit / confirm-delete.
**When to use:** Detail drawer per D-11, D-13, D-16.

```tsx
// Internal state: 'view' | 'edit' | 'confirm-delete'
type DrawerMode = 'view' | 'edit' | 'confirm-delete';

// State machine transitions:
// 'view' --[Редагувати]--> 'edit'
// 'view' --[Видалити]---> 'confirm-delete'
// 'edit' --[Скасувати]--> 'view'
// 'confirm-delete' --[Скасувати]--> 'view'
// 'edit' --[save success]--> close
// 'confirm-delete' --[delete success]--> close
```

[ASSUMED — pattern derived from D-13, D-16 decisions; no external source needed]

### Pattern 5: Express 5 route handler — no try/catch needed

**What:** Express 5 auto-propagates rejected async promises to error middleware.
**When to use:** All `/words` route handlers.

```typescript
// Source: https://expressjs.com/en/5x/api.html — app.use callback docs
// backend/src/routes/words.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as wordsService from '../services/words';

const router = Router();

// Express 5: async errors auto-propagate — no try/catch needed in handlers
// EXCEPT for Prisma P2002 which must be caught explicitly in the service layer
router.get('/', async (req, res) => {
  const words = await wordsService.listWords(req.user!.userId);
  res.json(words);
});

router.post('/', async (req, res) => {
  const word = await wordsService.createWord(req.user!.userId, req.body);
  res.status(201).json(word);
});
```

[VERIFIED: Context7 /websites/expressjs_en_5]

### Pattern 6: Prisma P2002 unique violation handling

**What:** Catch Prisma's unique constraint error and convert to 409.
**When to use:** `createWord` service function (duplicate `[userId, headword]`).

```typescript
// backend/src/services/words.ts
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export async function createWord(userId: string, data: CreateWordInput) {
  try {
    return await prisma.word.create({
      data: { userId, ...data },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      // Re-throw as a typed error the route handler can catch
      const conflict = new Error('Duplicate headword') as any;
      conflict.statusCode = 409;
      throw conflict;
    }
    throw err;
  }
}
```

Route handler catches the typed error:
```typescript
router.post('/', async (req, res) => {
  try {
    const word = await wordsService.createWord(req.user!.userId, req.body);
    res.status(201).json(word);
  } catch (err: any) {
    if (err.statusCode === 409) {
      res.status(409).json({ error: 'Headword already exists for this user' });
      return;
    }
    throw err; // re-throw for Express 5 global error handler
  }
});
```

[VERIFIED: Prisma docs error codes — P2002 = unique constraint violation. Pattern confirmed by prisma.ts existence and schema @@unique constraint.]

### Pattern 7: Ownership check before PATCH/DELETE

**What:** Verify the word belongs to the authenticated user before mutation.
**When to use:** PATCH `/words/:id` and DELETE `/words/:id`.

```typescript
// backend/src/services/words.ts
export async function getWordForUser(userId: string, wordId: string) {
  const word = await prisma.word.findUnique({ where: { id: wordId } });
  if (!word) throw Object.assign(new Error('Not found'), { statusCode: 404 });
  if (word.userId !== userId) throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
  return word;
}
```

[ASSUMED — no explicit decision in CONTEXT.md but required for AUTH-04: each user sees only their words]

### Pattern 8: SelectField component mirroring Input.tsx

**What:** Reusable `<select>` with label + error, same structure as `Input.tsx`.
**When to use:** gender select, wordClass select in both Add and Edit forms.

```tsx
// frontend/src/features/words/components/SelectField.tsx
// Mirrors Input.tsx pattern exactly (see Input.tsx for reference)
interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  id: string;
  children: React.ReactNode;
}

export function SelectField({ label, error, id, children, className = '', ...props }: SelectFieldProps) {
  return (
    <div className="form-control w-full">
      <label className="label" htmlFor={id}>
        <span className="label-text font-semibold">{label}</span>
      </label>
      <select
        id={id}
        className={`select select-bordered w-full ${error ? 'select-error' : ''} ${className}`}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={!!error}
        {...props}
      >
        {children}
      </select>
      {error && (
        <div className="label">
          <span id={`${id}-error`} className="label-text-alt text-error" role="alert">
            {error}
          </span>
        </div>
      )}
    </div>
  );
}
```

[VERIFIED: Input.tsx read directly — pattern cloned]

### Anti-Patterns to Avoid

- **Global state for modal open/closed:** D-23 locks this to local `useState`. Using Zustand for drawer state adds unnecessary complexity and breaks the single-responsibility principle for modal lifecycle.
- **Optimistic updates:** The phase description explicitly requires "await" behavior (show loading, then close on success). Optimistic updates add rollback complexity with no benefit for this phase's scope.
- **`modal-open` CSS class toggle (DaisyUI v3 pattern):** DaisyUI v4 uses the native `<dialog>` element. Toggling a CSS class does not respect ESC key or browser accessibility APIs. Use `showModal()` / `close()` via `useRef`.
- **Checkbox hack for modal:** DaisyUI docs show this as an alternative but it creates unmanaged DOM state. Avoid in React.
- **Inline Prisma calls in route handlers:** The auth route uses a service import (`../services/auth`). Words must follow the same pattern. Direct Prisma calls in routes makes P2002 handling inconsistent.
- **`isLoading` instead of `isPending`:** TanStack Query v5 renamed `isLoading` to `isPending`. Using `isLoading` will cause TypeScript errors.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Server-state cache invalidation | Custom cache + refetch logic | TanStack Query `invalidateQueries` | Handles stale-while-revalidate, deduplication, background refetch automatically |
| Loading/error state for fetch | `useState` loading flag + try/catch | `useQuery` `{ isPending, isError, data }` | Race conditions in manual state machines are common; TanStack Query handles correctly |
| Loading state on mutations | Manual `useState(false)` + toggle | `useMutation` `{ isPending }` | Mutation state is tracked precisely including concurrent mutation safety |
| Duplicate request deduplication | Custom request tracking | TanStack Query default behavior | Queries with same key are automatically deduplicated |
| Modal accessibility (focus trap, ESC) | Custom keydown handler | Native `<dialog>` + DaisyUI | Browser-native `<dialog>` handles focus trap and ESC key correctly |

**Key insight:** Phase 2 introduces TanStack Query for the first time. The QueryClientProvider is already in `main.tsx` — hooks work immediately. The main trap is using v4 API patterns (they differ in v5).

---

## Common Pitfalls

### Pitfall 1: TanStack Query v4 API used in v5 project
**What goes wrong:** `isLoading` instead of `isPending`; `onError` at query level (removed in v5); `useIsFetching` behavior changed.
**Why it happens:** Training data and many Stack Overflow answers reference v4.
**How to avoid:** Key v5 differences:
  - `isLoading` → `isPending` (for queries with no cached data)
  - Query-level `onError` callback removed — use `useQuery` `throwOnError` + error boundary, or check `isError`
  - `useMutation` `onError` callback still works fine
  - `queryKey` is now required (was optional in v4)
**Warning signs:** TypeScript error `Property 'isLoading' does not exist on type UseQueryResult`

[VERIFIED: Context7 /tanstack/query — status properties doc]

### Pitfall 2: Prisma P2002 not caught → unhandled 500
**What goes wrong:** Creating a word with a duplicate headword (same user) causes Prisma to throw `PrismaClientKnownRequestError` with code `P2002`. Express 5 propagates it as a 500 if not caught.
**Why it happens:** The `@@unique([userId, headword])` constraint is enforced at DB level.
**How to avoid:** Catch `Prisma.PrismaClientKnownRequestError` with `err.code === 'P2002'` in the service layer and re-throw with a 409 status code.
**Warning signs:** Postman returns 500 when posting duplicate headword.

[VERIFIED: prisma/schema.prisma @@unique constraint; Prisma error codes are well-established]

### Pitfall 3: `requireAuth` registered twice (once globally, once on router)
**What goes wrong:** If `requireAuth` is applied in `index.ts` as `app.use('/api/words', requireAuth, wordsRouter)` AND again per-route inside `words.ts`, the middleware runs twice — benign but redundant and confusing.
**Why it happens:** Pattern ambiguity between route-level and router-level middleware.
**How to avoid:** Apply `requireAuth` once at router registration in `index.ts`. Individual route handlers in `words.ts` can assume `req.user` is set.
**Warning signs:** Two auth token verifications in server logs per request.

[VERIFIED: backend/src/index.ts auth pattern: `app.use('/api/auth', authLimiter, authRouter)` — apply same pattern]

### Pitfall 4: DaisyUI modal flicker on first render
**What goes wrong:** The `<dialog>` is rendered in the DOM but `showModal()` is called in `useEffect`. If the component mounts already open (e.g., hot reload), there may be a flash.
**Why it happens:** React renders → paint → effect runs → dialog opens. The gap is visible.
**How to avoid:** Conditionally render the modal only when `open === true`, OR use `useLayoutEffect` instead of `useEffect` for the `showModal()` call.
**Warning signs:** Brief flash of un-opened dialog content on page load.

[ASSUMED — common React + native dialog integration issue; not verified against specific DaisyUI issue tracker]

### Pitfall 5: Ownership not enforced on PATCH/DELETE
**What goes wrong:** User A can PATCH or DELETE User B's words if they know the word ID.
**Why it happens:** `requireAuth` only validates the JWT; it does NOT check resource ownership.
**How to avoid:** Service layer `getWordForUser(userId, wordId)` fetches the word and throws 403 if `word.userId !== req.user.userId`. This must happen BEFORE the update/delete.
**Warning signs:** AUTH-04 ("каждый пользователь бачить тільки свої слова") fails in integration test.

[VERIFIED: backend/src/middleware/auth.ts — requireAuth only verifies JWT, no ownership check]

### Pitfall 6: Prisma singleton lazy import ignored
**What goes wrong:** If `prisma` is imported at module level and `DATABASE_URL` is not yet in `process.env`, Prisma fails to instantiate.
**Why it happens:** Documented in STATE.md — Prisma 6 `prisma.config.ts` reads env vars at module initialization time.
**How to avoid:** Import `prisma` from `'../lib/prisma'` inside functions or at module level in the route/service file (the singleton in `lib/prisma.ts` handles it correctly). Do NOT create a `new PrismaClient()` inline in route files.
**Warning signs:** `Error: Environment variable not found: DATABASE_URL` at startup.

[VERIFIED: backend/src/lib/prisma.ts read directly; STATE.md documents this explicitly]

---

## Code Examples

### Complete wordsApi.ts (axios calls)

```typescript
// frontend/src/features/words/api/wordsApi.ts
import api from '../../../lib/api';

export interface Word {
  id: string;
  headword: string;
  translation: string | null;
  gender: 'masculine' | 'feminine' | 'neuter' | null;
  wordClass: 'noun' | 'verb' | 'adjective' | 'adverb' | 'other' | null;
  difficulty: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | null;
  notes: string | null;
  personalNote: string | null;
  forms: unknown | null;
  examples: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateWordInput {
  headword: string;
  translation?: string;
  gender?: Word['gender'];
  wordClass?: Word['wordClass'];
  notes?: string;
}

export interface UpdateWordInput extends Partial<CreateWordInput> {
  difficulty?: Word['difficulty'];
  personalNote?: string;
}

export const listWords = async (): Promise<Word[]> => {
  const { data } = await api.get('/words');
  return data;
};

export const getWord = async (id: string): Promise<Word> => {
  const { data } = await api.get(`/words/${id}`);
  return data;
};

export const createWord = async (input: CreateWordInput): Promise<Word> => {
  const { data } = await api.post('/words', input);
  return data;
};

export const updateWord = async ({ id, ...input }: UpdateWordInput & { id: string }): Promise<Word> => {
  const { data } = await api.patch(`/words/${id}`, input);
  return data;
};

export const deleteWord = async (id: string): Promise<void> => {
  await api.delete(`/words/${id}`);
};
```

[VERIFIED: Derived from api.ts Axios instance pattern + Prisma schema Word model]

### words.ts backend route registration in index.ts

```typescript
// Addition to backend/src/index.ts
import wordsRouter from './routes/words';

// After authRouter registration:
app.use('/api/words', requireAuth, wordsRouter);
```

[VERIFIED: backend/src/index.ts read directly — follows existing authRouter pattern]

### Enum display map (Ukrainian labels)

```typescript
// frontend/src/features/words/components/WordClassBadge.tsx
const WORD_CLASS_LABELS: Record<string, string> = {
  noun: 'іменник',
  verb: 'дієслово',
  adjective: 'прикметник',
  adverb: 'прислівник',
  other: 'інше',
};

// frontend/src/features/words/components/GenderBadge.tsx
const GENDER_LABELS: Record<string, string> = {
  masculine: 'чоловічий',
  feminine: 'жіночий',
  neuter: 'середній',
};
```

[VERIFIED: 02-UI-SPEC.md Copywriting Contract — enum display values section]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| TanStack Query v4 `isLoading` | v5 `isPending` | v5.0 (2023) | Must use `isPending` — `isLoading` removed from primary status |
| TanStack Query v4 `onError` on `useQuery` | v5 removes query-level `onError` | v5.0 | Use `isError` + `error` destructured from `useQuery` result; mutation `onError` still works |
| DaisyUI v3 `modal-open` CSS class toggle | DaisyUI v4 native `<dialog>` + `showModal()` | v4.0 (2023) | Must use `dialogRef.current.showModal()` and `dialog.close()` — CSS class approach no longer supported |
| Express 4 async handlers need `try/catch` + `next(err)` | Express 5 auto-catches async rejections | Express 5 (2024) | Route handlers can omit `try/catch` for most errors — only explicit status-code errors need catching |

**Deprecated / outdated in this stack:**
- `isLoading` on `useQuery`: use `isPending`
- `modal-open` DaisyUI class: use native dialog API
- Creating a new `PrismaClient()` per request: use singleton from `lib/prisma.ts`

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend runtime | Already running (Phase 1 complete) | — | — |
| PostgreSQL (Neon) | Prisma / word storage | Already migrated (Phase 1) | Prisma 6 schema applied | — |
| npm packages | All | Already installed | See package.json | — |

**No missing dependencies.** All packages installed, database migrated, QueryClientProvider configured.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | WordDetailDrawer three-state machine (view/edit/confirm-delete) is implemented as single component with internal `useState<DrawerMode>` | Architecture Patterns — Pattern 4 | Low — directly derived from D-11, D-13, D-16 decisions; only implementation detail is which state shape |
| A2 | Ownership check pattern (`getWordForUser`) should throw 403 for wrong user, 404 for not found | Pitfall 5, Pattern 7 | Medium — alternative: return 404 for both (security through obscurity). Clarify if needed; 403 is more correct. |
| A3 | `useLayoutEffect` is preferable to `useEffect` for dialog.showModal() to avoid flash | Pitfall 4 | Low — either works; `useEffect` is simpler and the flash is barely perceptible in practice |

---

## Open Questions

1. **GET /words — pagination needed?**
   - What we know: No pagination requirements in WORD-02 through WORD-05. Phase 4 search is the next concern.
   - What's unclear: If a user accumulates 500+ words, a full list load could be slow.
   - Recommendation: Return all words for now. Add `cursor`/`limit` in Phase 4 alongside search. Note this in the plan as a known limitation.

2. **Should `GET /words/:id` be used for detail view or rely on list cache?**
   - What we know: D-22 says invalidate `['words']` query. WordDetailDrawer opens when a row is clicked — word data is already in the list cache.
   - What's unclear: Whether a separate `useQuery(['words', id])` is needed or if word detail is derived from the list.
   - Recommendation: For Phase 2 scope (no additional fields shown beyond list fields), derive detail from `data?.find(w => w.id === selectedWordId)` from the list query. The `GET /words/:id` endpoint should still be implemented (D-19 locks it) but the frontend detail view can read from list cache. This avoids an extra network request.

---

## Project Constraints (from CLAUDE.md)

All of the following are enforced in this phase:

| Directive | How It Applies to Phase 2 |
|-----------|--------------------------|
| Mobile-first UI | All new components use mobile-first Tailwind classes; modal uses `modal-bottom sm:modal-middle` |
| Nynorsk only | No AI prompts in Phase 2; constraint active for Phase 3 |
| gender enum = 3 values (masculine, feminine, neuter — feminine mandatory) | SelectField gender select MUST include all 3 options; never hardcode masculine/neuter only |
| PostgreSQL FTS `pg_catalog.norwegian` | Not applicable in Phase 2 (Phase 4) |
| Frontend structure: `src/features/{auth,words,chat}/` | All new code in `src/features/words/` |
| Prisma singleton lazy import | `import { prisma } from '../lib/prisma'` — never `new PrismaClient()` |
| Toast via `useToastStore` — no inline error banners | All error/success feedback via `toast.error()` / `toast.success()` |
| Commit after each completed task | GSD execution rule |

---

## Sources

### Primary (HIGH confidence)
- `frontend/package.json` — confirmed @tanstack/react-query ^5.100.14, daisyui ^4.12.24, axios ^1.16.1
- `backend/package.json` — confirmed express ^5.2.1, @prisma/client ^6.19.3
- `frontend/src/main.tsx` — QueryClientProvider already configured (staleTime 5min, retry 1)
- `backend/prisma/schema.prisma` — Word model, all enums, @@unique([userId, headword])
- `frontend/src/lib/api.ts` — Axios instance with JWT interceptor
- `frontend/src/lib/toastStore.ts` — toast.success / toast.error helpers
- `frontend/src/components/Button.tsx` — loading prop, aria-busy, variants
- `frontend/src/components/Input.tsx` — label/error/accessibility pattern
- `backend/src/routes/auth.ts` — route pattern with service layer import
- `backend/src/middleware/auth.ts` — requireAuth injects req.user.userId
- Context7 /tanstack/query — quick-start.md, mutations.md, invalidations-from-mutations.md, queries.md status properties
- Context7 /saadeghi/daisyui — modal documentation (showModal native dialog API)
- Context7 /websites/expressjs_en_5 — async error propagation

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — Prisma 6 lazy import constraint documented
- `02-UI-SPEC.md` — DaisyUI classes, layout contracts, copywriting (all locked decisions)
- `02-CONTEXT.md` — All 23 implementation decisions

### Tertiary (LOW confidence)
- Pitfall 4 (modal flicker with useEffect) — common React/dialog integration pattern, not verified against DaisyUI issue tracker

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json
- Architecture: HIGH — route/service pattern verified in existing auth code; TanStack Query verified in Context7
- TanStack Query v5 patterns: HIGH — verified against Context7
- DaisyUI modal pattern: HIGH — verified against Context7 DaisyUI docs
- Pitfalls: HIGH for Prisma P2002, ownership, v4/v5 API differences; MEDIUM for modal flicker

**Research date:** 2026-05-27
**Valid until:** 2026-06-27 (stable libraries; DaisyUI and TanStack Query APIs are stable at these versions)
