# Phase 6 Context: Project-Wide Audit & Polish

**Phase:** 6 — Polish
**Status:** Planning
**Created:** 2026-05-28

---

## Phase Goal

Провести повний аудит проєкту — виявити приховані баги, закрити прогалини UX, підвищити безпеку бекенду та покращити надійність усіх ключових флоу.

---

## User Intent

> "Хотів би зробити ревью всього проєкта, пошукати якісь неявні проблеми, десь оптимізувати, покращити юай юікс"

**Пріоритет:** UI/UX polish  
**Фокус-зони:** Translator tab, AddWord/AI-fill, мобільний досвід, backend безпека

---

## Key Decisions

### D-01: Масштаб фази — фіксуємо топ-знахідки з аудиту
Дослідник виявив 24 проблеми різної критичності. Фаза 6 охоплює:
- **Критичні (MUST):** B-01, P-02, U-07, S-02, S-05
- **Важливі (SHOULD):** P-06, B-05, U-05, U-10, B-10
- **Nice-to-have (IF TIME):** B-02, U-04, P-04, P-07, B-09

### D-02: FAB + AddWordDrawer — wire, не delete
FAB і AddWordDrawer існують у коді але не підключені. Рішення: підключити в WordsPage на вкладці "Словник". Manual word-entry flow — важлива функція.

### D-03: Edit mode у WordDetailDrawer — повне розширення
Поточний edit mode показує лише 5 полів. Додаємо forms, examples, difficulty. Backend PATCH вже підтримує ці поля.

### D-04: Backend hardening без breaking changes
Whitelist полів у updateWord, global error handler, try/catch на auth routes. Нічого не ламаємо — тільки додаємо захист.

---

## Out of Scope

- JWT refresh mechanism (S-03) — задокументована known limitation
- MyMemory email proxy (S-04) — особистий застосунок, прийнятний ризик  
- P-01 (N+1 queries at scale) — поточний масштаб не потребує
- Повна переробка tab state persistence (P-08) — occupied tabs working fine

---

## Success Criteria

1. FAB відображається на вкладці "Словник" і відкриває AddWordDrawer з ручним вводом
2. WordDetailDrawer в режимі редагування показує і зберігає forms, examples, difficulty
3. Видалення слова вимагає підтвердження
4. Chatbot помилки показують toast замість тихого зникання повідомлень
5. Translator: char counter, виправлений lastKeyRef, кращий fallback warning, abort on unmount
6. Backend: global error handler + PATCH field whitelist + auth try/catch
7. Глобальний React ErrorBoundary в App.tsx
