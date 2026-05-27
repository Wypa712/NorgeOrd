# Plan 02-03 Summary: WordDetailDrawer (view/edit/delete)

## Виконано

### Task 1: Хуки для оновлення та видалення

Створено три нових хуки:

- `useWord.ts` — useQuery для отримання одного слова за id (enabled тільки якщо id не null)
- `useUpdateWord.ts` — useMutation для PATCH /words/:id, інвалідує ['words'], toast успіху/помилки
- `useDeleteWord.ts` — useMutation для DELETE /words/:id, інвалідує ['words'], toast успіху/помилки

API функції `updateWord` та `deleteWord` вже були в `wordsApi.ts` — не дублювались.

### Task 2: WordDetailDrawer

Створено `frontend/src/features/words/components/WordDetailDrawer.tsx`:

- 3 режими: `view` | `edit` | `confirm-delete`
- `view` — показує headword, translation, GenderBadge, WordClassBadge, difficulty, notes, personalNote
- `edit` — форма з усіма полями (headword, translation, wordClass, gender, difficulty, notes, personalNote)
- `confirm-delete` — підтвердження видалення з кнопками "Скасувати" / "Видалити"
- Автоматично закривається після успішного update/delete через useEffect на isSuccess
- Скидає режим до 'view' при кожному відкритті

### Task 3: Оновлення WordsPage.tsx

- Виправлено `_selectedWordId` → `selectedWordId` (попередній агент додав underscore-prefix)
- Додано імпорт WordDetailDrawer
- Додано `<WordDetailDrawer>` з передачею `wordId`, `words`, `open`, `onClose`

## Верифікація

- `npx tsc --noEmit` — frontend: 0 помилок
- `npx tsc --noEmit` — backend: 0 помилок
- `isLoading` у features/words: не знайдено (використовується `isPending`)
- `feminine` у features/words: 4 файли (wordsApi.ts, AddWordDrawer.tsx, WordDetailDrawer.tsx, GenderBadge.tsx)
