# План 02-01: Words REST API — Підсумок

## Що зроблено

- Створено сервісний шар `backend/src/services/words.ts` з функціями `listWords`, `createWord`, `getWordForUser`, `updateWord`, `deleteWord`; обробка P2002 (дублікат headword) та перевірка belongs-to userId
- Створено роутер `backend/src/routes/words.ts` з повною валідацією вхідних даних та HTTP-статусами (400/201/204/404/403/409)
- Оновлено `backend/src/index.ts`: зареєстровано `wordsRouter` під `/api/words` із захистом `requireAuth`

## Верифікація

- Перевірено TypeScript ✓ (`npx tsc --noEmit` — нуль помилок)

## Endpoints

5 endpoints зареєстровані на `/api/words`:

| Метод  | Шлях         | Дія                        |
|--------|--------------|----------------------------|
| GET    | /api/words   | Список слів користувача    |
| POST   | /api/words   | Створити слово             |
| GET    | /api/words/:id | Отримати одне слово      |
| PATCH  | /api/words/:id | Оновити слово            |
| DELETE | /api/words/:id | Видалити слово           |
