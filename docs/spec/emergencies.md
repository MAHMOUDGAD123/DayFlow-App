# Dayflow Specification: Emergencies Page

## Purpose
Allows users to create emergency override events that suspend regular daily tasks and notifications without altering the underlying profile templates.

## Configuration of an Emergency
- Title (mandatory), description (optional).
- Active scheduling: specific date or date range on a calendar, or optional repeating weekdays.
- Optional time range (`from` / `to`). If omitted, it alters the ENTIRE 24-hour day.
- Reminders: at least one reminder is mandatory for an emergency event.
- Enable/disable toggle.

## Suspension Rules
1. **Whole-Day Emergency:**
   - Suspends all tasks and todos on that date that lack the `Important` flag.
   - Suppresses their reminders and notifications.
   - Items with the `Important` flag remain completely active and schedule their notifications.
   - Timeline bar displays solid red across the 24 hours.

2. **Time-Ranged Emergency:**
   - Suspends only tasks overlapping the emergency time range (unless marked `Important`).
   - Suppresses todo reminders that fall inside the emergency range (unless marked `Important`).
   - Non-overlapping tasks and todos proceed as normal.
   - Timeline bar displays a red range segment for the emergency duration.
