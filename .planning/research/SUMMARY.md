# Research Summary — Norwegian Learning Hub

## Recommended Stack

**Core (з SPEC.md — валідовано):**
- Frontend: React 18 + Vite + Tailwind CSS 3.4.x + DaisyUI + Zustand + Axios
- Backend: Node.js + Express 4.19.x + PostgreSQL + Prisma ORM + JWT
- AI: OpenAI API (`gpt-4o-mini` для auto-fill, `gpt-4o` для deep explanations)

**Додаткові бібліотеки (виявлені дослідженням):**
- `@tanstack/react-query` v5 — серверний стан, кешування, loading/error states
- `ai` (Vercel AI SDK v3) — стрімінг OpenAI відповідей, `streamText` + `useChat` hooks
- `express-rate-limit` + `bottleneck` — захист від зловживань і ліміти OpenAI RPM/TPM
- `helmet` — security headers для Express

**Не використовувати:**
- Express 5 (RC, не готовий)
- Tailwind v4 (breaking changes)
- Власне SSE плейбук — замість цього Vercel AI SDK

---

## Table Stakes (v1)

### Аутентифікація
- Реєстрація / вхід / вихід
- Сесія зберігається (JWT)
- Кожен користувач бачить тільки свої слова

### Словник
- Додати слово → AI автоматично заповнює всі поля
- Переглянути список слів
- Пошук по слову або перекладу
- Фільтрація за тегами та рівнем складності
- Детальна картка слова
- Редагування збереженого слова

### AI
- Auto-fill при додаванні: форми (нюнорська парадигма), рід, переклад, приклади, теги, складність
- Structured output (JSON mode) — надійна структура відповіді

## Differentiators (v2+)
- AI-асистент чат на картці слова (per-word Q&A)
- Анки-експорт
- Публічні профілі/шеринг словників

---

## Ключові архітектурні рішення

**Структура фронтенду:** `src/features/{auth,words,chat}/` з першого дня — запобігає God Component.

**AI інтеграція:**
- `POST /api/words` → внутрішньо викликає `AIService.analyze()` → повертає повністю заповнену картку
- Зберігати `rawAiOutput` (raw JSON) для можливого re-parsing у майбутньому
- In-memory cache `Map<headword, AnalysisResult>` для v1

**Схема БД:**
- `gender` — enum з 3 значеннями: `masculine | feminine | neuter` (нюнорськ вимагає feminine!)
- `inflections` — `Json` поле в Prisma (гнучко для розширення форм)
- GIN індекс для full-text search — створювати одразу при першій міграції
- Всі нові поля — nullable або з `@default` (безпечні міграції)

**PostgreSQL FTS:**
- Конфігурація: `to_tsvector('pg_catalog.norwegian', ...)` (не `simple`, не `english`)

---

## Топ-5 Ризиків (Pitfalls)

| # | Ризик | Важливість | Фаза |
|---|-------|-----------|------|
| 1 | **AI повертає Bokmål замість Nynorsk** — мовчки корумпує дані | КРИТИЧНО | Фаза 3 |
| 2 | **Бінарний gender enum** — пропускає feminine | КРИТИЧНО | Фаза 1 (схема) |
| 3 | **Витрати OpenAI без `max_tokens`** — runaway costs | ВИСОКА | Фаза 3 |
| 4 | **FTS без `pg_catalog.norwegian`** — пошук не стемує норвезькі суфікси | ВИСОКА | Фаза 1 (схема) |
| 5 | **Zustand god store** — стає незручним після Phase 2 | СЕРЕДНЯ | Фаза 2 |

**Canary test для Nynorsk:** перевіряти `husa` (не `husene`), `ikkje` (не `ikke`), `eg` (не `jeg`) перед релізом AI фази.

---

## Рекомендований порядок збірки (5 фаз)

| Фаза | Що будуємо | Gate |
|------|-----------|------|
| 1 | Auth + DB foundation + схема | Захищені маршрути працюють, gender/FTS правильні |
| 2 | Core word CRUD (без AI) | Повний lifecycle слова, AI ризик ізольований |
| 3 | AI auto-fill інтеграція | Одне слово → повна картка → canary test passed |
| 4 | Search + фільтрація | Словник навігується |
| 5 | Streaming chat асистент | Per-word AI розмова працює |
