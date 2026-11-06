---
name: day-engine
description: Rules and architectural constraints for Dayflow's pure domain scheduling engine, conflict detection, emergency handling, and test requirements.
---

# Day Engine Skill

The Dayflow Day Engine (`src/domain/`) is the deterministic, mathematical heart of the app. It calculates daily task allocations, conflicts, emergency alterations, and timeline state.

## Core Rules

1. **Zero UI / Platform Dependencies:**
   - Files in `src/domain/` MUST NOT import `react`, `react-native`, or Expo APIs.
   - Everything must be pure TypeScript functions taking plain objects and returning plain objects.

2. **Time Representation:**
   - Minute integer representation: `0..1439` (minutes since local midnight).
   - Tasks crossing midnight (e.g. `23:00 -> 06:00` where end < start):
     - Segment 1: `[start, 1440)` on Day N
     - Segment 2: `[0, end)` on Day N+1 (spillover)

3. **Conflict Detection Rules:**
   - **Strict Profile Rule:** Each weekday belongs to at most ONE active/enabled profile. If activating a profile causes a weekday conflict, the conflict resolver modal must be triggered.
   - **Internal Task Rule:** Tasks within the same profile cannot overlap.
   - **Spillover Rule:** Spillover segment from Day N-1 must not overlap Day N tasks.

4. **Emergency Suppression Rules:**
   - Whole-day emergency: all tasks & todos WITHOUT `flags.important = true` are suspended.
   - Time-ranged emergency: any non-important task whose `[start, end)` overlaps the emergency range is suspended. Todos inside the range have reminders suppressed.
   - Items with `flags.important = true` NEVER get suspended.

5. **Mandatory Testing:**
   - Every function in `src/domain/` must have corresponding test coverage in `src/domain/__tests__/`.
