# Dayflow Specification: Calendar & Insights Page

## Segment 1: Calendar History
- Month-year calendar view with month and year pickers.
- Indicators on past dates showing task completion rate dots, emergency markers (red dot).
- Tapping any date opens a read-only Day Preview modal that renders the full visual timeline, agenda, subtasks, and completion states as they existed on that date.
- Historical days are frozen snapshots via `ensureHistory()`. Editing profiles in the present never retroactively distorts past history.

## Segment 2: Insights (Statistics)
- Segmented toggle at the top of the page (`Calendar` | `Insights`).
- Metrics:
  - Daily, weekly, and monthly completion percentage trends.
  - Category breakdown: hours spent per category (e.g. Work vs Study vs Health).
  - Productivity streak counters.
  - Most frequently skipped tasks.
