# Phase 4: Search - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-27
**Phase:** 4-Search
**Areas discussed:** UI Placement, Search Trigger, Backend API shape, Empty state

---

## UI Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Над списком у «Словник» | Search input над WordList в існуючому «Словник» табі. Мінімальні зміни. | ✓ |
| Третій таб «Пошук» | Новий таб поруч з «AI пошук» і «Словник». Чіткіший UX, але зайва навігація. | (розглядалося, відхилено) |
| У AppShell header | Глобальний пошук у navbar. Складніше в реалізації для MVP. | |

**User's choice:** Спочатку "третій таб", потім уточнення: "краще в словник саме додати" → search input у «Словник» табі.
**Notes:** Кінцеве рішення — пошук вбудовано в «Словник», не в окремий таб.

---

## Search Trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Debounce 300-500мс | Запит кожні 300мс після зупинки друку. Плавний real-time UX. | ✓ |
| Тільки Enter / кнопка | Запит тільки після субміту. Менше API-запитів, гірший UX. | |

**User's choice:** Debounce 300-500мс
**Notes:** Відповідає Success Criteria "real time" з ROADMAP.md.

---

## Backend API Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Extend GET /api/words?q= | Опціональний ?q= до існуючого endpoint. useWords hook перевикористовується. | ✓ |
| GET /api/words/search?q= | Окремий endpoint. Чітке розділення, але новий hook на фронтенді. | |

**User's choice:** Extend GET /api/words?q=
**Notes:** Жодного нового endpoint — мінімальний diff.

---

## Empty State

| Option | Description | Selected |
|--------|-------------|----------|
| Повідомлення з запитом | «Нічого не знайшлося для 'X'» — показує що саме шукали. | ✓ |
| Загальне «Словник порожній» | Той самий empty state що вже є. Не розрізняє 0 слів від 0 результатів. | |

**User's choice:** Повідомлення з запитом
**Notes:** Окрема гілка в WordList або WordsPage для «0 результатів» vs «словник порожній».

---

## Claude's Discretion

- Debounce hook реалізація (`useDebounce` vs `useEffect` з `setTimeout`) — на розсуд планувальника.
- `plainto_tsquery` vs `to_tsquery` — обрано `plainto_tsquery` (зафіксовано в specifics).
- Мінімальна довжина запиту для FTS (0 vs 2 символи) — залишено на розсуд.

## Deferred Ideas

- Фільтрація за тегами / difficulty (FLTR-01/FLTR-02, v2)
- Пошук у forms/examples
- Highlight matched text
- Search history
