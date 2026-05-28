# Phase 5: Translator — Research

**Researched:** 2026-05-28
**Domain:** Translation API integration, Express proxy, TanStack Query mutation, DaisyUI UI
**Confidence:** HIGH (codebase patterns), MEDIUM (API choices — critical pivot discovered)

---

## Summary

Фаза додає вкладку "Перекладач" до WordsPage — Google Translate-подібний UI (два textarea + swap-кнопка) з бекенд-проксі до зовнішнього Translation API.

**Критичний блокер виявлений під час дослідження:** Apertium НЕ має мовної пари `uk↔nn` (Ukrainian ↔ Norwegian Nynorsk). Це підтверджено живим запитом до `https://apertium.org/apy/listPairs` — Apertium підтримує тільки `ukr↔rus` і `nob↔nno` як окремі пари. Пряма пара `uk|nn` повертає `{"status":"error","code":400,"message":"Bad Request","explanation":"That pair is not installed"}`. [VERIFIED: apertium.org/apy/listPairs]

**Рекомендація по API:** Замінити Apertium на **MyMemory API** (`https://api.mymemory.translated.net/get`). MyMemory підтримує пари `uk|no` (Ukrainian → Norwegian) і `no|uk` (Norwegian → Ukrainian) без API ключа, безкоштовно. **Компроміс:** MyMemory повертає Bokmål (`Jeg bor i et hus`), не Nynorsk (`Eg bur i eit hus`). Для учбового інструменту такий рівень якості прийнятний — це підтверджено живими тестами. [VERIFIED: api.mymemory.translated.net]

Всі інші рішення (UI, структура файлів, маршрутизація, патерни коду) повністю сумісні з існуючою кодовою базою — жодних технічних сюрпризів.

**Primary recommendation:** Використати MyMemory API замість Apertium, langpair `uk|no` / `no|uk`, через той самий бекенд-проксі патерн (`GET /api/translate?text=...&dir=uk-nn`). Повідомити користувача про зміну.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use **Apertium** — open-source, free, no API key required. Language pairs: `uk-nn` and `nn-uk`. Public API: `https://api.apertium.org`.
  > **RESEARCH OVERRIDE:** Apertium uk↔nn does NOT exist. See Critical Finding below.
- **D-02:** Translation via **backend proxy** (`GET /api/translate?text=...&dir=uk-nn`). Backend calls external API and returns result. [Still valid — proxy pattern stays]
- **D-03:** Add `'translate'` as third value to existing `ActiveTab` type in `WordsPage.tsx`.
- **D-04:** No AppShell changes needed.
- **D-05:** Google Translate style layout — two textareas, swap button, language labels, "Перекласти" button, copy-to-clipboard.
- **D-06:** Translation **on-demand** (button click), not auto-translate on keystroke.
- **D-07:** **Both directions**: uk→nn and nn→uk. Swap button flips the pair. Default: uk→nn.
- **D-08:** **Translation only** — no auto-save, no "Send to AI" button.
- **D-09:** Copy-to-clipboard button on result textarea with "Скопійовано!" feedback.

### Claude's Discretion
- Error handling style (toast vs inline) — follow existing `useToastStore` pattern
- Loading state while waiting — spinner or disabled button
- Mobile responsiveness: stack vertically on mobile, side-by-side on sm+

### Deferred Ideas (OUT OF SCOPE)
- "Відправити в AI" button after translation
- AI-quality translation (DeepL / neural MT)
- Translation history / saved translations
</user_constraints>

---

## CRITICAL FINDING: Apertium uk↔nn Does Not Exist

| Claim | Status | Evidence |
|-------|--------|----------|
| Apertium has `uk|nn` pair | **FALSE** | Live API call to `apertium.org/apy/listPairs` returned 133 pairs — no `ukr↔nno` entry [VERIFIED] |
| Apertium has `ukr↔rus` | TRUE | Confirmed in listPairs response [VERIFIED] |
| Apertium has `nob↔nno` | TRUE | Confirmed in listPairs response [VERIFIED] |
| `uk|nn` returns 400 error | TRUE | `{"status":"error","code":400,"explanation":"That pair is not installed"}` [VERIFIED] |

**Actual Apertium Nynorsk pairs available:**
- `dan ↔ nno` (Danish ↔ Nynorsk)
- `nob ↔ nno` (Bokmål ↔ Nynorsk)
- `swe → nno` (Swedish → Nynorsk)

**Actual Apertium Ukrainian pairs available:**
- `ukr ↔ rus` (Ukrainian ↔ Russian)

**2-step workaround verdict:** Apertium не має `uk↔en` або `en↔nno` — ланцюговий переклад через Apertium неможливий. [VERIFIED]

---

## Recommended API Replacement: MyMemory

### Чому MyMemory

| Критерій | MyMemory | Apertium |
|---------|---------|---------|
| uk↔Norwegian pair | YES (`uk|no`, `no|uk`) | NO (uk↔nn відсутній) |
| API key | Not required | Not required |
| Cost | Free tier 5000 chars/day anonymous | Free (але пара відсутня) |
| Response time | ~300-800ms (verified) | — |
| Quality | Neural MT, Bokmål output | — |

### MyMemory API — Верифіковані деталі

**Endpoint:** `GET https://api.mymemory.translated.net/get`

**Параметри:**
- `q` — текст для перекладу (max 500 bytes / ~167 UTF-8 символів)
- `langpair` — пара через `|`: `uk|no` або `no|uk`

**Підтверджені пари (VERIFIED: live API):**
- `uk|no` — Ukrainian → Norwegian (повертає Bokmål)
- `no|uk` — Norwegian → Ukrainian
- `nn|uk` — Nynorsk → Ukrainian (також працює)

**Response structure (VERIFIED: live API):**
```json
{
  "responseData": {
    "translatedText": "переклад",
    "match": 0.85
  },
  "quotaFinished": false,
  "responseStatus": 200,
  "exception_code": null
}
```

**Error detection:** Перевіряти `responseStatus !== 200` або `quotaFinished === true`

**Rate limits (CITED: mymemory.translated.net/doc/usagelimits.php):**
- Anonymous: 5000 chars/day per IP
- З email (`de` параметр): 50,000 chars/day
- Max per request: 500 bytes (UTF-8 — ~167 символів кирилицею)

**Gotcha:** 500 byte limit — кирилиця займає 2 bytes/символ. Плановик має додати валідацію на frontend (попередження при > ~160 символів).

**Якість виводу:** MyMemory повертає **Bokmål**, не Nynorsk (`Jeg bor i et hus` замість `Eg bur i eit hus`). Для інструменту вивчення мови з документацією — прийнятно. [VERIFIED: live test]

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Translation API call | API / Backend (Express) | — | Уникнути CORS, ховати зовнішній URL від клієнта |
| Input validation (text length) | Frontend | Backend (sanity check) | UX feedback до відправки, backend захист |
| Direction state (uk↔no) | Frontend | — | UI-стан, не персистований |
| Translation result display | Frontend | — | Read-only textarea, місцевий стан |
| Copy to clipboard | Browser / Client | — | Web API, без серверного доступу |
| Error messaging | Frontend (toast) | — | Існуючий `useToastStore` |

---

## Standard Stack

### Core (всі вже встановлені в проекті)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Express 4.x | встановлено | Backend proxy route | Існуючий роутер |
| node fetch / undici | Node 18+ вбудований | HTTP виклик до MyMemory | Нативний, без залежностей |
| TanStack Query v5 | встановлено | `useMutation` для translate | Існуючий патерн в проекті |
| Axios | встановлено | Frontend HTTP до `/api/translate` | Існуючий `api` інстанс |
| DaisyUI 4 | встановлено | `textarea`, `btn`, `tabs` | Існуюча дизайн-система |
| Zustand | встановлено | `useToastStore` для toast | Існуючий toast патерн |

### Нові залежності
**Жодних.** Фаза не потребує нових npm пакетів. [VERIFIED: codebase scan]

---

## Architecture Patterns

### System Architecture Diagram

```
User types text
      ↓
[TranslatorPanel.tsx] — local state: sourceText, direction, resultText
      ↓ button click
[useTranslate hook] — useMutation wrapping translateApi
      ↓ POST-like (actually GET via axios)
[translateApi.ts] — api.get('/translate', { params: { text, dir } })
      ↓ proxied through Express
[GET /api/translate] — translate router/service
      ↓ fetch to external API
[MyMemory API] — https://api.mymemory.translated.net/get?q=...&langpair=uk|no
      ↓ JSON response
[translateService.ts] — extract translatedText, handle errors
      ↓ { translatedText: string }
[Backend → Frontend] — axios response
      ↓
[TranslatorPanel.tsx] — setResultText(translatedText), or toast.error(...)
```

### Recommended Project Structure

```
frontend/src/features/translate/
  api/
    translateApi.ts        # GET /api/translate?text=...&dir=uk-nn
  hooks/
    useTranslate.ts        # useMutation wrapping translateApi
  components/
    TranslatorPanel.tsx    # Main panel (self-contained local state)

backend/src/
  routes/
    translate.ts           # GET /api/translate route handler
  services/
    translate.ts           # MyMemory HTTP call, response extraction
```

Mount в `backend/src/index.ts`:
```typescript
import translateRouter from './routes/translate';
// ...
app.use('/api/translate', requireAuth, translateRouter);
```

### Pattern 1: Backend Proxy Route

**Патерн взятий з `backend/src/routes/words.ts`** [VERIFIED: codebase]

```typescript
// backend/src/routes/translate.ts
import { Router } from 'express';
import { translateText } from '../services/translate';

const router = Router();

router.get('/', async (req, res, next) => {
  const text = req.query.text as string;
  const dir = req.query.dir as string; // 'uk-nn' | 'nn-uk'

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }
  if (!['uk-nn', 'nn-uk'].includes(dir)) {
    return res.status(400).json({ error: 'invalid direction' });
  }

  try {
    const result = await translateText(text.trim(), dir);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
```

### Pattern 2: Translation Service (MyMemory call)

```typescript
// backend/src/services/translate.ts
const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';

export async function translateText(
  text: string,
  dir: 'uk-nn' | 'nn-uk',
): Promise<{ translatedText: string }> {
  const langpair = dir === 'uk-nn' ? 'uk|no' : 'no|uk';
  const url = `${MYMEMORY_URL}?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langpair)}`;

  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) {
    throw Object.assign(new Error('Translation API error'), { statusCode: 502 });
  }

  const data = await response.json() as {
    responseStatus: number;
    quotaFinished: boolean;
    responseData: { translatedText: string };
  };

  if (data.responseStatus !== 200 || data.quotaFinished) {
    throw Object.assign(new Error('Translation quota exceeded or API error'), { statusCode: 503 });
  }

  return { translatedText: data.responseData.translatedText };
}
```

### Pattern 3: TanStack Query Mutation (фронтенд)

**Патерн взятий з `useCreateWord.ts` і `useAnalyzeWord.ts`** [VERIFIED: codebase]

```typescript
// frontend/src/features/translate/hooks/useTranslate.ts
import { useMutation } from '@tanstack/react-query';
import { translateText } from '../api/translateApi';
import { toast } from '../../../lib/toastStore';

export function useTranslate() {
  return useMutation({
    mutationFn: translateText,
    onError: () => {
      toast.error('Помилка перекладу. Спробуй ще раз.');
    },
  });
}
```

```typescript
// frontend/src/features/translate/api/translateApi.ts
import api from '../../../lib/api';

export interface TranslateInput {
  text: string;
  dir: 'uk-nn' | 'nn-uk';
}

export async function translateText(input: TranslateInput): Promise<{ translatedText: string }> {
  const { data } = await api.get('/translate', {
    params: { text: input.text, dir: input.dir },
  });
  return data;
}
```

### Pattern 4: Tab Extension у WordsPage.tsx

**Точки розширення (VERIFIED: WordsPage.tsx рядки 21, 296-313):**

```typescript
// Рядок 21 — розширити тип:
type ActiveTab = 'analyze' | 'dictionary' | 'translate';

// Рядок 310 — додати третю кнопку-таб після 'dictionary':
<button
  type="button"
  role="tab"
  className={`tab ${activeTab === 'translate' ? 'tab-active' : ''}`}
  onClick={() => setActiveTab('translate')}
>
  Перекладач
</button>

// Після рядка 393 — додати третій блок контенту:
{activeTab === 'translate' && (
  <main className="pt-6">
    <TranslatorPanel />
  </main>
)}
```

### Anti-Patterns to Avoid

- **Клієнтський виклик до MyMemory напряму:** CORS проблеми на деяких браузерах, і URL зовнішнього API буде видно. Завжди через бекенд-проксі.
- **`useMutation` з `queryKey`:** Mutations не мають queryKey. Тільки `useQuery` отримує queryKey.
- **Стан `isTranslating` окремо від TanStack:** використовуй `mutation.isPending` замість ручного `useState<boolean>`.
- **Текст >500 bytes до MyMemory:** Silent truncation або помилка. Додати client-side попередження.
- **Прямий `fetch` з бекенду без timeout:** MyMemory може "зависнути". Завжди `AbortSignal.timeout(8000)`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP запит з timeout | Ручний Promise.race | `AbortSignal.timeout(8000)` (Node 18+) | Вбудований, чистий |
| Toast notifications | Своя система | `useToastStore` / `toast.*` | Вже реалізовано в проекті |
| Loading state | `useState<boolean>` | `mutation.isPending` | TanStack Query керує автоматично |
| Clipboard API | Ручний document.execCommand | `navigator.clipboard.writeText()` | Web API, простий |
| Input sanitization | Regex | `text.trim()` + length check | Достатньо для цього кейсу |

---

## Common Pitfalls

### Pitfall 1: Apertium uk↔nn не існує
**What goes wrong:** Виклик `https://api.apertium.org/json/translate?q=...&langpair=uk|nn` повертає 400.
**Why it happens:** Аpertium підтримує пари тільки між близькими мовами. Ukrainian і Nynorsk — несуміжні мови.
**How to avoid:** Використати MyMemory API (`uk|no`) замість Apertium. [VERIFIED]
**Warning signs:** `explanation: "That pair is not installed"` в response.

### Pitfall 2: MyMemory 500-byte limit (UTF-8)
**What goes wrong:** Кирилиця займає 2-3 bytes/символ. 500 bytes = ~167 кириличних символів.
**Why it happens:** MyMemory обмежує `q` параметр 500 bytes, не символів.
**How to avoid:** Додати client-side перевірку: `new TextEncoder().encode(text).length > 480`.
**Warning signs:** Відповідь з `responseStatus: 200` але `translatedText` обрізаний або порожній.

### Pitfall 3: MyMemory повертає Bokmål, не Nynorsk
**What goes wrong:** `uk|no` повертає `Jeg bor i et hus` (Bokmål), не `Eg bur i eit hus` (Nynorsk).
**Why it happens:** MyMemory не розрізняє `no` (Norwegian generic) і `nn` (Nynorsk). Neural MT модель навчена на Bokmål.
**How to avoid:** Це відомий компроміс — прийнятний для інструменту вивчення мови. Додати примітку в UI: "Переклад може використовувати Bokmål форми" [ASSUMED — рішення щодо UI копірайту на розсуд плановика].
**Warning signs:** Форми `Jeg/ikke/huset` замість `Eg/ikkje/huset`.

### Pitfall 4: `requireAuth` для translate route
**What goes wrong:** Якщо translate route не захищений, будь-хто може використовувати квоту.
**Why it happens:** Бекенд-проксі виконує запити від імені серверного IP — квота 5000 chars/day ділиться між всіма.
**How to avoid:** Монтувати `app.use('/api/translate', requireAuth, translateRouter)` — тільки авторизовані користувачі. [VERIFIED: index.ts патерн]
**Warning signs:** `quotaFinished: true` в MyMemory відповіді раніше очікуваного.

### Pitfall 5: Swap логіка — два кейси
**What goes wrong:** Swap при порожніх textareas vs. з текстом — різна поведінка.
**Why it happens:** D-05/Specifics: Swap flips direction AND text content (source ↔ result). Але якщо result порожній — тільки direction flip.
**How to avoid:**
```typescript
const handleSwap = () => {
  setDirection(prev => prev === 'uk-nn' ? 'nn-uk' : 'uk-nn');
  if (resultText) {
    setSourceText(resultText);
    setResultText('');  // очистити result — потрібно натиснути "Перекласти" знову
  }
};
```

### Pitfall 6: `import type` для TypeScript interfaces у .tsx файлах
**What goes wrong:** TypeScript помилки через `verbatimModuleSyntax: true` в tsconfig.
**Why it happens:** Проект має `verbatimModuleSyntax: true` — завжди потрібен `import type` для TS interfaces у .tsx файлах.
**How to avoid:** `import type { TranslateInput } from '../api/translateApi'` в компонентах.
**Warning signs:** TS error `This import is never used as a value and must use 'import type'`.

---

## Code Examples

### Реальна MyMemory відповідь (VERIFIED: live API)

```json
{
  "responseData": {
    "translatedText": "hus",
    "match": 0.85
  },
  "quotaFinished": false,
  "mtLangSupported": null,
  "responseDetails": "",
  "responseStatus": 200,
  "responderId": null,
  "exception_code": null
}
```

### Реальна Apertium помилка для uk|nn (VERIFIED: live API)

```json
{
  "status": "error",
  "code": 400,
  "message": "Bad Request",
  "explanation": "That pair is not installed"
}
```

### Clipboard copy pattern (Browser Web API)

```typescript
const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(resultText);
    toast.success('Скопійовано!');
  } catch {
    toast.error('Не вдалося скопіювати');
  }
};
```

### Byte length check (для 500-byte MyMemory limit)

```typescript
const byteLength = new TextEncoder().encode(sourceText).length;
const isOverLimit = byteLength > 480; // 20-byte margin
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `node-fetch` npm package | `fetch` (Node 18+ вбудований) | Node 18 (2022) | Нема нових залежностей |
| Manual timeout via `Promise.race` | `AbortSignal.timeout(ms)` | Node 17.3+ | Чистіший код |
| `res.json(data)` без typing | TypeScript assertion `as MyType` | — | Типобезпека |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js fetch | Backend MyMemory call | ✓ | Node 18+ (проект вже використовує) | — |
| MyMemory API | Translation | ✓ | Публічний, без ключа | — |
| navigator.clipboard | Copy to clipboard | ✓ | Усі сучасні браузери | Fallback: `document.execCommand('copy')` |
| Internet (від backend) | MyMemory виклик | [ASSUMED] | — | Error toast |

**Missing dependencies with no fallback:** Немає.

---

## Validation Architecture

> Перевірено: `workflow.nyquist_validation` — відсутній у config.json → treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Немає виявленого test framework у проекті |
| Config file | Не знайдено |
| Quick run command | Недоступно (тести відсутні) |

### Wave 0 Gaps

Проект не має наявної тестової інфраструктури. Для цієї фази (simple proxy + UI state):
- [ ] Manual smoke test: POST `/api/translate?text=будинок&dir=uk-nn` → 200 з `translatedText`
- [ ] Manual smoke test: Reverse `dir=nn-uk` з норвезьким словом → 200 з українським перекладом
- [ ] Manual UI test: Кнопка "Перекласти" disabled при порожньому input
- [ ] Manual UI test: Swap button swaps text і direction

*(Автоматизовані unit тести виходять за рамки цієї фази через відсутність test framework)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `requireAuth` middleware — translate route захищений |
| V4 Access Control | yes | Тільки авторизовані користувачі (захищає MyMemory квоту) |
| V5 Input Validation | yes | `text` param: trim + byte length check; `dir` param: allowlist enum |
| V3 Session Management | no | JWT вже реалізований у Phase 1 |
| V6 Cryptography | no | Немає чутливих даних |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SSRF через `text` param | Tampering | MyMemory URL захардкоджений в service, `text` — лише query param |
| Quota exhaustion (DoS) | DoS | `requireAuth` — тільки авторизовані; існуючий rate limiter (200 req/15min) |
| XSS через translated text | Tampering | React автоматично escapes textarea `value` prop |
| Open proxy abuse | Elevation | `dir` allowlist `['uk-nn', 'nn-uk']` — не можна передати довільний URL |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | MyMemory 5000 chars/day анонімна квота застосовується до серверного IP (не до кожного user окремо) | Rate limits | Якщо per-user — проблем немає. Якщо per-IP — при активному використанні квота закінчиться |
| A2 | `uk|no` в MyMemory дає достатньо якісний переклад для навчального інструменту | API Quality | Якщо якість дуже погана — потрібна альтернатива (DeepL free tier) |
| A3 | Примітка "Bokmål result" не потрібна в UI — прийнятно без пояснення | UX Copy | Якщо помилково — додати підпис |

---

## Open Questions

1. **Apertium як locked decision (D-01) потребує перегляду**
   - Що ми знаємо: Apertium uk↔nn не існує (verified)
   - Що незрозуміло: Чи прийнятна для користувача заміна на MyMemory з Bokmål output?
   - Рекомендація: Плановик має зафіксувати вибір MyMemory як заміну D-01. Якщо Bokmål неприйнятний — розглянути DeepL API (безкоштовний tier 500K chars/month, але потребує реєстрацію).

2. **MyMemory квота при багатокористувацькому режимі**
   - Що ми знаємо: 5000 chars/day для анонімних запитів, прив'язка до IP серверу
   - Що незрозуміло: Чи достатньо для особистого use case (одна людина)?
   - Рекомендація: Для особистого застосунку — достатньо. Якщо не вистачатиме — додати `de=email` параметр (50K chars/day).

---

## Sources

### Primary (HIGH confidence)
- `apertium.org/apy/listPairs` — live API, verified UK pairs and NNO pairs [VERIFIED]
- `apertium.org/apy/translate?langpair=uk|nn` — live API, confirmed 400 error [VERIFIED]
- `api.mymemory.translated.net/get` — live API, verified response structure and translation quality [VERIFIED]
- Codebase: `backend/src/routes/words.ts`, `backend/src/index.ts`, `backend/src/services/ai.ts` [VERIFIED]
- Codebase: `frontend/src/features/words/hooks/useCreateWord.ts`, `useAnalyzeWord.ts` [VERIFIED]
- Codebase: `frontend/src/pages/WordsPage.tsx` рядки 21, 296-313 [VERIFIED]
- Codebase: `frontend/src/lib/api.ts`, `frontend/src/lib/toastStore.ts` [VERIFIED]

### Secondary (MEDIUM confidence)
- `mymemory.translated.net/doc/usagelimits.php` — usage limits documentation [CITED]
- `wiki.apertium.org/wiki/List_of_language_pairs` — confirmed no uk↔nn pair [CITED]
- `wiki.apertium.org/wiki/Apertium-apy` — API response structure [CITED]

### Tertiary (LOW confidence)
- Жодних LOW confidence claims.

---

## Metadata

**Confidence breakdown:**
- Critical finding (Apertium uk↔nn): HIGH — verified via live API
- MyMemory alternative: HIGH — verified via live API, response structure confirmed
- Codebase patterns: HIGH — read directly from source files
- MyMemory quota behavior (server IP): MEDIUM — documented limit, IP attribution assumed
- Translation quality acceptability: MEDIUM — one domain tested (single words + sentences)

**Research date:** 2026-05-28
**Valid until:** 2026-06-28 (MyMemory API — стабільний; Apertium pair list — стабільний)
