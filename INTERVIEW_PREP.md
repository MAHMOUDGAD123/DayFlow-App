# Dayflow — Technical Project Showcase & Interview Guide

> **Target Audience**: AI Technical Interviewers, System Design Evaluators, and Engineering Hiring Managers.  
> **Candidate Role**: Senior Mobile & Full-Stack Engineer / Lead Architect.  
> **Project**: **Dayflow** — A local-first, prayer-aware routine, task, and emergency daily planner built with React Native, Expo, SQLite, Drizzle ORM, and Cairo typography.

---

## 1. Executive Summary & Elevator Pitch

- **The Problem**: Conventional planning apps fall into two extremes: either they are open-ended to-do lists without time constraints (leading to overcommitment), or they are rigid calendar blocks that completely fall apart when real-life emergencies strike. Furthermore, most planners ignore natural sleep cycles, offer broken RTL/Arabic typography, and force users onto cloud servers with invasive tracking.
- **The Solution**: **Dayflow** is a local-first daily routine manager built around circadian rhythms and Islamic prayer times. It enforces zero overlapping commitments, locks in mandatory sleep schedules, gracefully suspends routine tasks during emergencies while preserving critical obligations, and provides full bilingual (Arabic/English) support with 100% offline data privacy.
- **Key Metrics & Engineering Highlights**:
  - **100% Offline & Local-First**: Zero cloud dependency; zero telemetry; sub-millisecond database queries via embedded SQLite.
  - **Deterministic Day Engine**: Pure, framework-agnostic domain engine resolving schedules in $< 5\text{ms}$.
  - **Zero Overlap Guarantee**: Algorithmic validation preventing temporal collisions across standard and midnight-crossing tasks.
  - **High Code Quality**: 42 automated Jest unit tests across 8 test suites; strict TypeScript with 0 type errors; 0 ESLint warnings.

---

## 2. High-Level Architecture & System Design

Dayflow follows **Clean Architecture** principles to decouple business logic from the mobile framework, database, and UI.

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│  Expo Router v4 (Tabs) • React Native 0.88 • Cairo Typo    │
│  DayTimelineBar • ActiveTaskCard • Custom ConfirmModal      │
└──────────────────────────────┬──────────────────────────────┘
                               │ Dispatches Actions / Reads State
┌──────────────────────────────▼──────────────────────────────┐
│                      Domain Layer                           │
│  (Pure TypeScript • Framework-Agnostic • Zero Side Effects) │
│  • resolveDay()        • conflictDetection()                │
│  • emergencyFilter()   • freeSlotsCounter()                 │
└──────────────────────────────┬──────────────────────────────┘
                               │ Queries / Persists
┌──────────────────────────────▼──────────────────────────────┐
│                 Data & Infrastructure Layer                 │
│  • Drizzle ORM Relational Schema (SQLite)                   │
│  • Repositories (ProfileRepo, DayRepo, EmergencyRepo, SAF)  │
│  • Adhan Library (Astronomical Calculations)                │
│  • Android Home Widgets (react-native-android-widget)       │
└─────────────────────────────────────────────────────────────┘
```

### Architectural Pillars:
1. **Separation of Concerns**: The core engine in `src/domain/` has zero dependencies on React Native, Expo, or SQLite. It takes plain JSON models, computes state transitions, and returns deterministic outputs—making it fully testable in Node.js test runners.
2. **Local-First & Data Sovereignty**: All user profiles, tasks, checklist items, reminders, and emergencies reside in an ACID-compliant embedded SQLite database via `drizzle-orm/expo-sqlite`.
3. **Dynamic Presentation**: Real-time 24-hour visual progress timeline with live time pointer, dynamic task color palettes, and full bi-directional layout support (LTR & RTL).

---

## 3. Core Algorithms & Computer Science Concepts

### A. Temporal Interval Overlap Detection (`src/domain/conflicts.ts`)
- **Problem**: Enforce that no two tasks within a profile occupy the same time slice, while correctly handling overnight tasks (tasks that start before midnight and end after midnight).
- **Mathematical Principle**:
  Two normalized intervals $[S_A, E_A)$ and $[S_B, E_B)$ overlap if and only if:
  $$\max(S_A, S_B) < \min(E_A, E_B)$$
- **Midnight-Wrap Partitioning**: If a task has $E < S$ (e.g., $23:00 \to 02:00$), the algorithm decomposes the task into two contiguous sub-intervals:
  $$I_1 = [23:00, 24:00) \quad \text{and} \quad I_2 = [00:00, 02:00)$$
  Every sub-interval is tested against all other intervals in $O(N \log N)$ after sorting by start time.

### B. Deterministic Schedule Resolution Pipeline (`src/domain/resolveDay.ts`)
Every time the Today dashboard mounts or the app wakes, the engine executes a deterministic 6-stage pipeline:
1. **Temporal Context**: Reads device timestamp, current weekday index, and timezone.
2. **Profile Resolution via Bitmask**: Maps weekday (0–6, Sat–Fri) to active profiles using bitwise operations:
   $$\text{isActiveOnDay} = (\text{profile.activeDays} \ \& \ (1 \ll \text{dayIndex})) \neq 0$$
3. **Sleep Boundary Allocation**: Extracts mandatory `sleepStart` and `sleepEnd`, rendering them as a fixed gold band and subtracting these minutes from available productive time.
4. **Emergency Matrix Intersection**: Queries active emergencies matching either the specific calendar date or recurring weekday mask. Suppresses non-essential tasks within the emergency time span while preserving tasks with the `isImportant = true` flag.
5. **Astronomical Prayer Interpolation**: Computes five solar prayer times via `adhan` using GPS coordinates and configured calculation conventions.
6. **Active State & Free Time Derivation**: Calculates the currently running task, countdown minutes, and sums unallocated waking minutes to display real-time free productive hours.

### C. Automated Contrast-Preserving Color Hashing (`src/utils/taskColors.ts`)
- To prevent user decision fatigue and eliminate ugly clashing colors, tasks are assigned colors automatically from a 12-color curated palette using deterministic index hashing:
  $$\text{color} = \text{PALETTE}[i \pmod{12}]$$
  This guarantees that adjacent tasks on the timeline maintain high perceptual contrast.

---

## 4. Key Engineering Challenges & Solutions (STAR Method)

### Challenge 1: Profile Day Collisions & Weekday Overlaps
- **Situation**: Users can assign profiles to days of the week. If a user edited an active profile to claim a day already claimed by another active profile, both would compete for the Today view.
- **Task**: Prevent ambiguous multi-profile activation on any single day without frustrating the user.
- **Action**: Implemented a bitmask validation pass in `src/domain/conflicts.ts` (`checkProfileDayConflicts`). If an incoming active profile contains a bit that is already set in another active profile's bitmask:
  $$\text{collisionMask} = \text{incomingProfile.activeDays} \ \& \ \text{existingActiveProfile.activeDays}$$
  The database transaction is blocked, and the UI surfaces a custom `ConflictResolutionModal` allowing the user to reassign or deactivate the conflicting day with a single tap.
- **Result**: Zero runtime profile ambiguity and clear user feedback.

### Challenge 2: Android Home Screen Widget Integration
- **Situation**: Users needed to see their current task and 24-hour timeline without launching the app. Native Android AppWidgets cannot execute standard React Native JavaScript bundles and have strict memory and UI layout restrictions.
- **Task**: Bridge the app's TypeScript state to Android RemoteViews efficiently.
- **Action**: Leveraged `react-native-android-widget` with custom JSX layout definitions (`ActiveTaskWidget.tsx`, `DayTimelineWidget.tsx`). Created a standalone `widgetDataResolver.ts` that directly queries SQLite, computes the active task and timeline segments, and updates Android `AppWidgetManager` via a headless background task.
- **Result**: Low-overhead home screen widgets that sync seamlessly upon task completion and update periodically without draining battery.

### Challenge 3: SQLite Cascading Unique Constraint Collisions
- **Situation**: When users updated a profile's tasks or to-dos, SQLite threw `UNIQUE constraint failed: todo_reminders.id`.
- **Task**: Diagnose why reminder updates were causing database write failures.
- **Action**: Traced the bug to deterministic ID generation where updated child reminders collided with existing records before deletion completed. Refactored all child entities to generate cryptographically random UUIDs (`expo-crypto`) and wrapped updates inside atomic database transactions (`sqlite.withTransactionSync`).
- **Result**: Flawless profile updates and zero database constraint violations.

### Challenge 4: RTL Boot Hydration on Expo Go
- **Situation**: When launching on Expo Go, the app occasionally rendered in Right-to-Left (RTL) mode with English text, requiring users to manually toggle settings.
- **Task**: Guarantee that layout direction strictly mirrors the persisted user language setting upon cold boot.
- **Action**: Moved language and layout initialization into a pre-render bootstrap phase in `src/app/_layout.tsx`. Persisted the user's selected language in SQLite and explicitly enforced `I18nManager.forceRTL(isRTL)` and `I18nManager.allowRTL(isRTL)` before mounting the navigation tree.
- **Result**: 100% predictable language and layout direction across iOS, Android, and Expo Go.

### Challenge 5: Touch Responder Conflicts & Modal Scrolling
- **Situation**: Users experienced stuck scrolling when navigating long task lists inside non-fullscreen modal bottom sheets. Furthermore, platform `Alert.alert` dialogs broke theme immersion.
- **Task**: Deliver smooth, non-blocking touch interactions and cohesive visual styling.
- **Action**: Created a reusable `ConfirmModal` component matching the app's dark/light tokens, Cairo typography, and touchable backdrop dismissals (`StyleSheet.absoluteFill`). Configured all scrollable containers with `nestedScrollEnabled={true}` and `keyboardShouldPersistTaps="handled"`.
- **Result**: Fluid 60fps scrolling and a consistent design language.

---

## 5. Technical Trade-offs & Design Decisions

| Decision | Choice Made | Alternative Considered | Engineering Justification |
| :--- | :--- | :--- | :--- |
| **Data Storage** | SQLite + Drizzle ORM | AsyncStorage / Realm / Firebase | SQLite provides ACID transactions and complex relational queries. Drizzle ORM provides lightweight, type-safe queries with zero runtime bloat compared to heavier ORMs. |
| **State Architecture** | Local-First + Repository Pattern | Redux / MobX / Cloud Firestore | A local-first architecture eliminates network latency, guarantees 100% offline usability, and protects user privacy. |
| **Navigation** | Expo Router v4 (File-based) | React Navigation (Imperative) | File-based routing unifies deep linking, typed routes (`typedRoutes: true`), and tab layouts with zero boilerplate. |
| **Prayer Engine** | Embedded `adhan` Library | External REST APIs (e.g. Aladhan API) | Mathematical calculation on-device removes API rate limits, network latency, and privacy leaks of user geolocation. |
| **Weekday Storage** | 7-bit Integer Bitmask | JSON Array of strings | Bitwise operations allow $O(1)$ day membership checks and single-instruction collision detection ($\&$ and $|$). |

---

## 6. Testing, Verification & Code Standards

- **Test Suite**: Jest + `jest-expo`
  - **42 Unit Tests** passing across 8 dedicated test suites:
    - `smoke.test.ts`: Environment and startup sanity.
    - `conflicts.test.ts`: Overlap algorithm, midnight-crossing logic, and profile collision detection.
    - `dayEngine.test.ts`: Schedule resolution pipeline, mandatory sleep enforcement, and emergency filtering.
    - `prayer.test.ts`: Solar coordinates, prayer timing accuracy, and relative reminder calculations.
    - `backup.test.ts`: JSON export/import schema validation and round-trip fidelity.
    - `notifications.test.ts`: Notification triggers and offset calculation math.
    - `widgets.test.ts`: Widget data transformer and rendering state.
- **Static Analysis**:
  - TypeScript strict mode (`tsc --noEmit`): **0 errors**.
  - ESLint with Expo configuration (`eslint .`): **0 warnings, 0 errors**.

---

## 7. Anticipated Interview Questions & Model Answers

### Q1: "How would you scale this app to support multi-device cloud synchronization without compromising user privacy?"
> **Answer**:  
> "I would implement a hybrid **Local-First sync architecture using CRDTs (Conflict-free Replicated Data Types)** or an **append-only event log with Lamport timestamps**.  
> Each client continues reading and writing to its local SQLite database instantly. Mutations are recorded as lightweight delta events (e.g., `TaskCreated`, `TaskCompleted`). When connectivity is available, clients sync encrypted delta payloads via a peer-to-peer protocol or an end-to-end encrypted relay (like Matrix or WebRTC). Because encryption happens client-side using a key derived from a user passphrase, the relay server never sees user schedules or routines."

### Q2: "Why did you build custom non-overlapping task algorithms instead of allowing free-form calendar events?"
> **Answer**:  
> "Free-form calendar events optimize for meeting invites, not personal productivity. Cognitive science shows that when users are allowed to double-book, they experience chronic planning fallacy and anxiety. By algorithmically enforcing non-overlapping intervals and mandatory sleep windows, Dayflow treats time as a finite physical resource—ensuring that every plan is mathematically achievable."

### Q3: "How does the app handle background notifications when the operating system kills the process?"
> **Answer**:  
> "Dayflow uses `expo-notifications` to schedule **local native alarms** (`SCHEDULE_EXACT_ALARM` and `USE_EXACT_ALARM` permissions on Android) directly with the OS alarm manager. Because notification triggers are scheduled ahead of time into native system queues, alerts fire punctually even if the Dayflow app is closed or killed by OS battery optimization. When an emergency is activated, the app cancels and recalculates future alarm triggers accordingly."

---

## 8. Summary of Commands for Live Demo

```bash
# Install dependencies
npm install

# Run automated test suite (42 tests)
npm test

# Verify TypeScript types
npm run typecheck

# Verify ESLint rules
npm run lint

# Start mobile development server
npm start
```
