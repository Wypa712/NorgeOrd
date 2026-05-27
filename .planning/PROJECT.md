# Norwegian Learning Hub

## What This Is

Персональний веб-застосунок для вивчення норвезької (Nynorsk) лексики. Користувач вводить слово — AI автоматично заповнює граматичні форми, рід, переклад, приклади речень. Все зберігається в єдиному місці, щоб пізніше переглянути через пошук або детальну картку.

## Core Value

Одне поле вводу → AI заповнює все → слово збережено назавжди зі всіма формами і контекстом.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Користувач може зареєструватися, увійти та вийти
- [ ] Кожен користувач бачить тільки свої слова
- [ ] Введення одного слова запускає AI-автозаповнення (форми, рід, переклад, приклади)
- [ ] AI пояснює граматику, контекст вживання, генерує приклади речень, відповідає на питання
- [ ] Перегляд списку всіх слів із пошуком
- [ ] Фільтрація за тегами та рівнем складності
- [ ] Детальна картка слова з усією інформацією
- [ ] Слова можна редагувати після збереження
- [ ] Орієнтація на Nynorsk (форми відмінювання відповідно до нюнорських норм)

### Out of Scope

- Flashcard/SRS система — можливо в майбутньому, не в v1
- Багатокористувацькі функції (шеринг словників) — можливо пізніше
- Нативний мобільний додаток — веб-версія з mobile-first дизайном достатня

## Context

- Вивчається Nynorsk (не Bokmål) — форми слів та граматичні правила відрізняються
- Замінює ручний процес: Google Translate → Ordbokene → нотатки → забув
- AI виконує важку роботу: форми, рід, приклади — користувач тільки вводить слово
- Можливо в майбутньому стане публічним продуктом, але v1 — особистий інструмент

## Constraints

- **Tech Stack**: React + Vite + Tailwind + DaisyUI + Zustand (Frontend); Node.js + Express + PostgreSQL + Prisma + JWT (Backend)
- **AI**: OpenAI API для автоматичного аналізу слів та AI-асистента
- **Мова**: Nynorsk як основний контекст для всіх AI-підказок та форм
- **UI**: Mobile-first — всі інтерфейси проектуються для мобільного екрану (DaisyUI допомагає)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| AI заповнює все автоматично | Мінімальний ввід від користувача — ключова цінність | — Pending |
| Nynorsk як основний діалект | Це те що вивчає користувач | — Pending |
| PostgreSQL + Prisma | Зі SPEC.md, добре підходить для структурованих словникових даних | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-27 after initialization*
