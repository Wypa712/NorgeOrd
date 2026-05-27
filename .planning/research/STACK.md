# Technology Stack

**Project:** Norwegian Learning Hub
**Researched:** 2026-05-27
**Note:** External tools (WebSearch, WebFetch, Context7 CLI) were unavailable in this environment. All version and library data comes from training knowledge (cutoff August 2025). Versions marked with * require live verification against npm before pinning in package.json.

---

## Verdict on Decided Stack

The stack from SPEC.md is **valid and well-chosen** for this project type. No major swaps recommended. Specific library additions are needed for the three gap areas: AI streaming, PostgreSQL full-text search, and rate limiting. See sections below.

---

## Recommended Stack

### Frontend

| Technology | Version* | Purpose | Why |
|------------|---------|---------|-----|
| React | 18.3.x | UI component tree | React 18 concurrent features (Suspense, transitions) handle async AI streaming states cleanly. React 19 exists but has breaking changes — 18.3.x is the stable production choice as of 2025. |
| Vite | 5.x | Dev server + bundler | Fastest HMR in the ecosystem. Native ESM. React plugin via `@vitejs/plugin-react`. No config ceremony. The clear standard for new React projects since 2023 — CRA is deprecated. |
| Tailwind CSS | 3.4.x | Utility-first styling | Pairs with DaisyUI. v4 is in release but introduces breaking changes; 3.4.x is the production-safe version with a massive ecosystem of community references. |
| DaisyUI | 4.x | Component system on top of Tailwind | Provides semantic component classes (btn, card, modal, badge) that match vocabulary card UI needs exactly. Avoids building a component library from scratch. |
| Zustand | 4.x | Client state management | Minimal API. No boilerplate. Handles auth state (current user, JWT token), word list cache, and UI state (search filters, active word). Redux is overkill for a personal app. React Context + useReducer is fine but Zustand gives better devtools and less ceremony. |
| Axios | 1.6.x | HTTP client | Consistent request/response interceptors — critical for attaching JWT Bearer token to every request from one central place. The interceptor pattern is cleaner than fetch wrappers for this auth pattern. `fetch` is a valid alternative but requires more manual setup for interceptors. |
| react-query (TanStack Query) | 5.x | Server state / data fetching | **GAP — add this.** Zustand handles UI/auth state; TanStack Query handles server state (word list, individual word cards). Gives automatic caching, background refetch, loading/error states, and optimistic updates for word edits. Without it, you end up re-implementing caching and loading logic manually in Zustand. |

### Backend

| Technology | Version* | Purpose | Why |
|------------|---------|---------|-----|
| Node.js | 20.x LTS | Runtime | 20.x is the current LTS (active until 2026-04-30). 22.x is also LTS as of 2024. Pin to 20.x for maximum ecosystem compatibility and stability on whatever host you use. |
| Express | 4.19.x | HTTP server / routing | Express 5 reached RC in 2024 but was not fully stable/documented as of August 2025. Stay on 4.x — it is battle-tested, has the widest middleware ecosystem, and the migration to 5.x is non-trivial. |
| PostgreSQL | 16.x | Primary datastore | Structured vocabulary data with JSONB for word forms. Built-in `tsvector`/`tsquery` for full-text search (see below). 16.x is current stable. |
| Prisma ORM | 5.x | Database access + migrations | Type-safe queries generated from schema. Migration workflow (`prisma migrate dev`) keeps DB in sync with code. Schema-first approach matches the structured word data model well. `@prisma/client` auto-completes word form fields. **Note:** Prisma's full-text search support (see below) requires a raw query escape hatch for advanced `tsvector` operations. |
| JWT (jsonwebtoken) | 9.x | Authentication tokens | `jsonwebtoken` npm package. Simple stateless auth for a personal app — no need for session stores or OAuth complexity. Issue on login, verify on every protected route via middleware. |
| bcrypt (bcryptjs) | 2.4.x | Password hashing | `bcryptjs` (pure JS, no native bindings) is simpler to build/deploy than `bcrypt`. For a personal app with one or few users, bcryptjs performance is perfectly adequate. |

### AI Integration

| Technology | Version* | Purpose | Why |
|------------|---------|---------|-----|
| openai (npm) | 4.x | OpenAI API client | Official Node.js SDK. v4 introduced the streaming helpers and the clean `chat.completions.create({ stream: true })` API. Use this — do not hand-roll HTTP calls to the OpenAI API. |
| **Vercel AI SDK** (`ai`) | 3.x | **GAP — add for streaming** | Provides `streamText`, `LangChainStream`, and React hooks (`useChat`, `useCompletion`) that wire streaming responses end-to-end from Express through to the React UI. Without it, you must manually read SSE chunks in the browser and manage the stream state. The SDK handles backpressure, error recovery, and the `ReadableStream` → UI state bridge. It works with Express (not just Next.js). |

**Alternative to Vercel AI SDK:** If you prefer fewer dependencies, the `openai` SDK v4 `stream` option combined with manual `res.write()` SSE in Express and a custom `EventSource` or `fetch` streaming consumer on the frontend works — but it is 60-80 lines of plumbing the AI SDK gives you for free. Recommended: use the AI SDK.

### Full-Text Search (PostgreSQL)

**GAP — requires deliberate implementation choice.**

PostgreSQL has native full-text search via `tsvector` + `tsquery`. For Norwegian vocabulary search (search by word, translation, tags, notes), this is sufficient and requires no additional service.

**Recommended approach:**

1. Add a `search_vector tsvector` column to the `words` table, populated by a PostgreSQL trigger on insert/update.
2. Index it: `CREATE INDEX words_search_idx ON words USING GIN (search_vector)`.
3. Query: `WHERE search_vector @@ plainto_tsquery('simple', $1)`.
4. Use `'simple'` dictionary (not `'norwegian'`) because Nynorsk is not in PostgreSQL's default text search configurations — `'simple'` does basic normalization without stemming, which is correct for a vocabulary app where you want exact-ish matches.

**Prisma integration:** Prisma 5.x supports `fullTextSearch` as a preview feature for PostgreSQL. Enable with `previewFeatures = ["fullTextSearch"]` in `schema.prisma`. This gives `findMany({ where: { _search: 'hus' } })`. However, the preview feature generates less optimal SQL than the raw `tsvector` + GIN index approach. **Recommendation:** Use Prisma for all standard CRUD, drop to `prisma.$queryRaw` for the search query to get full control over the GIN index path.

No additional npm package needed — this is pure PostgreSQL + Prisma raw query.

### Rate Limiting

**GAP — add both of these:**

| Library | Version* | Purpose | Why |
|---------|---------|---------|-----|
| `express-rate-limit` | 7.x | General API rate limiting | Per-IP or per-user request throttling on all routes. Prevents abuse and protects your OpenAI API bill. Apply a global limit (e.g. 100 req/15min) and a stricter limit on AI endpoints (e.g. 10 req/min). |
| `bottleneck` | 2.x | OpenAI call queue/throttle | Client-side rate limiter that queues outbound calls to OpenAI. Prevents you from accidentally hitting OpenAI's TPM (tokens per minute) or RPM (requests per minute) limits when multiple requests arrive simultaneously. `express-rate-limit` protects your server; `bottleneck` protects the OpenAI API relationship. |

**Usage pattern:**
```javascript
// bottleneck limiter for OpenAI calls
const Bottleneck = require('bottleneck');
const limiter = new Bottleneck({
  maxConcurrent: 2,        // max 2 simultaneous OpenAI calls
  minTime: 1000            // minimum 1s between calls
});

const result = await limiter.schedule(() =>
  openai.chat.completions.create({ ... })
);
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Frontend framework | React 18 | Next.js | No SSR/SSG needed for a personal SPA. Next.js adds build complexity, server costs, and routing constraints. Pure SPA is the right shape. |
| Frontend framework | React 18 | Vue 3 / Svelte | Stack is already decided and both are valid; React has broader hiring pool and ecosystem. No reason to switch. |
| State management | Zustand + TanStack Query | Redux Toolkit | RTK is excellent but verbose for a personal project with simple state. Zustand + TanStack Query covers the same surface with 80% less code. |
| HTTP client | Axios | fetch | Both work. Axios wins for this project because the JWT interceptor pattern is one `axios.interceptors.request.use()` call vs. a custom wrapper function around every fetch call. Consistency matters. |
| ORM | Prisma | Drizzle ORM | Drizzle is gaining popularity in 2025 for its lighter footprint and SQL-first approach. Either is fine. Stick with Prisma — it's in the spec and the migration/schema tooling is more mature. Revisit for v2 if performance becomes a concern. |
| ORM | Prisma | TypeORM | TypeORM has more open issues and slower maintenance pace as of 2025. Prisma is the safer choice. |
| Auth | JWT (jsonwebtoken) | Passport.js | Passport adds abstraction for multi-strategy OAuth — unnecessary for a personal app with username/password only. Raw `jsonwebtoken` + custom middleware is simpler and fully sufficient. |
| Auth | JWT | Lucia Auth / Better Auth | These are modern auth libraries worth considering for v2 if the app goes multi-user public. For v1 personal tool, hand-rolled JWT is transparent and has zero magic. |
| AI streaming | Vercel AI SDK | Hand-rolled SSE | Both work. AI SDK saves ~100 lines of plumbing and handles edge cases (stream cancellation, error recovery). Use it. |
| Bundler | Vite | webpack / Parcel | webpack is legacy for new projects. Parcel is simpler but less configurable. Vite is the current standard. |
| CSS | Tailwind + DaisyUI | styled-components / CSS Modules | CSS-in-JS has runtime overhead. Tailwind generates static CSS. DaisyUI component classes keep JSX readable. This combination is well-suited to a vocabulary card UI. |

---

## Gaps Summary (What to Add)

Three concrete additions beyond the SPEC.md stack:

1. **TanStack Query v5** — server state management for word list and word card data
2. **Vercel AI SDK v3** (`ai` package) — streaming AI responses without plumbing
3. **express-rate-limit v7 + bottleneck v2** — rate limiting at server level and OpenAI call level

---

## Full Dependency List

### Frontend (`package.json`)

```bash
# Production
react@^18.3.0
react-dom@^18.3.0
axios@^1.6.0
zustand@^4.5.0
@tanstack/react-query@^5.0.0   # ADD: server state
ai@^3.0.0                       # ADD: streaming hooks

# Dev
vite@^5.0.0
@vitejs/plugin-react@^4.0.0
tailwindcss@^3.4.0
daisyui@^4.0.0
autoprefixer@^10.0.0
postcss@^8.0.0
```

### Backend (`package.json`)

```bash
# Production
express@^4.19.0
@prisma/client@^5.0.0
jsonwebtoken@^9.0.0
bcryptjs@^2.4.0
openai@^4.0.0
ai@^3.0.0                        # ADD: streaming helpers
express-rate-limit@^7.0.0        # ADD: API rate limiting
bottleneck@^2.19.0               # ADD: OpenAI call throttle
cors@^2.8.5
dotenv@^16.0.0
helmet@^7.0.0                    # ADD: security headers (no-brainer for Express)

# Dev
prisma@^5.0.0
nodemon@^3.0.0
```

---

## Important Notes

### Nynorsk and Full-Text Search

PostgreSQL's built-in `norwegian` text search config is for Bokmål morphology. For Nynorsk, use `'simple'` dictionary. This avoids incorrect stemming (e.g., Nynorsk plurals differ from Bokmål). The `tsvector` column should concatenate: `norwegianWord || ' ' || translation || ' ' || tags`.

### OpenAI Model Selection

Use `gpt-4o-mini` as the default model for word analysis — it is significantly cheaper than `gpt-4o` and more than capable of producing Nynorsk grammatical forms, gender, and example sentences. Reserve `gpt-4o` for explicit "deep explanation" user requests only. This directly controls cost for a personal app with no billing controls.

### Environment Variables Required

```
DATABASE_URL=postgresql://...
JWT_SECRET=...
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
PORT=3000
NODE_ENV=development
```

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Core stack validation (React, Vite, Tailwind, Express, Prisma, JWT) | HIGH | These are mature, stable choices with no serious contenders in 2025. Training knowledge is reliable here. |
| Exact versions | MEDIUM | Based on training data (cutoff Aug 2025). Versions are correct as of that date. Verify against npm before pinning. React 18.3.x, Prisma 5.x, Express 4.19.x, Vite 5.x are safe anchors. |
| TanStack Query recommendation | HIGH | Widely validated pattern for separating server state from UI state in React apps. |
| Vercel AI SDK for streaming | HIGH | The AI SDK is the dominant solution for SSE streaming from LLMs in Node.js/React stacks as of 2025. The `useChat` hook pattern is well-established. |
| PostgreSQL full-text search approach | HIGH | `tsvector` + GIN index + `plainto_tsquery` is standard PostgreSQL. Nynorsk `simple` dict recommendation is based on known limitation of `norwegian` config being Bokmål-only. |
| Rate limiting libraries | HIGH | `express-rate-limit` is the de facto Express rate limiting library. `bottleneck` is a well-known queue/throttle library. Both stable. |
| OpenAI model recommendation (gpt-4o-mini) | MEDIUM | Model pricing and capability may shift. Verify current OpenAI pricing at time of implementation. |

---

## Sources

Note: All external network access was blocked during this research session. Findings are based on training knowledge (cutoff August 2025) combined with project context from SPEC.md and PROJECT.md.

- React 18 docs: https://react.dev
- Vite docs: https://vitejs.dev
- TanStack Query v5: https://tanstack.com/query/v5
- Vercel AI SDK: https://sdk.vercel.ai/docs
- Prisma full-text search preview: https://www.prisma.io/docs/orm/prisma-client/queries/full-text-search
- express-rate-limit: https://github.com/express-rate-limit/express-rate-limit
- bottleneck: https://github.com/SGrondin/bottleneck
- OpenAI Node SDK: https://github.com/openai/openai-node
