# Phase 5: Translator — Discussion Log

**Date:** 2026-05-28
**Duration:** ~1 session
**Areas discussed:** Translation API, Navigation/UI, Integration, Translation direction

---

## Area: Translation API

| Question | Options | Selected |
|----------|---------|----------|
| Який API використати? | Apertium / LibreTranslate / DeepL Free / Не пам'ятаю | **Apertium** |
| Чи базова якість прийнятна? | Просто показати / З приміткою / + кнопка AI | **Просто показати** |
| Proxy чи прямо з фронтенду? | Через бекенд (proxy) / Прямо з фронтенду | **Через бекенд** |

**Notes:** Apertium має пари uk-nn і nn-uk, публічний API без ключа.

---

## Area: Navigation/UI

| Question | Options | Selected |
|----------|---------|----------|
| Де розмістити вкладку? | Bottom navbar / Tabs вверху / Новий маршрут | Існуючий switch у WordsPage |
| Які пункти навігації? | 2 / 3 вкладки | **Додати 3й таб до наявних AI пошук + Словник** |
| Layout перекладача? | 2 textarea + swap / 1 input + select | **2 textarea + кнопка заміни (⇄)** |

**Notes:** Користувач уточнив — це не AppShell навігація, а DaisyUI `tabs tabs-boxed` всередині WordsPage. Розширити `ActiveTab` type.

---

## Area: Translation Direction

| Question | Options | Selected |
|----------|---------|----------|
| Напрямок? | uk↔nn (обидва) / uk→nn тільки | **uk↔nn обидва** |

---

## Area: Integration with Words

| Question | Options | Selected |
|----------|---------|----------|
| Зберігати/аналізувати після перекладу? | Тільки переклад / + кнопка 'В AI' | **Тільки переклад** |
| Кнопка copy-to-clipboard? | Так / Ні | **Так** |

---

## Deferred Ideas

- "Відправити в AI" після перекладу — занадто складно для цієї фази, user може скопіювати вручну
- Neural MT (DeepL) — не потрібно для навчального застосунку
