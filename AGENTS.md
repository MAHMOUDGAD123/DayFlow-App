# Dayflow — Project Instructions & AI Agent Guidelines

Dayflow is a modern, offline-first productivity mobile app built with **Expo SDK 58 (React Native New Architecture)**, **TypeScript**, **expo-sqlite + Drizzle ORM**, and **pure domain engine logic**.

---

## 🚨 Cardinal Rules & Context Management

1. **Always check `docs/PROGRESS.md` first:**
   - At the beginning of any session or task, read `docs/PROGRESS.md` to know the current milestone, completed deliverables, and next active task.
   - When completing any milestone or significant feature, update `docs/PROGRESS.md`.
2. **Consult feature specs in `docs/spec/<feature>.md`:**
   - Detailed functional requirements and edge cases are documented in `docs/spec/`. Never guess requirements.
3. **Keep the Domain Engine Pure:**
   - All scheduling, conflict detection, emergency filtering, midnight crossing, prayer offsets, and time math live in `src/domain/`.
   - Domain files MUST NOT import React, React Native, or native platform APIs.
   - Every domain function must have automated unit tests in `src/domain/__tests__/` with >= 90% coverage.
4. **Strict i18n & RTL Compliance:**
   - NEVER hardcode user-facing strings. All text must go through `t('key')` from `react-i18next`.
   - Add new translation keys to both `src/i18n/locales/en.json` and `src/i18n/locales/ar.json`.
   - In Arabic, numbers, dates, times, and counts MUST use Arabic-Indic numerals (`٠١٢٣٤٥٦٧٨٩`).
   - Use logical styling only: `marginStart`, `marginEnd`, `paddingStart`, `paddingEnd`, `start`, `end`. Never hardcode `left`/`right` for layout.
5. **Database Changes Require Migration Versioning:**
   - DB schema is managed via Drizzle in `src/db/schema.ts`.
   - Any schema modification must increment `SCHEMA_VERSION` and include a backup serializer/deserializer migration in `src/services/backup/`.
6. **No Breaking Expo Go in M0–M6:**
   - During Milestones M0–M6, the app runs in standard **Expo Go**. Do not introduce non-Expo-Go native dependencies before Milestone M7.

---

## Verification Pipeline Before Declaring Work Done

Always run:
```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .
npm test            # Jest test suite
```
Fix all errors and warnings before completing a turn.
