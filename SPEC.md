# Norwegian Learning Hub — Specification

## 1. Idea

A web application for learning Norwegian vocabulary in one place.

The app should replace the current workflow:

1. See a new word.
2. Translate it.
3. Check dictionary forms.
4. Check gender / word type.
5. Write it in notes.
6. Repeat it later.

Instead, the user can add a word once and store all useful information in one system.

---

## 2. Main Goal

Create a personal Norwegian vocabulary assistant with:

- personal dictionary
- word forms
- translations
- examples
- tags
- notes
- repetition system
- AI assistant for explanations and examples

---

## 3. Tech Stack

### Frontend

- React
- Vite
- Tailwind CSS
- DaisyUI
- Zustand
- Axios

### Backend

- Node.js
- Express
- PostgreSQL
- Prisma ORM
- JWT authentication

### Optional

- OpenAI API for automatic word analysis
- Python service for advanced language processing

---

## 4. Main Features

## 4.1 Authentication

User can:

- register
- login
- logout
- stay logged in after page reload
- access only their own words

---

## 4.2 Add Word

User can add a new Norwegian word.

### Fields

- Norwegian word
- Translation
- Word type
- Gender
- Forms
- Example sentence
- Tags
- Notes
- Difficulty level

### Example

```json
{
  "norwegianWord": "hus",
  "translation": "будинок",
  "wordType": "noun",
  "gender": "neuter",
  "forms": {
    "indefiniteSingular": "eit hus",
    "definiteSingular": "huset",
    "indefinitePlural": "hus",
    "definitePlural": "husa"
  },
  "exampleSentence": "Eg bur i eit hus.",
  "tags": ["A1", "home", "noun"],
  "notes": "Neuter noun. Same form in plural.",
  "difficulty": "easy"
}