# Feature Landscape

**Domain:** Personal vocabulary / language learning web app (Norwegian Nynorsk)
**Researched:** 2026-05-27
**Confidence:** HIGH — domain patterns are stable and well-established from Anki, Duolingo, Quizlet, Clozemaster, Lingvist, WordReference community discussions, and the personal vocab-builder niche

---

## Table Stakes

Features users expect to exist. Missing any of these makes the app feel broken or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Add a word and have it persist | Core loop — if this breaks, there is no app | Low | Already the central requirement |
| View all saved words as a list | Users need to see what they've collected | Low | With pagination or infinite scroll at scale |
| Search words in the list | The moment a user has >20 words, they need search | Low | At minimum: Norwegian word match. Ideally: translation match too |
| Detailed word card view | See everything about a word in one place | Low | Forms, gender, translation, examples, tags, difficulty |
| Edit a saved word | Typos happen; AI sometimes gets things wrong | Low | Full re-edit of all fields or trigger AI re-generation |
| Delete a word | Users will add duplicates or mistakes | Low | Soft confirm dialog to prevent accidents |
| Filter by tag | Vocabulary grows fast; tags are the primary org system | Low-Med | Tag must be assigned at add-time or editable later |
| Filter by difficulty level | Users want to review hard words separately | Low | Requires difficulty to be set (by AI or user) |
| Authentication (register / login / logout) | Personal data must be private and persistent | Med | JWT-based, confirmed in stack |
| User sees only their own words | Multi-user data isolation | Low | PostgreSQL row-level isolation, enforced at API layer |
| Nynorsk-correct grammatical forms | This is the whole reason for the app — Bokmål forms would be useless | High | AI prompt must be explicitly Nynorsk-scoped; this is the hardest correctness problem |
| Graceful AI failure handling | OpenAI can fail or return garbage; app must not silently swallow errors | Med | Show user what failed, allow manual entry as fallback |
| Loading state during AI fill | AI calls take 2-5 seconds; blank screen = broken feeling | Low | Spinner or skeleton on the word card while awaiting response |

---

## Differentiators

Features that create competitive advantage or meaningful delight. Not universally expected, but valuable when present.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI auto-fill on single word entry | Eliminates the #1 friction point of vocabulary apps: manually filling in all forms | High | This is the entire core value of the app. Everything else is table stakes. |
| Nynorsk specialization | No mainstream app handles Nynorsk properly — they either skip it, conflate it with Bokmål, or omit mutation forms entirely | High | Differentiator AND table stakes for this user; critical to get right |
| AI-generated usage examples (contextual) | Generic apps give dictionary examples; AI can generate examples tuned to the learner's level or context | Med | Prompt can request beginner/intermediate examples; upgradeable later |
| AI grammar explanation inline | Other apps give forms without explaining why. AI can explain the grammatical rule that produced each form | Med | Shown on word card; not in a separate "grammar" section. Scoped to the specific word |
| AI assistant / Q&A on a word | User can ask "when would I use this vs that?" directly on the word card — no tab-switching to ChatGPT | High | Conversational follow-up; requires chat UI component on card. This is the "replace the manual workflow" differentiator |
| Difficulty auto-assigned by AI | AI infers difficulty (A1–C2 or simple/medium/hard) from the word's frequency and morphological complexity in Nynorsk | Low-Med | Removes a manual tagging decision; users can override |
| Tags suggested by AI | AI suggests semantic tags (e.g. "weather", "verbs", "formal") at add-time | Low-Med | Reduces cognitive overhead. User confirms or edits. Requires tag suggestion in AI response schema |
| Zero-friction add flow | User types one word, presses enter, sees filled card — entire cycle under 10 seconds | Med | UX design problem as much as engineering. Page should not navigate away; card appears inline or in a modal |
| Translation in user's preferred language | AI can translate to Ukrainian, English, or any language — not hardcoded to English | Low | Small prompt change with large UX value for this user (Ukrainian speaker learning Norwegian) |

---

## Anti-Features

Features deliberately excluded from v1, with explicit justification.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Flashcard / SRS system | Anki already does this perfectly. Building a mediocre SRS competes with a best-in-class tool on its own turf, delays shipping, and splits the app's identity. The list+card model is already useful without it | If SRS is needed later, export to Anki format (`.apkg`) — this is a future differentiator, not a v1 feature |
| Gamification (streaks, XP, badges) | Creates maintenance burden, distracts from the core loop, and tends to optimize for app-opening rather than actual learning | Keep the app neutral; learning satisfaction comes from seeing your word list grow |
| Social / sharing vocabulary lists | Adds multi-tenancy complexity, moderation concerns, and privacy surface area. Personal tool first | Out of scope per PROJECT.md; revisit if app goes public |
| Built-in audio pronunciation | Requires either a TTS API (cost, latency) or recorded audio (impossible for all Nynorsk forms). Forrvo-style crowdsource is out of scope | Link out to Ordbokene (nb.no) which has native speaker audio — single anchor tag, zero complexity |
| Progress tracking / statistics dashboard | Vocabulary acquisition is non-linear. Stats like "words learned this week" are vanity metrics without SRS to define "learned" | The list itself is the progress tracker |
| Manual form entry UI | Forces the user to know the forms before they can save — defeats the purpose | AI fills everything. Manual override is available only for corrections after the fact |
| Offline mode / PWA sync | Adds significant complexity (service workers, sync conflicts, IndexedDB). This is a web app tied to an AI API that requires connectivity anyway | N/A — online-only is fine |
| CSV / bulk import | Bulk import produces low-quality entries (no AI enrichment per word, or expensive). It trains the wrong habit | One word at a time is the intentional constraint |
| Dark/light mode toggle | Not core functionality. DaisyUI ships with theme support; can be added as a 1-hour task later | Default to one tasteful theme and revisit |

---

## Feature Dependencies

```
Authentication (register/login)
  └── Word list (scoped to user)
        ├── Add word
        │     └── AI auto-fill (forms, gender, translation, examples, difficulty, tags)
        │           └── Tag suggestion (extends AI response schema)
        │           └── Difficulty auto-assign (extends AI response schema)
        ├── Search
        ├── Filter by tag       ← requires tags to exist on words
        ├── Filter by difficulty ← requires difficulty to exist on words
        ├── Detailed card view
        │     ├── Grammar explanation (AI-generated, part of initial fill)
        │     └── AI assistant / Q&A    ← separate conversational API call
        └── Edit word
              └── Optionally re-trigger AI fill
```

---

## What Vocabulary Apps Typically Miss (User Frustration Patterns)

These are recurring complaints in the vocabulary app space, based on established community feedback patterns from Anki forums, r/languagelearning, and app store reviews of Quizlet/Lingvist/Clozemaster:

**1. Forms without context**
Apps store the infinitive or base form but not inflected forms. When a user encounters "gjekk" in the wild, they cannot find it under "gå" unless they already know to look there. This app solves it because AI stores all forms on the card.

**2. No explanation of why a form exists**
Knowing that "huset" is definite singular neuter is useless unless the learner understands the pattern. AI inline grammar explanations address this directly.

**3. Translation is the only meaning provided**
Dictionary apps give a translation. They rarely give register (formal/informal), collocations ("this word goes with X"), or usage warnings ("do not use in context Y"). AI can generate all of this as part of the initial fill.

**4. Nynorsk treated as a footnote**
Nynorsk has genuinely different inflection patterns from Bokmål — "boka" vs "boken", "eg" vs "jeg", strong verb classes differ. Apps that claim Norwegian support almost always mean Bokmål. This is the single largest unmet need in the Norwegian learning niche.

**5. The lookup → save workflow is broken**
Typical workflow: Google Translate (loses context) → Ordbokene (forms, but no examples) → copy to notes (unstructured, never reviewed). This app collapses the entire workflow into one action.

**6. Re-finding words is painful**
Notes and spreadsheets have no search. Anki has search but no quick browse. This app's list+search+filter covers the gap.

---

## MVP Recommendation

The v1 feature set as specified is already correct. The key discipline is:

**Do not expand the AI response schema incrementally** — define it completely upfront. Every field the AI will ever fill (forms, gender, translation, examples, grammar note, difficulty, suggested tags) should be in the initial schema even if the UI only displays some fields in v1. Changing the schema later means re-enriching all saved words.

**Priority order for v1:**
1. Auth (gate everything behind it)
2. Add word + AI fill (the core value proposition — validate this first)
3. Word list with search
4. Detailed card view
5. Filter by tag / difficulty
6. Edit word

**Defer to v2:**
- AI assistant / conversational Q&A on word card (requires chat UI, separate API call pattern, more UX complexity)
- Tag suggestions surfaced in the add flow (can ship with manual tags first)
- Difficulty auto-assign display refinement (store it v1, surface it prominently v2)

---

## Sources

- Domain knowledge from established vocabulary app ecosystem (Anki, Quizlet, Duolingo, Lingvist, Clozemaster, Memrise): HIGH confidence — patterns are stable
- Nynorsk linguistic specifics (inflection divergence from Bokmål, form classes): HIGH confidence — well-documented in Norwegian grammar literature
- AI auto-fill pattern (single-field entry → structured enrichment): HIGH confidence — matches GPT-4o structured output capabilities
- User frustration patterns: MEDIUM confidence — synthesized from established community discussions, no single source verified in this session
