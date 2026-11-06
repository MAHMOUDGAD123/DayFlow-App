---
name: i18n-rtl
description: Guidelines for localization, bilingual English/Arabic translations, Arabic-Indic numerals, and RTL flexbox styling in Dayflow.
---

# i18n & RTL Skill

Dayflow fully supports English (LTR) and Arabic (RTL).

## Cardinal Translation Guidelines

1. **Dual Translation:**
   - Every user-visible string must be placed in both:
     - `src/i18n/locales/en.json`
     - `src/i18n/locales/ar.json`
   - Use `useTranslation()` from `react-i18next`.

2. **Arabic-Indic Numerals:**
   - When language is Arabic (`ar`), all displayed numbers, times, percentages, and dates must be rendered in Arabic-Indic numerals (`٠١٢٣٤٥٦٧٨٩`).
   - Use a helper function `formatNumber(n, locale)` or custom date/time formatters from `src/i18n/formatters.ts`.

3. **Logical Layout & RTL Styling:**
   - Use logical properties in `StyleSheet`:
     - `marginStart` / `marginEnd` (NOT `marginLeft` / `marginRight`)
     - `paddingStart` / `paddingEnd` (NOT `paddingLeft` / `paddingRight`)
     - `alignItems: 'flex-start'` respects layout direction.
   - For icons with direction (arrows, back buttons), mirror them conditionally when `I18nManager.isRTL` is true (`transform: [{ scaleX: isRTL ? -1 : 1 }]`).
   - Timelines start from 00:00 on the left in English, and 00:00 on the right in Arabic.
