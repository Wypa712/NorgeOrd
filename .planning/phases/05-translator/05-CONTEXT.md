# Phase 5: Translator - Context

**Gathered:** 2026-05-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a third tab "Перекладач" to the existing DaisyUI tabs switch in WordsPage, backed by Apertium API (Ukrainian ↔ Nynorsk) via backend proxy. The translator is a standalone tool — no auto-save, no AI analysis trigger.

</domain>

<decisions>
## Implementation Decisions

### Translation API
- **D-01 [REVISED]:** Use **two-step pipeline** — MyMemory (`https://api.mymemory.translated.net/get`) + Apertium (`https://www.apertium.org/apy/translate`). Apertium uk↔nn не існує (verified via listPairs). Pipeline: `uk→nn` = MyMemory `uk|nb` → Apertium `nob|nno`; `nn→uk` = Apertium `nno|nob` → MyMemory `nb|uk`. Optional `VITE_MYMEMORY_EMAIL` env var for higher quota. Returns `{text: string, fallback: boolean}` where `fallback=true` means Apertium step failed (result may be Bokmål).
- **D-02 [OVERRIDDEN — frontend-direct]:** Translation is done **directly on the frontend** via fetch() to MyMemory and Apertium. Both APIs support CORS. No backend proxy needed. `translateApi.ts` lives in `frontend/src/features/translate/api/` and calls external APIs directly. No backend files modified. *(Original decision: backend proxy — overridden by user during planning after research revealed Apertium uk↔nn unavailable.)*

### Navigation / UI Integration
- **D-03:** Add `'translate'` as the third value to the existing `ActiveTab` type in `WordsPage.tsx` (currently `'analyze' | 'dictionary'`). Add a third tab button "Перекладач" inside the existing `tabs tabs-boxed` div.
- **D-04:** No AppShell changes needed — the tab switch lives inside WordsPage, not in the top navbar.

### Translator UI Layout
- **D-05:** Google Translate style layout:
  - Left textarea: source language input (editable by user)
  - Swap button (⇄) in the middle: flips direction (uk↔nn)
  - Right textarea: translation result (read-only, populated after translate)
  - Language labels above each textarea ("Українська" | "Nynorsk")
  - "Перекласти" button below or between textareas
  - Copy-to-clipboard icon button on the result textarea
- **D-06:** Translation is **on-demand** (button click), not auto-translate on keystroke.

### Translation Direction
- **D-07:** **Both directions**: uk→nn and nn→uk. Swap button flips the pair. Default direction: uk→nn.

### Integration with Words
- **D-08:** **Translation only** — no auto-save, no "Send to AI" button. User manually copies the Nynorsk result and pastes into the AI пошук tab if needed.
- **D-09:** Copy-to-clipboard button on the result textarea (icon button, shows brief "Скопійовано!" feedback via toast or inline state).

### Claude's Discretion
- Error handling style (toast vs inline) — can follow existing pattern (useToastStore)
- Loading state while waiting for translation — spinner or disabled button, Claude decides
- Mobile responsiveness: stack textareas vertically on mobile, side-by-side on sm+

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Feature Code
- `frontend/src/pages/WordsPage.tsx` — Contains `ActiveTab` type and `tabs tabs-boxed` switch to extend. All tab rendering logic is here.
- `frontend/src/components/AppShell.tsx` — Top navbar (no changes needed for this phase)
- `frontend/src/lib/api.ts` — Axios instance with JWT interceptors (use for backend calls from frontend)
- `frontend/src/lib/toastStore.ts` — Toast notifications (use for copy feedback / error display)

### Backend Patterns
- `backend/src/routes/words.ts` — Example Express router pattern to follow for new `/api/translate` route
- `backend/src/services/ai.ts` — Example of calling external API from Express service layer

### External API
- Apertium REST API: `https://api.apertium.org/json/translate?q={text}&langpair={pair}` — no auth required. Language pairs: `uk|nn` and `nn|uk`.

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Button` component (`frontend/src/components/Button.tsx`) — use for "Перекласти" button, has `loading` prop
- `useToastStore` / `toast` helper — use for copy feedback ("Скопійовано!") and error toasts
- DaisyUI `textarea textarea-bordered` class — consistent with existing form inputs

### Established Patterns
- **Tab pattern**: `type ActiveTab = 'analyze' | 'dictionary'` with `useState<ActiveTab>('analyze')` — extend with `| 'translate'` and add a third `<button role="tab">` in the `tabs tabs-boxed` div
- **Feature folder structure**: new code goes in `frontend/src/features/translate/` (hooks, components, api)
- **Backend proxy pattern**: Express route → service function → external HTTP call (fetch/axios) → return JSON
- **Mobile-first**: stack layouts use `flex flex-col sm:flex-row` convention

### Integration Points
- `WordsPage.tsx` line 21 (`type ActiveTab`) and lines 296–313 (tab buttons + content switch) — primary extension points
- New Express route: mount at `/api/translate` in `backend/src/index.ts`
- New frontend API: `frontend/src/features/translate/api/translateApi.ts` → calls `GET /api/translate`

</code_context>

<specifics>
## Specific Ideas

- Swap button (⇄) swaps both the direction AND the text content of both textareas (so user can translate back what they got)
- Language labels: "Українська" and "Nynorsk" (not "Norwegian")
- The result textarea should be read-only but selectable

</specifics>

<deferred>
## Deferred Ideas

- "Відправити в AI" button after translation — would forward nn result to AI пошук tab. Deferred: keeps translator simple; user can copy manually.
- AI-quality translation (DeepL / neural MT) — Apertium quality is sufficient for language learning purposes
- Translation history / saved translations — separate feature if ever needed

None of the discussion went outside phase scope.

</deferred>

---

*Phase: 5-Translator*
*Context gathered: 2026-05-28*
