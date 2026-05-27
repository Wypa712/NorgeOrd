# Phase 4: Search - Context

**Gathered:** 2026-05-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Search: користувач відкриває вкладку «Словник», бачить search input над списком слів, вводить запит (норвезьке слово або переклад) → з debounce 300-500мс backend виконує FTS-запит (`plainto_tsquery('pg_catalog.norwegian', q)`) → список фільтрується в реальному часі → порожній запит повертає повний список → 0 результатів показує «Нічого не знайшлося для 'X'».

Scope: SRCH-01. AI auto-fill, CRUD операції — поза scope.

</domain>

<decisions>
## Implementation Decisions

### UI Placement
- **D-01:** Search input вбудовується **в існуючий «Словник» таб** (WordsPage, `activeTab === 'dictionary'`) — над `WordList`. Новий таб НЕ створюємо. Мінімальні зміни: WordsPage + WordList.
- **D-02:** Search field — один рядок вводу, placeholder «Пошук у словнику...» або подібний. Без кнопки «Шукати» — тільки debounce.

### Search Trigger
- **D-03:** Debounce **300-500мс** після останнього натискання клавіші. Пустий рядок (або рядок з пробілів) → повертаємо повний список без backend-запиту.
- **D-04:** Frontend state: `searchQuery` зберігається в `WordsPage` (локальний `useState`). useWords hook отримує опціональний `query` параметр.

### Backend API
- **D-05:** **Extend `GET /api/words`** з опціональним query param `?q=`. Якщо `q` відсутній або порожній — повертає весь список (поведінка Phase 2 без змін). Якщо `q` є — виконує FTS. Жодного нового endpoint.
- **D-06:** FTS реалізується через Prisma `$queryRaw` з `plainto_tsquery('pg_catalog.norwegian', q)` по полях `headword` і `translation`. GIN-індекс вже існує (міграція `20260527115317_add_fts_gin_index`).
- **D-07:** Результати повертають той самий shape що і `listWords` (з `tags: { include: { tag: true } }`) — жодних змін у фронтенд-типах.

### Empty & Loading States
- **D-08:** Empty state при 0 результатах: «Нічого не знайшлося для "X"» (де X — поточний запит). Окрема гілка в `WordList` або в `WordsPage`.
- **D-09:** Під час debounce-очікування та HTTP-запиту — той самий skeleton-loader що вже є в `WordList` (`isPending`).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema & FTS Index
- `backend/prisma/schema.prisma` — Word model з полями `headword`, `translation`. GIN-індекс у міграції.
- `backend/prisma/migrations/20260527115317_add_fts_gin_index/` — підтверджує що `tsvector` GIN-індекс вже в БД.

### Existing Backend
- `backend/src/routes/words.ts` — `GET /` (listWords) розширюється `?q=` параметром.
- `backend/src/services/words.ts` — `listWords(userId)` розширюється до `listWords(userId, query?)`. FTS через `$queryRaw`.
- `backend/src/middleware/auth.ts` — `requireAuth` вже захищає `/api/words`.

### Existing Frontend
- `frontend/src/pages/WordsPage.tsx` — `activeTab === 'dictionary'` блок отримує search input + `searchQuery` state.
- `frontend/src/features/words/components/WordList.tsx` — отримує `words` prop, додаємо empty state для «немає результатів».
- `frontend/src/features/words/hooks/useWords.ts` — розширюємо для передачі `q` параметру в GET-запит.
- `frontend/src/lib/api.ts` — Axios instance з JWT, використовується в useWords.

### Project Constraints
- `.planning/REQUIREMENTS.md` — SRCH-01: FTS by Norwegian word or translation.
- `CLAUDE.md` — PostgreSQL FTS: `to_tsvector('pg_catalog.norwegian', ...)` — не `english`, не `simple`.
- `.planning/ROADMAP.md` — Phase 4 Success Criteria: real-time search, Norwegian stemming, empty state.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `WordList` (`frontend/src/features/words/components/WordList.tsx`): вже приймає `words: Word[]` prop — достатньо передати відфільтрований список. Потрібно додати окремий empty state для «0 результатів пошуку» vs «словник порожній».
- `useWords` (`frontend/src/features/words/hooks/useWords.ts`): TanStack Query `useQuery` — розширюємо `queryKey` та URL з `q` параметром.
- `Input` (`frontend/src/components/Input.tsx`): існуючий компонент для search field.
- `WordsPage` (`frontend/src/pages/WordsPage.tsx`): вже має `useState` pattern — додати `searchQuery` + debounce.

### Established Patterns
- TanStack Query v5 `useQuery` з динамічним `queryKey` — `['words', query]` — автоматичний refetch при зміні параметру.
- Toast (top-right, 10s) для помилок — `useToastStore` (якщо search-запит провалиться).
- Mobile-first: AppShell `max-w-7xl mx-auto`, DaisyUI components.
- Feature folder: `frontend/src/features/words/` — нові компоненти/зміни тут.
- `$queryRaw` у Prisma для FTS — дає повний контроль над SQL.

### Integration Points
- `GET /api/words?q=query` → `listWords(userId, query)` → `$queryRaw` FTS → той самий Word[] response shape.
- `useWords(query?)` → `queryKey: ['words', query]` → автоматичне скасування застарілих запитів TanStack Query.
- `WordsPage` debounce → `useWords(debouncedQuery)` → `WordList` відображає результати.

</code_context>

<specifics>
## Specific Ideas

- Debounce можна реалізувати через кастомний `useDebounce(value, 350)` hook (3 рядки) або через `setTimeout`/`clearTimeout` в `useEffect`.
- `plainto_tsquery` краще ніж `to_tsquery` для user input — не вимагає спеціального синтаксису (без `&`, `|`, `!`).
- FTS SQL pattern: `WHERE to_tsvector('pg_catalog.norwegian', headword || ' ' || COALESCE(translation, '')) @@ plainto_tsquery('pg_catalog.norwegian', $1) AND "userId" = $2`
- Якщо `q` < 2 символів — можна скіпнути backend і показати повний список (зменшує шум від поодиноких букв).

</specifics>

<deferred>
## Deferred Ideas

- **Фільтрація за тегами / difficulty** — FLTR-01/FLTR-02, v2 requirements.
- **Пошук у forms/examples** — повнотекстовий пошук у всіх полях, не тільки headword+translation. Ускладнює SQL, не в SRCH-01.
- **Highlight matched text** — підсвічування збігів у результатах. Nice-to-have, v2.
- **Search history** — збереження попередніх запитів. V2.

</deferred>

---

*Phase: 4-Search*
*Context gathered: 2026-05-27*
