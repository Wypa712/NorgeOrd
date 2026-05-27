# Plan 02-02: Frontend Word List UI — Summary

## What was built

### API Layer
- `features/words/api/wordsApi.ts` — typed CRUD functions (listWords, createWord, getWord, updateWord, deleteWord) + Word/CreateWordInput/UpdateWordInput interfaces

### TanStack Query Hooks
- `features/words/hooks/useWords.ts` — useQuery with `isPending` (TanStack v5)
- `features/words/hooks/useCreateWord.ts` — useMutation with cache invalidation, 409 conflict toast, generic error toast

### Components
- `features/words/components/SelectField.tsx` — mirrors Input.tsx pattern for `<select>`
- `features/words/components/GenderBadge.tsx` — ч/ж/с labels (feminine обов'язково присутній)
- `features/words/components/WordClassBadge.tsx` — Ukrainian labels for word classes
- `features/words/components/WordListRow.tsx` — clickable/keyboard-accessible list item
- `features/words/components/WordList.tsx` — skeleton loading, error state, empty state, list render
- `features/words/components/FAB.tsx` — fixed bottom-right + button
- `features/words/components/AddWordDrawer.tsx` — `<dialog>` modal, form with validation, uses useCreateWord

### Page
- `pages/WordsPage.tsx` — replaces placeholder, wires all components together

## Key decisions
- `AppShell` is default export → imported without braces
- `WordsPage` kept as default export to match existing `App.tsx` import
- `_selectedWordId` prefix suppresses unused-var warning (detail panel is future phase)
- No `isLoading` usage anywhere — only `isPending` (TanStack Query v5 API)
- No `modal-open` CSS class — native `<dialog>` showModal()/close() API used

## Verification
- `npx tsc --noEmit` — 0 errors, 0 warnings
