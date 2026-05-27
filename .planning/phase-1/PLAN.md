# Phase 1 Plan: Auth + DB Foundation

**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Mode:** MVP — vertical slices (UI → API → DB per feature)
**Wave structure:** Slice 1 → Slice 2 → Slice 3+4 (parallel) → Slice 5 → Slice 6

---

## Goal

Users can securely register, log in, remain authenticated across page reloads, and access only their own isolated word collection — backed by a production-ready PostgreSQL schema with the correct Nynorsk gender enum and GIN full-text index.

---

## Approach

Every slice ends in a testable, working state. The build order is: schema + migrations first (proves DB connection), then backend auth API (proves JWT loop), then frontend scaffolding + auth UI in parallel (both consume the working API), then route protection + AppShell, then end-to-end verification. No placeholder tasks — each task has a specific, verifiable outcome.

Walking skeleton target: `POST /api/auth/register` → store JWT in localStorage → visit `/words` after reload → see placeholder page → click "Вийти" → redirect to `/login`.

---

## Prerequisites

Before starting Slice 1, the following must exist or be set up manually:

1. **PostgreSQL running locally** — `postgresql://localhost:5432` accessible, or a connection string to a hosted DB (Supabase, Railway, Neon, etc.)
2. **Node.js 20+ installed** — `node --version` should show v20+
3. **npm 10+ installed** — comes with Node 20
4. **Git initialized at project root** — `git init` if not already done
5. **`.gitignore` at project root** — must include `backend/.env` and `frontend/.env` before first commit

---

## Environment Setup

### Step E1 — Create `.gitignore` at project root

Create `c:\Users\Олександр\Desktop\lern nor\.gitignore` with at minimum:

```
# Environment files — NEVER commit
backend/.env
frontend/.env
node_modules/
dist/
build/
.DS_Store
*.log
```

### Step E2 — Generate JWT_SECRET

Run this once and save the output — it becomes `JWT_SECRET` in `backend/.env`:

```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step E3 — Create `backend/.env` (not committed)

```env
DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/norwegian_hub
JWT_SECRET=<64-char hex from Step E2>
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Step E4 — Create `frontend/.env` (not committed)

```env
VITE_API_URL=http://localhost:3000/api
```

### Step E5 — Create `backend/.env.example` (committed as template)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/norwegian_hub
JWT_SECRET=replace_with_64_char_random_hex
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### Step E6 — Create `frontend/.env.example` (committed as template)

```env
VITE_API_URL=http://localhost:3000/api
```

---

## Slices

---

### Slice 1: Database Foundation

**Goal:** PostgreSQL schema exists with all models, enums, indexes, and the GIN FTS index. Prisma client is generated and usable.

**Addresses:** AUTH-04 (userId FK on Word, row isolation foundation), all future phases depend on this schema.

---

#### Task 1.1 — Scaffold backend and write Prisma schema

**Files to create:**
- `backend/package.json` — via `npm init -y` then manual edits
- `backend/tsconfig.json` — via `npx tsc --init` then configured
- `backend/.env.example` — see Environment Setup Step E5
- `backend/prisma/schema.prisma` — full schema below
- `backend/src/lib/prisma.ts` — PrismaClient singleton

**Actions:**

1. Create the `backend/` directory at project root and scaffold:

```powershell
cd "c:\Users\Олександр\Desktop\lern nor"
mkdir backend
cd backend
npm init -y
npm install express@^5.2.1 @prisma/client@^7.8.0 jsonwebtoken@^9.0.3 bcryptjs@^3.0.3 cors@^2.8.5 dotenv@^16.0.0 helmet@^8.2.0 express-rate-limit@^8.5.2
npm install -D prisma@^7.8.0 typescript@^5 @types/node @types/express @types/jsonwebtoken @types/bcryptjs @types/cors ts-node nodemon
npx tsc --init
npx prisma init
```

2. Configure `backend/tsconfig.json` — replace generated defaults with:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Note: Using `"module": "CommonJS"` (not `"node16"`) to avoid `.js` import suffixes on every file. If TypeScript complains about imports later, add `"moduleResolution": "node"` explicitly.

3. Add scripts to `backend/package.json`:

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "type-check": "tsc --noEmit",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio"
  }
}
```

4. Write `backend/prisma/schema.prisma` with the full v1 schema:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Gender {
  masculine
  feminine
  neuter
}

enum WordClass {
  noun
  verb
  adjective
  adverb
  other
}

enum Difficulty {
  A1
  A2
  B1
  B2
  C1
  C2
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  words        Word[]
}

model Word {
  id           String      @id @default(cuid())
  userId       String
  user         User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  headword     String
  translation  String?
  gender       Gender?
  wordClass    WordClass?
  forms        Json?
  examples     String[]
  notes        String?
  rawAiOutput  Json?

  difficulty   Difficulty?
  personalNote String?

  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  tags         WordTag[]
  chatMessages ChatMessage[]

  @@index([userId])
  @@index([headword])
  @@unique([userId, headword])
}

model Tag {
  id    String    @id @default(cuid())
  name  String    @unique
  words WordTag[]
}

model WordTag {
  wordId String
  tagId  String
  word   Word   @relation(fields: [wordId], references: [id], onDelete: Cascade)
  tag    Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([wordId, tagId])
}

model ChatMessage {
  id        String   @id @default(cuid())
  wordId    String
  word      Word     @relation(fields: [wordId], references: [id], onDelete: Cascade)
  role      String
  content   String
  createdAt DateTime @default(now())

  @@index([wordId])
}
```

Critical schema decisions to verify before saving:
- `Gender` enum has exactly 3 values: `masculine`, `feminine`, `neuter` — `feminine` is MANDATORY (Nynorsk requirement)
- `@@unique([userId, headword])` prevents duplicate words per user — add now, not in Phase 2
- `examples String[]` — Prisma array type, maps to PostgreSQL `text[]`
- `forms Json?` — for flexible inflection storage (Nynorsk has complex forms)
- All child FK relations have `onDelete: Cascade`

5. Create `backend/src/lib/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

**Verify:**
- `backend/prisma/schema.prisma` contains all 5 models (User, Word, Tag, WordTag, ChatMessage) and 3 enums (Gender, WordClass, Difficulty)
- `npx prisma validate` in `backend/` exits with no errors
- `Gender` enum contains `feminine` (grep check: `grep -A4 "enum Gender" prisma/schema.prisma` shows all 3 values)

---

#### Task 1.2 — Run initial migration and generate Prisma client

**Files modified:**
- `backend/prisma/migrations/` — created by Prisma CLI

**Actions:**

1. Ensure `backend/.env` exists with a valid `DATABASE_URL` (see Environment Setup Step E3).

2. Create the database if it does not exist yet. In psql:
   ```sql
   CREATE DATABASE norwegian_hub;
   ```
   Or use your DB provider's dashboard.

3. Run the initial migration:
   ```powershell
   cd "c:\Users\Олександр\Desktop\lern nor\backend"
   npx prisma migrate dev --name init
   ```
   This creates `backend/prisma/migrations/YYYYMMDDHHMMSS_init/migration.sql` and applies it to the DB.

4. Verify the migration succeeded by listing tables in psql:
   ```sql
   \dt
   ```
   Expected tables: `User`, `Word`, `Tag`, `WordTag`, `ChatMessage`

5. Generate the Prisma client (already done by `migrate dev`, but explicit for clarity):
   ```powershell
   npx prisma generate
   ```

**Verify:**
- `npx prisma migrate status` shows "All migrations have been applied"
- Tables `User`, `Word`, `Tag`, `WordTag`, `ChatMessage` exist in the database
- `backend/node_modules/.prisma/client/` exists (Prisma client generated)

---

#### Task 1.3 — Add GIN full-text search index

**Files modified:**
- `backend/prisma/migrations/YYYYMMDDHHMMSS_add_fts_gin_index/migration.sql` — created then edited

**Actions:**

This MUST be done as a two-step migration because Prisma cannot generate GIN tsvector expression indexes automatically.

1. Create an empty migration shell:
   ```powershell
   cd "c:\Users\Олександр\Desktop\lern nor\backend"
   npx prisma migrate dev --name add_fts_gin_index --create-only
   ```
   This creates a new migration directory with an empty `migration.sql`.

2. Find the newly created file. It will be at:
   `backend/prisma/migrations/YYYYMMDDHHMMSS_add_fts_gin_index/migration.sql`
   (The timestamp prefix is generated by Prisma — find the newest directory in `migrations/`)

3. Edit that `migration.sql` file and replace its contents with:
   ```sql
   CREATE INDEX words_search_gin_idx ON "Word"
   USING GIN (
     to_tsvector(
       'pg_catalog.norwegian',
       "headword" || ' ' || coalesce("translation", '')
     )
   );
   ```

   Critical details:
   - Table name is `"Word"` with double-quotes and capital W — Prisma maps model names directly to PostgreSQL
   - Language config is `'pg_catalog.norwegian'` — NOT `'english'`, NOT `'simple'` (Nynorsk FTS requirement from CLAUDE.md)
   - `coalesce("translation", '')` handles NULL translation without breaking the index

4. Apply the migration:
   ```powershell
   npx prisma migrate dev
   ```

**Verify:**
- `npx prisma migrate status` shows all migrations applied (no pending)
- In psql: `\d "Word"` — shows `words_search_gin_idx` in the indexes list
- Or: `SELECT indexname FROM pg_indexes WHERE tablename = 'Word' AND indexname = 'words_search_gin_idx';` returns 1 row
- Index language check: `SELECT indexdef FROM pg_indexes WHERE indexname = 'words_search_gin_idx';` — output must contain `pg_catalog.norwegian`

---

### Slice 2: Backend Auth API

**Goal:** Four endpoints working and manually testable with curl. JWT issued on register/login, verified on protected routes.

**Addresses:** AUTH-01 (register), AUTH-02 (login + JWT), AUTH-03 (logout endpoint), AUTH-04 (requireAuth middleware ready for word queries)

---

#### Task 2.1 — Auth services and middleware

**Files to create:**
- `backend/src/services/auth.ts` — JWT sign/verify, password hash/compare
- `backend/src/middleware/auth.ts` — requireAuth middleware + Express type augmentation

**Actions:**

Create `backend/src/services/auth.ts`:

```typescript
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET!;
const SALT_ROUNDS = 12;

export interface TokenPayload {
  userId: string;
  email: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

Decisions:
- `expiresIn: '7d'` — v1 personal tool; no refresh token needed
- `SALT_ROUNDS = 12` — bcryptjs recommended default for 2025 hardware (~100ms login, acceptable for personal tool)
- `JWT_SECRET!` non-null assertion — server will crash on startup if env var missing (fail-fast behavior)

Create `backend/src/middleware/auth.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../services/auth';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed token' });
    return;
  }

  const token = header.slice(7);
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

Note on Express 5.x + TypeScript: The `requireAuth` function return type must be `void`, not `Response`, when calling `res.status().json()` without returning the value. Express 5 propagates async errors automatically — but this function is synchronous, so no special handling needed.

Note on `declare global`: This augmentation in `middleware/auth.ts` makes `req.user` available throughout the app. If TypeScript still reports `Property 'user' does not exist on type 'Request'`, check that `tsconfig.json` includes `src/**/*` and this file is compiled.

**Verify:**
- `npx tsc --noEmit` in `backend/` passes (zero errors)
- Both files exist at the correct paths

---

#### Task 2.2 — Auth routes and Express app entry point

**Files to create:**
- `backend/src/routes/auth.ts` — register, login, logout, me endpoints
- `backend/src/index.ts` — Express app with helmet, cors, rate-limiting

**Actions:**

Create `backend/src/routes/auth.ts`:

```typescript
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { hashPassword, comparePassword, signToken } from '../services/auth';
import { requireAuth } from '../middleware/auth';

const router = Router();

// POST /api/auth/register — AUTH-01
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({ error: 'Valid email is required' });
    return;
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email: email.trim().toLowerCase(), passwordHash },
  });

  const token = signToken({ userId: user.id, email: user.email });
  res.status(201).json({ token, userId: user.id });
});

// POST /api/auth/login — AUTH-02
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user || !(await comparePassword(password, user.passwordHash))) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email });
  res.json({ token, userId: user.id });
});

// POST /api/auth/logout — AUTH-03
// Server-side: no-op (JWT is stateless). Client clears the token.
router.post('/logout', requireAuth, (_req, res) => {
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me — used by frontend to verify token on load
router.get('/me', requireAuth, (req, res) => {
  res.json({ userId: req.user!.userId, email: req.user!.email });
});

export default router;
```

Note on Express 5 error handling: async errors thrown inside route handlers propagate automatically without `next(err)`. The `try/catch` in `requireAuth` (sync code) handles JWT verification errors explicitly.

Create `backend/src/index.ts`:

```typescript
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import authRouter from './routes/auth';

const app = express();

app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: false,
}));

app.use(express.json());

// Global rate limit: 200 req/15min per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Auth-specific rate limit: 10 req/15min (brute force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts, please try again later' },
});

app.use('/api/auth', authLimiter, authRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Start the backend and test all four endpoints:**

```powershell
cd "c:\Users\Олександр\Desktop\lern nor\backend"
npm run dev
```

Test register:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method POST -ContentType "application/json" -Body '{"email":"test@example.com","password":"testpass123"}'
```
Expected: `{ token: "eyJ...", userId: "cl..." }` with HTTP 201

Test login:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"test@example.com","password":"testpass123"}'
```
Expected: `{ token: "eyJ...", userId: "cl..." }` with HTTP 200

Test /me with token (replace TOKEN with value from above):
```powershell
$headers = @{ Authorization = "Bearer TOKEN" }
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/me" -Method GET -Headers $headers
```
Expected: `{ userId: "cl...", email: "test@example.com" }` with HTTP 200

Test /me without token:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/me" -Method GET
```
Expected: HTTP 401 `{ error: "Missing or malformed token" }`

Test duplicate email:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method POST -ContentType "application/json" -Body '{"email":"test@example.com","password":"testpass123"}'
```
Expected: HTTP 409 `{ error: "Email already registered" }`

**Verify:**
- All 5 curl tests above pass with expected status codes and response shapes
- `npx tsc --noEmit` in `backend/` passes with zero errors
- Row isolation test: register a second email (`test2@example.com`) — confirm different `userId` is returned

---

### Slice 3: Frontend Scaffold + Tailwind/DaisyUI

**Goal:** Vite project exists, all dependencies installed, Tailwind + DaisyUI configured, `data-theme="nord"` applied, and `npm run dev` shows a page with the correct background color (`#ECEFF4`).

This slice runs in parallel with Slice 4 if a second Claude instance is used, but Slice 5 depends on both completing first.

---

#### Task 3.1 — Scaffold Vite project and install all dependencies

**Files to create:**
- `frontend/` — entire Vite scaffolded project
- `frontend/.env.example` — see Environment Setup Step E6
- `frontend/tailwind.config.js` — with DaisyUI plugin
- `frontend/postcss.config.js` — postcss + autoprefixer
- `frontend/index.html` — with `data-theme="nord"` on `<html>`

**Actions:**

1. Scaffold the frontend from project root:

```powershell
cd "c:\Users\Олександр\Desktop\lern nor"
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

2. Install runtime dependencies:

```powershell
npm install axios@^1.16.1 zustand@^5.0.13 @tanstack/react-query@^5.100.14 react-router-dom@^7.15.1
```

3. Install dev dependencies:

```powershell
npm install -D tailwindcss@^3.4.0 postcss autoprefixer daisyui@^5.5.20
npx tailwindcss init -p
```

4. Configure `frontend/tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['nord'],
    darkTheme: false,
  },
}
```

WARNING: `require('daisyui')` is the assumed DaisyUI 5.x Tailwind plugin syntax. If this fails with an error like "daisyui is not a function" or "cannot find module", check the DaisyUI 5 migration guide. The alternative ESM import syntax is:
```js
import daisyui from 'daisyui';
// plugins: [daisyui]
```
But `tailwind.config.js` with `module.exports` uses CommonJS `require`. If DaisyUI 5 ships as ESM-only, rename to `tailwind.config.cjs` or use a dynamic require workaround.

5. Configure `frontend/src/index.css` — replace all contents with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

6. Edit `frontend/index.html` — add `data-theme="nord"` and `lang="uk"` to the `<html>` tag:

```html
<!doctype html>
<html lang="uk" data-theme="nord">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Norwegian Learning Hub</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

7. Create `frontend/.env` (not committed — matches Step E4):
   ```
   VITE_API_URL=http://localhost:3000/api
   ```

8. Create `frontend/.env.example`:
   ```
   VITE_API_URL=http://localhost:3000/api
   ```

**Verify:**
- `npm run dev` in `frontend/` starts without errors
- Browser at `http://localhost:5173` shows a page with background color `#ECEFF4` (the DaisyUI `nord` base-100)
- Browser DevTools → Elements: `<html>` tag has `data-theme="nord"` attribute
- `npm run build` completes without TypeScript errors

---

### Slice 4: Auth Types, Axios Instance, Zustand Store

**Goal:** The core frontend auth infrastructure is in place — types defined, API client configured with JWT interceptors, auth store can persist tokens across page reloads.

This slice runs in parallel with Slice 3.

---

#### Task 4.1 — Types, Axios instance, and auth store

**Files to create:**
- `frontend/src/lib/types.ts` — AuthResponse, ApiError, User
- `frontend/src/lib/api.ts` — Axios instance with JWT interceptors
- `frontend/src/features/auth/authStore.ts` — Zustand persist store

**Actions:**

Create `frontend/src/lib/types.ts`:

```typescript
export interface AuthResponse {
  token: string;
  userId: string;
}

export interface ApiError {
  error: string;
}

export interface User {
  userId: string;
  email: string;
}
```

Create `frontend/src/lib/api.ts`:

```typescript
import axios from 'axios';
import { useAuthStore } from '../features/auth/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT Bearer token to every outgoing request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401 (token expired or invalid)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;
```

Note: `useAuthStore.getState()` (store method) is used here, NOT `useAuthStore()` (React hook). Hooks cannot be called outside React components — interceptors run outside component trees.

Create directory `frontend/src/features/auth/` if it does not exist, then create `frontend/src/features/auth/authStore.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  userId: string | null;
  login: (token: string, userId: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      login: (token, userId) => set({ token, userId }),
      logout: () => set({ token: null, userId: null }),
    }),
    {
      name: 'auth',
      partialize: (state) => ({ token: state.token, userId: state.userId }),
    }
  )
);
```

The `persist` middleware:
- Automatically saves `token` and `userId` to `localStorage` under key `'auth'`
- Rehydrates synchronously when the store first loads — no `useEffect` needed
- `partialize` ensures only data (not functions) is serialized

**Verify:**
- `npx tsc --noEmit` in `frontend/` passes with zero errors for these three files
- Open browser console on `http://localhost:5173`, run: `localStorage.getItem('auth')` — should return `null` (nothing stored yet, that is correct)
- The store's `persist` key in localStorage will be `'auth'` (not `'auth_token'` — the key is the Zustand persist `name`, not the field name)

---

### Slice 5: Auth Feature — Forms, ProtectedRoute, AppShell, Routing

**Goal:** Full auth UI is wired and functional — register creates a user, login issues a token, protected routes redirect unauthenticated users, logout clears state and redirects.

**Depends on:** Slices 3 and 4 complete.
**Addresses:** AUTH-01 (register form), AUTH-02 (login form + token persist), AUTH-03 (logout button), AUTH-04 (ProtectedRoute blocks unauthenticated access)

---

#### Task 5.1 — Shared UI components: Button, Input, AuthLayout, AppShell

**Files to create:**
- `frontend/src/components/Button.tsx`
- `frontend/src/components/Input.tsx`
- `frontend/src/components/AppShell.tsx`
- `frontend/src/features/auth/AuthLayout.tsx`

**Actions:**

Create `frontend/src/components/Button.tsx`:

```typescript
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'error';
  loading?: boolean;
  block?: boolean;
}

export function Button({
  variant = 'primary',
  loading = false,
  block = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const variantClass = {
    primary: 'btn-primary',
    ghost: 'btn-ghost',
    error: 'btn-error',
  }[variant];

  return (
    <button
      className={`btn ${variantClass} ${block ? 'btn-block' : ''} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading && <span className="loading loading-spinner loading-sm mr-2" />}
      {children}
    </button>
  );
}
```

Create `frontend/src/components/Input.tsx`:

```typescript
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  id: string;
}

export function Input({ label, error, id, className = '', ...props }: InputProps) {
  return (
    <div className="form-control w-full">
      <label className="label" htmlFor={id}>
        <span className="label-text font-semibold">{label}</span>
      </label>
      <input
        id={id}
        className={`input input-bordered w-full ${error ? 'input-error' : ''} ${className}`}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={!!error}
        {...props}
      />
      {error && (
        <div className="label">
          <span
            id={`${id}-error`}
            className="label-text-alt text-error"
            role="alert"
          >
            {error}
          </span>
        </div>
      )}
    </div>
  );
}
```

Create `frontend/src/components/AppShell.tsx`:

```typescript
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/authStore';
import { Button } from './Button';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-base-100">
      <nav className="navbar bg-base-200 shadow-sm sticky top-0 z-10">
        <div className="navbar-start">
          <span className="text-primary font-semibold">Norwegian Hub</span>
        </div>
        <div className="navbar-end">
          <Button variant="ghost" className="btn-sm" onClick={handleLogout}>
            Вийти
          </Button>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
```

Create `frontend/src/features/auth/AuthLayout.tsx`:

```typescript
interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center px-4">
      <div className="card bg-base-200 shadow-sm w-full max-w-sm">
        <div className="card-body p-6 md:p-8 gap-4">
          {children}
        </div>
      </div>
    </div>
  );
}
```

**Verify:**
- `npx tsc --noEmit` passes for all four files
- No import errors

---

#### Task 5.2 — LoginForm, RegisterForm, ProtectedRoute, WordsPage

**Files to create:**
- `frontend/src/features/auth/LoginForm.tsx`
- `frontend/src/features/auth/RegisterForm.tsx`
- `frontend/src/features/auth/ProtectedRoute.tsx`
- `frontend/src/pages/WordsPage.tsx`

**Actions:**

Create `frontend/src/features/auth/LoginForm.tsx`:

```typescript
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from './authStore';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import api from '../../lib/api';
import type { AuthResponse, ApiError } from '../../lib/types';

export default function LoginForm() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const token = useAuthStore((s) => s.token);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const errorAlertRef = useRef<HTMLDivElement>(null);

  // Redirect already-authenticated users
  useEffect(() => {
    if (token) navigate('/words', { replace: true });
  }, [token, navigate]);

  function validate(): boolean {
    let valid = true;
    if (!email.trim()) {
      setEmailError("Email обов'язковий");
      valid = false;
    } else if (!email.includes('@') || !email.includes('.')) {
      setEmailError('Невірний формат email');
      valid = false;
    } else {
      setEmailError('');
    }
    if (!password) {
      setPasswordError('Пароль обов\'язковий');
      valid = false;
    } else {
      setPasswordError('');
    }
    return valid;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setServerError('');

    if (!validate()) return;

    setLoading(true);
    try {
      const { data } = await api.post<AuthResponse>('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });
      login(data.token, data.userId);
      navigate('/words', { replace: true });
    } catch (err: unknown) {
      const status = (err as { response?: { status: number } })?.response?.status;
      const message = ((err as { response?: { data?: ApiError } })?.response?.data as ApiError)?.error;

      if (status === 401) {
        setServerError('Невірний email або пароль');
      } else {
        setServerError(message ?? 'Помилка сервера. Спробуйте ще раз.');
      }
      setPassword('');
      setTimeout(() => errorAlertRef.current?.focus(), 50);
    } finally {
      setLoading(false);
    }
  }

  // Re-validate on blur after first submit
  function handleBlur(field: 'email' | 'password') {
    if (!submitted) return;
    if (field === 'email') validate();
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Форма входу" noValidate>
      <h1 className="text-2xl font-semibold">Увійти</h1>

      {serverError && (
        <div
          className="alert alert-error rounded-lg"
          role="alert"
          tabIndex={-1}
          ref={errorAlertRef}
        >
          <span>{serverError}</span>
        </div>
      )}

      <Input
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={() => handleBlur('email')}
        error={emailError}
        autoFocus
        disabled={loading}
        autoComplete="email"
      />

      <Input
        id="password"
        label="Пароль"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onBlur={() => handleBlur('password')}
        error={passwordError}
        disabled={loading}
        autoComplete="current-password"
      />

      <Button type="submit" block loading={loading}>
        {loading ? 'Входжу…' : 'Увійти'}
      </Button>

      <p className="text-sm text-center">
        Немає акаунту?{' '}
        <Link to="/register" className="text-primary font-semibold">
          Зареєструватися
        </Link>
      </p>
    </form>
  );
}
```

Create `frontend/src/features/auth/RegisterForm.tsx`:

```typescript
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from './authStore';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import api from '../../lib/api';
import type { AuthResponse, ApiError } from '../../lib/types';

export default function RegisterForm() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const token = useAuthStore((s) => s.token);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const errorAlertRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (token) navigate('/words', { replace: true });
  }, [token, navigate]);

  function validate(): boolean {
    let valid = true;
    if (!email.trim()) {
      setEmailError("Email обов'язковий");
      valid = false;
    } else if (!email.includes('@') || !email.includes('.')) {
      setEmailError('Невірний формат email');
      valid = false;
    } else {
      setEmailError('');
    }
    if (!password) {
      setPasswordError('Пароль обов\'язковий');
      valid = false;
    } else if (password.length < 8) {
      setPasswordError('Мінімум 8 символів');
      valid = false;
    } else {
      setPasswordError('');
    }
    if (confirm !== password) {
      setConfirmError('Паролі не збігаються');
      valid = false;
    } else {
      setConfirmError('');
    }
    return valid;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setServerError('');

    if (!validate()) return;

    setLoading(true);
    try {
      const { data } = await api.post<AuthResponse>('/auth/register', {
        email: email.trim().toLowerCase(),
        password,
      });
      login(data.token, data.userId);
      navigate('/words', { replace: true });
    } catch (err: unknown) {
      const status = (err as { response?: { status: number } })?.response?.status;
      const message = ((err as { response?: { data?: ApiError } })?.response?.data as ApiError)?.error;

      if (status === 409) {
        setServerError('Цей email вже зареєстрований');
        setTimeout(() => emailInputRef.current?.focus(), 50);
      } else {
        setServerError(message ?? 'Помилка сервера. Спробуйте ще раз.');
        setTimeout(() => errorAlertRef.current?.focus(), 50);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleBlur(field: 'email' | 'password' | 'confirm') {
    if (!submitted) return;
    if (field === 'email' || field === 'password' || field === 'confirm') validate();
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Форма реєстрації" noValidate>
      <h1 className="text-2xl font-semibold">Зареєструватися</h1>

      {serverError && (
        <div
          className="alert alert-error rounded-lg"
          role="alert"
          tabIndex={-1}
          ref={errorAlertRef}
        >
          <span>{serverError}</span>
        </div>
      )}

      <Input
        id="reg-email"
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={() => handleBlur('email')}
        error={emailError}
        ref={emailInputRef}
        autoFocus
        disabled={loading}
        autoComplete="email"
      />

      <Input
        id="reg-password"
        label="Пароль"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onBlur={() => handleBlur('password')}
        error={passwordError}
        disabled={loading}
        autoComplete="new-password"
      />

      <Input
        id="reg-confirm"
        label="Підтвердіть пароль"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        onBlur={() => handleBlur('confirm')}
        error={confirmError}
        disabled={loading}
        autoComplete="new-password"
      />

      <Button type="submit" block loading={loading}>
        {loading ? 'Реєструю…' : 'Зареєструватися'}
      </Button>

      <p className="text-sm text-center">
        Вже маєте акаунт?{' '}
        <Link to="/login" className="text-primary font-semibold">
          Увійти
        </Link>
      </p>
    </form>
  );
}
```

Note: `RegisterForm` uses `ref={emailInputRef}` on the `Input` component — this requires forwarding the ref. If TypeScript reports an error here, either use `document.getElementById('reg-email')` in the catch block, or wrap `Input` with `React.forwardRef`. The simpler fix: replace `ref={emailInputRef}` with `id="reg-email"` lookup in catch block:
```typescript
// In catch block for 409:
(document.getElementById('reg-email') as HTMLInputElement)?.focus();
```

Create `frontend/src/features/auth/ProtectedRoute.tsx`:

```typescript
import { Navigate } from 'react-router-dom';
import { useAuthStore } from './authStore';
import AppShell from '../../components/AppShell';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const token = useAuthStore((s) => s.token);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <AppShell>{children}</AppShell>;
}
```

No loading state needed — Zustand `persist` rehydrates synchronously. The token is available on first render.

Create `frontend/src/pages/WordsPage.tsx`:

```typescript
export default function WordsPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <p className="text-base-content/50 text-center">
        Слів ще немає.<br />
        Функція додавання слів з'явиться у наступній фазі.
      </p>
    </main>
  );
}
```

**Verify:**
- `npx tsc --noEmit` in `frontend/` passes with zero errors
- All five files exist at correct paths

---

#### Task 5.3 — main.tsx entry point and App.tsx routing

**Files to modify:**
- `frontend/src/main.tsx` — replace Vite default with QueryClientProvider + theme
- `frontend/src/App.tsx` — replace Vite default with React Router routes

**Actions:**

Replace `frontend/src/main.tsx` contents:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
```

Note: TanStack Query is initialized here but not used in Phase 1 (auth is Zustand-only). It is ready for Phase 2 word queries.

Replace `frontend/src/App.tsx` contents:

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from './features/auth/AuthLayout';
import LoginForm from './features/auth/LoginForm';
import RegisterForm from './features/auth/RegisterForm';
import ProtectedRoute from './features/auth/ProtectedRoute';
import WordsPage from './pages/WordsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={<AuthLayout><LoginForm /></AuthLayout>}
        />
        <Route
          path="/register"
          element={<AuthLayout><RegisterForm /></AuthLayout>}
        />
        <Route
          path="/words"
          element={<ProtectedRoute><WordsPage /></ProtectedRoute>}
        />
        <Route path="/" element={<Navigate to="/words" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

Route behavior:
- `/` → redirects to `/words` → ProtectedRoute checks token → if null, redirects to `/login`
- `/login` with token → LoginForm's `useEffect` redirects to `/words`
- `/register` with token → RegisterForm's `useEffect` redirects to `/words`

**Verify:**
- `npm run dev` in `frontend/` starts without errors
- `npm run build` completes without TypeScript errors
- Browser: visiting `http://localhost:5173` redirects to `/login` (no token yet)

---

### Slice 6: Integration and Walking Skeleton Verification

**Goal:** Full auth loop works end-to-end in the browser. All 4 AUTH requirements verified.

**Depends on:** All prior slices complete. Both `npm run dev` processes running (backend on :3000, frontend on :5173).

---

#### Task 6.1 — End-to-end verification checklist

**This is a human verification task.** Run each step in order and confirm the expected outcome.

Start both servers:
```powershell
# Terminal 1 — backend
cd "c:\Users\Олександр\Desktop\lern nor\backend"
npm run dev

# Terminal 2 — frontend
cd "c:\Users\Олександр\Desktop\lern nor\frontend"
npm run dev
```

**AUTH-01: User can register**

1. Open `http://localhost:5173` in a browser
2. Confirm redirect to `/login`
3. Click "Зареєструватися" link
4. Confirm redirect to `/register` page — card visible with "Зареєструватися" heading
5. Try submitting empty form — confirm validation errors appear for email and password fields (do NOT submit to server)
6. Enter `test@example.com` and password `short` — confirm "Мінімум 8 символів" error after submit
7. Enter valid email `test@example.com`, password `testpassword123`, confirm password `testpassword123`
8. Click "Зареєструватися" — spinner shown, then redirect to `/words`
9. Confirm `/words` page shows the "Слів ще немає" placeholder
10. Confirm `localStorage.getItem('auth')` in DevTools console returns a JSON string with a `token` field

**AUTH-02: JWT persists across page reload**

11. While on `/words`, press F5 (hard reload)
12. Confirm: stays on `/words` — NOT redirected to `/login`
13. Confirm: navbar shows "Norwegian Hub" and "Вийти" button

**AUTH-03: User can log out**

14. Click "Вийти" in the navbar
15. Confirm redirect to `/login`
16. Confirm `localStorage.getItem('auth')` returns `null` or `'{"state":{"token":null,"userId":null}}'`
17. Try navigating to `http://localhost:5173/words` — confirm redirect to `/login`

**AUTH-04: Row-level isolation**

18. Register a second user with `test2@example.com` and `testpassword123`
19. Confirm second user gets a DIFFERENT `userId` (visible in network tab response or localStorage)
20. Check backend DB: `SELECT id, email FROM "User";` should show 2 rows with distinct `id` values

**Login flow:**

21. Log out if not already done
22. Visit `/login`
23. Enter wrong password — confirm "Невірний email або пароль" server error banner appears
24. Enter correct credentials — confirm redirect to `/words` and token restored in localStorage

**Security spot-checks:**

25. Call `GET http://localhost:3000/api/auth/me` without a token — confirm 401 response
26. Try to access a word endpoint (even though none exist yet): `GET http://localhost:3000/api/words` — confirm 404 (route does not exist yet) not 200 or 500

**Verify all:**
- [ ] AUTH-01: Register form creates user, redirects to /words
- [ ] AUTH-02: Page reload on /words keeps user logged in
- [ ] AUTH-03: Logout clears token, /words redirects to /login
- [ ] AUTH-04: Two registered users have different userIds
- [ ] DB has GIN index on Word table (check with psql as noted in Task 1.3)
- [ ] Gender enum has `feminine` value (psql: `SELECT unnest(enum_range(NULL::"Gender"));`)

---

## Threat Model

### Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → Backend API | All auth requests cross this boundary; user-controlled input, untrusted |
| JWT → requireAuth middleware | Token extracted from Authorization header; must be verified cryptographically before trusting |
| Prisma queries → PostgreSQL | Application layer controls userId filters; no DB-level RLS |

### STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|------------|
| T-1-01 | Spoofing | POST /auth/login | mitigate | bcryptjs comparePassword with 12 salt rounds; constant-time comparison prevents timing attacks |
| T-1-02 | Spoofing | JWT verification | mitigate | jsonwebtoken verifyToken throws on invalid/expired; requireAuth returns 401 on catch |
| T-1-03 | Tampering | JWT payload | mitigate | JWT signed with 64-byte random secret; HS256; `expiresIn: '7d'` enforced |
| T-1-04 | Repudiation | Auth events | accept | v1 personal tool; no audit log needed; userId in JWT payload provides basic traceability |
| T-1-05 | Information Disclosure | Login errors | mitigate | Login returns generic "Invalid email or password" for both wrong email and wrong password; does not reveal which field is wrong |
| T-1-06 | Information Disclosure | JWT in localStorage | accept | Personal single-user tool on trusted device; HttpOnly cookie would be better but adds CORS complexity; acceptable risk for v1 |
| T-1-07 | Denial of Service | POST /auth/register, /auth/login | mitigate | express-rate-limit: 10 req/15min on /api/auth routes; global 200 req/15min |
| T-1-08 | Elevation of Privilege | Word queries (future) | mitigate | requireAuth middleware attaches req.user.userId; all word queries MUST filter by userId (enforced in Phase 2 implementation) |
| T-1-09 | Elevation of Privilege | Registration bypass | mitigate | Email uniqueness enforced by Prisma unique constraint AND DB-level unique index on User.email |

---

## Acceptance Criteria

| # | Criterion | How to verify |
|---|-----------|---------------|
| 1 | User can register with email and password and receive a session token | POST /api/auth/register returns 201 + `{token, userId}`; register form stores token in localStorage |
| 2 | User can log in and remain authenticated across page reloads | POST /api/auth/login returns 200 + token; Zustand persist rehydrates on reload; /words accessible after F5 |
| 3 | User can log out and all protected routes become inaccessible | "Вийти" clears localStorage auth key; /words redirects to /login |
| 4 | Authenticated user can only see and access their own words | Two users have distinct userId values; all future word queries MUST include `where: { userId: req.user.id }` (architecture enforced by requireAuth middleware) |
| 5 | Database schema is production-ready | All 5 Prisma models exist; Gender enum has feminine; GIN index on Word with pg_catalog.norwegian; @@unique([userId, headword]) present |

---

## Notes

### Key decisions

1. **JWT in localStorage (T-1-06 accepted risk)** — HttpOnly cookies would be more secure against XSS, but require `credentials: true` on CORS, `SameSite` cookie config, and CSRF tokens for mutations. For a personal single-user tool on a trusted device, localStorage with a strong JWT secret is acceptable. Document this if the app ever becomes multi-user or public.

2. **No server-side logout** — JWT is stateless. POST /logout validates the token (requireAuth) but does not invalidate it server-side. The client removes the token. This means a stolen token is valid until expiry (7 days). Acceptable for v1; a token blacklist (Redis) would be needed for production multi-user.

3. **Zustand persist for session restore** — This is synchronous, so ProtectedRoute has no loading flash. The token is available on the first render. No `/api/auth/me` validation call on load — for a personal tool, trusting the locally-stored JWT without re-validating on every load is acceptable.

4. **Express 5.x async error propagation** — Async errors in route handlers automatically call `next(err)`. This means `try/catch` is only needed when you want to return a specific error response (like 409 or 401). Do not add `.catch(next)` wrappers — they are Express 4 patterns.

5. **Prisma 7.x vs 5.x** — If the scaffolding commands above produce errors about the Prisma API (e.g., `prisma.user.create` signature changes), check the Prisma 7 changelog. The most likely breaking change: if `$queryRaw` template literal syntax changed, the GIN index migration workaround may need adjustment.

6. **DaisyUI 5.x config assumption** — The `require('daisyui')` Tailwind plugin syntax is assumed to work. If it fails, see the DaisyUI 5 migration guide or try: rename `tailwind.config.js` to `tailwind.config.cjs` and try `import daisyui from 'daisyui'` with an `.mjs` config.

### Pre-execution Adjustment Points

These issues are known ahead of time. Apply the fix when you reach the relevant task:

**[Task 3.1] DaisyUI 5.x ESM issue:**
If `require('daisyui')` fails with `ERR_REQUIRE_ESM`, rename `tailwind.config.js` → `tailwind.config.cjs`. Tailwind loads `.cjs` files in CommonJS mode, which resolves the ESM mismatch.

**[Task 5.2] `Input` ref forwarding:**
`RegisterForm.tsx` focuses the email field on 409 error. The `Input` component is NOT a `forwardRef` component, so `ref={emailInputRef}` on it will cause a TypeScript error. Use `document.getElementById` instead:
```typescript
// In catch block for 409 (replace the ref approach):
(document.getElementById('reg-email') as HTMLInputElement)?.focus();
```
Remove `emailInputRef` and its `useRef` declaration from RegisterForm entirely.

**[Task 1.1] Prisma 7.x client import:**
After `prisma generate`, verify `import { PrismaClient } from '@prisma/client'` resolves. If Prisma 7 used a custom output path, update the import in `prisma.ts` to match the generated client path shown in `prisma generate` output.

---

### What is NOT in Phase 1

- No word CRUD endpoints (Phase 2)
- No AI integration (Phase 3)
- No search (Phase 4)
- No email verification (out of scope)
- No password reset (out of scope for v1)
- No refresh tokens (stateless JWT, 7-day expiry)
- WordsPage is a placeholder only — will be replaced in Phase 2

### Phase 2 handoff

When Phase 1 is complete, the following are available for Phase 2 to consume:
- `requireAuth` middleware — import from `backend/src/middleware/auth.ts`
- `prisma` singleton — import from `backend/src/lib/prisma.ts`
- `req.user.userId` — available on all protected routes after `requireAuth`
- `api` Axios instance — import from `frontend/src/lib/api.ts`
- `useAuthStore` — import from `frontend/src/features/auth/authStore.ts`
- All Prisma models and enums from `@prisma/client`

---

*Plan created: 2026-05-27*
*Phase: 1 — Auth + DB Foundation*
*Requirements: AUTH-01, AUTH-02, AUTH-03, AUTH-04*
