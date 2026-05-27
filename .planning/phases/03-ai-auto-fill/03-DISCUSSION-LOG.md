# Phase 3: AI Auto-fill - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-27
**Phase:** 3-ai-auto-fill
**Areas discussed:** Fill trigger & flow, Streaming vs. spinner, Forms JSON shape, Error & partial save UX, Tags display, AI Provider

---

## Fill Trigger & Flow

### Q1: Коли AI kickається?

| Option | Description | Selected |
|--------|-------------|----------|
| Два кроки | Headword + "🧠 AI заповнити" → поля → review → "Зберегти" | ✓ |
| Один крок | Headword + "Зберегти з AI" → fill+save в одну дію | |
| Авто-тригер на blur | Автоматично після виходу з headword поля | |

**User's choice:** Два кроки
**Notes:** Повний контроль, видно помилки AI перед збереженням.

### Q2: Як трансформувати AddWordDrawer?

| Option | Description | Selected |
|--------|-------------|----------|
| Трансформувати існуючий | AddWordDrawer оновлюється — один компонент | ✓ |
| Новий AIFillDrawer | Окремий компонент, старий залишається для ручного вводу | |
| Два режими в одному | Toggle "AI" / "Ручний" в одному drawer | |

**User's choice:** Трансформувати існуючий
**Notes:** Менше коду, легше підтримувати.

### Q3: Поля редаговані після AI-заповнення?

| Option | Description | Selected |
|--------|-------------|----------|
| Так, всі поля редаговані | AI заповнює, але можна редагувати перед збереженням | ✓ |
| Ні, read-only | AI-значення не редаговані, редагування — після збереження | |

**User's choice:** Так, всі поля редаговані

### Q4: Ручний ввід залишається?

| Option | Description | Selected |
|--------|-------------|----------|
| Так, ручний ввід залишається | "AI заповнити" — необов'язкова дія | ✓ |
| Ні, AI обов'язковий | "Зберегти" тільки після AI-заповнення | |

**User's choice:** Так, ручний ввід залишається

---

## Streaming vs. Spinner

### Q1: Анімація під час AI-роботи

| Option | Description | Selected |
|--------|-------------|----------|
| Streaming полів | Vercel AI SDK `streamObject` — прогресивне заповнення | ✓ |
| Один запит (spinner) | Spinner до отримання повної відповіді | |

**User's choice:** Streaming полів

### Q2: Endpoint для AI-виклику

| Option | Description | Selected |
|--------|-------------|----------|
| POST /api/words/analyze | Окремий endpoint, не зберігає в DB | ✓ |
| POST /api/words з AI | Існуючий endpoint викликає AI + зберігає | |

**User's choice:** POST /api/words/analyze

---

## Forms JSON Shape

### Q1: Структура `forms` JSON

| Option | Description | Selected |
|--------|-------------|----------|
| {плоский об'єкт} | `{sing_indef: "hus", sing_def: "huset", ...}` | ✓ |
| {вкладки за wordClass} | `{noun: {...}, verb: {...}}` | |

**User's choice:** Плоский об'єкт

### Q2: Ключі в `forms` JSON

| Option | Description | Selected |
|--------|-------------|----------|
| Nynorsk-ключі | sing_indef/sing_def/pl_indef/pl_def, inf/pres/past/past_part | ✓ |
| Norwegian стандартні | bestemt_entall/ubestemt_entall/... | |

**User's choice:** Nynorsk-ключі

### Q3: Відображення форм в UI

| Option | Description | Selected |
|--------|-------------|----------|
| Таблиця 2×2 | Compact grid: label + значення | ✓ |
| Простий перелік | label: value список | |

**User's choice:** Таблиця 2×2 (mobile-friendly)

---

## Error & Partial Save UX

### Q1: Де показати AI-помилку

| Option | Description | Selected |
|--------|-------------|----------|
| Інлайн в drawer | Error-рядок під AI-кнопкою + Retry | |
| Toast-повідомлення | Існуючий useToastStore | ✓ |

**User's choice:** Toast
**Notes:** Узгоджується з Phase 1/2 рішенням — toast для всього feedback.

### Q2: Retry механізм

| Option | Description | Selected |
|--------|-------------|----------|
| AI-кнопка знову активна | Простий retry = натиснути знову | ✓ |
| Retry кнопка в toast | Toast з action-кнопкою | |

**User's choice:** AI-кнопка знову активна

### Q3: Partial save

| Option | Description | Selected |
|--------|-------------|----------|
| Стандартне "Зберегти" працює | Ручний ввід + звичайне збереження | ✓ |
| Explicit "Зберегти без AI" | Окрема кнопка після помилки | |

**User's choice:** Стандартне "Зберегти" працює

---

## Tags Display

### Q1: AI-запропоновані теги

| Option | Description | Selected |
|--------|-------------|----------|
| Chip-список з видаленням | DaisyUI badge, click × для видалення | ✓ |
| Text input | Comma-separated editing | |

**User's choice:** Chip-список з видаленням

---

## AI Provider (user-initiated зміна)

Під час обговорення Error UX користувач повідомив, що хоче використовувати Groq (безкоштовний) замість OpenAI API (платний).

| Option | Description | Selected |
|--------|-------------|----------|
| llama-3.3-70b-versatile | Groq free tier, найпотужніша вільна модель, 128k context | ✓ |
| llama-3.1-8b-instant | Швидкий але менша якість Nynorsk | |
| mixtral-8x7b-32768 | Старіша, добра для євр. мов | |

**User's choice:** `llama-3.3-70b-versatile` на Groq
**Notes:** Замінює `gpt-4o-mini` з CLAUDE.md. Пакет: `@ai-sdk/groq`. CLAUDE.md треба оновити.

---

## Claude's Discretion

- Структура `forms` для прикметників: `{ "positive": "...", "comparative": "...", "superlative": "..." }` — без явного запиту, Claude вибирає відповідні ключі.
- Zod schema для AI-відповіді на backend: Claude вибирає деталі схеми.
- Точний вигляд streaming UI (skeleton/placeholder) під час заповнення — Claude вибирає.

## Deferred Ideas

- Ручне додавання нових тегів (не тільки видалення AI-запропонованих) — можливо Phase 4/v2
- Фільтрація за тегами/difficulty — FLTR-01/02 (v2)
- AI chat per word — AIXT-01/02 (v2)
- Rate limit handling UX — не critical для особистого використання
