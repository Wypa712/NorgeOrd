# Phase 6 Research: Project-Wide Audit

**Researched:** 2026-05-28
**Domain:** Full-stack audit — React/DaisyUI frontend, Node/Express/Prisma backend, external translation APIs
**Confidence:** HIGH (all findings verified by direct codebase inspection)

---

## Findings by Category

### 1. Bugs & Reliability

#### B-01 — Dead components: FAB and AddWordDrawer are unreachable (HIGH severity)
**Files:** `frontend/src/features/words/components/FAB.tsx`, `frontend/src/features/words/components/AddWordDrawer.tsx`
**Evidence:** `grep -rn "import.*FAB\|import.*AddWordDrawer" frontend/src/` returns zero results. Both components exist on disk but are imported by nothing.
**Impact:** The "Add Word" modal flow via FAB is completely missing from the app — users can only add words via the AI-analyze tab, not the manual entry drawer. This is a regression or missing wiring from Phase 2→3 transition.
**Fix:** Either wire FAB+AddWordDrawer into WordsPage (dictionary tab, `sm:bottom-6`, above the chat FAB) or delete both files if the manual flow was intentionally deprecated.

#### B-02 — Translator: `lastKeyRef` stores wrong key format, causing silent deduplication failure
**File:** `frontend/src/features/translate/components/TranslatorPanel.tsx`, lines 31 and 45
**Evidence:**
```ts
// Line 31: key used for comparison
const key = `${trimmed}|${direction}`;
// Line 45: stores the *key* in the .text field (wrong!)
lastKeyRef.current = { text: key, dir: direction };
// Line 37: compares key against .text field
if (lastKeyRef.current.text === key) return;
```
The ref shape is `{ text: string; dir: string }` (line 21) but line 45 writes `key` (which is `"text|direction"`) into `.text`, while line 37 compares `key` against `.text`. This works by accident when `direction` never changes, but on a direction swap the guard fires correctly only because `lastKeyRef` is reset in `handleSwap`. The accidental correctness is fragile — any future refactor of the key construction breaks this silently.
**Fix:** Normalise: store `{ text: trimmed, dir: direction }` and compare both fields separately, or store `key` in a single string ref.

#### B-03 — Translator: Stale closure in `useEffect` — `direction` in dep array reads stale `sourceLang`/`targetLang`
**File:** `frontend/src/features/translate/components/TranslatorPanel.tsx`, lines 29–55
**Evidence:** The translation effect depends on `direction` (line 55) and uses `sourceLang`/`targetLang` (computed from `direction` on lines 13–14) inside the effect — but these derived constants are NOT in the dep array. Since they're derived at render time and the effect captures them via closure, this is safe in React 18 — but the `// eslint-disable-next-line react-hooks/exhaustive-deps` suppression on line 54 hides a real smell: `mutation` (a new object every render) is also excluded, meaning the effect cannot call `mutate` if `mutation` changes identity. In practice TanStack Query stabilises `mutate`, but this is a latent risk.
**Fix:** Derive `sourceLang`/`targetLang` inside the effect or add them to deps; remove the blanket eslint suppression and add the specific ones that are intentionally excluded.

#### B-04 — `useAnalysisChat`: stale `messages` captured in `send` closure
**File:** `frontend/src/features/words/hooks/useAnalysisChat.ts`, line 21
**Evidence:**
```ts
const history = messages.map(m => ({ role: m.role, content: m.content }));
```
`messages` here is the state value at the time `send` was defined, not at call time. If the user sends two messages quickly, the second send will use a history that doesn't include the optimistic entry from the first send. Should use a functional ref or `useCallback` with proper deps.
**Fix:** Use `setMessages` with a function form and pass history as the full updated list, or use a `useRef` shadow of messages that's always up to date.

#### B-05 — `AddWordDrawer.handleAnalyze`: unhandled rejection — no try/catch
**File:** `frontend/src/features/words/components/AddWordDrawer.tsx`, lines 79–93
**Evidence:**
```ts
const handleAnalyze = async () => {
  ...
  const result = await analyzeMutation.mutateAsync(headword.trim());
  // No try/catch — throws if AI request fails
```
`mutateAsync` throws on error. `useAnalyzeWord` shows a toast in `onError`, but without a catch here the unhandled promise rejection propagates to the browser console and React's error boundary. The toast appears but React 18 logs an uncaught promise error.
**Fix:** Wrap in try/catch (the catch body can be empty or log); `useAnalyzeWord`'s `onError` already handles user feedback.

#### B-06 — `WordDetailDrawer`: `useEffect` on `[open, wordId]` missing `resetChat` in deps
**File:** `frontend/src/features/words/components/WordDetailDrawer.tsx`, line 44–46
**Evidence:**
```ts
useEffect(() => {
  if (open) setMode('view');
  if (!open) { resetChat(); setChatInput(''); }
}, [open, wordId]);
```
`resetChat` comes from `useWordChat` and changes reference on every render. React lint rule `react-hooks/exhaustive-deps` would flag this. The actual risk: if `resetChat` re-renders between the dependency capture and the effect call, the stale `resetChat` is invoked — though in practice `useWordChat` returns a stable function, this is a code smell.
**Fix:** Add `resetChat` to the dep array (it's already stable from `useCallback`-equivalent in the hook).

#### B-07 — Backend `words.ts` line 15: `analyzeWord` returns a streamable result, not awaited — no error handling for stream failures
**File:** `backend/src/routes/words.ts`, lines 14–19
**Evidence:**
```ts
const result = analyzeWord(headword.trim());
result.pipeTextStreamToResponse(res);
```
`analyzeWord` is synchronous (returns `streamObject` result immediately) and the stream is piped without any error handler on the stream itself. If the Groq API returns an error mid-stream, the response has already started (200 OK), so the client receives a partial/malformed JSON body. The frontend's `parseAnalysisText` then throws a `JSON.parse` error with no useful message.
**Fix:** Attach `.on('error', ...)` to the stream, or use the Vercel AI SDK's `pipeDataStreamToResponse` with error handling; alternatively catch and return 502 before the first byte is sent (check if response was started with `res.headersSent`).

#### B-08 — `useWordChat`: chat history loaded once per `wordId`, but `reset()` clears `loadedForId.current` — leads to double-fetch on reopen
**File:** `frontend/src/features/words/hooks/useWordChat.ts`, lines 43–47
**Evidence:** `reset()` sets `loadedForId.current = null`. `WordDetailDrawer` calls `reset()` when the drawer closes (`!open`). When the same word is reopened, `wordId === loadedForId.current` is false, so history is re-fetched. This is actually correct behaviour (fresh history on reopen), but the drawer also clears chat input and mode. The **bug** is that if the user closes and reopens rapidly the effect may fire twice for the same word (race condition between two sequential `wordId` transitions when `reset` clears the ref before the new effect runs).
**Impact:** Low — in practice the second fetch wins and results are the same. Worth documenting.

#### B-09 — `requestSignal()` in `translateApi.ts` is dead/wrong code
**File:** `frontend/src/features/translate/api/translateApi.ts`, lines 6–10
**Evidence:**
```ts
function requestSignal(): AbortSignal {
  return AbortController.prototype.constructor
    ? new AbortController().signal
    : (undefined as unknown as AbortSignal);
}
```
This function is defined but never called anywhere in the file. `AbortController.prototype.constructor` is always truthy (it's a constructor function), so the else branch is unreachable dead code. The function itself is an orphan.
**Fix:** Delete `requestSignal()`. The actual abort handling uses `withTimeout()` directly.

#### B-10 — No abort on translator unmount / tab switch — in-flight request continues after leaving Translator tab
**File:** `frontend/src/features/translate/components/TranslatorPanel.tsx`, `frontend/src/features/translate/hooks/useTranslate.ts`
**Evidence:** The translation effect fires `mutation.mutateAsync(...)` but stores no reference to cancel it. When the user switches to another tab while translation is pending, the request completes, `setResultText` is called on an unmounted (or hidden) component. React 18 will log a `setState` on unmounted component warning (in dev). The promise rejection from a cancelled mutation is silenced by TanStack Query but the UI state update still fires.
**Fix:** Add an AbortController ref in `TranslatorPanel`; pass its signal to `mutateAsync` (useTranslate already accepts the signal via `translateApi.translate`'s optional `signal` param — just wire it through). Cancel on cleanup.

---

### 2. UI/UX Issues

#### U-01 — Mobile: FAB (`Є питання?` chat button) conflicts with bottom tab bar [HIGH]
**File:** `frontend/src/pages/WordsPage.tsx`, line 432
**Evidence:**
```tsx
className="fixed bottom-20 right-6 z-40 btn btn-primary shadow-lg sm:bottom-6"
```
`bottom-20` (5rem = 80px) on mobile. The bottom tab bar is `py-3` (approx 48px tall) + the `-mt-px` active indicator. At `z-30` for tabs, `z-40` for the chat button. The chat panel uses `bottom-[3.5rem]` (56px) which could still clip behind the tab bar on shorter phones (iPhone SE: 667px). Verified in the most recent commit (`fix(mobile): raise chat button and panel above bottom tab bar`). The fix was applied but the value `3.5rem` may still be tight. The tab bar is closer to `3rem` + safe area. Needs safe-area-inset awareness.
**Severity:** Medium — partially fixed, needs `env(safe-area-inset-bottom)` on iOS.

#### U-02 — Mobile: Chat panel is full-width at `w-full` with `rounded-t-2xl` but no `pb-safe` [HIGH]
**File:** `frontend/src/pages/WordsPage.tsx`, line 447
**Evidence:**
```tsx
className="fixed bottom-[3.5rem] right-0 sm:bottom-6 sm:right-6 z-40 flex flex-col w-full sm:w-96 h-[420px] ..."
```
The chat panel anchors at `bottom-[3.5rem]` but iOS devices with home indicators have an additional safe area (~34px). The input at the bottom of the panel may be obscured.
**Fix:** Add `pb-[env(safe-area-inset-bottom)]` to the form container, or use CSS `safe-area-inset-bottom` variable in a utility class.

#### U-03 — Translator: swap button `⇄` is a plain Unicode glyph — inconsistent with the rest of the icon-less UI and potentially unreadable in some fonts [Low]
**File:** `frontend/src/features/translate/components/TranslatorPanel.tsx`, line 127
**Evidence:** Other action symbols in the app use text labels. On Windows 7/8 and some Android font stacks `⇄` renders as a tofu box.
**Fix:** Replace with an SVG arrow icon or use two separate arrows (`→` / `←`) in a flex column.

#### U-04 — Translator: no indication of which engine was used — fallback warning is vague [Medium]
**File:** `frontend/src/features/translate/components/TranslatorPanel.tsx`, lines 158–160
**Evidence:**
```tsx
{fallback && (
  <div className="mt-3 text-xs text-warning">Результат може містити Bokmål форми</div>
)}
```
When Apertium fails and fallback returns the raw MyMemory nb→uk text, the user sees a yellow warning but doesn't know if the translation is Norwegian→Ukrainian or just untouched Bokmål. The warning text is accurate but the UX doesn't show WHICH step failed or what the user can do.
**Fix:** Expand the warning to: "Apertium недоступний — переклад може бути на Bokmål. Результат лише попередній." Consider also showing a "retry" affordance.

#### U-05 — Translator: no char/byte counter — the 500-byte limit is not visible to the user [Medium]
**File:** `frontend/src/features/translate/components/TranslatorPanel.tsx`, line 39–42
**Evidence:** The byte limit check happens silently (toast error fires only after the user has already typed past the limit). There's no counter, no progressive warning. On mobile typing a long Ukrainian sentence will produce a surprise error toast.
**Fix:** Show a character counter below the source textarea (e.g., `{sourceText.length}/~160`) that turns red when approaching/exceeding the limit.

#### U-06 — Translator: empty source text shows a spinner in the target label because `isTranslating` can be true for a prior in-flight request [Low]
**File:** `frontend/src/features/translate/components/TranslatorPanel.tsx`, lines 131–134
**Evidence:** `isTranslating` reads from `mutation.isPending` which stays true until TanStack Query resolves. If the user clears the field while a request is in flight, the loading dots persist until resolution.
**Fix:** Track local loading state that resets immediately when `sourceText` becomes empty: `const showLoading = isTranslating && sourceText.trim().length > 0`.

#### U-07 — WordDetailDrawer: delete has no confirmation dialog [HIGH]
**File:** `frontend/src/features/words/components/WordDetailDrawer.tsx`, lines 83–86 and 162–170
**Evidence:**
```tsx
const handleDelete = () => {
  if (!word) return;
  deleteMutation.mutate(word.id);   // No confirm dialog
};
```
A single tap on the red "Видалити" button permanently deletes the word with all its chat history (cascade). On mobile this is especially dangerous due to accidental taps.
**Fix:** Add a confirmation step: either a second `btn-error` that appears in place of the first, a DaisyUI `<dialog>` confirm modal, or at minimum an `if (!confirm(...))` fallback.

#### U-08 — AddWordDrawer: `exampleSlots` creates phantom empty textareas when AI returns < 3 examples [Medium]
**File:** `frontend/src/features/words/components/AddWordDrawer.tsx`, lines 107–109
**Evidence:**
```ts
const exampleSlots = examples.length
  ? [...examples, ...Array(Math.max(0, 3 - examples.length)).fill('')]
  : ['', '', ''];
```
When AI fills `examples = ['sentence 1']`, the drawer shows 3 textareas (1 filled + 2 empty). But the empty strings feed into `setExampleValue` by index, and are NOT filtered from `cleanExamples` until submit (line 64 does filter them). This is correct at save time — but the UX shows the user two apparently-editable empty examples, implying they should fill them in. This creates confusion.
**Fix:** Either only show AI-populated examples + one "add example" button, or show exactly 3 slots regardless but add placeholder text "Необов'язково" to make it clear they can be left blank.

#### U-09 — WordsPage: `pb-20` padding bottom applied always, not conditionally for mobile [Low]
**File:** `frontend/src/pages/WordsPage.tsx`, line 296
**Evidence:**
```tsx
<div className="mx-auto w-full max-w-5xl pb-20 sm:pb-0">
```
`pb-20` (80px) prevents content from being hidden behind the bottom tab bar on mobile. This is correct. However, the `sm:pb-0` resets to zero padding on desktop where the sticky header takes up space but no bottom bar exists. If the user is on a tablet in portrait mode (which `sm:` = 640px covers), there might not be a bottom bar but there IS padding. This is a minor spacing inconsistency, not a bug.

#### U-10 — No global error boundary — any unhandled React render error shows a blank white page [Medium]
**File:** `frontend/src/App.tsx` (no ErrorBoundary present)
**Evidence:** The app has zero error boundaries. A rendering error in `WordList`, `WordDetailDrawer`, or `TranslatorPanel` will crash the entire app to a blank screen with no user-visible message.
**Fix:** Wrap `<Routes>` (or at least `<ProtectedRoute>`) with an `<ErrorBoundary fallback={<GenericErrorPage />}>` component.

#### U-11 — AnalysisReviewCard in WordsPage: `useEffect` missing from `[mutation.isSuccess]` dep — form doesn't auto-close on duplicate error [Low]
**File:** `frontend/src/pages/WordsPage.tsx`
**Evidence:** `AnalysisReviewCard` does not have the `useEffect(() => { if (mutation.isSuccess) onClose() })` pattern that `AddWordDrawer` has (line 36–38 of AddWordDrawer). In WordsPage, `onSaved` is passed directly as a callback to `mutate()` in the `save()` function (line 82), which is correct. Not a bug, just a design asymmetry. No action needed.

#### U-12 — Mobile: Bottom tab bar active state uses `border-t-2 border-primary -mt-px` — the negative margin can cause pixel-level jitter on some browsers [Low]
**File:** `frontend/src/pages/WordsPage.tsx`, lines 334–342
**Evidence:** The `-mt-px` shifts the active tab up by 1px to align the border-top with the container edge. On Firefox Android and some Chromium versions this can cause sub-pixel rendering artifacts.
**Fix:** Consider using `border-b-2` on the tab bar container + `border-t-2` on inactive tabs with `border-transparent`, which avoids the negative margin.

---

### 3. Security & Backend

#### S-01 — Auth route: register has no try/catch — unhandled DB errors return 500 without sanitisation [Medium]
**File:** `backend/src/routes/auth.ts`, lines 8–33
**Evidence:** The register handler has no try/catch. If `prisma.user.create` throws (e.g., due to a DB connection error that's NOT a P2002 unique violation), Express will call the default error handler which sends the raw Prisma error to the client — including stack traces in development and potentially revealing schema details.
**Fix:** Wrap both `/register` and `/login` handlers in try/catch and call `next(err)`, or add a global error-handling middleware to `index.ts`.

#### S-02 — No global error-handling middleware in Express — Prisma errors leak schema details [HIGH]
**File:** `backend/src/index.ts`
**Evidence:** The Express app has no `app.use((err, req, res, next) => {...})` error handler. Errors passed to `next(err)` land in Express's default handler, which in `NODE_ENV !== 'production'` sends the full error stack. In production Express sends "Internal Server Error" text — but the auth routes don't even call `next(err)` for non-Prisma errors.
**Fix:** Add a final error handler middleware that sanitises errors to `{ error: 'Internal server error' }` in production.

#### S-03 — JWT has no refresh mechanism — 7-day token stored in localStorage via Zustand persist [Medium]
**File:** `backend/src/services/auth.ts` line 13, `frontend/src/features/auth/authStore.ts`
**Evidence:** Token expires in 7 days. There's no refresh endpoint. The token is persisted to `localStorage` (Zustand `persist` default). `localStorage` is accessible to any JavaScript on the same origin, making it XSS-vulnerable. For a personal app this is acceptable, but should be documented as a known limitation.
**Recommendation:** For Phase 6 scope: note as known limitation. For a future phase: use `httpOnly` cookie or implement silent token refresh.

#### S-04 — `VITE_MYMEMORY_EMAIL` leaks user email to MyMemory API via URL query param [Medium]
**File:** `frontend/src/features/translate/api/translateApi.ts`, lines 35–36
**Evidence:**
```ts
if (MYMEMORY_EMAIL) params.set('de', MYMEMORY_EMAIL);
const data = await fetchJson<...>(`${MYMEMORY}?${params}`, signal);
```
The email address is embedded in the URL as `?de=user@example.com` and sent to `api.mymemory.translated.net`. This URL appears in browser network tab, server logs, and potentially browser history. MyMemory uses this only for quota tracking — not authentication — but the email is still transmitted to a third party as a plaintext URL parameter.
**Recommendation:** Either proxy the MyMemory call through the backend (which would also move the email out of client-side env vars), or document this as an accepted risk for a personal app.

#### S-05 — Backend `words.ts`: `PATCH /:id` passes `req.body` directly to `updateWord` without field whitelist [Medium]
**File:** `backend/src/routes/words.ts`, lines 83–89 and `backend/src/services/words.ts`, line 102–105
**Evidence:**
```ts
// routes/words.ts line 85:
const word = await wordsService.updateWord(req.user!.userId, req.params.id, req.body);
// services/words.ts line 104:
return prisma.word.update({ where: { id: wordId }, data });
```
`req.body` is passed as the Prisma `data` object with no field filtering. An attacker who has a valid JWT could PATCH `{ userId: "another_user_id" }` to change the owner of a word, or set `rawAiOutput` to arbitrary data, or set `createdAt`/`updatedAt` to arbitrary values (Prisma ignores managed fields, but the `userId` change is a real risk).
**Fix:** In `updateWord`, pick only the allowed fields explicitly: `headword`, `translation`, `gender`, `wordClass`, `notes`, `personalNote`, `difficulty`, `forms`, `examples`.

#### S-06 — `preview-chat` endpoint: `wordContext` and `messages` are not validated — arbitrary system prompt injection possible [Medium]
**File:** `backend/src/routes/words.ts`, lines 51–70
**Evidence:**
```ts
const { wordContext, messages, message } = req.body;
// Only message and wordContext.headword are checked
const history = Array.isArray(messages) ? messages.filter(...) : [];
```
An authenticated user can send any `wordContext.headword` string (and all other fields) to inject content into the AI system prompt (`buildChatSystemPrompt`). For a single-user personal app the risk is low (the attacker is the only user), but it's worth noting for when the app is multi-user.
**Recommendation:** Add length limits and sanitisation on `wordContext` fields (e.g., `headword` max 100 chars, truncate `notes` at 500 chars before injection into the prompt).

#### S-07 — Rate limiter applies globally AFTER route mounting — `authLimiter` is effectively shadowed by the global limiter's counter [Low]
**File:** `backend/src/index.ts`, lines 21–34
**Evidence:** The global rate limiter (`max: 200`) is applied at `app.use(rateLimit(...))` AFTER `app.use('/api/auth', authLimiter, authRouter)`. In Express, middleware order matters: requests to `/api/auth` hit the authLimiter first (10/15min) and then the global limiter (200/15min). This ordering is correct and the authLimiter effectively limits auth endpoints. The finding is that the global limiter's counter is shared across ALL endpoints including auth, so a brute-force with 200+ requests/15min to non-auth endpoints could potentially exhaust the global counter and block auth, but auth would already be blocked by its own limiter at 10. Low risk.

---

### 4. Performance & Code Quality

#### P-01 — `listWords` search: two parallel raw SQL queries + N Prisma findMany for N results — potential performance issue at scale [Medium]
**File:** `backend/src/services/words.ts`, lines 24–52
**Evidence:** For a search query, two `$queryRaw` calls run in parallel (FTS + LIKE), then a `prisma.word.findMany` with `include` fetches full word objects. The FTS query does not use the GIN index if `pg_catalog.norwegian` full-text config doesn't match the index config. Currently the migration `20260527115317_add_fts_gin_index` created the index — but it should be verified that the index uses the same config. For personal use (< 10,000 words) this is fine.
**Note:** For Phase 6, add a TODO comment in the service. No immediate fix required.

#### P-02 — `WordDetailDrawer`: edit mode does NOT include `forms` and `examples` editing — updates to these fields are silently discarded [HIGH]
**File:** `backend/src/routes/words.ts` line 85 + `frontend/src/features/words/components/WordDetailDrawer.tsx`, lines 70–81
**Evidence:** The edit form in `WordDetailDrawer` only exposes: `headword`, `translation`, `gender`, `wordClass`, `notes`. It does NOT show `forms`, `examples`, `tags`, or `difficulty` fields. When the user saves, only those 5 fields are sent in the PATCH. If a user wants to correct a form or add an example via the edit UI, they cannot.
**Fix:** Add `forms`, `examples`, and `difficulty` to the edit form in `WordDetailDrawer`, mirroring the fields available in `AddWordDrawer`.

#### P-03 — `useWords` query key uses `query ?? ''` — fetches ALL words when query is undefined AND when query is `''` — two query keys for same data [Low]
**File:** `frontend/src/features/words/hooks/useWords.ts`, lines 4–9
**Evidence:**
```ts
queryKey: ['words', query ?? ''],
queryFn: () => listWords(query),
```
When `query` is `undefined`, key is `['words', '']` and `listWords(undefined)` is called. When `query` is `''`, key is `['words', '']` and `listWords('')` is called. Both are equivalent (the API treats empty/undefined the same). No duplicate fetch, but the query key could be normalised to `['words']` for the no-query case to improve cache hit consistency.

#### P-04 — Dead hook `useWord` is exported but never imported [Low]
**File:** `frontend/src/features/words/hooks/useWord.ts`
**Evidence:** `grep -rn "useWord\b" frontend/src/` returns only the hook's own definition — it's never used. The `WordDetailDrawer` uses the words array from the parent via props, not this hook.
**Fix:** Delete `useWord.ts` or add a note that it's reserved for a future word-detail-page route.

#### P-05 — `WordDetailDrawer.tsx` uses `as any` three times for gender/wordClass select onChange [Low]
**File:** `frontend/src/features/words/components/WordDetailDrawer.tsx`, lines 32–33, 196, 210
**Evidence:**
```ts
setEditGender((word.gender ?? '') as any);
onChange={e => setEditWordClass(e.target.value as any)}
```
Same issue exists in `AddWordDrawer.tsx` lines 144, 158. The `as any` casts bypass TypeScript's enum checking — an out-of-range value from the DOM would not be caught.
**Fix:** Use explicit type assertion helpers or narrow the type properly: `e.target.value as Gender | ''`.

#### P-06 — `useAnalysisChat`: chat error on send silently removes the optimistic message with no toast [Medium]
**File:** `frontend/src/features/words/hooks/useAnalysisChat.ts`, lines 31–32
**Evidence:**
```ts
} catch {
  setMessages(prev => prev.filter(m => m.id !== optimistic.id));
}
```
If the AI chat request fails (network error, Groq rate limit), the user's message disappears from the chat window with no explanation. Same issue exists in `useWordChat.ts`.
**Fix:** Add `toast.error('Не вдалося надіслати повідомлення')` in the catch block of both `useAnalysisChat` and `useWordChat`.

#### P-07 — `AddWordDrawer`: `mutation.isSuccess` effect missing `onClose` in dependency array [Low]
**File:** `frontend/src/features/words/components/AddWordDrawer.tsx`, lines 35–37
**Evidence:**
```ts
useEffect(() => {
  if (mutation.isSuccess) onClose();
}, [mutation.isSuccess]);
// `onClose` missing from deps
```
React hooks exhaustive-deps rule requires `onClose` to be in the dep array. In practice `onClose` is a stable reference from `useState` setter — but if the parent re-renders with a different `onClose`, the stale version would be called.
**Fix:** Add `onClose` to the dependency array.

#### P-08 — `TranslatorPanel` state is NOT persisted between tab switches — text is lost when user switches tabs [Medium]
**File:** `frontend/src/pages/WordsPage.tsx`, lines 427–429
**Evidence:**
```tsx
<main className={`pt-6 ${activeTab !== 'translate' ? 'hidden' : ''}`}>
  <TranslatorPanel />
</main>
```
The Translator tab uses CSS `hidden` instead of conditional rendering, so the component stays mounted and state is preserved on tab switch. This is intentional (per recent commit `feat(ui): persist translator state`). HOWEVER, the analyze and dictionary tabs do use conditional rendering (`{activeTab === 'analyze' && ...}`), which means analysis state IS lost when switching tabs. This asymmetry may confuse users who expect consistent behavior across tabs.
**Consider:** Either use `hidden` consistently for all tabs (preserve state) or use a Zustand slice for translator state and unmount all panels.

---

## Prioritized Fix List

1. **[B-01] Wire or delete FAB + AddWordDrawer** — Users have no manual word-entry path. Critical UX gap. `WordsPage.tsx` + `WordDetailDrawer` parity.

2. **[P-02] Add forms/examples/difficulty to WordDetailDrawer edit mode** — Currently the edit UI allows editing only 5 of 10 word fields. AI-filled data cannot be corrected after save. High value for the learning workflow.

3. **[U-07] Add delete confirmation** — One-tap permanent delete of words + chat history on mobile. High severity on touch devices.

4. **[S-02] Add global Express error handler** — Prevents Prisma stack traces leaking to API consumers. Simple 10-line fix in `index.ts`.

5. **[S-05] Whitelist PATCH body fields in `updateWord`** — Prevents `userId` field injection via API. Simple destructure + pick in `services/words.ts`.

6. **[P-06 / useAnalysisChat + useWordChat] Show toast on chat send failure** — Messages silently vanishing confuses users. One-line fix in both hooks.

7. **[B-05] Wrap `handleAnalyze` in try/catch in AddWordDrawer** — Prevents unhandled promise rejection from reaching the browser console.

8. **[U-05] Add char counter to TranslatorPanel** — Prevents surprise error toast when typing past the 500-byte limit.

9. **[B-09] Delete dead `requestSignal()` function in translateApi** — Code hygiene; reduces confusion when reading the translation pipeline.

10. **[U-10] Add a top-level React ErrorBoundary** — Prevents blank white screen on any render error. Quick to add, high safety value.

---

## Recommended Phase 6 Tasks

### Task 6-01: Wire Manual Add Word Flow (FAB + AddWordDrawer)
**Impact:** Restores a critical feature that existed in Phase 2 but was disconnected from WordsPage.
**Files:** `frontend/src/pages/WordsPage.tsx` — import `FAB` and `AddWordDrawer`, add `[drawerOpen, setDrawerOpen]` state, render FAB on the dictionary tab (or globally), render `<AddWordDrawer>` alongside `<WordDetailDrawer>`.
**Estimate:** ~1 hour.

### Task 6-02: Expand WordDetailDrawer Edit Mode
**Impact:** Users can correct AI-generated forms, examples, and difficulty after saving. Closes the main friction point in the learning workflow.
**Files:** `frontend/src/features/words/components/WordDetailDrawer.tsx` — add `editForms`, `editExamples`, `editDifficulty` state + form fields in edit mode. Backend `PATCH` already accepts these fields.
**Estimate:** ~1.5 hours.

### Task 6-03: Delete Confirmation + Chat Error Toasts
**Impact:** Prevents accidental data loss (high on mobile); makes chat failures visible to user.
**Files:**
- `WordDetailDrawer.tsx` — add confirm step before delete
- `frontend/src/features/words/hooks/useAnalysisChat.ts` — add toast in catch
- `frontend/src/features/words/hooks/useWordChat.ts` — add toast in catch
**Estimate:** ~45 minutes.

### Task 6-04: Backend Security Hardening
**Impact:** Closes PATCH field injection and ensures errors don't leak internal details.
**Files:**
- `backend/src/services/words.ts` `updateWord` — whitelist allowed fields
- `backend/src/index.ts` — add global error handler middleware
- `backend/src/routes/auth.ts` — add try/catch to register/login handlers
**Estimate:** ~1 hour.

### Task 6-05: Translator UX Polish
**Impact:** Improves the most recently added feature — the one users will actually use daily.
**Files:** `frontend/src/features/translate/components/TranslatorPanel.tsx`
- Add character counter below source textarea
- Fix `lastKeyRef` storage (B-02)
- Improve fallback warning text (U-04)
- Add abort on unmount (B-10)
- Delete dead `requestSignal()` (B-09)
**Estimate:** ~1 hour.

---

## Summary Table

| ID | Category | Severity | File | Quick Fix |
|----|----------|----------|------|-----------|
| B-01 | Bug | CRITICAL | `WordsPage.tsx` | Wire FAB+AddWordDrawer |
| B-02 | Bug | Medium | `TranslatorPanel.tsx:45` | Fix ref field name |
| B-03 | Bug | Low | `TranslatorPanel.tsx:54` | Remove eslint suppression, audit deps |
| B-04 | Bug | Medium | `useAnalysisChat.ts:21` | Use `useRef` for history |
| B-05 | Bug | Medium | `AddWordDrawer.tsx:79` | Add try/catch |
| B-06 | Bug | Low | `WordDetailDrawer.tsx:44` | Add `resetChat` to deps |
| B-07 | Bug | Medium | `routes/words.ts:15` | Stream error handling |
| B-09 | Bug | Low | `translateApi.ts:6` | Delete dead function |
| B-10 | Bug | Medium | `TranslatorPanel.tsx` | Add abort on unmount |
| U-01 | UX | Medium | `WordsPage.tsx:432` | CSS safe-area |
| U-02 | UX | Medium | `WordsPage.tsx:447` | `pb-safe` on chat form |
| U-04 | UX | Medium | `TranslatorPanel.tsx:159` | Better fallback text |
| U-05 | UX | Medium | `TranslatorPanel.tsx` | Char counter |
| U-07 | UX | HIGH | `WordDetailDrawer.tsx:83` | Confirm before delete |
| U-08 | UX | Medium | `AddWordDrawer.tsx:107` | Example slots UX |
| U-10 | UX | Medium | `App.tsx` | ErrorBoundary |
| P-02 | Feature gap | HIGH | `WordDetailDrawer.tsx` | Add forms/examples to edit |
| P-04 | Code quality | Low | `hooks/useWord.ts` | Delete unused hook |
| P-06 | Bug | Medium | `useAnalysisChat.ts`, `useWordChat.ts` | Toast on chat error |
| P-07 | Bug | Low | `AddWordDrawer.tsx:36` | Add `onClose` to deps |
| S-02 | Security | HIGH | `backend/src/index.ts` | Global error handler |
| S-05 | Security | Medium | `services/words.ts:104` | Whitelist PATCH fields |
| S-01 | Security | Medium | `routes/auth.ts` | try/catch on register/login |
| P-08 | UX | Medium | `WordsPage.tsx:427` | Tab state consistency |
