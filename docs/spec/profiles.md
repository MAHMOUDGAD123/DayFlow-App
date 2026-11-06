# Dayflow Specification: Profiles Page

## Purpose
Allows users to create, customize, and manage unlimited productivity profiles representing recurring weekly day schedules.

## Structure of a Profile
- Mandatory title, optional description.
- Active weekdays checkbox list (`Sat`, `Sun`, `Mon`, `Tue`, `Wed`, `Thu`, `Fri`).
- Strict conflict rule: A weekday can only be active in ONE enabled profile at a time.
- Tasks list:
  - Title, optional description.
  - Time range: `from` to `to` using the Smart Time Picker (supports prayer times & custom clock picker).
  - Midnight crossing: tasks can cross midnight (e.g. `23:00 -> 06:00`).
  - Category (Studying, Work, Reading, etc.).
  - Distinct task color (auto-picked so adjacent tasks contrast, user-editable).
  - Flags: `Important` (persists through emergencies), `Focus` (triggers DND).
  - Reminders: default notification at start of range, optional lead times.
- Todos list:
  - Title, optional description, category, `Important` flag.
  - Reminders list: one or more reminder timestamps throughout the day.

## Drafts (Gmail-style)
- Any unsaved profile edits or new profiles are automatically saved to `drafts` table.
- A draft banner/card appears with "Resume Draft" or "Discard".

## Conflict Resolution Modal
- When user enables a profile that shares a weekday with another active profile:
  - System presents a comparison timeline showing overlapping days.
  - User can choose: "Edit Days of Profile A", "Edit Days of Profile B", or "Deactivate conflicting profile".
