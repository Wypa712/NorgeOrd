---
phase: 5
slug: translator
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-28
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no test framework detected in project |
| **Config file** | none |
| **Quick run command** | N/A — manual smoke tests only |
| **Full suite command** | N/A |
| **Estimated runtime** | N/A |

**Note:** No automated test framework exists in this project (verified in RESEARCH.md). All verification for this phase is manual smoke tests.

---

## Sampling Rate

- **After every task commit:** Manual browser smoke test (see per-task instructions below)
- **After every plan wave:** Full manual UI walkthrough
- **Before `/gsd-verify-work`:** All smoke tests must pass

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 05-01-01 | 01 | 1 | — | manual | MISSING | ⬜ pending |
| 05-01-02 | 01 | 1 | — | manual | MISSING | ⬜ pending |
| 05-01-03 | 01 | 1 | — | manual | MISSING | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

No test framework to install — project has no automated testing infrastructure. Proceeding with manual-only verification.

---

## Manual-Only Verifications

| Behavior | Why Manual | Test Instructions |
|----------|------------|-------------------|
| uk→nn translation returns text | No test framework | 1. Open Перекладач tab. 2. Type "будинок". 3. Click "Перекласти". 4. Result textarea shows Norwegian text. |
| nn→uk translation (reverse direction) | No test framework | 1. Swap direction. 2. Type "hus". 3. Click "Перекласти". 4. Result shows Ukrainian text. |
| Swap button swaps text+direction | No test framework | 1. Type "будинок" in source. 2. Translate. 3. Click ⇄. 4. Old result appears in source, direction flips. |
| Copy button shows "Скопійовано!" | No test framework | 1. After translation, click copy icon. 2. Toast "Скопійовано!" appears. 3. Clipboard contains result text. |
| "Перекласти" disabled when empty | No test framework | Source empty → button disabled (greyed out). |
| Loading state during translation | No test framework | Click "Перекласти" → button shows spinner + "Перекладаю..." while waiting. |
| Error toast on API failure | No test framework | Disconnect internet → translate → toast "Помилка перекладу. Спробуй ще раз." |
| Fallback indicator when Apertium fails | No test framework | If `fallback=true` returned → subtle inline note visible. |
| Mobile layout stacks vertically | No test framework | Resize browser to < 640px → textareas stack, swap button centered between them. |

---

## Validation Sign-Off

- [ ] All tasks have manual verify instructions documented above
- [ ] No automated tests available — project has no test framework (see RESEARCH.md Validation Architecture)
- [ ] Manual smoke tests cover all must_haves from 05-01-PLAN.md

**Approval:** pending
