# Phase 2: Core Word CRUD - Pattern Map

**Mapped:** 2026-05-27
**Files analyzed:** 16 new/modified files
**Analogs found:** 16 / 16

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `backend/src/routes/words.ts` | route | CRUD | `backend/src/routes/auth.ts` | role-match |
| `backend/src/services/words.ts` | service | CRUD | `backend/src/routes/auth.ts` (inline Prisma pattern) | role-match |
| `backend/src/index.ts` (modify) | config | request-response | `backend/src/index.ts` (existing) | exact |
| `frontend/src/features/words/api/wordsApi.ts` | utility | request-response | `frontend/src/lib/api.ts` | role-match |
| `frontend/src/features/words/hooks/useWords.ts` | hook | CRUD | — | no-analog (first TanStack Query use) |
| `frontend/src/features/words/hooks/useWord.ts` | hook | CRUD | — | no-analog |
| `frontend/src/features/words/hooks/useCreateWord.ts` | hook | CRUD | — | no-analog |
| `frontend/src/features/words/hooks/useUpdateWord.ts` | hook | CRUD | — | no-analog |
| `frontend/src/features/words/hooks/useDeleteWord.ts` | hook | CRUD | — | no-analog |
| `frontend/src/features/words/components/WordList.tsx` | component | CRUD | `frontend/src/features/auth/LoginForm.tsx` (list layout ref) | partial |
| `frontend/src/features/words/components/WordListRow.tsx` | component | CRUD | `frontend/src/features/auth/LoginForm.tsx` | partial |
| `frontend/src/features/words/components/WordClassBadge.tsx` | component | transform | `frontend/src/components/Button.tsx` | partial |
| `frontend/src/features/words/components/GenderBadge.tsx` | component | transform | `frontend/src/components/Button.tsx` | partial |
| `frontend/src/features/words/components/SelectField.tsx` | component | request-response | `frontend/src/components/Input.tsx` | exact |
| `frontend/src/features/words/components/AddWordDrawer.tsx` | component | CRUD | `frontend/src/features/auth/RegisterForm.tsx` | role-match |
| `frontend/src/features/words/components/WordDetailDrawer.tsx` | component | CRUD | `frontend/src/features/auth/LoginForm.tsx` | role-match |
| `frontend/src/features/words/components/FAB.tsx` | component | event-driven | `frontend/src/components/Button.tsx` | partial |
| `frontend/src/pages/WordsPage.tsx` (replace) | component | CRUD | `frontend/src/features/auth/AuthLayout.tsx` (page shell) | partial |

---

## Pattern Assignments

### `backend/src/routes/words.ts` (route, CRUD)

**Analog:** `backend/src/routes/auth.ts`

**Imports pattern** (auth.ts lines 1-4):
```typescript
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { hashPassword, comparePassword, signToken } from '../services/auth';
import { requireAuth } from '../middleware/auth';
```

Words version:
```typescript
import { Router } from 'express';
import * as wordsService from '../services/words';

const router = Router();
// requireAuth is applied at registration in index.ts — NOT per-route here (Pitfall 3)
```

**Core CRUD pattern** (auth.ts lines 8-33 for handler shape):
```typescript
// Express 5: async errors auto-propagate — no try/catch for most handlers
router.get('/', async (req, res) => {
  const words = await wordsService.listWords(req.user!.userId);
  res.json(words);
});

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

**Validation pattern** (auth.ts lines 11-18 — manual guard):
```typescript
// Manual field presence check before service call
if (!email || typeof email !== 'string' || !email.includes('@')) {
  res.status(400).json({ error: 'Valid email is required' });
  return;
}
```
For words: check `headword` is a non-empty string; wordClass/gender must be valid enum values if provided.

**409 conflict pattern** (auth.ts lines 20-24):
```typescript
const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
if (existing) {
  res.status(409).json({ error: 'Email already registered' });
  return;
}
```
For words: conflict is caught via Prisma P2002 in service layer (different approach — see service pattern).

**Error response shape** (auth.ts — consistent throughout):
```typescript
res.status(4xx).json({ error: 'Human-readable message' });
```
Always `{ error: string }` for errors; bare object for success.

---

### `backend/src/services/words.ts` (service, CRUD)

**Analog:** `backend/src/routes/auth.ts` (inline Prisma calls — service extracts these)

**Imports pattern** (lib/prisma.ts lines 1-9 + Prisma namespace):
```typescript
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
```
NEVER `new PrismaClient()` — always import the singleton.

**Prisma singleton** (prisma.ts lines 1-9):
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

**P2002 unique violation pattern** (derived from Prisma docs, RESEARCH.md Pattern 6):
```typescript
export async function createWord(userId: string, data: CreateWordInput) {
  try {
    return await prisma.word.create({
      data: { userId, ...data },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const conflict = new Error('Duplicate headword') as any;
      conflict.statusCode = 409;
      throw conflict;
    }
    throw err;
  }
}
```

**Ownership check pattern** (RESEARCH.md Pattern 7):
```typescript
export async function getWordForUser(userId: string, wordId: string) {
  const word = await prisma.word.findUnique({ where: { id: wordId } });
  if (!word) throw Object.assign(new Error('Not found'), { statusCode: 404 });
  if (word.userId !== userId) throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
  return word;
}
```
Call before every PATCH and DELETE.

**Prisma Word model fields** (schema.prisma lines 43-68):
```prisma
model Word {
  id           String      @id @default(cuid())
  userId       String
  headword     String
  translation  String?
  gender       Gender?        // masculine | feminine | neuter
  wordClass    WordClass?     // noun | verb | adjective | adverb | other
  forms        Json?
  examples     String[]
  notes        String?
  difficulty   Difficulty?    // A1 | A2 | B1 | B2 | C1 | C2
  personalNote String?
  @@unique([userId, headword])
}
```

---

### `backend/src/index.ts` (modify — router registration)

**Analog:** `backend/src/index.ts` lines 32 — existing authRouter registration

**Pattern to copy** (index.ts line 32):
```typescript
app.use('/api/auth', authLimiter, authRouter);
```

**Words registration** — add after authRouter line:
```typescript
import wordsRouter from './routes/words';
import { requireAuth } from './middleware/auth';

app.use('/api/words', requireAuth, wordsRouter);
```
No rate limiter on words (not auth). `requireAuth` applied here once — NOT inside words.ts routes.

---

### `frontend/src/features/words/api/wordsApi.ts` (utility, request-response)

**Analog:** `frontend/src/lib/api.ts`

**Imports pattern** (api.ts lines 1-2):
```typescript
import axios from 'axios';
import { useAuthStore } from '../features/auth/authStore';
```

wordsApi.ts version:
```typescript
import api from '../../../lib/api';
// api instance already has JWT interceptor and base URL — import it, don't recreate
```

**Axios call pattern** (LoginForm.tsx lines 54-57):
```typescript
const { data } = await api.post<AuthResponse>('/auth/login', {
  email: email.trim().toLowerCase(),
  password,
});
```

Words version (destructure `data` from response):
```typescript
export const listWords = async (): Promise<Word[]> => {
  const { data } = await api.get('/words');
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

**Type definitions** (derived from schema.prisma Word model):
```typescript
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
```

---

### `frontend/src/features/words/hooks/useWords.ts` (hook, CRUD)

**Analog:** No existing TanStack Query hooks in codebase. Use RESEARCH.md Pattern 1.

**Pattern** (RESEARCH.md Pattern 1):
```typescript
import { useQuery } from '@tanstack/react-query';
import { listWords } from '../api/wordsApi';

export function useWords() {
  return useQuery({
    queryKey: ['words'],
    queryFn: listWords,
  });
}
// Destructure: const { data: words, isPending, isError } = useWords();
// NOTE: isPending not isLoading (TanStack Query v5 rename)
```

---

### `frontend/src/features/words/hooks/useCreateWord.ts` (hook, CRUD)

**Analog:** No existing mutation hooks. Use RESEARCH.md Pattern 2.

**Toast error handling pattern** (LoginForm.tsx lines 60-68 — copy error detection approach):
```typescript
} catch (err: unknown) {
  const status = (err as { response?: { status: number } })?.response?.status;
  const message = ((err as { response?: { data?: ApiError } })?.response?.data as ApiError)?.error;

  if (status === 409) {
    toast.error('Цей email вже зареєстрований');
  } else {
    toast.error(message ?? 'Помилка сервера. Спробуйте ще раз.');
  }
}
```

**useMutation pattern** (RESEARCH.md Pattern 2):
```typescript
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
        toast.error('Це слово вже є у вашому словнику');
      } else {
        toast.error('Не вдалося зберегти слово. Спробуйте ще раз.');
      }
    },
  });
}
// Loading state: mutation.isPending (not isLoading)
// Trigger: mutation.mutate(data)
```

---

### `frontend/src/features/words/hooks/useUpdateWord.ts` (hook, CRUD)

**Analog:** Same useMutation pattern as useCreateWord.ts.

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateWord } from '../api/wordsApi';
import { toast } from '../../../lib/toastStore';

export function useUpdateWord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateWord, // expects { id, ...fields }
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['words'] });
      toast.success('Зміни збережено');
    },
    onError: () => {
      toast.error('Не вдалося зберегти зміни. Спробуйте ще раз.');
    },
  });
}
```

---

### `frontend/src/features/words/hooks/useDeleteWord.ts` (hook, CRUD)

**Analog:** Same useMutation pattern.

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteWord } from '../api/wordsApi';
import { toast } from '../../../lib/toastStore';

export function useDeleteWord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWord, // expects word id: string
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['words'] });
      // No toast needed — drawer closes (visual confirmation)
    },
    onError: () => {
      toast.error('Не вдалося видалити слово. Спробуйте ще раз.');
    },
  });
}
```

---

### `frontend/src/features/words/components/SelectField.tsx` (component, request-response)

**Analog:** `frontend/src/components/Input.tsx` — EXACT pattern clone

**Full pattern to copy** (Input.tsx lines 1-35):
```typescript
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  id: string;
}

export function Input({ label, error, id, className = '', ...props }: InputProps) {
  return (
    <div className="form-control w-full">
      <label className="label" htmlFor={id}>
        <span className="label-text font-semibold">{label}</span>
      </label>
      <input
        id={id}
        className={`input input-bordered w-full ${error ? 'input-error' : ''} ${className}`}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={!!error}
        {...props}
      />
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

SelectField substitutes `<input className="input input-bordered">` with `<select className="select select-bordered">` and accepts `children` for `<option>` elements. All `form-control`, `label`, error display, and aria attributes are identical.

---

### `frontend/src/features/words/components/AddWordDrawer.tsx` (component, CRUD)

**Analog:** `frontend/src/features/auth/RegisterForm.tsx`

**Form state pattern** (RegisterForm.tsx lines 15-21):
```typescript
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [emailError, setEmailError] = useState('');
const [loading, setLoading] = useState(false);
const [submitted, setSubmitted] = useState(false);
```
For AddWordDrawer: replace with `headword`, `translation`, `gender`, `wordClass`, `notes` + per-field error states.

**Validation pattern** (RegisterForm.tsx lines 28-55):
```typescript
function validate(): boolean {
  let valid = true;
  if (!email.trim()) {
    setEmailError("Email обов'язковий");
    valid = false;
  } else {
    setEmailError('');
  }
  return valid;
}
```
For AddWordDrawer: validate only `headword` (required). Other fields optional.

**Submit + toast pattern** (RegisterForm.tsx lines 57-84):
```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setSubmitted(true);
  if (!validate()) return;
  setLoading(true);
  try {
    // ... API call
  } catch (err: unknown) {
    const status = (err as { response?: { status: number } })?.response?.status;
    if (status === 409) {
      toast.error('Цей email вже зареєстрований');
    } else {
      toast.error(message ?? 'Помилка сервера. Спробуйте ще раз.');
    }
  } finally {
    setLoading(false);
  }
}
```
For AddWordDrawer: use `useMutation` hook instead of raw `api.post` + manual loading state. The mutation's `onSuccess`/`onError` handles toasts.

**DaisyUI modal pattern** (RESEARCH.md Pattern 3 — no existing analog):
```typescript
import { useRef, useEffect } from 'react';

export function AddWordDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) dialog.showModal();
    else dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="modal modal-bottom sm:modal-middle"
      onClose={onClose}
    >
      <div className="modal-box max-w-lg w-full mx-auto">
        {/* form content */}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit" onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
```

**Button usage pattern** (LoginForm.tsx lines 110-112):
```typescript
<Button type="submit" block loading={loading}>
  {loading ? 'Зберігаю…' : 'Зберегти'}
</Button>
```
For cancel: `<Button type="button" variant="ghost" onClick={onClose}>Скасувати</Button>`

---

### `frontend/src/features/words/components/WordDetailDrawer.tsx` (component, CRUD)

**Analog:** `frontend/src/features/auth/LoginForm.tsx` (form with internal state)

**Three-state internal machine** (no existing analog — derived from D-11, D-13, D-16):
```typescript
type DrawerMode = 'view' | 'edit' | 'confirm-delete';
const [mode, setMode] = useState<DrawerMode>('view');
// Reset on open: useEffect(() => { if (open) setMode('view'); }, [open]);
```

**Modal shell**: Same `useRef` + `useEffect` + `<dialog>` pattern as AddWordDrawer above.

**Form field population** (RegisterForm.tsx lines 14-18 — controlled state pattern):
```typescript
// In edit mode, initialize from word prop:
const [headword, setHeadword] = useState(word.headword);
const [translation, setTranslation] = useState(word.translation ?? '');
// ... etc
// Re-initialize when word changes: useEffect(() => { setHeadword(word.headword); ... }, [word]);
```

**Button variants** (Button.tsx lines 18-22):
```typescript
// View mode buttons:
<Button variant="ghost" onClick={() => setMode('edit')}>Редагувати</Button>
<Button variant="error" onClick={() => setMode('confirm-delete')}>Видалити</Button>

// Edit mode buttons:
<Button type="submit" loading={updateMutation.isPending}>Зберегти</Button>
<Button variant="ghost" type="button" onClick={() => setMode('view')}>Скасувати</Button>

// Confirm-delete mode buttons:
<Button variant="error" loading={deleteMutation.isPending} onClick={handleDelete}>Видалити</Button>
<Button variant="ghost" type="button" onClick={() => setMode('view')}>Скасувати</Button>
```

---

### `frontend/src/features/words/components/WordList.tsx` (component, CRUD)

**Analog:** `frontend/src/components/AppShell.tsx` (layout container pattern)

**Container pattern** (AppShell.tsx lines 20-36):
```typescript
<div className="min-h-screen bg-base-100">
  <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
</div>
```

WordList — compact flex column:
```typescript
// D-01: compact flex rows (not cards/grid)
<ul className="divide-y divide-base-200">
  {words.map((word) => (
    <WordListRow key={word.id} word={word} onClick={() => onSelect(word.id)} />
  ))}
</ul>
```

**Empty/loading/error state** (derived from auth patterns — no exact analog):
```typescript
if (isPending) return <div className="flex justify-center py-12"><span className="loading loading-spinner" /></div>;
if (isError) return <p className="text-error text-center py-8">Помилка завантаження слів</p>;
if (!words?.length) return <p className="text-base-content/50 text-center py-12">Слів ще немає. Додайте перше слово!</p>;
```

---

### `frontend/src/features/words/components/WordListRow.tsx` (component, CRUD)

**Badge pattern** (Button.tsx lines 18-22 for variant/conditional class approach):
```typescript
// D-02: headword + translation + gender badge (conditional) + wordClass badge
<li
  className="flex items-center gap-3 px-4 py-3 hover:bg-base-200 cursor-pointer active:bg-base-300"
  onClick={onClick}
>
  <span className="font-medium flex-1">{word.headword}</span>
  {word.translation && <span className="text-base-content/60 text-sm truncate max-w-[120px]">{word.translation}</span>}
  <div className="flex gap-1 shrink-0">
    {word.gender && <GenderBadge gender={word.gender} />}
    {word.wordClass && <WordClassBadge wordClass={word.wordClass} />}
  </div>
</li>
```

---

### `frontend/src/features/words/components/WordClassBadge.tsx` (component, transform)

**Analog:** `frontend/src/components/Button.tsx` (variant → class mapping pattern)

**Variant-to-class map pattern** (Button.tsx lines 18-22):
```typescript
const variantClass = {
  primary: 'btn-primary',
  ghost: 'btn-ghost',
  error: 'btn-error',
}[variant];
```

WordClassBadge version:
```typescript
const WORD_CLASS_LABELS: Record<string, string> = {
  noun: 'іменник', verb: 'дієслово', adjective: 'прикметник',
  adverb: 'прислівник', other: 'інше',
};
const WORD_CLASS_COLORS: Record<string, string> = {
  noun: 'badge-primary', verb: 'badge-secondary',
  adjective: 'badge-accent', adverb: 'badge-ghost', other: 'badge-neutral',
};

export function WordClassBadge({ wordClass }: { wordClass: string }) {
  return (
    <span className={`badge badge-sm ${WORD_CLASS_COLORS[wordClass] ?? 'badge-neutral'}`}>
      {WORD_CLASS_LABELS[wordClass] ?? wordClass}
    </span>
  );
}
```

---

### `frontend/src/features/words/components/GenderBadge.tsx` (component, transform)

**Analog:** Same Button.tsx variant-to-class pattern as WordClassBadge.

```typescript
const GENDER_LABELS: Record<string, string> = {
  masculine: 'ч', feminine: 'ж', neuter: 'с',  // abbreviated for compact row
};
const GENDER_COLORS: Record<string, string> = {
  masculine: 'badge-info', feminine: 'badge-warning', neuter: 'badge-ghost',
};

export function GenderBadge({ gender }: { gender: string }) {
  return (
    <span className={`badge badge-sm ${GENDER_COLORS[gender] ?? 'badge-ghost'}`}>
      {GENDER_LABELS[gender] ?? gender}
    </span>
  );
}
// NOTE: feminine MUST be included — CLAUDE.md constraint
```

---

### `frontend/src/features/words/components/FAB.tsx` (component, event-driven)

**Analog:** `frontend/src/components/Button.tsx`

**Button pattern** (Button.tsx lines 24-35):
```typescript
<button
  className={`btn ${variantClass} ${block ? 'btn-block' : ''} ${className}`}
  disabled={disabled || loading}
  aria-busy={loading}
  {...props}
>
```

FAB version — fixed position, circular:
```typescript
export function FAB({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="btn btn-primary btn-circle btn-lg fixed bottom-6 right-6 shadow-lg z-20"
      onClick={onClick}
      aria-label="Додати слово"
    >
      <svg ...>+</svg>  {/* or text "+" */}
    </button>
  );
}
```

---

### `frontend/src/pages/WordsPage.tsx` (replace placeholder, CRUD)

**Analog:** `frontend/src/features/auth/AuthLayout.tsx` (page-level state + component composition)

**Page state pattern** — local useState for drawer (D-23):
```typescript
const [addDrawerOpen, setAddDrawerOpen] = useState(false);
const [selectedWordId, setSelectedWordId] = useState<string | null>(null);

const { data: words, isPending, isError } = useWords();
```

**AppShell usage** (AppShell.tsx lines 10-36 — wrap all page content):
```typescript
import AppShell from '../components/AppShell';

export default function WordsPage() {
  // ... state
  return (
    <AppShell>
      <WordList words={words ?? []} isPending={isPending} isError={isError} onSelect={setSelectedWordId} />
      <FAB onClick={() => setAddDrawerOpen(true)} />
      <AddWordDrawer open={addDrawerOpen} onClose={() => setAddDrawerOpen(false)} />
      <WordDetailDrawer
        wordId={selectedWordId}
        words={words ?? []}
        open={selectedWordId !== null}
        onClose={() => setSelectedWordId(null)}
      />
    </AppShell>
  );
}
```

---

## Shared Patterns

### Authentication Middleware
**Source:** `backend/src/middleware/auth.ts` lines 12-26
**Apply to:** Registration in `backend/src/index.ts` — `app.use('/api/words', requireAuth, wordsRouter)`
```typescript
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed token' });
    return;
  }
  const token = header.slice(7);
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
// After requireAuth: req.user!.userId is available in all route handlers
```

### Error Response Shape
**Source:** `backend/src/routes/auth.ts` — consistent throughout
**Apply to:** All `backend/src/routes/words.ts` and `backend/src/services/words.ts`
```typescript
// Errors:  res.status(4xx).json({ error: 'Human-readable message' })
// Success: res.json(object) or res.status(201).json(object)
// Never wrap in { data: ... } envelope (auth.ts does not use envelope)
```

### Toast Error Handling
**Source:** `frontend/src/features/auth/LoginForm.tsx` lines 60-68 + `frontend/src/lib/toastStore.ts` lines 42-46
**Apply to:** All mutation hooks (`useCreateWord`, `useUpdateWord`, `useDeleteWord`)
```typescript
// Import:
import { toast } from '../../../lib/toastStore';

// Usage (direct, not via hook):
toast.success('Слово збережено');
toast.error('Не вдалося зберегти слово. Спробуйте ще раз.');
// toast.error is default type in useToastStore — can pass 'error' | 'success' | 'info'
```

### Prisma Singleton Import
**Source:** `backend/src/lib/prisma.ts` lines 1-9
**Apply to:** `backend/src/services/words.ts` — ONLY import pattern, never `new PrismaClient()`
```typescript
import { prisma } from '../lib/prisma';
// prisma singleton handles global caching in dev (prevents hot-reload exhaustion)
```

### Axios Instance Import
**Source:** `frontend/src/lib/api.ts` lines 1-15
**Apply to:** `frontend/src/features/words/api/wordsApi.ts`
```typescript
import api from '../../../lib/api';
// api instance: baseURL already set, JWT Bearer token injected via interceptor,
// 401 response auto-triggers logout via useAuthStore.getState().logout()
```

### Component Accessibility Pattern
**Source:** `frontend/src/components/Input.tsx` lines 15-22
**Apply to:** `SelectField.tsx`, form elements in `AddWordDrawer.tsx`, `WordDetailDrawer.tsx`
```typescript
// id + htmlFor linkage
// aria-describedby={error ? `${id}-error` : undefined}
// aria-invalid={!!error}
// role="alert" on error span
```

### Button Loading State
**Source:** `frontend/src/components/Button.tsx` lines 24-35
**Apply to:** All submit buttons in `AddWordDrawer.tsx`, `WordDetailDrawer.tsx`
```typescript
<Button type="submit" block loading={mutation.isPending}>
  {mutation.isPending ? 'Зберігаю…' : 'Зберегти'}
</Button>
// disabled prop not needed — Button.tsx auto-disables when loading=true
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `frontend/src/features/words/hooks/useWords.ts` | hook | CRUD | No TanStack Query hooks exist yet — first use in Phase 2 |
| `frontend/src/features/words/hooks/useWord.ts` | hook | CRUD | Same — no existing query hooks |
| `frontend/src/features/words/hooks/useCreateWord.ts` | hook | CRUD | Same — no existing mutation hooks |
| `frontend/src/features/words/hooks/useUpdateWord.ts` | hook | CRUD | Same |
| `frontend/src/features/words/hooks/useDeleteWord.ts` | hook | CRUD | Same |

**Resolution:** Use RESEARCH.md Patterns 1 & 2 (TanStack Query v5 useQuery/useMutation). Both verified against Context7 TanStack Query docs. Key v5 differences: `isPending` not `isLoading`; `queryKey` required; query-level `onError` removed.

---

## Critical Constraints Recap

| Constraint | Source | Applies To |
|------------|--------|------------|
| gender enum must include `feminine` | `CLAUDE.md` | `SelectField` gender options, `GenderBadge`, backend enum validation |
| `isPending` not `isLoading` | RESEARCH.md Pitfall 1 | All TanStack Query hooks |
| `requireAuth` once at index.ts, not per-route in words.ts | RESEARCH.md Pitfall 3 | `backend/src/index.ts` registration |
| P2002 caught in service layer, not route handler | RESEARCH.md Pattern 6 | `backend/src/services/words.ts` createWord |
| Ownership check before PATCH/DELETE | RESEARCH.md Pattern 7 | `backend/src/services/words.ts` updateWord, deleteWord |
| `modal-bottom sm:modal-middle` DaisyUI class | RESEARCH.md Pattern 3 | `AddWordDrawer`, `WordDetailDrawer` |
| `dialog.showModal()` / `dialog.close()` via useRef | RESEARCH.md Pattern 3 | Both drawer components |
| Drawer open/close → local `useState` only (D-23) | `02-CONTEXT.md` D-23 | `WordsPage.tsx` |

---

## Metadata

**Analog search scope:** `backend/src/routes/`, `backend/src/middleware/`, `backend/src/lib/`, `backend/prisma/`, `frontend/src/features/auth/`, `frontend/src/components/`, `frontend/src/lib/`, `frontend/src/pages/`
**Files scanned:** 12 source files read directly
**Pattern extraction date:** 2026-05-27
