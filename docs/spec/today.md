# Dayflow Specification: Today (Preview) Page

## Purpose
The Today page is the primary dashboard where users inspect their daily timeline, manage tasks, mark todos, and review free time throughout the 24 hours.

## Key Elements & Behaviors

1. **Header:**
   - Gregorian date and Hijri date.
   - Active profile badge.
   - Circular daily progress indicator (% completed of active tasks + todos).

2. **24-Hour Timeline Bar:**
   - Full horizontal 24h day representation (00:00 to 24:00).
   - Distinct auto-allocated colors for each active task range.
   - Red visual bands representing active emergency time ranges.
   - Unoccupied intervals rendered as neutral "Free Time" slots.
   - Live "Current Time" pointer positioned accurately (12:00 PM is exactly center) updating every minute.
   - Timeline mirrors horizontally in RTL (Arabic).

3. **Agenda & Activity Cards:**
   - Cards display only the title and time range in the main list.
   - Interstitial cards indicating free time (e.g. `Free Time: 13:00 - 14:30`).
   - Cards indicate status: upcoming, in-progress, completed, skipped, or suspended by emergency.
   - Small tasks (sub-tasks) can be added under each task for the current day only (stored in daily state, never mutating the base profile).
   - Tap on any card opens a centered Details Pop-up Modal.

4. **Details Pop-up Modal:**
   - Displays full task/todo description, category, flags, and reminder times.
   - Contains an **Edit** button: redirects directly to the Profile Page to edit the exact task/todo.
   - Changes made in Profile Page immediately reflect on Today upon saving.

5. **Todos Section:**
   - List with checkboxes. Checking an item animates it into a collapsible "Completed" section.
   - Unchecking restores it to the active list.
   - Checking a todo cancels its remaining scheduled alarms for today.

6. **Ad-hoc Items:**
   - Quick "+" button to add a one-off task or todo for today only.
