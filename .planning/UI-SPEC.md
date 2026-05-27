---
phase: 1
phase_name: Auth + DB Foundation
status: ready
created: 2026-05-27
design_system: DaisyUI on Tailwind CSS 3.4.x
tool: DaisyUI (no shadcn — project uses DaisyUI)
---

# UI-SPEC — Phase 1: Auth + DB Foundation

## 0. Source Decisions (pre-populated from upstream)

| Decision | Source | Value |
|----------|--------|-------|
| Component library | CLAUDE.md / SPEC.md | DaisyUI on Tailwind CSS 3.4.x |
| Mobile-first breakpoint | CLAUDE.md | 375px baseline, desktop adaptation at 768px+ |
| Color theme | Design default | DaisyUI `nord` theme |
| Font | DaisyUI default | Inter (system-ui fallback stack) |
| Auth approach | REQUIREMENTS.md | Email + password, JWT in localStorage |
| Feature folder | CLAUDE.md | `src/features/auth/` from day one |
| Norwegian char support | CLAUDE.md | Required — ø, æ, å in all inputs |

---

## 1. Design Tokens

### 1.1 Color Palette — DaisyUI `nord` Theme

Apply via `data-theme="nord"` on `<html>`.

| Role | DaisyUI token | Approximate hex | Usage |
|------|---------------|-----------------|-------|
| Base-100 (dominant 60%) | `bg-base-100` | #ECEFF4 | Page background |
| Base-200 (secondary 30%) | `bg-base-200` | #E5E9F0 | Auth card background |
| Base-300 | `bg-base-300` | #D8DEE9 | Input borders, dividers |
| Base-content | `text-base-content` | #2E3440 | Body text |
| Primary (accent 10%) | `btn-primary`, `text-primary` | #5E81AC | Primary CTA button, focus rings |
| Primary-content | `text-primary-content` | #FFFFFF | Text on primary button |
| Error | `text-error`, `alert-error` | #BF616A | Validation errors, error alerts |
| Success | `text-success`, `alert-success` | #A3BE8C | Success feedback |
| Neutral | `btn-neutral` | #4C566A | Secondary/ghost actions |

Accent is reserved exclusively for:
- Primary submit button (`btn btn-primary`)
- Active focus ring on inputs (`focus:outline-primary`)
- Link text in auth forms ("Немає акаунту? Зареєструватися")

### 1.2 Typography

| Role | Size | Weight | Line-height | DaisyUI / Tailwind class |
|------|------|--------|-------------|--------------------------|
| Page heading (h1) | 24px / 1.5rem | 600 semibold | 1.2 | `text-2xl font-semibold` |
| Form label | 14px / 0.875rem | 600 semibold | 1.4 | `text-sm font-semibold` |
| Body / input text | 16px / 1rem | 400 regular | 1.5 | `text-base font-normal` |
| Helper / error text | 12px / 0.75rem | 400 regular | 1.4 | `text-xs` |

Font stack (Tailwind default): `ui-sans-serif, system-ui, -apple-system, sans-serif`

No custom font download in Phase 1. System font stack is sufficient and avoids FOUT.

### 1.3 Spacing System

8-point scale only. No half-values (no 6px, no 10px).

| Token | px | Tailwind class | Usage |
|-------|----|----------------|-------|
| xs | 4px | `p-1` / `gap-1` | Icon padding, tight inline gaps |
| sm | 8px | `p-2` / `gap-2` | Label-to-input gap |
| md | 16px | `p-4` / `gap-4` | Field-to-field gap, card inner padding |
| lg | 24px | `p-6` / `gap-6` | Card padding (mobile) |
| xl | 32px | `p-8` / `gap-8` | Card padding (desktop) |
| 2xl | 48px | `py-12` | Vertical centering offset |

Touch targets: minimum 44px height for all interactive elements (DaisyUI `btn` and `input` meet this by default).

### 1.4 Border Radius and Shadows

| Element | Value | Tailwind class |
|---------|-------|----------------|
| Input fields | 8px | `rounded-lg` (DaisyUI default) |
| Buttons | 8px | `rounded-lg` (DaisyUI default) |
| Auth card | 12px | `rounded-xl` |
| Alert boxes | 8px | `rounded-lg` (DaisyUI default) |
| Card shadow | sm | `shadow-sm` |

---

## 2. Component Inventory

### 2.1 `LoginForm`

**File:** `src/features/auth/LoginForm.tsx`

**Props interface:**
```typescript
// No external props — self-contained, reads from authStore
// Internal state managed with react-hook-form or useState
```

**Visual description:**
Single-column form centered on screen. Title "Увійти" at top. Two fields (email, password). Primary submit button. Link to register page below button.

**DaisyUI classes:**
```
form-control       — wraps each field (label + input + error)
label              — wraps label text
label-text         — field label
label-text-alt     — inline validation error (inside label, bottom)
input input-bordered — text input
btn btn-primary btn-block — submit button (full width)
alert alert-error  — server error banner at top of form
loading loading-spinner loading-sm — inside button when loading
```

**States:**

| State | Visual |
|-------|--------|
| Default | Empty fields, primary button enabled |
| Typing | Input has value, no error shown |
| Validation error | Red border on input (`input-error`), error text under field in `label-text-alt text-error` |
| Loading | Button shows spinner + "Входжу…" text, button disabled, fields disabled |
| Server error | `alert alert-error` rendered above form fields with server message |
| Success | Immediate redirect — no success state shown on this screen |

**Interaction:**
- Submit on button click or Enter key
- Email: trim whitespace before validation
- On server error: focus moves to error alert (`role="alert"`, `tabIndex={-1}`, `ref.focus()`)

---

### 2.2 `RegisterForm`

**File:** `src/features/auth/RegisterForm.tsx`

**Props interface:**
```typescript
// No external props — self-contained
```

**Visual description:**
Same layout as LoginForm. Title "Зареєструватися". Three fields: email, password, confirm password. Primary submit button. Link to login page.

**DaisyUI classes:** identical pattern to LoginForm.

**Additional field — Confirm password:**
- Validation: must match password field value
- Error text: "Паролі не збігаються"

**States:** identical to LoginForm plus:

| State | Visual |
|-------|--------|
| Password mismatch | `input-error` on confirm field, error text "Паролі не збігаються" |
| Email taken (409 from server) | `alert alert-error` "Цей email вже зареєстрований" |
| Success | Redirect to `/words` — no success state on this screen |

---

### 2.3 `AuthLayout`

**File:** `src/features/auth/AuthLayout.tsx`

**Props interface:**
```typescript
interface AuthLayoutProps {
  children: React.ReactNode
}
```

**Visual description:**
Full-viewport container. Vertically and horizontally centers the auth card. Background uses `bg-base-100`. Card uses `bg-base-200 rounded-xl shadow-sm`. No logo or illustration in Phase 1 — text title only.

**DaisyUI classes:**
```
min-h-screen bg-base-100 flex items-center justify-center px-4
card bg-base-200 shadow-sm w-full max-w-sm
card-body p-6 md:p-8 gap-4
```

---

### 2.4 `AppShell`

**File:** `src/components/AppShell.tsx`

**Props interface:**
```typescript
interface AppShellProps {
  children: React.ReactNode
}
```

**Visual description:**
Minimal sticky top navbar + page content area. Navbar: left = app name "Norwegian Hub" in `text-primary font-semibold`, right = "Вийти" ghost button. No hamburger, no sidebar — Phase 1 is nav-only.

**DaisyUI classes:**
```
navbar bg-base-200 shadow-sm sticky top-0 z-10
navbar-start — app name text
navbar-end   — logout button
btn btn-ghost btn-sm — logout button
min-h-screen bg-base-100
```

**States:**

| State | Visual |
|-------|--------|
| Default | Navbar visible, content area renders children |
| Logging out | Logout button briefly disabled (optimistic — instant in practice) |

---

### 2.5 `ProtectedRoute`

**File:** `src/features/auth/ProtectedRoute.tsx`

**Props interface:**
```typescript
interface ProtectedRouteProps {
  children: React.ReactNode
}
```

**Visual description:**
Renders nothing visible. Logic only: check `authStore.token` — if falsy, redirect to `/login`. If truthy, render children inside `AppShell`.

No loading skeleton in Phase 1 — token check is synchronous from localStorage via Zustand.

---

### 2.6 `Button` (shared)

**File:** `src/components/Button.tsx`

Thin wrapper over DaisyUI `btn` for consistent loading state handling.

**Props interface:**
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'error'
  loading?: boolean
  block?: boolean
}
```

**DaisyUI classes mapping:**
```
primary  → btn btn-primary
ghost    → btn btn-ghost
error    → btn btn-error
block    → btn-block (full width)
loading  → adds <span class="loading loading-spinner loading-sm mr-2"> before children
```

---

### 2.7 `Input` (shared)

**File:** `src/components/Input.tsx`

Wrapper over DaisyUI `input` that includes label and inline error slot.

**Props interface:**
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  id: string
}
```

**Rendered structure:**
```html
<div class="form-control w-full">
  <label class="label" for="{id}">
    <span class="label-text font-semibold">{label}</span>
  </label>
  <input id="{id}" class="input input-bordered w-full [input-error if error]"
    aria-describedby="{id}-error" aria-invalid="{!!error}" />
  {error && (
    <div class="label">
      <span id="{id}-error" class="label-text-alt text-error" role="alert">{error}</span>
    </div>
  )}
</div>
```

---

## 3. Screen Layouts (ASCII Wireframes)

### 3.1 Login Page — Mobile (375px)

```
┌─────────────────────────────┐  ← bg-base-100
│                             │
│                             │
│   ┌─────────────────────┐   │  ← card bg-base-200 rounded-xl max-w-sm
│   │                     │   │
│   │   Увійти            │   │  ← text-2xl font-semibold
│   │                     │   │
│   │  Email              │   │  ← label-text font-semibold
│   │  ┌───────────────┐  │   │
│   │  │               │  │   │  ← input input-bordered
│   │  └───────────────┘  │   │
│   │                     │   │
│   │  Пароль             │   │
│   │  ┌───────────────┐  │   │
│   │  │               │  │   │
│   │  └───────────────┘  │   │
│   │                     │   │
│   │  ┌───────────────┐  │   │
│   │  │   Увійти      │  │   │  ← btn btn-primary btn-block
│   │  └───────────────┘  │   │
│   │                     │   │
│   │  Немає акаунту?     │   │  ← text-sm
│   │  Зареєструватися    │   │  ← link text-primary
│   │                     │   │
│   └─────────────────────┘   │
│                             │
└─────────────────────────────┘

With server error (above fields):
│   ┌─────────────────────┐   │
│   │ ⚠ Невірний email    │   │  ← alert alert-error rounded-lg
│   │   або пароль        │   │
│   └─────────────────────┘   │
│   [fields below...]         │
```

### 3.2 Login Page — Desktop (768px+)

Card remains `max-w-sm` (384px), centered on wider viewport. Background fills remaining space with `bg-base-100`. No layout changes — card just floats in center. Card padding increases from `p-6` to `p-8`.

### 3.3 Register Page — Mobile (375px)

```
┌─────────────────────────────┐
│                             │
│   ┌─────────────────────┐   │
│   │                     │   │
│   │   Зареєструватися   │   │  ← text-2xl font-semibold
│   │                     │   │
│   │  Email              │   │
│   │  ┌───────────────┐  │   │
│   │  │               │  │   │
│   │  └───────────────┘  │   │
│   │                     │   │
│   │  Пароль             │   │
│   │  ┌───────────────┐  │   │
│   │  │               │  │   │
│   │  └───────────────┘  │   │
│   │  ✗ Мінімум 8 символів│  │  ← label-text-alt text-error (conditional)
│   │                     │   │
│   │  Підтвердіть пароль │   │
│   │  ┌───────────────┐  │   │
│   │  │               │  │   │
│   │  └───────────────┘  │   │
│   │  ✗ Паролі не збігаються│ │  ← label-text-alt text-error (conditional)
│   │                     │   │
│   │  ┌───────────────┐  │   │
│   │  │ Зареєструватися│  │   │  ← btn btn-primary btn-block
│   │  └───────────────┘  │   │
│   │                     │   │
│   │  Вже маєте акаунт?  │   │
│   │  Увійти             │   │  ← link text-primary
│   │                     │   │
│   └─────────────────────┘   │
│                             │
└─────────────────────────────┘
```

### 3.4 App Shell — Mobile (375px)

```
┌─────────────────────────────┐
│ Norwegian Hub    [Вийти]    │  ← navbar bg-base-200 shadow-sm sticky
├─────────────────────────────┤
│                             │
│   (page content — Phase 2   │
│    will render word list)   │  ← bg-base-100 flex-1
│                             │
│   ┌─────────────────────┐   │
│   │  Слів ще немає.     │   │  ← placeholder text-base-content/50
│   │  Додайте перше слово│   │
│   │  в наступній фазі.  │   │
│   └─────────────────────┘   │
│                             │
└─────────────────────────────┘
```

Phase 1 renders an empty `<main>` with placeholder text. No word list UI in this phase.

---

## 4. Interaction Flows

### 4.1 Login — Success Path

```
User opens /login
  → LoginForm renders (empty, enabled)
  → User types email + password
  → User clicks "Увійти" or presses Enter
    → Button becomes disabled, spinner shown, fields disabled
    → POST /api/auth/login
      → 200 OK: { token, userId }
        → authStore.login(token, userId)
        → localStorage.setItem('auth_token', token)
        → navigate('/words')          ← React Router replace (no back to login)
```

### 4.2 Login — Error Path

```
      → 401 Unauthorized:
        → Button re-enabled, spinner removed, fields re-enabled
        → alert alert-error rendered above fields:
          "Невірний email або пароль"
        → focus() called on alert element (aria announcement)
        → Password field value cleared, cursor placed in password field

      → Network error / 5xx:
        → alert alert-error: "Помилка сервера. Спробуйте ще раз."
        → Fields and button re-enabled
```

### 4.3 Register — Success Path

```
User opens /register
  → RegisterForm renders
  → User fills email, password, confirm password
  → Client validation passes
  → User clicks "Зареєструватися"
    → Button disabled, spinner shown, fields disabled
    → POST /api/auth/register
      → 201 Created: { token, userId }
        → authStore.login(token, userId)     ← same action as login
        → localStorage.setItem('auth_token', token)
        → navigate('/words')
```

### 4.4 Register — Error Paths

```
Client validation:
  → Email invalid format → input-error + "Невірний формат email" under field
  → Password < 8 chars → input-error + "Мінімум 8 символів"
  → Passwords don't match → input-error on confirm + "Паролі не збігаються"
  → Form NOT submitted until all pass

Server errors:
  → 409 Conflict (email taken):
    alert alert-error: "Цей email вже зареєстрований"
    Email field gets input-error, focus moved to email field

  → 5xx / network:
    alert alert-error: "Помилка сервера. Спробуйте ще раз."
```

### 4.5 Session Restore on Page Load

```
App mounts (main.tsx / App.tsx)
  → authStore initializes:
    const token = localStorage.getItem('auth_token')
    if (token) → set store state { token, isAuthenticated: true }
  → React Router renders routes
  → ProtectedRoute reads authStore.token
    → token present → render children (AppShell + page)
    → token absent → <Navigate to="/login" replace />

No loading state — check is synchronous.
No token validation request on load in Phase 1 (v1 personal tool).
```

### 4.6 Logout Flow

```
User clicks "Вийти" in AppShell navbar
  → authStore.logout()
    → localStorage.removeItem('auth_token')
    → clear store state { token: null, isAuthenticated: false }
  → navigate('/login', { replace: true })
  → ProtectedRoute redirects all protected routes to /login
  → /words is now inaccessible without re-login
```

---

## 5. Form Validation

### 5.1 Rules

| Field | Rule | Error message |
|-------|------|---------------|
| Email | Required | "Email обов'язковий" |
| Email | Valid format (RFC-like: contains @, has domain) | "Невірний формат email" |
| Password | Required | "Пароль обов'язковий" |
| Password | Minimum 8 characters | "Мінімум 8 символів" |
| Confirm password | Must equal password value | "Паролі не збігаються" |

### 5.2 Validation Timing

- Validate on submit first (not on keystroke — avoid premature errors)
- After first submit attempt: re-validate on blur for each field
- Confirm password: validate on blur only after user has left the field

### 5.3 Error Display Pattern

Inline field error (DaisyUI pattern):
```html
<div class="form-control w-full">
  <label class="label" for="email">
    <span class="label-text font-semibold">Email</span>
  </label>
  <input
    id="email"
    type="email"
    class="input input-bordered w-full input-error"
    aria-describedby="email-error"
    aria-invalid="true"
  />
  <div class="label">
    <span
      id="email-error"
      class="label-text-alt text-error"
      role="alert"
    >
      Невірний формат email
    </span>
  </div>
</div>
```

Server error banner (top of form):
```html
<div
  class="alert alert-error rounded-lg"
  role="alert"
  tabIndex={-1}
  ref={errorAlertRef}
>
  <svg .../>  {/* DaisyUI alert icon */}
  <span>Невірний email або пароль</span>
</div>
```

---

## 6. Navigation Structure (Phase 1)

### 6.1 Routes

| Path | Component | Auth required | Phase |
|------|-----------|---------------|-------|
| `/login` | `AuthLayout > LoginForm` | No | 1 |
| `/register` | `AuthLayout > RegisterForm` | No | 1 |
| `/words` | `ProtectedRoute > AppShell > WordsPage` | Yes | 1 (shell only) |
| `/` | Redirect → `/words` | — | 1 |

`WordsPage` in Phase 1 is a placeholder — renders empty state text only. Full implementation in Phase 2.

### 6.2 Redirect Rules

| Condition | Redirect | Method |
|-----------|----------|--------|
| Unauthenticated user visits `/words` | → `/login` | `<Navigate replace>` in ProtectedRoute |
| Unauthenticated user visits `/` | → `/login` | Root route redirects to `/words` → caught by ProtectedRoute |
| Authenticated user visits `/login` | → `/words` | Check token in LoginForm useEffect on mount |
| Authenticated user visits `/register` | → `/words` | Check token in RegisterForm useEffect on mount |
| After successful login | → `/words` | `navigate('/words', { replace: true })` |
| After logout | → `/login` | `navigate('/login', { replace: true })` |

---

## 7. Accessibility

### 7.1 `aria-label` Requirements

| Element | Required attribute |
|---------|-------------------|
| Password input | `type="password"` — no additional aria needed; label association via `htmlFor` |
| Submit button (loading state) | `aria-busy="true"` when loading |
| Server error alert | `role="alert"` + `tabIndex={-1}` + programmatic `focus()` |
| Inline field error | `role="alert"` on `label-text-alt` span |
| Input with error | `aria-invalid="true"` + `aria-describedby="{field}-error"` |
| Logout button | Visible text "Вийти" is sufficient — no `aria-label` needed |
| Form | `aria-label="Форма входу"` / `aria-label="Форма реєстрації"` |

### 7.2 Focus Management

| Event | Focus action |
|-------|-------------|
| Page load on `/login` | Focus on email input (autofocus attribute) |
| Page load on `/register` | Focus on email input (autofocus attribute) |
| Server error appears | `errorAlertRef.current?.focus()` — announces error to screen reader |
| Successful form submit | No focus action — page navigates away |
| Inline validation error | No programmatic focus — error announced via `role="alert"` |

### 7.3 Screen Reader Error Announcement

Inline errors use `role="alert"` on the error span. This causes screen readers to announce the error immediately when it appears without requiring focus change. The `aria-describedby` linkage ensures the error is also read when the field is focused.

Server error uses `role="alert"` on the banner div plus programmatic `focus()` to scroll the alert into view and force announcement.

### 7.4 Norwegian Character Input

No special treatment needed beyond standard `<input type="text">` and `<input type="email">`. The browser's native character input handles ø, æ, å via the OS keyboard. Do NOT set `inputMode` to numeric or restrict character sets on email/password fields.

---

## 8. Copywriting Contract

### 8.1 Primary CTAs

| Screen | Button label | Loading label |
|--------|-------------|---------------|
| Login | "Увійти" | "Входжу…" |
| Register | "Зареєструватися" | "Реєструю…" |
| Logout | "Вийти" | (instant — no loading) |

### 8.2 Navigation Links

| Context | Link text |
|---------|-----------|
| On login page | "Немає акаунту? **Зареєструватися**" |
| On register page | "Вже маєте акаунт? **Увійти**" |

### 8.3 Empty State (Phase 1 WordsPage placeholder)

```
Слів ще немає.
Функція додавання слів з'явиться у наступній фазі.
```

Render as centered `text-base-content/50 text-center` paragraph inside `<main>`.

### 8.4 Error Messages

| Trigger | Message |
|---------|---------|
| 401 on login | "Невірний email або пароль" |
| 409 on register | "Цей email вже зареєстрований" |
| 5xx / network error | "Помилка сервера. Спробуйте ще раз." |
| Email format invalid | "Невірний формат email" |
| Password too short | "Мінімум 8 символів" |
| Passwords don't match | "Паролі не збігаються" |
| Email required | "Email обов'язковий" |
| Password required | "Пароль обов'язковий" |

### 8.5 Destructive Actions in Phase 1

Logout is the only destructive-ish action. No confirmation dialog — logout is instant and reversible (user can log back in). No confirmation modal required.

---

## 9. File Structure — Phase 1 Frontend

All paths relative to project root.

```
src/
├── main.tsx                        — React entry point, renders <App />, sets data-theme="nord" on <html>
├── App.tsx                         — React Router <Routes> setup, root redirect
│
├── features/
│   └── auth/
│       ├── authStore.ts            — Zustand store: { token, userId, login(), logout() }
│       │                             init: reads localStorage on store creation
│       ├── AuthLayout.tsx          — Centered card wrapper for auth pages
│       ├── LoginForm.tsx           — Login form component (self-contained)
│       ├── RegisterForm.tsx        — Register form component (self-contained)
│       └── ProtectedRoute.tsx      — Route guard: checks authStore.token
│
├── components/
│   ├── Button.tsx                  — DaisyUI btn wrapper with loading state prop
│   └── Input.tsx                   — DaisyUI input wrapper with label + error slot
│
├── lib/
│   ├── api.ts                      — Axios instance (baseURL from env), auth header interceptor
│   └── types.ts                    — Shared TypeScript types: AuthResponse, User, ApiError
│
└── pages/
    └── WordsPage.tsx               — Phase 1 placeholder: empty state text inside AppShell
```

### Key exports per file

| File | Exports |
|------|---------|
| `authStore.ts` | `useAuthStore` (Zustand hook) |
| `AuthLayout.tsx` | `AuthLayout` (default export) |
| `LoginForm.tsx` | `LoginForm` (default export) |
| `RegisterForm.tsx` | `RegisterForm` (default export) |
| `ProtectedRoute.tsx` | `ProtectedRoute` (default export) |
| `AppShell.tsx` | `AppShell` (default export) |
| `Button.tsx` | `Button` (named export) |
| `Input.tsx` | `Input` (named export) |
| `api.ts` | `api` (Axios instance, default export) |
| `types.ts` | `AuthResponse`, `ApiError` (named exports) |
| `WordsPage.tsx` | `WordsPage` (default export) |
| `App.tsx` | `App` (default export) |

---

## 10. Registry

No third-party component registries. All components built on DaisyUI (Tailwind CSS plugin) + hand-written wrappers.

**DaisyUI components used in Phase 1:**
- `btn`, `btn-primary`, `btn-ghost`, `btn-block`
- `input`, `input-bordered`, `input-error`
- `form-control`, `label`, `label-text`, `label-text-alt`
- `alert`, `alert-error`, `alert-success`
- `loading`, `loading-spinner`, `loading-sm`
- `navbar`, `navbar-start`, `navbar-end`
- `card`, `card-body`

Registry safety gate: not applicable (no third-party registries).

---

## 11. DaisyUI Theme Setup

Add to `tailwind.config.js`:
```js
module.exports = {
  // ...
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['nord'],
    darkTheme: false,  // Phase 1: light only
  },
}
```

Add to `src/main.tsx` or `index.html`:
```html
<html data-theme="nord">
```

---

*UI-SPEC created: 2026-05-27*
*Status: ready — checker validated, accessibility fixes applied*
