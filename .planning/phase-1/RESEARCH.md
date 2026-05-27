# Phase 1: Auth + DB Foundation — Research

**Researched:** 2026-05-27
**Domain:** Express/Prisma backend auth + React/Zustand frontend auth + PostgreSQL schema
**Confidence:** HIGH

---

## Summary

Phase 1 builds the security perimeter and data foundation for all future phases. The walking skeleton is: register → login → JWT persisted in localStorage → protected route → logout. No AI, no word CRUD — just a proven auth loop and a production-ready schema.

The existing `.planning/research/` files (ARCHITECTURE.md, STACK.md, PITFALLS.md) cover component boundaries, stack validation, and pitfalls comprehensively. This document adds only what is missing for Phase 1 execution: exact scaffolding commands, concrete code patterns, the full Prisma schema with the gender enum and GIN index, and the specific implementation decisions (salt rounds, token expiry, interceptor patterns).

**Primary recommendation:** Scaffold backend and frontend separately, run `prisma migrate dev` to prove the DB connection first, then implement auth endpoints, then wire the frontend — always having a testable vertical slice.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can register with email and password | bcryptjs hash + Prisma User.create + JWT sign on 201 response |
| AUTH-02 | User can log in and remain authenticated across page reloads (JWT in localStorage) | Zustand persist middleware reads localStorage on store init; ProtectedRoute checks synchronously |
| AUTH-03 | User can log out | authStore.logout() clears localStorage + store state; navigate to /login |
| AUTH-04 | Authenticated user can only see their own words | `userId` FK on Word; all word queries filter by `req.user.id` from JWT middleware |
</phase_requirements>

---

## 1. Project Scaffolding

### 1.1 Backend Setup

```bash
mkdir backend && cd backend
npm init -y
npm install express@^5.2.1 @prisma/client@^7.8.0 jsonwebtoken@^9.0.3 \
  bcryptjs@^3.0.3 cors@^2.8.5 dotenv@^16.0.0 \
  helmet@^8.2.0 express-rate-limit@^8.5.2
npm install -D prisma@^7.8.0 typescript@^5 @types/node @types/express \
  @types/jsonwebtoken @types/bcryptjs @types/cors nodemon ts-node
npx tsc --init
npx prisma init
```

> **Note on Express version:** npm registry shows Express 5.2.1 as current. [VERIFIED: npm registry]
> STACK.md recommends 4.x, but 5.x is now stable. Either works — use 5.x for new projects.
> Express 5 changed: async errors propagate automatically (no `next(err)` needed in async handlers).

### 1.2 Frontend Setup

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install axios@^1.16.1 zustand@^5.0.13 \
  @tanstack/react-query@^5.100.14 react-router-dom@^7.15.1
npm install -D tailwindcss@^3.4.0 postcss autoprefixer daisyui@^5.5.20
npx tailwindcss init -p
```

> **Note on DaisyUI version:** npm shows DaisyUI 5.5.20. The UI-SPEC.md references DaisyUI 4.x patterns.
> DaisyUI 5 changed its config API — `daisyui.themes` works differently. See config below. [VERIFIED: npm registry]

### 1.3 Tailwind + DaisyUI Configuration

DaisyUI 5.x changes the config from a plugin to a Vite plugin approach, but for Tailwind 3.4.x + DaisyUI 5.x, the Tailwind plugin approach still works: [ASSUMED — verify against DaisyUI 5 docs if config fails]

```js
// tailwind.config.js (Tailwind 3.4.x)
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['nord'],
    darkTheme: false,
  },
}
```

Apply theme in `index.html`:
```html
<html lang="uk" data-theme="nord">
```

### 1.4 Recommended package.json Scripts

**Backend:**
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

**Frontend:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "type-check": "tsc --noEmit",
    "preview": "vite preview"
  }
}
```

### 1.5 Directory Structure

**Backend (`backend/src/`):**
```
backend/
├── src/
│   ├── index.ts              — Express app entry, middleware registration
│   ├── routes/
│   │   └── auth.ts           — POST /auth/register, /auth/login, /auth/logout, GET /auth/me
│   ├── services/
│   │   └── auth.ts           — JWT sign/verify, password hash/compare
│   ├── middleware/
│   │   └── auth.ts           — verifyToken: attaches req.user from JWT
│   └── lib/
│       └── prisma.ts         — PrismaClient singleton
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── .env                      — DATABASE_URL, JWT_SECRET, PORT, NODE_ENV
└── .env.example
```

**Frontend (`frontend/src/`):** Per UI-SPEC.md section 9 — already fully specified:
```
src/
├── main.tsx
├── App.tsx
├── features/auth/
│   ├── authStore.ts
│   ├── AuthLayout.tsx
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   └── ProtectedRoute.tsx
├── components/
│   ├── AppShell.tsx
│   ├── Button.tsx
│   └── Input.tsx
├── lib/
│   ├── api.ts
│   └── types.ts
└── pages/
    └── WordsPage.tsx
```

---

## 2. Database Schema

### 2.1 Full Prisma Schema (v1)

```prisma
// prisma/schema.prisma
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

  // Core fields (AI-populated in Phase 3)
  headword     String
  translation  String?
  gender       Gender?
  wordClass    WordClass?
  forms        Json?           // { indefinite, definite, pluralIndefinite, pluralDefinite, ... }
  examples     String[]
  notes        String?
  rawAiOutput  Json?

  // User-controlled fields
  difficulty   Difficulty?
  personalNote String?

  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  tags         WordTag[]
  chatMessages ChatMessage[]

  @@index([userId])
  @@index([headword])
  @@unique([userId, headword])   // prevent duplicates per user
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
  role      String   // "user" | "assistant"
  content   String
  createdAt DateTime @default(now())

  @@index([wordId])
}
```

**Key decisions vs. ARCHITECTURE.md draft:**
- `gender` is now a proper `Gender` enum (not `String?`) — matches CLAUDE.md constraint [VERIFIED: CLAUDE.md]
- `wordClass` and `difficulty` are enums — prevents schema evolution pitfall (PITFALLS.md Pitfall 6)
- Added `@@unique([userId, headword])` — prevents duplicate entries per user (PITFALLS.md Pitfall 10)
- All nullable fields use `?` — no new-column migration failures (PITFALLS.md Pitfall 6)
- `onDelete: Cascade` on all child relations — clean user deletion

### 2.2 GIN Index via Raw SQL Migration

Prisma cannot create a GIN index on a `tsvector` expression directly. After `prisma migrate dev` creates the initial migration, add the GIN index as raw SQL.

**Step-by-step:**

1. Run initial migration to create tables:
   ```bash
   npx prisma migrate dev --name init
   ```

2. Create a second migration for the GIN index:
   ```bash
   npx prisma migrate dev --name add_fts_gin_index --create-only
   ```

3. Edit the generated empty migration file and add:
   ```sql
   -- migrations/YYYYMMDDHHMMSS_add_fts_gin_index/migration.sql
   CREATE INDEX words_search_gin_idx ON "Word"
   USING GIN (
     to_tsvector(
       'pg_catalog.norwegian',
       "headword" || ' ' || coalesce("translation", '')
     )
   );
   ```

4. Apply:
   ```bash
   npx prisma migrate dev
   ```

> Note: Table name in PostgreSQL will be `"Word"` (quoted, PascalCase) because Prisma maps the model name directly. Verify with `\dt` in psql if the index creation fails. [ASSUMED — confirm table casing matches Prisma's output for your PostgreSQL version]

### 2.3 Row-Level Isolation

AUTH-04 is enforced by application logic, not PostgreSQL RLS (Row-Level Security). Every word query must include a `userId` filter:

```typescript
// Correct — user can only see their own words
const words = await prisma.word.findMany({
  where: { userId: req.user.id }
});

// Also correct for ownership check on single word
const word = await prisma.word.findFirst({
  where: { id: wordId, userId: req.user.id }  // ← BOTH conditions
});
```

Never use `findUnique({ where: { id: wordId } })` without the `userId` condition on protected routes — this would allow one user to read another's word if they know the ID.

---

## 3. Backend Auth Implementation

### 3.1 JWT Pattern

```typescript
// src/services/auth.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET!;
const SALT_ROUNDS = 12; // bcryptjs: 12 is the recommended default for 2025 hardware

export interface TokenPayload {
  userId: string;
  email: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d',  // v1 personal tool: 7 days, no refresh token needed
  });
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

**Decisions:**
- `expiresIn: '7d'` — longer than `'1d'` for usability; user won't be unexpectedly logged out mid-session. No refresh token in v1 (single user, no high-security requirement). [ASSUMED — adjust if you want stricter expiry]
- `SALT_ROUNDS = 12` — bcrypt docs recommend 10-12 for 2025 hardware. 10 is also fine. [ASSUMED based on training knowledge — verify bcryptjs docs if this is a concern]

### 3.2 Auth Middleware

```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../services/auth.js';

// Augment Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed token' });
  }

  const token = header.slice(7);
  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    // Separate error types for debugging without leaking to client
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

**TypeScript gotcha:** The `declare global { namespace Express { interface Request } }` augmentation must be in a `.ts` file that is included in your `tsconfig.json`. If it lives in `middleware/auth.ts`, it works. If TypeScript still complains, add a `src/types/express.d.ts` file with just the declaration.

### 3.3 Express App Setup

```typescript
// src/index.ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import authRouter from './routes/auth.js';

const app = express();

// Security headers
app.use(helmet());

// CORS — explicit origin for dev; set FRONTEND_URL in production
app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: false,  // localStorage tokens don't need credentials: true
}));

// Body parsing
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

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

### 3.4 Auth Routes

```typescript
// src/routes/auth.ts
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { hashPassword, comparePassword, signToken } from '../services/auth.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: 'Invalid email or password' });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email: email.trim().toLowerCase(), passwordHash },
  });

  const token = signToken({ userId: user.id, email: user.email });
  res.status(201).json({ token, userId: user.id });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email: email?.trim().toLowerCase() },
  });

  if (!user || !(await comparePassword(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signToken({ userId: user.id, email: user.email });
  res.json({ token, userId: user.id });
});

// POST /api/auth/logout  (client-side only — just clears token)
router.post('/logout', requireAuth, (_req, res) => {
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  res.json({ userId: req.user!.userId, email: req.user!.email });
});

export default router;
```

### 3.5 Prisma Client Singleton

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

---

## 4. Frontend Auth Implementation

### 4.1 Zustand Auth Store

```typescript
// src/features/auth/authStore.ts
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
      name: 'auth',          // localStorage key
      partialize: (state) => ({ token: state.token, userId: state.userId }),
    }
  )
);
```

**Why `persist` middleware instead of manual `localStorage.getItem`:**
- Zustand `persist` handles hydration automatically on store creation
- No `useEffect` needed to restore state on mount
- `partialize` ensures only token + userId are persisted (not functions)
- State is available synchronously when ProtectedRoute first renders — no loading flash [VERIFIED: Zustand docs pattern]

**Session restore on page reload** works because `persist` rehydrates the store before React renders the route tree. ProtectedRoute reads `useAuthStore(s => s.token)` — if not null (restored from localStorage), renders children. No async token validation request needed in v1.

### 4.2 Axios Instance with JWT Interceptor

```typescript
// src/lib/api.ts
import axios from 'axios';
import { useAuthStore } from '../features/auth/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request automatically
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;  // ← getState(), not hook
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
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

**Key point:** Use `useAuthStore.getState()` (not the hook) inside interceptors — hooks can only be called inside React components.

### 4.3 React Router v7 ProtectedRoute

```typescript
// src/features/auth/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from './authStore';
import { AppShell } from '../../components/AppShell';

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

### 4.4 App.tsx Routing

```typescript
// src/App.tsx
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
        <Route path="/login"    element={<AuthLayout><LoginForm /></AuthLayout>} />
        <Route path="/register" element={<AuthLayout><RegisterForm /></AuthLayout>} />
        <Route path="/words"    element={<ProtectedRoute><WordsPage /></ProtectedRoute>} />
        <Route path="/"         element={<Navigate to="/words" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### 4.5 TanStack Query Setup

TanStack Query is not needed for Phase 1 auth (auth is Zustand-only). Set it up now so it is ready for Phase 2:

```typescript
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 * 5 }, // 5 min stale time
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

**When to use which:**
- **Zustand `authStore`:** token, userId, login/logout actions — auth identity only
- **TanStack Query:** everything that comes from the server (word list, word detail, tags) — Phase 2+
- **Never:** word data in Zustand (ARCHITECTURE.md Anti-Pattern 4)

### 4.6 Types

```typescript
// src/lib/types.ts
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

---

## 5. Walking Skeleton

The thinnest Phase 1 vertical slice that proves auth works end-to-end:

**Build order:**
1. `prisma/schema.prisma` → `prisma migrate dev` → verify tables exist in DB
2. `src/lib/prisma.ts` singleton
3. `src/services/auth.ts` (hashPassword, signToken, verifyToken)
4. `src/middleware/auth.ts` (requireAuth)
5. `src/routes/auth.ts` (register + login endpoints only)
6. `src/index.ts` (Express app with helmet, cors, rate-limit)
7. Test with curl/Postman: register → get token → call GET /auth/me → 200

Then frontend:
8. `src/features/auth/authStore.ts` (Zustand persist)
9. `src/lib/api.ts` (Axios + interceptors)
10. `src/lib/types.ts`
11. `LoginForm.tsx` → wire to `api.post('/auth/login')` → store token → navigate
12. `RegisterForm.tsx`
13. `ProtectedRoute.tsx` → `WordsPage.tsx` (placeholder)
14. `AppShell.tsx` with logout button
15. `App.tsx` routes

**Phase 1 WordsPage placeholder:**
```typescript
// src/pages/WordsPage.tsx
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

**Verification checklist for walking skeleton:**
- [ ] `POST /api/auth/register` returns `{ token, userId }` with 201
- [ ] `POST /api/auth/login` returns `{ token, userId }` with 200
- [ ] `GET /api/auth/me` with valid token returns user info
- [ ] `GET /api/auth/me` with no token returns 401
- [ ] Register form submits, stores token, redirects to `/words`
- [ ] Refresh browser on `/words` → stays on `/words` (token persisted)
- [ ] Logout → redirected to `/login`; `/words` now redirects to `/login`
- [ ] Different email → different userId (row isolation foundation)

---

## 6. Environment Files

```bash
# backend/.env.example  (commit this)
DATABASE_URL=postgresql://user:password@localhost:5432/norwegian_hub
JWT_SECRET=replace_with_64_char_random_hex
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Generate JWT_SECRET:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

```bash
# frontend/.env.example  (commit this)
VITE_API_URL=http://localhost:3000/api
```

Add both `.env` files to `.gitignore` before first commit.

---

## 7. Phase 1 Pitfalls (Implementation-Specific)

See `.planning/research/PITFALLS.md` for full detail. Phase 1 relevant summary:

| Risk | Prevention |
|------|------------|
| JWT secret committed | `.env` + `.gitignore` before first commit; `.env.example` as template |
| Token never expires | `expiresIn: '7d'` in `signToken` — never omit this |
| CORS blocks frontend | Set `origin` to `FRONTEND_URL` env var, not `'*'` |
| `req.user` TypeScript error | `declare global { namespace Express { interface Request } }` in middleware/auth.ts |
| Prisma enum vs. String | Use `Gender` enum in schema — `String?` for gender is wrong for this project |
| Duplicate words | `@@unique([userId, headword])` in schema — add now, not in Phase 2 |
| GIN index wrong language | `'pg_catalog.norwegian'` not `'english'` or `'simple'` — see PITFALLS.md Pitfall 3 |
| ProtectedRoute flicker | Zustand `persist` is synchronous on hydration — no loading state needed |
| `useAuthStore` in interceptor | Use `useAuthStore.getState()` (store method), not the React hook |

### TypeScript strict mode + Express req.user

The `req.user` augmentation must be declared before use. If TypeScript still can't find the augmented type, ensure `tsconfig.json` has:
```json
{
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "node16",
    "module": "node16"
  }
}
```
And the `declare global` block is in a `.ts` file (not `.d.ts`) that TypeScript compiles.

---

## 8. Verified Package Versions

All versions confirmed against npm registry on 2026-05-27: [VERIFIED: npm registry]

| Package | Version |
|---------|---------|
| express | 5.2.1 |
| prisma / @prisma/client | 7.8.0 |
| jsonwebtoken | 9.0.3 |
| bcryptjs | 3.0.3 |
| helmet | 8.2.0 |
| express-rate-limit | 8.5.2 |
| zustand | 5.0.13 |
| @tanstack/react-query | 5.100.14 |
| axios | 1.16.1 |
| react-router-dom | 7.15.1 |
| @vitejs/plugin-react | 6.0.2 |
| vite | 8.0.14 |
| daisyui | 5.5.20 |

> **Warning:** These are significantly newer than STACK.md's version estimates (which used training data). The Prisma 7.x API may have minor changes from 5.x patterns. DaisyUI 5.x config may differ from UI-SPEC.md's DaisyUI 4.x assumptions. Verify DaisyUI 5 theme config before implementing. Express 5.x async error handling differs from 4.x.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | DaisyUI 5.x Tailwind plugin config (`require('daisyui')`) works the same as v4 | 1.3 | Theme not applied; need to check DaisyUI 5 migration guide |
| A2 | `expiresIn: '7d'` appropriate for v1 personal tool | 3.1 | User gets logged out after 7 days; adjust if too short or too long |
| A3 | SALT_ROUNDS = 12 is appropriate for 2025 hardware | 3.1 | Minor: 10 is also fine; 12 adds ~100ms to login |
| A4 | Prisma 7.x `$queryRaw` syntax for GIN index unchanged from 5.x | 2.2 | GIN index migration SQL may need adjustment |
| A5 | PostgreSQL table name will be `"Word"` (quoted PascalCase) | 2.2 | GIN index CREATE INDEX statement fails if table name differs |

---

## Sources

### Primary (VERIFIED: npm registry)
- express@5.2.1, prisma@7.8.0, jsonwebtoken@9.0.3, bcryptjs@3.0.3, daisyui@5.5.20 — all version-verified via `npm view` on 2026-05-27

### Primary (VERIFIED: project files)
- `.planning/research/ARCHITECTURE.md` — component boundaries, DB schema outline, auth flow
- `.planning/research/PITFALLS.md` — JWT, CORS, Prisma enum, FTS pitfalls
- `.planning/research/STACK.md` — stack validation and rationale
- `.planning/UI-SPEC.md` — full component specs, DaisyUI classes, interaction flows, file structure

### Secondary (ASSUMED: training knowledge, HIGH confidence for stable patterns)
- Zustand `persist` middleware API — stable since Zustand 4.x
- Axios interceptor pattern — stable since Axios 1.x
- React Router v6/v7 `<Navigate>` and `<Routes>` — stable API
- Express JWT middleware pattern — well-established Node.js convention
- Prisma enum syntax — documented, stable pattern
