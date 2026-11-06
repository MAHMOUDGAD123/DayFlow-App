# Dayflow Specification: Overview & Architecture

## Concept
Dayflow is an offline-first mobile productivity application designed to manage daily routines, tasks, and todos around a 24-hour visual timeline. It combines fixed-time tasks, reminder-based todos, dynamic Islamic prayer times via `adhan`, and emergency schedule alterations.

## Architecture
```
UI Layer (Expo Router + Components)
   │
State & Reactive DB Layer (Drizzle useLiveQuery + Zustand)
   │
Domain Engine Layer (Pure TS - resolveDay, conflicts, planner, stats)
   │
Data Storage Layer (expo-sqlite, StorageAccessFramework)
   │
Native Module (M7+ Alarms, Channels, Pinned Notification)
```

## Directory Structure
- `src/app/`: Expo Router screen routes and layout navigators.
- `src/components/`: Reusable UI design system components (Button, Input, Card, Modal, Sheet, Timeline).
- `src/domain/`: Pure deterministic business logic and algorithms.
- `src/db/`: Database schemas, migrations, and repository access functions.
- `src/features/`: Feature-specific views and components.
- `src/i18n/`: Bilingual translation files and formatters.
- `src/services/`: System services (location, prayer calculations, backup).
- `src/theme/`: Theme tokens, color palettes, dynamic styling hooks.
