# Roadmap: Norwegian Learning Hub

**Milestone:** v1 MVP
**Granularity:** Coarse (4 phases)
**Coverage:** 10/10 v1 requirements mapped

---

## Phases

- [x] **Phase 1: Auth + DB Foundation** - Secure user accounts and production-ready database schema
- [x] **Phase 2: Core Word CRUD** - Complete word lifecycle without AI dependency
- [x] **Phase 3: AI Auto-fill** - One-field entry triggers full Nynorsk word analysis
- [x] **Phase 4: Search** - Dictionary is navigable by word or translation
- [ ] **Phase 5: Translator** - Ukrainian ↔ Nynorsk translation tab via MyMemory + Apertium frontend pipeline
- [ ] **Phase 6: Polish & Audit** - Fix critical bugs, close UX gaps, harden backend security

---

## Phase Details

### Phase 1: Auth + DB Foundation
**Goal:** Users can securely access their own isolated word collections, and the database schema is production-ready with correct Nynorsk gender enum and FTS index.
**Mode:** mvp
**Depends on:** Nothing
**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria**:
1. User can register with email and password and receive a session token
2. User can log in and remain authenticated across page reloads (JWT persisted)
3. User can log out and all protected routes become inaccessible
4. Authenticated user can only see and access their own words (row-level isolation verified)
**Plans:** Completed in prior session

### Phase 2: Core Word CRUD
**Goal:** Users can manually add, view, edit, and delete words — full word lifecycle works end-to-end without any AI dependency.
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** WORD-02, WORD-03, WORD-04, WORD-05
**Success Criteria**:
1. User can add a word with manually entered fields and see it appear in the word list
2. User can open a word's detail card and see all stored information
3. User can edit any field of a saved word and see the update reflected immediately
4. User can delete a word and confirm it is removed from the list
**Plans:** 3 plans
Plans:
- [x] 02-01-PLAN.md — Backend REST API (words routes + service + index.ts registration)
- [x] 02-02-PLAN.md — Add + List slice (wordsApi + hooks + WordList + AddWordDrawer + FAB + WordsPage)
- [x] 02-03-PLAN.md — View + Edit + Delete slice (WordDetailDrawer three-state + update/delete hooks)

### Phase 3: AI Auto-fill
**Goal:** Entering a single Norwegian word triggers AI analysis that fills in Nynorsk inflections, gender, translation, example sentences, tags, and difficulty level automatically.
**Mode:** mvp
**Depends on:** Phase 2
**Requirements:** WORD-01
**Success Criteria**:
1. User types one Nynorsk headword, submits, and receives a fully populated word card (inflections, gender, translation, examples, tags, difficulty) without entering any other field
2. AI returns Nynorsk forms specifically — canary words `husa`, `ikkje`, `eg` appear correctly (not Bokmål equivalents)
3. Failed or slow AI calls surface a clear error; user can retry or save with partial data
**Plans:** 3 plans
Plans:
- [x] 03-01-PLAN.md — Backend AI analysis endpoint + tag persistence
- [x] 03-02-PLAN.md — Gap closure: AddWordDrawer AI-fill flow + editable generated fields
- [x] 03-03-PLAN.md — Gap closure: Persisted AI metadata display + live canary verification
**UI hint**: yes

### Phase 4: Search
**Goal:** Users can find any saved word by searching the Norwegian word or its translation using full-text search.
**Mode:** mvp
**Depends on:** Phase 3
**Requirements:** SRCH-01
**Success Criteria**:
1. User can type part of a Norwegian word or its translation into a search field and see matching results in real time
2. Search uses Norwegian-aware stemming (`pg_catalog.norwegian`) so inflected forms match the headword
3. Empty search returns the full word list; no matches returns a clear empty state
**Plans:** 1 plan
Plans:
- [x] 04-01-PLAN.md — Search: useDebounce + FTS backend + frontend wiring (all 7 files)
**UI hint**: yes

### Phase 5: Translator
**Goal:** Users can translate text between Ukrainian and Nynorsk via a dedicated tab, using a frontend-side two-step pipeline (MyMemory + Apertium).
**Mode:** extension
**Depends on:** Phase 4
**Requirements:** TRANSLATOR-01
**Success Criteria**:
1. User can navigate to the "Перекладач" tab and see a two-textarea Google Translate-style layout
2. User enters Ukrainian text, clicks "Перекласти", receives Nynorsk translation (MyMemory uk→nb + Apertium nob→nno)
3. User can swap direction (nn→uk) and the pipeline reverses correctly
4. Text over 500 bytes shows an error; no request sent
5. When Apertium step fails (fallback=true), an inline warning about possible Bokmål forms appears
**Plans:** 1 plan
Plans:
- [ ] 05-01-PLAN.md — Frontend translator: translateApi + useTranslate + TranslatorPanel + WordsPage tab extension

### Phase 6: Polish & Audit
**Goal:** Fix critical bugs and close UX gaps found in the full-project audit — wire the dead manual add-word flow, expand the word edit form to all 10 fields, add mobile-safe delete confirmation, surface chat errors as toasts, harden backend against field injection and error leaks, and polish the Translator tab.
**Mode:** extension
**Depends on:** Phase 5
**Requirements:** POLISH-01, POLISH-02, POLISH-03, POLISH-04, POLISH-05
**Success Criteria**:
1. FAB appears on the dictionary tab and opens AddWordDrawer for manual word entry
2. WordDetailDrawer edit mode exposes and saves forms, examples, difficulty
3. Word deletion requires a second confirmation tap
4. Chat send failures show a toast instead of silently removing the message
5. Backend PATCH rejects injected fields (userId, rawAiOutput, createdAt)
6. Global Express error handler returns sanitised JSON — no stack traces
7. Translator shows char counter and improved fallback warning; requestSignal() dead code removed
8. React ErrorBoundary in App.tsx shows Ukrainian fallback instead of blank screen
**Plans:** 1 plan
Plans:
- [ ] 06-01-PLAN.md — Full audit polish: FAB wiring + edit form + delete confirm + chat toasts + backend hardening + translator UX + ErrorBoundary

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Auth + DB Foundation | ?/? | Complete | 2026-05-27 |
| 2. Core Word CRUD | 3/3 | Complete | 2026-05-27 |
| 3. AI Auto-fill | 3/3 | Complete | 2026-05-27 |
| 4. Search | 1/1 | Complete | 2026-05-28 |
| 5. Translator | 1/1 | Complete | 2026-05-28 |
| 6. Polish & Audit | 0/1 | Planning | — |

---

*Roadmap created: 2026-05-27*
*Last updated: 2026-05-28 — Phase 6 planned; full-project audit polish pass*
