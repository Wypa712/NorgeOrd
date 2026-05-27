# Domain Pitfalls — Norwegian Vocabulary Learning App

**Domain:** AI-assisted vocabulary learning app (Nynorsk)
**Stack:** React + Vite + Zustand / Node.js + Express + PostgreSQL + Prisma + OpenAI API
**Researched:** 2026-05-27
**Overall confidence:** HIGH for JWT/Prisma/Zustand/cost control; MEDIUM for Nynorsk-specific AI accuracy; MEDIUM for PostgreSQL Norwegian FTS

---

## Critical Pitfalls

Mistakes that cause rewrites, data corruption, or complete feature failure.

---

### Pitfall 1: OpenAI Returns Bokmål Forms Silently

**What goes wrong:**
GPT models have vastly more Bokmål training data than Nynorsk. When asked to inflect a Norwegian word, the model defaults to Bokmål without warning — returning `huset` (Bokmål) instead of `huset/huse` (Nynorsk), or `ikke` instead of `ikkje`. The response looks grammatically valid, is in Norwegian, and passes any surface-level validation. The user stores it, learns it, and only discovers the error later when a teacher or native speaker corrects them.

**Why it happens:**
The model associates "Norwegian" with Bokmål (≈90% of written Norwegian). Nynorsk instruction in the prompt must be explicit, repeated, and structurally enforced — a single mention of "Nynorsk" in a system prompt is insufficient when the model's prior is overwhelmingly Bokmål.

**Consequences:**
- Silently corrupted vocabulary data that is hard to audit in bulk
- User learns wrong forms — this is a learning app, correctness is the product
- No error is thrown; validation layers that check "is this Norwegian" will pass

**Warning signs:**
- Words that have identical Bokmål/Nynorsk spellings mask the problem during testing — use divergent test words: `eg/jeg`, `ikkje/ikke`, `heim/hjem`, `me/vi`, `kva/hva`
- If the `definite_plural` of `bok` comes back as `bøkene` (Bokmål) rather than `bøkene/bøker` (Nynorsk uses `bøkene` too here — use `hus`: Nynorsk definite plural is `husa`, Bokmål is `husene`) — that divergence is your canary
- Long form outputs that never contain Nynorsk-distinctive endings: `-ane`, `-inga`, `-ast`

**Prevention strategy:**
1. Make Nynorsk enforcement structural in the system prompt, not advisory. Do not say "please use Nynorsk" — say "ONLY Nynorsk forms are valid. Bokmål forms are errors. If uncertain, state uncertainty in the `confidence` field."
2. Include a `confidence: low|medium|high` field in the JSON schema returned by the AI. Treat `low` as requiring human review before save.
3. Maintain a small local canary list (~20 words where Nynorsk and Bokmål forms are maximally divergent). Run this list against any new prompt template before deploying prompt changes.
4. Add a client-side warning banner when `confidence` is not `high`: "AI is uncertain — verify against Ordbokene before saving."

**Phase address:** Phase implementing the AI auto-fill feature (word creation). Address in the same phase, not deferred.

---

### Pitfall 2: OpenAI API Cost Spiral from Unbounded Requests

**What goes wrong:**
Each word addition triggers an OpenAI API call. This is correct by design, but without guardrails, cost can grow unboundedly in three ways: (a) the user adds many words quickly, (b) the AI assistant chat generates many turns with large context windows, (c) retries on failure double or triple consumption. Because OpenAI bills per token and model upgrades silently increase costs, a working feature can become expensive without any code change.

**Why it happens:**
The auto-fill prompt likely sends the word plus a full JSON schema example + system instructions. If the schema example is large (showing all inflection forms with explanations), the input token count per request can be 500-1000 tokens. gpt-4o at $5/1M input tokens is cheap per call, but a power user adding 50 words/day generates meaningful monthly cost. The chat assistant is worse: each chat turn re-sends the full conversation history unless explicitly managed.

**Consequences:**
- Unexpected billing spikes; for a personal tool this may exceed acceptable spend
- If the app ever becomes multi-user, cost scales with user count, not just word count
- Retry loops on transient 429/500 errors can multiply calls by 3-5x

**Warning signs:**
- No `max_tokens` cap on completion requests
- Chat component sends full `messages[]` array without trimming old turns
- No per-user or per-day request count tracking in the database
- Retry logic using fixed intervals rather than exponential backoff with attempt limits

**Prevention strategy:**
1. Cap `max_tokens` on every completion call. For the word analysis JSON response, the output is bounded — 300-500 tokens is sufficient. Set `max_tokens: 600` and treat truncated responses as errors.
2. For the chat assistant: implement a sliding window — keep only the last N turns in `messages[]` (N = 6-8). Always re-inject the system prompt and the word context, but drop old chat history beyond the window.
3. Add a `usage_log` table: `(user_id, request_type, tokens_used, cost_estimate, created_at)`. Log every API call. This gives visibility before cost becomes a problem.
4. Implement a soft daily limit per user (configurable in `.env`). When limit is approached, warn the user. When exceeded, block further AI calls and prompt to continue tomorrow.
5. Use exponential backoff for retries with a maximum of 2 retries. Never retry in a tight loop.
6. Cache analysis results: if a word has already been analyzed, return the cached result instead of calling OpenAI again. Key the cache on `normalized_word + "nynorsk"`.

**Phase address:** Phase implementing AI auto-fill. The `usage_log` table and caching can be deferred to the phase after the initial AI feature works, but the `max_tokens` cap and backoff must be in the first implementation.

---

### Pitfall 3: PostgreSQL Full-Text Search Ignores æøå and Returns Wrong Stems

**What goes wrong:**
PostgreSQL's built-in full-text search uses the `simple` text search configuration by default when no language is specified, or `english` if you use `to_tsvector('english', ...)`. Both break Norwegian in two ways: (a) characters `æ`, `ø`, `å` may be treated as punctuation or stripped, corrupting search tokens; (b) Norwegian stemming (removing `-ing`, `-else`, `-het`, `-ar`, `-ane` suffixes) is not applied, so searching "boka" does not find "bok".

**Why it happens:**
PostgreSQL ships with a `norwegian` text search configuration (`pg_catalog.norwegian`), but it must be explicitly used. The natural instinct when wiring up Prisma is to use raw SQL with a hardcoded language or to use Prisma's `search` field feature (which targets `english` stemming by default in most guides).

**Consequences:**
- Searching for a word in its inflected form (`husene`, `bøkene`) fails to find the base form
- Words containing æøå may not be indexed correctly, making them unfindable by partial search
- The bug is subtle — some searches work (common short words), others silently fail

**Warning signs:**
- Test search with: `fjord` (no special chars, works everywhere), then `fjorden` (inflected, should find `fjord`), then `ø` (special char), then `køyre` (Nynorsk-specific verb). If `fjorden` does not find `fjord`, stemming is broken.
- Any Prisma query using `contains` or `search` without an explicit `norwegian` configuration

**Prevention strategy:**
1. Use `to_tsvector('pg_catalog.norwegian', ...)` explicitly in all full-text search queries. The `norwegian` configuration applies correct stemming and handles æøå as word characters.
2. Create a GIN index on the `tsvector` column at migration time:
   ```sql
   CREATE INDEX words_search_idx ON words
   USING GIN (to_tsvector('pg_catalog.norwegian', word || ' ' || coalesce(translation, '')));
   ```
3. For Prisma: use `$queryRaw` for FTS queries rather than relying on Prisma's `search` mode, which does not expose language configuration.
4. Include `translation` (Ukrainian/English) in the search vector so users can search by meaning, not just by Norwegian form.
5. Test with the canary set: `ø`, `æ`, `å`, `gå` (infinitive), `gjekk` (past tense of `gå` in Nynorsk — should link to same concept), `ikkje`.

**Phase address:** Phase implementing word list and search. Set up the index and `$queryRaw` pattern in the same phase as basic CRUD — retrofitting FTS after the table has millions of rows is painful.

---

## Moderate Pitfalls

---

### Pitfall 4: JWT Secret Leaks and Token Never Expiring

**What goes wrong:**
Two separate JWT problems commonly occur together: the secret is committed to version control (or is a weak default like `"secret"` or `"your-jwt-secret"`), and access tokens are issued with no expiry or an extremely long expiry (30 days). The first makes the secret extractable from git history forever. The second means a stolen token is valid indefinitely.

**Why it happens:**
Early development uses placeholder secrets. The placeholder gets committed before `.env` is added to `.gitignore`. JWT libraries do not enforce expiry by default — `jwt.sign(payload, secret)` without `expiresIn` creates a token that never expires.

**Consequences:**
- Git history with a real secret cannot be fully purged without force-push history rewrite
- A stolen token (from XSS, network interception, or localStorage) is permanently valid
- For a personal app this is low severity, but the habit carries into multi-user releases

**Warning signs:**
- `jwt.sign(payload, secret)` without `{ expiresIn: '...' }` option
- `.env` not in `.gitignore` at project creation
- `JWT_SECRET` in `config.js` or hardcoded in the source file
- No `Authorization` header validation middleware (checking `Bearer ` prefix and catching malformed tokens)

**Prevention strategy:**
1. Add `.env` to `.gitignore` before the first commit. Use `.env.example` with placeholder values as the committed reference.
2. Always set `expiresIn: '15m'` for access tokens and implement a refresh token with longer expiry (`7d`) stored in an `httpOnly` cookie. For a personal tool, `expiresIn: '1d'` with no refresh is acceptable but document the tradeoff.
3. Generate the secret with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` — never a dictionary word.
4. In the JWT verification middleware, wrap `jwt.verify()` in try/catch and return 401 on `JsonWebTokenError`, `TokenExpiredError`, and `NotBeforeError` separately — this prevents error stack traces leaking to the client.
5. Store JWTs in `httpOnly` cookies rather than `localStorage` if XSS risk matters. For a personal single-user app, localStorage is acceptable but document it as a known tradeoff.

**Phase address:** Phase implementing authentication. All of the above must be in place before the auth feature ships — none can be deferred.

---

### Pitfall 5: Zustand Store Becomes a God Object as Word List Grows

**What goes wrong:**
The initial Zustand store looks clean: `{ words: [], addWord, removeWord, searchQuery, filteredWords }`. Over time, loading state, error state, pagination, selected word, edit mode, chat messages per word, and filter state accumulate in a single store slice. Components begin subscribing to the whole store and re-rendering on unrelated changes. With 500+ words, this creates noticeable UI lag on every keystroke in the search field.

**Why it happens:**
Zustand is easy to start with one store. Adding state to an existing store feels simpler than creating a new one. There is no natural forcing function to split until performance becomes painful.

**Consequences:**
- Search input causes full word list re-render on every keystroke
- Word detail components re-render when other words change
- Debugging becomes hard when one slice change triggers unexpected UI updates

**Warning signs:**
- A single `useWordStore` hook used in more than 5-6 different components
- `words[]` state and `chatMessages[]` state living in the same slice
- Any component using `useWordStore(state => state)` (subscribing to entire store)
- Search field feels sluggish with 200+ words loaded

**Prevention strategy:**
1. Define store boundaries from the start: `useWordStore` (list, CRUD, pagination), `useSearchStore` (query, filters, results), `useChatStore` (per-word chat state), `useUIStore` (loading, errors, selected word ID, modal state).
2. Always use selector functions: `useWordStore(state => state.words)` not `useWordStore()`. Zustand only re-renders when the selected slice changes.
3. For the search use case specifically: debounce the search input by 200ms before updating `useSearchStore`. This prevents per-keystroke re-renders.
4. Paginate or virtualize the word list. With 500+ entries, render only the visible viewport using a simple slice (`words.slice(page * 20, (page + 1) * 20)`) rather than rendering all entries into the DOM.
5. Keep async logic (API calls) in store actions, not components. Components should call `addWord(word)` and react to state changes — not await fetch calls directly.

**Phase address:** Store architecture (boundary definitions, selector discipline) in the phase that builds the word list UI. Virtualization can be deferred until the word count makes it necessary, but the store split cannot be retrofitted cheaply.

---

### Pitfall 6: Prisma Schema Evolution Breaks Existing Data

**What goes wrong:**
The initial `Word` model has fields that seem complete at design time. As Nynorsk grammar requirements become clearer, new fields are needed: `verbal_noun`, `supine`, `passive_infinitive`, extra example sentence slots, `difficulty` enum values. Each change requires a migration. The common mistakes are: adding `NOT NULL` columns without defaults (breaking existing rows), renaming columns instead of adding new ones (losing data), and letting migration files accumulate uncommitted changes that diverge between dev and prod.

**Why it happens:**
Nynorsk verb paradigms are more complex than initially modeled. A verb like `å skrive` has: infinitive, present, past, supine, past participle (two forms: strong and weak in Nynorsk), imperative, passive infinitive. An initial schema that models only `infinitive + past_tense + past_participle` will need expansion. The urgency of adding features leads to rushed migrations.

**Consequences:**
- `prisma migrate deploy` in production fails on `NOT NULL` constraint violations against existing rows
- Renamed columns lose their history if the rename is done as drop+add rather than rename migration
- Schema drift: dev database has fields that prod doesn't, or vice versa

**Warning signs:**
- Any `prisma migrate dev` that adds a `NOT NULL` column without `@default(...)` in Prisma schema
- Migration files edited after creation (modifying a migration that has already been applied)
- The `schema.prisma` has a `Json` field used as a catch-all for "extra grammar data" (sign that the schema was underdesigned)
- Fields typed as `String` where an enum would be more appropriate (`gender`, `word_class`, `difficulty`)

**Prevention strategy:**
1. Use `@default(...)` on every new column, or make it nullable with `?`. Never add a `NOT NULL` column to a table with existing rows without supplying a migration-time default.
2. Design the `Word` schema generously upfront. For Nynorsk verbs, model all known paradigm slots even if the AI leaves some null initially: `infinitive`, `present_tense`, `past_tense`, `supine`, `past_participle`, `imperative`, `passive_infinitive`. Nullable is fine; missing columns are not.
3. Use PostgreSQL enums via Prisma for `word_class` (`noun`, `verb`, `adjective`, `adverb`, `conjunction`, `preposition`), `gender` (`masculine`, `feminine`, `neuter`), `difficulty` (`beginner`, `intermediate`, `advanced`). Changing a `String` to an enum later requires a data migration.
4. Never edit a committed migration file. If a migration was wrong, create a new corrective migration.
5. Keep a `seed.ts` script that populates 10-15 representative words covering all word classes. Run it after every migration in dev to verify the schema is coherent.
6. Store example sentences as a separate `examples` table with a foreign key to `words`, not as a `String[]` array column. Arrays in PostgreSQL are hard to query and harder to extend (you can't add metadata to an array element).

**Phase address:** Schema design phase (before any AI integration). Getting word structure right before the AI prompt is written matters — the JSON schema returned by OpenAI should match the database schema exactly.

---

## Minor Pitfalls

---

### Pitfall 7: AI Prompt Returns Non-JSON on Edge Cases

**What goes wrong:**
The auto-fill feature expects OpenAI to return a JSON object. For most words it does. For edge cases — proper nouns, loanwords, interjections, words the model doesn't recognize — the model may return plain text ("This word doesn't appear to be Norwegian"), partial JSON, or JSON wrapped in a markdown code fence (` ```json ... ``` `). If the API response is parsed with `JSON.parse()` directly, the feature throws an unhandled exception.

**Prevention:**
1. Strip markdown code fences before parsing: `response.replace(/^```json\n?/, '').replace(/\n?```$/, '')`.
2. Wrap `JSON.parse()` in try/catch. On parse failure, return a structured error to the frontend: `{ error: "AI could not parse this word", raw: responseText }`.
3. Include in the system prompt: "Always respond with valid JSON matching the schema. If the word is unrecognizable, return the schema with all fields null and `confidence: 'low'`."
4. Use OpenAI's structured outputs / `response_format: { type: "json_object" }` (available in gpt-4o and later) to enforce JSON responses at the API level. This largely eliminates the problem.

**Phase address:** Same phase as auto-fill implementation.

---

### Pitfall 8: CORS Misconfiguration Blocks the Frontend in Production

**What goes wrong:**
During development, the Vite dev server proxy makes CORS invisible. In production, Express needs explicit CORS headers. A common mistake is setting `origin: '*'` (allows all origins, including credential-bearing requests in some browsers) or forgetting to include `credentials: true` when cookies are used for JWT.

**Prevention:**
1. Configure the `cors` npm package with an explicit `origin` list, not `'*'`. In production, `origin: process.env.FRONTEND_URL`.
2. If using `httpOnly` cookies for tokens: `cors({ credentials: true, origin: process.env.FRONTEND_URL })`.
3. Include `cors` configuration in the initial Express setup, not as an afterthought.

**Phase address:** Initial backend setup / authentication phase.

---

### Pitfall 9: Nynorsk Noun Gender Has Three Values, Not Two

**What goes wrong:**
Norwegian (and Nynorsk especially) uses three grammatical genders: masculine (`hankjønn`), feminine (`hokjønn`), and neuter (`inkjekjønn`). Bokmål allows treating masculine and feminine as the same class (`felleskjønn`), but Nynorsk does not — feminine gender is obligatory in standard Nynorsk. A schema or UI that offers only `masculine/neuter` (as many Bokmål-centric tools do) will corrupt Nynorsk data for a large class of words.

**Prevention:**
1. The `gender` enum must include all three: `masculine | feminine | neuter`. Do not use a boolean `is_neuter`.
2. The AI prompt must explicitly state that Nynorsk uses three genders and that feminine must be used where applicable.
3. The word card UI must display all three gender options, not a binary toggle.

**Phase address:** Schema design and word card UI phase.

---

### Pitfall 10: No Input Normalization Leads to Duplicate Words

**What goes wrong:**
A user adds `Hus`, `hus`, and `HUS` as separate entries because the uniqueness constraint is case-sensitive. Similarly, Unicode normalization differences (e.g., `å` as a single code point vs. `a` + combining ring above) can cause duplicates that look identical but are different strings.

**Prevention:**
1. Normalize input on the backend before the uniqueness check: `word.toLowerCase().normalize('NFC')`.
2. Add a database unique constraint on the normalized form, not the raw input: store `word_normalized` as a separate column used for the unique index.
3. Before calling OpenAI, check if the normalized form already exists in the user's word list and return the cached result.

**Phase address:** Word creation endpoint, same phase as basic CRUD.

---

## Phase-Specific Warning Matrix

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Database schema design | Undermodeled Nynorsk verb paradigm; wrong gender enum | Model all verb slots nullable; use 3-value gender enum |
| Authentication | JWT secret in repo; no expiry | `.env` before first commit; `expiresIn` on every sign call |
| AI auto-fill feature | Bokmål forms returned silently | Canary test set; `confidence` field; strict system prompt |
| AI auto-fill feature | No `max_tokens` cap; no retry backoff | Cap at 600 tokens; 2 retries max with exponential backoff |
| AI auto-fill feature | Non-JSON response on edge words | `response_format: json_object`; try/catch parse |
| Word list + search | PostgreSQL FTS with wrong language | Explicit `pg_catalog.norwegian`; GIN index at migration time |
| Word list + search | Duplicate words from case variants | Normalize + deduplicate before insert and before AI call |
| Chat assistant | Context window grows unbounded per session | Sliding window: keep last 6-8 turns + system prompt |
| Frontend state | Zustand god object; re-render on keystroke | Split stores by domain; use selectors; debounce search |
| Schema evolution | NOT NULL without default breaks prod deploy | Always `@default` or nullable; seed script after every migration |
| Production deploy | CORS blocks credentialed requests | Explicit origin; `credentials: true` if using cookies |

---

## Sources and Confidence Notes

| Area | Confidence | Basis |
|------|------------|-------|
| OpenAI Nynorsk accuracy | MEDIUM | Known behavior from LLM minority language bias; no live test against current gpt-4o |
| OpenAI cost control patterns | HIGH | OpenAI API documentation patterns (training data); `max_tokens`, `response_format`, usage logging are standard |
| PostgreSQL Norwegian FTS | HIGH | PostgreSQL ships `pg_catalog.norwegian`; `to_tsvector` language behavior is well-documented and stable |
| JWT security patterns | HIGH | Standard Node.js JWT security recommendations; well-established |
| Zustand store architecture | HIGH | Zustand documentation patterns; selector behavior is stable |
| Prisma migration pitfalls | HIGH | Prisma migration docs; `NOT NULL` without default is a documented failure mode |
| Nynorsk 3-gender system | HIGH | Standard Nynorsk grammar (Norsk språkråd); three-gender system is obligatory in Nynorsk |

**Note:** The Nynorsk-specific AI accuracy claims (Pitfall 1) should be validated by running the canary word list against the actual OpenAI model in the earliest AI integration phase. The prompt engineering strategy described is based on known LLM behavior with low-resource language variants, but exact failure rates depend on the specific model version used.
