# Phase 2: Core Word CRUD - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-27
**Phase:** 2-Core Word CRUD
**Areas discussed:** Word list layout, Форма додавання слова, Перегляд / Редагування, Теги у Phase 2

---

## Word list layout

| Option | Description | Selected |
|--------|-------------|----------|
| Картки (cards) | DaisyUI card, headword великий + переклад + badge | |
| Компактний список | flex-row рядки, більше слів на екрані | ✓ |
| Картки 2 колонки (grid) | CSS grid, 2-col планшет / 1-col мобільний | |

**User's choice:** Компактний список

---

| Option | Description | Selected |
|--------|-------------|----------|
| Headword + переклад + рід | 3 поля | ✓ |
| Headword + переклад + рід + wordClass | 4 поля | |
| Headword + переклад | 2 поля | |

**User's choice:** Headword + переклад + рід

---

| Option | Description | Selected |
|--------|-------------|----------|
| DaisyUI badge | Colored badge для роду і wordClass | ✓ |
| Простий текст (m/f/n) | Текстове скорочення | |
| Іконка/колір | Візуальне розрізнення | |

**User's choice:** DaisyUI badge

**Notes:** Користувач зауважив, що не тільки іменники мають рід — дієслова, прикметники, прислівники його не мають. Рішення: wordClass badge завжди, gender badge тільки якщо `gender != null`.

---

## Форма додавання слова

| Option | Description | Selected |
|--------|-------------|----------|
| Мінімальний набір | headword + translation + gender + wordClass + notes | ✓ |
| Розширений набір | всі поля схеми + difficulty + personalNote + examples | |
| Progressive disclosure | обов'язкові поля + акордіон "Додати деталі" | |

**User's choice:** Мінімальний набір

---

| Option | Description | Selected |
|--------|-------------|----------|
| Пропустити в Phase 2 | forms = null до Phase 3 (AI заповнить) | ✓ |
| JSON textarea | текстове поле для неструктурованого JSON | |
| Key-value інпути | динамічні поля "form name" / "value" | |

**User's choice:** Пропустити в Phase 2

---

| Option | Description | Selected |
|--------|-------------|----------|
| Модальне вікно | FAB "+" → modal drawer | ✓ |
| Окрема сторінка /words/new | окремий маршрут | |
| Форма зверху списку | inline поле над списком | |

**User's choice:** Модальне вікно

---

## Перегляд / Редагування

| Option | Description | Selected |
|--------|-------------|----------|
| Окрема сторінка /words/:id | окремий маршрут, URL змінюється | |
| Модальне вікно (drawer) | відкривається над списком, URL не змінюється | ✓ |

**User's choice:** Модальне вікно (drawer)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Кнопка "Редагувати" → перемикає до форми | view-мод за замовчуванням | ✓ |
| Inline editing (клік на поле) | пряме редагування полів | |

**User's choice:** Кнопка "Редагувати" → перемикає до форми

---

| Option | Description | Selected |
|--------|-------------|----------|
| Всі не-null поля | headword, translation, gender, wordClass, difficulty, notes, personalNote, forms (якщо є), examples (якщо є) | ✓ |
| Тільки основні | headword + translation + gender | |

**User's choice:** Всі не-null поля

---

## Теги у Phase 2

| Option | Description | Selected |
|--------|-------------|----------|
| Відкласти до Phase 3 | AI автоматично пропонує теги | ✓ |
| Базовий tag input | текстове поле через кому | |

**User's choice:** Відкласти до Phase 3

---

## Видалення

| Option | Description | Selected |
|--------|-------------|----------|
| Confirm dialog | DaisyUI modal з назвою слова + кнопки Скасувати / Видалити | ✓ |
| Без підтвердження | прямий клік — видаляє одразу | |

**User's choice:** Confirm dialog перед видаленням

---

## Claude's Discretion

- Порядок сортування у списку (за `createdAt` DESC — найновіші зверху)
- Структура API response (включати теги у list endpoint чи тільки у detail)
- Анімація відкриття drawer (DaisyUI defaults)

## Deferred Ideas

- Теги — Phase 3 (AI auto-suggest)
- `forms` field UI — Phase 3 (AI fills)
- `examples[]` field UI — Phase 3 (AI fills)
- Фільтрація за тегами/difficulty — Phase 4+ (v2 requirement FLTR-01, FLTR-02)
- Пошук — Phase 4 (SRCH-01)
