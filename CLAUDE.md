спілкуйся укр по можливості

# Norwegian Learning Hub

Персональний застосунок для вивчення Nynorsk лексики. Одне поле вводу → AI заповнює все → слово збережено.

## Stack

**Frontend:** React 18 + Vite + Tailwind CSS 3.4.x + DaisyUI + Zustand + TanStack Query v5 + Axios
**Backend:** Node.js + Express 4.x + PostgreSQL + Prisma ORM + JWT + helmet + express-rate-limit
**AI:** OpenAI API (`gpt-4o-mini` для auto-fill) + Vercel AI SDK (`ai` пакет) для стрімінгу

## Key Constraints

- **Mobile-first UI** — всі компоненти проектуються для мобільного екрану
- **Nynorsk only** — всі AI промпти та форми для Nynorsk (не Bokmål)
- **gender enum = 3 значення**: `masculine | feminine | neuter` (feminine обов'язковий для Nynorsk!)
- **PostgreSQL FTS**: `to_tsvector('pg_catalog.norwegian', ...)` — не `english`, не `simple`
- **Frontend структура**: `src/features/{auth,words,chat}/` з першого дня

## GSD Workflow

Цей проект управляється через GSD. Плани фаз і стан знаходяться в `.planning/`.

**Поточний стан:** [.planning/STATE.md](.planning/STATE.md)
**Roadmap:** [.planning/ROADMAP.md](.planning/ROADMAP.md)

### Команди

- `/gsd-discuss-phase N` — обговорити підхід до фази
- `/gsd-plan-phase N` — створити детальний план
- `/gsd-execute-phase N` — виконати фазу
- `/gsd-progress` — статус проекту

### Правила виконання

- Завжди читай `.planning/STATE.md` на початку роботи
- Комітити після кожного завершеного завдання
- Зміни в схемі БД — тільки через Prisma міграції
- AI промпти тестувати canary словами: `husa`, `ikkje`, `eg` (Nynorsk ≠ Bokmål)
