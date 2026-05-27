# Architecture Patterns

**Project:** Norwegian Learning Hub
**Researched:** 2026-05-27
**Confidence:** HIGH (well-established stack, clear domain)

---

## Recommended Architecture

The application follows a classic three-tier web architecture with an AI service layer inserted
between the backend and OpenAI. The frontend is a React SPA; the backend is a REST + SSE API;
the database is PostgreSQL accessed through Prisma ORM.

```
┌─────────────────────────────────────────────────────────┐
│  BROWSER (React + Vite + Zustand)                       │
│                                                         │
│  Pages          Layouts       Feature Components        │
│  /words         AppShell      WordInput                 │
│  /words/:id     AuthLayout    WordCard                  │
│  /login                       WordList                  │
│                               ChatPanel                 │
│                               TagFilter                 │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP / SSE
┌──────────────────────▼──────────────────────────────────┐
│  BACKEND (Node.js + Express)                            │
│                                                         │
│  Auth routes     Word routes      AI routes             │
│  POST /auth/     GET  /words       POST /ai/analyze     │
│  login           POST /words       POST /ai/chat        │
│  POST /auth/     GET  /words/:id   GET  /ai/chat/stream │
│  register        PATCH /words/:id                       │
│  POST /auth/     DELETE /words/:id                      │
│  logout                                                 │
│                                                         │
│  AIService layer (wraps OpenAI SDK)                     │
│  CacheService   (in-memory + DB-backed)                 │
└─────────────┬──────────────────────┬────────────────────┘
              │ Prisma               │ OpenAI Node SDK
┌─────────────▼──────┐   ┌──────────▼──────────────────┐
│  PostgreSQL        │   │  OpenAI API                  │
│  users             │   │  gpt-4o (analysis)           │
│  words             │   │  gpt-4o (chat)               │
│  tags              │   │  Streaming: SSE chunks       │
│  word_tags         │   └─────────────────────────────┘
│  chat_messages     │
└────────────────────┘
```

---

## Component Boundaries

### Frontend Components

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `AppShell` | Nav, auth-gated layout wrapper | Auth store (Zustand) |
| `AuthLayout` | Login/register page wrapper | — |
| `LoginForm` | Credential form, submits to auth store | Auth store |
| `RegisterForm` | Registration form | Auth store |
| `WordInput` | Single text field + submit; triggers AI analyze | Word store → POST /words |
| `WordList` | Paginated/filtered list of saved words | Word store |
| `WordCard` (list item) | Compact word summary: headword, translation, tags | Links to `/words/:id` |
| `WordDetail` | Full word info: all forms, gender, examples, notes | Word store → GET /words/:id |
| `WordEditForm` | Inline edit of any field in WordDetail | Word store → PATCH /words/:id |
| `ChatPanel` | Per-word AI chat interface; shows message history | Chat store → SSE stream |
| `ChatMessage` | Single message bubble (user or assistant) | — |
| `TagFilter` | Multi-select tag chips for list filtering | Word store (local filter) |
| `SearchBar` | Text search input, debounced | Word store (query param) |
| `DifficultyBadge` | Visual indicator (A1–C2) | — |

**Store responsibilities (Zustand):**

| Store | State Owned |
|-------|------------|
| `authStore` | JWT token, user id, login/logout actions |
| `wordStore` | words list, current word, loading/error states, search/filter params |
| `chatStore` | messages array for current word, streaming state |

**Rules:**
- Components never call `fetch` directly — they dispatch store actions.
- Stores own all API calls via a thin `api.ts` client (Axios or native fetch with interceptors).
- `api.ts` attaches the JWT from `authStore` to every request header automatically.

---

### Backend Modules

| Module | Responsibility | Dependencies |
|--------|---------------|--------------|
| `routes/auth.ts` | Login, register, logout, token refresh | `services/auth.ts`, Prisma |
| `routes/words.ts` | CRUD for words; validates ownership | `services/words.ts`, Prisma |
| `routes/ai.ts` | Analyze endpoint + chat SSE stream | `services/ai.ts` |
| `services/auth.ts` | JWT sign/verify, password hashing (bcrypt) | jsonwebtoken, bcrypt |
| `services/words.ts` | Business logic: create word, attach tags, search query builder | Prisma |
| `services/ai.ts` | OpenAI calls: word analysis, chat completion with streaming | OpenAI Node SDK |
| `services/cache.ts` | Cache analyzed results by normalized headword | In-memory Map (v1) |
| `middleware/auth.ts` | Verify JWT on protected routes | `services/auth.ts` |
| `middleware/owner.ts` | Verify word belongs to requesting user | Prisma |

---

## Database Schema Outline

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  words        Word[]
}

model Word {
  id           String        @id @default(cuid())
  userId       String
  user         User          @relation(fields: [userId], references: [id])

  // Core fields (AI-populated)
  headword     String        // the word as entered by the user
  translation  String        // Ukrainian/English gloss
  gender       String?       // m / f / n (Nynorsk noun gender)
  wordClass    String?       // noun / verb / adj / adv
  forms        Json          // { indefinite, definite, plural_indef, plural_def, ... }
  examples     String[]      // AI-generated example sentences
  notes        String?       // AI grammar/usage notes
  rawAiOutput  Json?         // full AI response, kept for debugging/reanalysis

  // User-controlled fields
  difficulty   String?       // A1 / A2 / B1 / B2 / C1 / C2
  personalNote String?

  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  tags         WordTag[]
  chatMessages ChatMessage[]

  @@index([userId])
  @@index([headword])
}

model Tag {
  id    String    @id @default(cuid())
  name  String    @unique
  words WordTag[]
}

model WordTag {
  wordId String
  tagId  String
  word   Word   @relation(fields: [wordId], references: [id])
  tag    Tag    @relation(fields: [tagId], references: [id])

  @@id([wordId, tagId])
}

model ChatMessage {
  id        String   @id @default(cuid())
  wordId    String
  word      Word     @relation(fields: [wordId], references: [id])
  role      String   // "user" | "assistant"
  content   String
  createdAt DateTime @default(now())

  @@index([wordId])
}
```

**Key schema decisions:**
- `forms` is stored as `Json` because Nynorsk inflection patterns vary by word class (noun declension tables differ from verb conjugation tables). A typed JSON blob is simpler than a polymorphic table join for v1.
- `rawAiOutput` stored as `Json` enables reanalysis without re-calling OpenAI if the prompt improves.
- Tags are a shared table (not per-user). For v1 (single user) this is fine. For multi-user, add `userId` to `Tag` or keep them shared as vocabulary categories (e.g., "travel", "food").
- `ChatMessage` is persisted so the user can re-read past chat sessions for a word.

---

## API Endpoint Structure

### Auth

```
POST   /api/auth/register    body: { email, password }
POST   /api/auth/login       body: { email, password }  → { token }
POST   /api/auth/logout      header: Authorization: Bearer <token>
GET    /api/auth/me          header: Authorization       → { id, email }
```

### Words

```
GET    /api/words            ?search=&tag=&difficulty=&page=&limit=
POST   /api/words            body: { headword }          → triggers AI analysis, saves word
GET    /api/words/:id
PATCH  /api/words/:id        body: partial Word fields
DELETE /api/words/:id
```

### Tags

```
GET    /api/tags             → list all tags (for filter UI)
POST   /api/tags             body: { name }              → create tag
POST   /api/words/:id/tags   body: { tagId }             → attach tag to word
DELETE /api/words/:id/tags/:tagId
```

### AI

```
POST   /api/ai/analyze       body: { headword }
                             → returns structured JSON (forms, gender, translation, examples)
                             → cached by normalized headword

GET    /api/ai/chat/stream   query: ?wordId=&message=
                             → SSE stream of assistant tokens
                             Accept: text/event-stream
```

**Note on POST /api/words:** This endpoint calls `/api/ai/analyze` internally (or the same
`AIService`). The client submits one request and gets back a fully populated word. There is no
client-side orchestration of analyze-then-save.

---

## AI Integration Pattern

### Word Analysis (non-streaming)

```
Client                    Backend                      OpenAI
  |                          |                            |
  | POST /api/words           |                            |
  | { headword: "hund" }      |                            |
  |-------------------------->|                            |
  |                          | normalize headword          |
  |                          | check cache                 |
  |                          |   (cache miss)              |
  |                          | build system prompt         |
  |                          | (Nynorsk grammar expert)    |
  |                          |--------------------------->|
  |                          |         chat.completions   |
  |                          |         JSON mode response |
  |                          |<---------------------------|
  |                          | validate JSON shape         |
  |                          | write to cache              |
  |                          | save Word to DB (Prisma)    |
  |<--------------------------|                            |
  | 201 { word: {...} }       |                            |
```

**Cache strategy:**
- v1: In-memory `Map<string, AnalysisResult>` keyed on `headword.toLowerCase().trim()`.
- The cache is warm-only (process lifetime). A restart clears it.
- On cache miss, the result is written to `words.rawAiOutput` in the DB. On process restart, a warm-up step can reload from DB if needed.
- v2 (if multi-user): add a `analyzed_words` table as a persistent cache, shared across users.

**System prompt structure for analysis:**

```
You are a Nynorsk grammar expert. Given a headword, return a JSON object with:
- translation: Ukrainian gloss
- gender: m | f | n | null
- wordClass: noun | verb | adjective | adverb | other
- forms: object with inflected forms appropriate to wordClass
  (nouns: indefinite, definite, pluralIndefinite, pluralDefinite)
  (verbs: infinitive, present, past, pastParticiple, imperative)
- examples: array of 3 example sentences in Nynorsk with Ukrainian translations
- notes: 1-2 sentences on usage, register, or grammar peculiarities
```

Use `response_format: { type: "json_object" }` in the OpenAI call to enforce JSON output.

### Chat Assistant (streaming)

```
Client                    Backend                      OpenAI
  |                          |                            |
  | GET /ai/chat/stream       |                            |
  | ?wordId=x&message=...     |                            |
  |-------------------------->|                            |
  |                          | load word from DB           |
  |                          | build context:              |
  |                          |   system: Nynorsk expert    |
  |                          |   word context injected     |
  |                          | load chat history from DB   |
  |                          | append user message         |
  |                          |--------------------------->|
  |                          |    stream: true             |
  |     SSE: data: token1\n\n |<--- chunk ---------------  |
  |<--------------------------|                            |
  |     SSE: data: token2\n\n |<--- chunk ---------------  |
  |<--------------------------|                            |
  |     SSE: data: [DONE]\n\n |                            |
  |<--------------------------|                            |
  |                          | save full assistant message |
  |                          | to ChatMessage table        |
```

**SSE implementation pattern (Express):**

```typescript
// routes/ai.ts
router.get('/chat/stream', authMiddleware, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: buildMessages(word, history, userMessage),
    stream: true,
  });

  let fullContent = '';
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content ?? '';
    fullContent += token;
    res.write(`data: ${JSON.stringify({ token })}\n\n`);
  }

  res.write('data: [DONE]\n\n');
  res.end();

  // Persist after stream ends
  await prisma.chatMessage.createMany({ data: [userMsg, { role: 'assistant', content: fullContent }] });
});
```

**Frontend SSE consumption (React + Zustand):**

```typescript
// chatStore action
async streamChat(wordId: string, message: string) {
  const es = new EventSource(`/api/ai/chat/stream?wordId=${wordId}&message=${encodeURIComponent(message)}`);
  set({ streaming: true, pendingToken: '' });

  es.onmessage = (e) => {
    if (e.data === '[DONE]') { es.close(); set({ streaming: false }); return; }
    const { token } = JSON.parse(e.data);
    set((s) => ({ pendingToken: s.pendingToken + token }));
  };
}
```

Note: `EventSource` does not support POST requests or custom headers natively. Since the JWT must
be sent for auth, use one of these approaches:
- Pass the token as a query parameter (`?token=...`) — acceptable for v1 personal app where the
  token is short-lived.
- Use `fetch` with `ReadableStream` instead of `EventSource` for full header control — recommended
  for production / multi-user.

For v1, query-param token is simpler. Flag this for upgrade when multi-user auth is needed.

---

## Data Flow

### Add Word Flow

```
User types "hund" → WordInput
  → wordStore.addWord("hund")
    → POST /api/words { headword: "hund" }
      → Express: validate input
      → AIService.analyze("hund")
        → cache miss → OpenAI API (JSON mode)
        → validate + cache result
      → Prisma.word.create({ ...aiResult, userId })
    → 201 { word }
  → wordStore.words.push(word)
  → router.push(`/words/${word.id}`)
WordDetail renders with fully populated data.
```

### Chat Flow

```
User types question in ChatPanel
  → chatStore.streamChat(wordId, message)
    → GET /api/ai/chat/stream?wordId=&message=
      → load word + history from DB
      → OpenAI streaming call
      → SSE tokens → client
      → persist messages after stream ends
    → pendingToken accumulates in store
    → ChatMessage re-renders token by token
    → on [DONE]: finalize message in store
```

### Auth Flow

```
LoginForm submits credentials
  → authStore.login(email, password)
    → POST /api/auth/login
    → receive JWT
    → store in memory (authStore.token)
    → store in httpOnly cookie or localStorage (v1: localStorage for simplicity)
  → AppShell re-renders: shows protected routes
```

---

## Suggested Build Order

Dependencies flow from data persistence → business logic → AI → UI. Build in this order to always
have a testable vertical slice at each step.

### Phase 1 — Foundation (Auth + DB)
1. Prisma schema + migrations (User, Word, Tag, ChatMessage)
2. Express app skeleton (error handler, CORS, JSON middleware)
3. Auth routes + JWT middleware
4. Protect routes with `authMiddleware`
5. `LoginForm` + `RegisterForm` + `AppShell` with auth gate

**Gate:** Can log in, token persists, protected routes reject unauthenticated requests.

### Phase 2 — Core Word CRUD (no AI)
1. `POST /api/words` — save a word with manually-provided fields (AI optional at this point)
2. `GET /api/words` + `GET /api/words/:id`
3. `PATCH /api/words/:id` + `DELETE /api/words/:id`
4. `WordInput` → `WordList` → `WordDetail` → `WordEditForm`

**Gate:** Full word lifecycle works without AI. This decouples AI integration risk from core CRUD.

### Phase 3 — AI Word Analysis
1. `AIService.analyze()` with OpenAI JSON mode
2. In-memory cache
3. Wire into `POST /api/words` — analyze before save
4. Update `WordDetail` to show all AI-populated fields (forms table, examples, notes)

**Gate:** Typing a word and saving it produces a fully populated card with Nynorsk forms.

### Phase 4 — Search + Filtering
1. `GET /api/words?search=&tag=&difficulty=` query builder in Prisma
2. Tags API (`GET /api/tags`, `POST /api/words/:id/tags`)
3. `SearchBar`, `TagFilter`, `DifficultyBadge` components

**Gate:** User can navigate their growing vocabulary by search and tags.

### Phase 5 — AI Chat Assistant
1. `GET /api/ai/chat/stream` SSE endpoint
2. `ChatMessage` persistence
3. `ChatPanel` + `ChatMessage` components with streaming render

**Gate:** User can ask questions about a saved word and get streaming responses.

---

## Scalability Considerations

| Concern | v1 (single user) | v2 (multi-user) |
|---------|-----------------|-----------------|
| AI analysis cache | In-memory Map | `analyzed_words` DB table keyed on headword |
| JWT storage | localStorage (acceptable) | httpOnly cookie + refresh token rotation |
| Tag ownership | Shared global tags | Per-user tags or shared + user override |
| Chat history context | Full history per word | Truncate to last N messages + summary for long conversations |
| OpenAI rate limits | Not a concern | Queue + retry with exponential backoff |
| SSE auth | Token in query string | Switch to `fetch` ReadableStream with `Authorization` header |

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client-Side AI Orchestration
**What:** Frontend calls OpenAI directly, then separately saves to the backend.
**Why bad:** Exposes the OpenAI API key in the browser; inconsistent saves if one call fails.
**Instead:** All OpenAI calls happen server-side. `POST /api/words` is the single entry point.

### Anti-Pattern 2: Storing Only AI Output, Not Raw Response
**What:** Parsing the AI JSON and discarding `rawAiOutput` before saving.
**Why bad:** When the prompt is improved, you cannot re-parse historical words without re-calling OpenAI.
**Instead:** Store `rawAiOutput` in the `words` table. Add a background job later if re-analysis is needed.

### Anti-Pattern 3: Polling for AI Results
**What:** Client polls `GET /api/words/:id` until the word is populated.
**Why bad:** Unnecessary requests; worse UX than a single blocking response.
**Instead:** `POST /api/words` blocks until AI analysis is complete and returns the full word. Analysis is fast enough (< 3s) to block synchronously.

### Anti-Pattern 4: Zustand Store as Database
**What:** Storing all words in the store and treating it as the source of truth.
**Why bad:** Memory grows unbounded; stale after edits from another tab/device.
**Instead:** Store is a cache of the last fetched page. Always re-fetch on navigate-to-detail. Invalidate list on add/edit/delete.

### Anti-Pattern 5: One Monolithic `App.tsx`
**What:** All state and components in a single file.
**Why bad:** Unmaintainable by Phase 3+.
**Instead:** Feature-based folder structure from Phase 1:
```
src/
  features/
    auth/       LoginForm, RegisterForm, authStore
    words/      WordInput, WordList, WordCard, WordDetail, wordStore
    chat/       ChatPanel, ChatMessage, chatStore
  components/   shared UI: Button, Badge, SearchBar
  lib/          api.ts, types.ts
```

---

## Sources

- OpenAI Node SDK streaming pattern: training knowledge (HIGH confidence — stable API)
- Prisma schema patterns: training knowledge (HIGH confidence — stable ORM conventions)
- Express SSE pattern: training knowledge (HIGH confidence — established Node.js pattern)
- React feature-folder structure: training knowledge (HIGH confidence — widely adopted convention)
- EventSource auth limitation (no custom headers): training knowledge (HIGH confidence — browser spec limitation)
