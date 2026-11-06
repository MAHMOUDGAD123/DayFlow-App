---
name: verify
description: Quality assurance pipeline to validate code syntax, TypeScript types, linter rules, unit test suites, and runtime health.
---

# Verify Skill

Every milestone and feature in Dayflow must pass the full verification checklist before being declared done.

## Automated Checks Pipeline

Run these commands in order:
```bash
npm run typecheck   # Validates all TypeScript types with tsc --noEmit
npm run lint        # Validates code style and rules with ESLint
npm test            # Runs the full Jest test suite
```

## Manual Verification Checklist
1. App boots without redbox or runtime warnings in Expo Go.
2. Layout renders properly in both Light and Dark themes.
3. Switch language to Arabic: verify RTL mirror, Arabic-Indic numerals, and translated strings.
4. Check responsiveness across different screen sizes.
