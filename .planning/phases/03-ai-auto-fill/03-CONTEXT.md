# Phase 3: AI Auto-fill - Context

**Gathered:** 2026-05-27
**Status:** Ready for planning

<domain>
## Phase Boundary

AI Auto-fill: користувач вводить одне Nynorsk слово → натискає "AI заповнити" → backend викликає Groq (`llama-3.3-70b-versatile`) через Vercel AI SDK streaming → поля заповнюються в реальному часі → користувач переглядає/редагує → зберігає.

Scope: WORD-01 (forms, gender, translation, examples[], tags[], difficulty). Пошук і FTS — Phase 4.

</domain>

<decisions>
## Implementation Decisions

### AI Provider
- **D-01:** Groq замість OpenAI. Пакет: `@ai-sdk/groq`. Env var: `GROQ_API_KEY`. Модель: `llama-3.3-70b-versatile` (free tier, 128k context).
- **D-02:** `gpt-4o-mini` (з CLAUDE.md) замінюється Groq для Phase 3. CLAUDE.md треба оновити.

### Fill Trigger & Flow (два кроки)
- **D-03:** AddWordDrawer трансформується (не новий компонент): вгорі видно headword-поле + кнопка "🧠 AI заповнити". Решта полів з'являються після AI-відповіді.
- **D-04:** "AI заповнити" — необов'язкова дія. Ручний ввід (headword + поля + "Зберегти") залишається як Phase 2 — без натискання AI-кнопки.
- **D-05:** Після AI-заповнення всі поля редаговані. Користувач може виправити будь-яке поле перед збереженням.
- **D-06:** Кнопка "Зберегти" з'являється після AI-заповнення (або доступна одразу для ручного збереження).

### Streaming
- **D-07:** Vercel AI SDK `streamObject` — поля заповнюються прогресивно по мірі надходження JSON-токенів.
- **D-08:** Окремий endpoint: `POST /api/words/analyze` — повертає AI-результат без збереження в DB. Збереження — окремим `POST /api/words` (існуючий endpoint) після перегляду.
- **D-09:** Під час streaming AI-кнопка — disabled + loading state. Поля заповнюються поступово.

### Forms JSON Shape
- **D-10:** Плоский JSON-об'єкт. Ключі залежать від wordClass:
  - Іменники: `{ "sing_indef": "hus", "sing_def": "huset", "pl_indef": "hus", "pl_def": "husa" }`
  - Дієслова: `{ "inf": "gjera", "pres": "gjer", "past": "gjorde", "past_part": "gjort" }`
  - Прикметники: `{ "positive": "god", "comparative": "betre", "superlative": "best" }`
  - Прислівники / інші: `{}` або null (немає форм)
- **D-11:** UI відображення: compact 2×2 grid-таблиця (label + значення). Mobile-friendly. Відображається в AddWordDrawer після AI-заповнення і в WordDetailDrawer.

### Tags & Difficulty
- **D-12:** AI пропонує теги як chip-список з видаленням (DaisyUI badge). Користувач може видалити небажані до збереження.
- **D-13:** AI пропонує `difficulty` (easy/medium/hard). Поле редаговане — DaisyUI select або radio.

### Error Handling
- **D-14:** AI-помилка (мережа, timeout, некоректна відповідь) → toast через існуючий `useToastStore`.
- **D-15:** Retry = AI-кнопка знову стає активною після toast-помилки. Без окремої retry-кнопки.
- **D-16:** Partial save = стандартна кнопка "Зберегти" працює з будь-якими заповненими полями. Мінімум — тільки headword (вже вистачає для `POST /api/words`).

### Canary Test (CRITICAL)
- **D-17:** AI промпт ОБОВ'ЯЗКОВО перевіряти на canary словах: `husa`, `ikkje`, `eg`. Це Nynorsk форми — якщо AI повертає `huset`/`ikke`/`jeg` — Bokmål, критична помилка.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema & Migrations
- `backend/prisma/schema.prisma` — Word model: `forms Json?`, `examples String[]`, `tags WordTag[]`, `difficulty Difficulty?`. Gender enum (masculine/feminine/neuter). WordClass enum.
- `backend/prisma/migrations/` — поточна схема БД

### Existing Backend (Phase 2 handoff)
- `backend/src/routes/words.ts` — існуючі endpoints. `POST /api/words/analyze` додається тут або в окремому файлі.
- `backend/src/services/words.ts` — `createWord`, `updateWord` — використовуються після AI-заповнення для збереження.
- `backend/src/middleware/auth.ts` — `requireAuth` обов'язковий для `/api/words/analyze`.

### Existing Frontend (Phase 2 handoff)
- `frontend/src/features/words/components/AddWordDrawer.tsx` — компонент трансформується в Phase 3.
- `frontend/src/features/words/components/WordDetailDrawer.tsx` — треба додати відображення `forms` таблиці та `tags` chips.
- `frontend/src/lib/api.ts` — Axios instance з JWT. Використовується для `POST /api/words/analyze`.
- `frontend/src/lib/toastStore.ts` — для error toast AI-помилок.

### AI & Streaming
- `CLAUDE.md` — Stack: Vercel AI SDK (`ai` пакет) для стрімінгу. Nynorsk only. Canary words: `husa`, `ikkje`, `eg`.
- `.planning/REQUIREMENTS.md` — WORD-01: форми, рід, переклад, приклади, теги, рівень складності.
- `.planning/STATE.md` — Active Risks: "AI returning Bokmål instead of Nynorsk (CRITICAL)"

### Project Constraints
- `.planning/PROJECT.md` — Core Value: одне поле → AI заповнює все → збережено.
- `.planning/phases/02-core-word-crud/02-CONTEXT.md` — Phase 2 decisions (toast patterns, TanStack Query, drawer patterns).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AddWordDrawer` (`frontend/src/features/words/components/AddWordDrawer.tsx`): трансформується — headword input вже є, mutation через `useCreateWord`. Треба додати AI-кнопку + streaming state.
- `useCreateWord` hook: `POST /api/words` — використовується після AI-заповнення для збереження.
- `useToastStore` (`frontend/src/lib/toastStore.ts`): error toast для AI-помилок (consistent з Phase 1/2).
- `SelectField`, `Input`, `Button` — існуючі компоненти для полів форми.
- `GenderBadge`, `WordClassBadge` — можуть використовуватися в AI-результаті preview.
- `WordDetailDrawer` — треба оновити для `forms` таблиці та `tags` chips.

### Established Patterns
- TanStack Query v5 (`useQuery`/`useMutation`) для server state — встановлено в Phase 2.
- Toast (top-right, 10s) для success/error — НЕ inline банери (Phase 1 рішення).
- Mobile-first: AppShell `max-w-7xl mx-auto`, DaisyUI components.
- Feature folder: `frontend/src/features/words/` для нових hooks і компонентів.
- Backend service layer: `backend/src/services/words.ts` — нова AI service в `backend/src/services/ai.ts`.

### Integration Points
- `POST /api/words/analyze` — новий endpoint, монтується в `backend/src/routes/words.ts` або новий `backend/src/routes/ai.ts`.
- `backend/src/index.ts` — якщо новий router, реєструється тут.
- Vercel AI SDK: `streamObject` з `@ai-sdk/groq` — backend стрімить SSE-відповідь → frontend Vercel AI SDK client читає stream.
- `frontend/src/features/words/hooks/` — новий `useAnalyzeWord` hook для streaming виклику.

</code_context>

<specifics>
## Specific Ideas

- Canary слова для ручного тестування промпту: `husa` (pl.def іменника `hus`), `ikkje` (Nynorsk "не"), `eg` (Nynorsk "я"). Якщо модель повертає `huset`/`ikke`/`jeg` — Bokmål, критична помилка.
- Groq free tier: rate limits (~30 req/min, 14400 req/day) — для особистого використання достатньо. Не потрібен retry на rate limit в MVP.
- `streamObject` Vercel AI SDK: Zod schema для валідації AI-відповіді — гарантує типи на backend перед стрімінгом до frontend.

</specifics>

<deferred>
## Deferred Ideas

- **Ручне додавання тегів** — тільки видалення AI-запропонованих. Ручний ввід нових тегів — можливо Phase 4 або v2.
- **Фільтрація за тегами/difficulty** — FLTR-01/FLTR-02 (v2 requirements, не v1).
- **AI chat per word (AIXT-01/02)** — v2, не Phase 3.
- **Rate limit handling UX** — для особистого використання not critical в MVP.

</deferred>

---

*Phase: 3-AI Auto-fill*
*Context gathered: 2026-05-27*
