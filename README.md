<p align="center">
  <img src="./app-banner.jpg" alt="Dayflow Banner" width="100%" />
</p>

<p align="center">
  <img src="./assets/logo.svg" alt="Dayflow Logo" width="110" />
</p>

<h1 align="center">Dayflow</h1>

<p align="center">
  <strong>A calm, simple daily planner that respects your sleep, adapts when life happens, and keeps your data completely private.</strong><br />
  Built with React Native, Expo, SQLite, Drizzle ORM, and Cairo typography.
</p>

---

## Table of Contents

- [What is Dayflow?](#what-is-dayflow)
- [Why We Built Dayflow](#why-we-built-dayflow)
- [Key Features Explained Simply](#key-features-explained-simply)
  - [1. Today Screen: Your Daily Dashboard](#1-today-screen-your-daily-dashboard)
  - [2. Profiles: Set Up Your Weekly Routine](#2-profiles-set-up-your-weekly-routine)
  - [3. Emergency Mode: When Life Gets in the Way](#3-emergency-mode-when-life-gets-in-the-way)
  - [4. Prayer Times and Smart Reminders](#4-prayer-times-and-smart-reminders)
  - [5. Full Arabic and English Support](#5-full-arabic-and-english-support)
  - [6. Clean Design and Helpful Popups](#6-clean-design-and-helpful-popups)
  - [7. Android Home Screen Widgets](#7-android-home-screen-widgets)
  - [8. Completely Offline and Private](#8-completely-offline-and-private)
- [How It Works Behind the Scenes](#how-it-works-behind-the-scenes)
  - [How Dayflow Builds Your Day](#how-dayflow-builds-your-day)
  - [How We Stop Tasks from Overlapping](#how-we-stop-tasks-from-overlapping)
  - [How Emergencies Handle Your Tasks](#how-emergencies-handle-your-tasks)
  - [The Local Database](#the-local-database)
- [Challenges We Faced and How We Solved Them](#challenges-we-faced-and-how-we-solved-them)
  - [1. Stopping Day Collisions Between Profiles](#1-stopping-day-collisions-between-profiles)
  - [2. Preventing Overlapping Tasks Inside a Profile](#2-preventing-overlapping-tasks-inside-a-profile)
  - [3. Protecting Sleep as a Required Schedule](#3-protecting-sleep-as-a-required-schedule)
  - [4. Building Android Home Screen Widgets](#4-building-android-home-screen-widgets)
  - [5. Fixing Database Unique Constraint Errors](#5-fixing-database-unique-constraint-errors)
  - [6. Getting Right-to-Left (RTL) Layout Right on Startup](#6-getting-right-to-left-rtl-layout-right-on-startup)
  - [7. Fixing Stuck Scrolling and Friendly Dismissals in Modals](#7-fixing-stuck-scrolling-and-friendly-dismissals-in-modals)
- [Project Folders and Files](#project-folders-and-files)
- [Tech Stack](#tech-stack)
- [Getting Started and Setup](#getting-started-and-setup)
- [Testing](#testing)
- [License](#license)

---

## What is Dayflow?

Dayflow is a daily routine planner for mobile phones and the web. It helps you organize your waking hours, make sure you get enough sleep, keep track of daily prayers, and stay on top of your tasks.

Unlike most calendar apps that expect every day to go perfectly, Dayflow is built for the real world. When something unexpected happens, you can easily pause your regular routine without losing your setup.

---

## Why We Built Dayflow

Most planning apps fail because of two extremes:
1. **The endless to-do list**: You write down twenty things to do. By evening, you only finished four. You feel like you failed, even though you simply ran out of hours in the day.
2. **The rigid calendar**: You schedule every single hour. Then life happens—you wake up sick, a meeting runs late, or there is traffic. Suddenly your whole calendar is broken and you have to reschedule everything one by one.

Dayflow takes a much calmer, more realistic approach:
- **Sleep comes first**: Before you schedule work, your sleep hours are locked in.
- **No double-booking**: The app never lets you schedule two tasks at the same time.
- **Emergency friendly**: If an emergency comes up, you can pause your normal tasks with one tap. Your important obligations stay on screen, and your regular routine comes back as soon as the emergency is over.
- **Prayer aware**: If you pray, daily prayer times are calculated right on your timeline, and you can set reminders around them.
- **Private and local**: There is no login, no account, no tracking, and no cloud server. Everything stays on your phone.

---

## Key Features Explained Simply

### 1. Today Screen: Your Daily Dashboard

The Today screen is your home base throughout the day:

- **24-Hour Visual Timeline**: A clean horizontal bar showing the full day from midnight to midnight. Tasks show up in their assigned colors, sleep is shown in yellow, and prayer times are marked clearly. A red pointer moves across the bar to show the current time.
- **Color Legend**: Right under the timeline, you will see a list showing which color belongs to which task.
- **Active Task Card**: Shows the task you should be working on right now, with start and end times, how many minutes are left, and quick access to its subtasks checklist.
- **Free Time Counter**: Shows you how many free waking hours you have left today so you know if you have time for extra work.
- **Foldable Tasks List**: Lets you fold or unfold your tasks to keep the screen neat. You can check off checklist items, and your progress saves immediately.
- **Foldable To-Dos List**: Keeps your to-do items organized. Checkboxes only toggle when tapped directly, so you never accidentally check something off while scrolling.
- **Today-Only Quick Items**: Need to write down something that only matters today? Add an ad-hoc to-do directly from the Today screen. You can edit it inline, set a reminder, or mark it as important without touching your saved weekly routines.

---

### 2. Profiles: Set Up Your Weekly Routine

Instead of planning every day from scratch, you create reusable templates called **Profiles** (for example: *Workday*, *Weekend*, or *Study Day*):

- **Assign Days of the Week**: Link each profile to specific days (Saturday through Friday). The app makes sure you never accidentally assign two active profiles to the same day.
- **Mandatory Sleep Window**: Every profile requires you to set sleep hours (like 11:00 PM to 7:00 AM). Sleep shows up as a warm yellow block on your timeline.
- **No Overlapping Tasks**: Tasks inside a profile cannot overlap. If you have a task from 9:00 AM to 11:00 AM, the app will not let you create another task starting at 10:00 AM.
- **Automatic Smart Colors**: You never have to manually pick colors. The app picks distinct colors automatically from a carefully chosen 12-color palette so your timeline is always easy to read.
- **Subtasks and Reminders**: Add smaller steps to your tasks and set reminders that go off at a set time or relative to prayer times.

---

### 3. Emergency Mode: When Life Gets in the Way

When life throws a curveball—like catching the flu, taking care of a family member, or unexpected travel—Emergency Mode steps in:

- **Pick a Date or Repeating Day**: Set an emergency for a specific date (like next Tuesday) or repeating weekdays (like every Monday afternoon).
- **Full Day or a Few Hours**: Pause the entire 24-hour day or just a specific time window.
- **Keeps Important Tasks Safe**: Regular tasks scheduled during the emergency are hidden so your screen stays calm. However, tasks marked with a star (**Important**) stay visible, so you never forget crucial things like medications or essential check-ins.
- **Fully Reversible**: When the emergency ends, your regular schedule comes right back. Nothing was erased or broken.

---

### 4. Prayer Times and Smart Reminders

For users who schedule their day around the 5 daily Muslim prayers, Dayflow has prayer calculations built right in:

- **Accurate Astronomical Times**: Calculates **Fajr**, **Dhuhr**, **Asr**, **Maghrib**, and **Isha** based on your GPS or custom city coordinates using the trusted Adhan engine.
- **Multiple Calculation Methods**: Supports Egyptian Survey, Muslim World League, Umm Al-Qura, ISNA, Karachi, and Gulf regions.
- **Prayer-Relative Reminders**: Set reminders that trigger relative to prayer times (for example, *15 minutes before Fajr* or *10 minutes after Maghrib*). Because prayer times shift a little each day, Dayflow recalculates the reminder times automatically.

---

### 5. Full Arabic and English Support

Dayflow was built from day one to work comfortably in both Arabic and English:

- **True Right-to-Left (RTL)**: Switching to Arabic flips the entire layout naturally—menus, cards, buttons, and animations all follow natural Arabic reading direction.
- **Arabic Numbers**: When Arabic is active, all times and counters display in clean Arabic-Indic numbers (`٠١٢٣٤٥٦٧٨٩`).
- **Cairo Font Family**: Uses the popular Cairo font for both Arabic and English, making the text crisp, modern, and pleasant to read.

---

### 6. Clean Design and Helpful Popups

- **Custom Confirmation Boxes**: When you delete a profile, task, to-do, or emergency, a clean card asks if you are sure. There are no harsh system alert dialogs.
- **Tap Outside to Close**: Any popup card can be closed simply by tapping the darkened area outside it.
- **Smooth Scrolling**: You will never get stuck trying to scroll through a long list of tasks or inside a popup window.

---

### 7. Android Home Screen Widgets

You do not even have to open the app to see what is next:

- **Active Task Widget**: Shows the current task, how much time is left, and what is coming up next right on your phone's home screen.
- **Day Timeline Widget**: Displays a mini 24-hour progress bar on your home screen.

---

### 8. Completely Offline and Private

- **Everything Stays on Your Device**: Your tasks, schedules, and settings are saved locally in a fast SQLite database.
- **Easy Backups**: Export your entire setup into a single `.json` file anytime. You can send it to your email or save it to your phone's files, and restore it on any other phone whenever you want.

---

## How It Works Behind the Scenes

### How Dayflow Builds Your Day

Every time you open the Today screen, Dayflow follows this simple step-by-step process:

1. **Checks the Day and Time**: Identifies the current weekday and time of day.
2. **Finds the Active Profile**: Looks up the profile assigned to today.
3. **Puts Down the Sleep Bar**: Adds your mandatory sleep window to the timeline in yellow.
4. **Checks for Active Emergencies**: If an emergency is running, regular tasks in that window are paused, while tasks marked as Important stay on the schedule.
5. **Calculates Prayer Times**: Calculates the 5 prayer times for your location and marks them on the timeline.
6. **Finds the Current Task and Free Time**: Identifies what you should be doing right now, calculates your remaining unbooked hours, and displays your daily timeline.

---

### How We Stop Tasks from Overlapping

To make sure your schedule stays realistic, Dayflow prevents you from booking two tasks at the same time:

- When you add or edit a task, the app checks if its start time comes before another task ends and its end time comes after that task starts.
- If a task crosses midnight (for example, starting at 11:00 PM and ending at 1:00 AM), the app handles the overnight jump cleanly.
- If there is a clash, the app warns you right away and tells you the name and time of the conflicting task so you can adjust it easily.

---

### How Emergencies Handle Your Tasks

| Item | During Normal Hours | During an Emergency |
| :--- | :--- | :--- |
| **Normal Task** | Appears on the schedule | Paused and hidden |
| **Important Task (★)** | Appears on the schedule | **Stays active and visible** |
| **Sleep Time** | Always active (yellow band) | Always active (rest is protected) |
| **Prayer Times** | Visible on timeline | Visible on timeline |

---

### The Local Database

Dayflow uses an embedded SQLite database managed with Drizzle ORM. Here are the main tables:

- `profiles`: Stores name, active days of the week, sleep start and end times, and active toggle.
- `tasks`: Tasks belonging to a profile with start time, end time, assigned color, category, and importance.
- `task_subtasks`: Checklist steps inside each task.
- `task_reminders`: Reminder settings (fixed time or prayer-relative).
- `todos`: To-dos belonging to a profile with category and completion status.
- `todo_reminders`: Reminder settings for to-dos.
- `today_adhoc_items`: Quick to-dos added directly on the Today screen.
- `emergencies`: Override dates, times, and descriptions.
- `settings`: Language, theme, prayer calculation method, and location coordinates.

---

## Challenges We Faced and How We Solved Them

Building an offline-first app that handles time math, native mobile widgets, and dynamic schedule overrides came with several interesting technical challenges. Here is how we tackled them:

### 1. Stopping Day Collisions Between Profiles

- **The Problem**: Each profile can be assigned to multiple days of the week. At first, it was possible for a user to edit an active profile and assign a day that was already being used by another active profile. This caused confusion about which profile should show up on that day.
- **The Solution**: We created a day collision checker using a 7-day bitmask (from Saturday to Friday). Whenever you try to activate or edit a profile, the app checks if any of the selected days are already claimed by another active profile. If there is a clash, the app stops the save, highlights the exact day that is conflicting, and opens a friendly Conflict Resolution dialog where you can switch days with one click.

### 2. Preventing Overlapping Tasks Inside a Profile

- **The Problem**: A daily routine only works if it is realistic. If users could accidentally schedule two tasks at the same time (for example, gym from 9:00 AM to 11:00 AM and a meeting from 10:00 AM to 12:00 PM), the timeline would glitch and the free time counter would become inaccurate. Handling tasks that crossed midnight made this even trickier.
- **The Solution**: We built an interval overlap algorithm in our domain logic. Whenever a task is saved, it is compared against all existing tasks in that profile. If an overlap is found, the app prevents saving and shows a clear message naming the conflicting task and its time window. For overnight tasks, the engine splits the span across the midnight line (00:00) so calculations stay exact.

### 3. Protecting Sleep as a Required Schedule

- **The Problem**: In many planners, sleep is either ignored or treated like any other optional task. This led to users accidentally scheduling tasks in the middle of the night, leaving the timeline without a realistic picture of waking hours.
- **The Solution**: We made sleep a mandatory configuration in every profile. You cannot save a profile without specifying when you sleep and wake up. Sleep is rendered on both the profile editor and the Today screen as a distinct gold/yellow band. It is never hidden—even during an emergency, your sleep schedule remains protected.

### 4. Building Android Home Screen Widgets

- **The Problem**: Android home screen widgets do not run standard React Native views. They have strict UI limitations, cannot easily read active state directly from React contexts, and need to update efficiently without draining the device's battery.
- **The Solution**: Using `react-native-android-widget`, we designed dedicated native layouts for both the Active Task widget and the 24-Hour Timeline widget. We created a standalone data resolver that queries the local SQLite database directly, transforms the current schedule into widget friendly data, and syncs automatically whenever the user updates their tasks or on a periodic background schedule.

### 5. Fixing Database Unique Constraint Errors

- **The Problem**: When editing a profile, existing reminders were being updated by deleting and re-inserting them. Because reminder IDs were previously generated using predictable keys, SQLite threw a `UNIQUE constraint failed: todo_reminders.id` error, which prevented users from saving changes.
- **The Solution**: We updated the repository to generate fresh, unique UUIDs for every new reminder entry and cleaned up related records properly inside database transactions. This eliminated the unique constraint collisions entirely.

### 6. Getting Right-to-Left (RTL) Layout Right on Startup

- **The Problem**: On Expo Go, the app occasionally opened in RTL mode even when English was selected, because the phone's system language was overriding the stored app preference during boot.
- **The Solution**: We updated the root app initialization in `_layout.tsx` to read the user's saved language preference from the database before the first screen renders, explicitly applying the correct text direction and layout mirroring so the language always matches what the user chose.

### 7. Fixing Stuck Scrolling and Friendly Dismissals in Modals

- **The Problem**: When opening popups and modals with long lists, users found that their touch would get stuck on certain elements, making it frustrating to scroll. Also, standard system alerts (`Alert.alert`) looked harsh and could not be closed by tapping outside.
- **The Solution**: We replaced native alerts with a custom, beautifully styled `ConfirmModal` that matches the app's dark and light themes, uses the Cairo font, and closes smoothly whenever you tap outside the card. We also added `nestedScrollEnabled` and keyboard-safe touch handling so scrolling feels natural on any mobile screen.

---

## Project Folders and Files

Here is how the project is organized:

```
dayflow/
├── app-banner.jpg                         # Official hero banner
├── assets/
│   ├── favicon.png                        # App launch icon and web favicon
│   ├── logo.svg                           # Official vector logo
│   └── images/                            # Image assets
├── src/
│   ├── app/                               # Screen routes (Expo Router)
│   │   ├── (tabs)/
│   │   │   ├── today.tsx                  # Today dashboard, 24h timeline, active task
│   │   │   ├── profiles.tsx               # Weekly profile management
│   │   │   ├── emergencies.tsx            # Emergency mode overrides
│   │   │   ├── settings.tsx               # Settings, prayers, backup, theme, language
│   │   │   └── _layout.tsx                # Bottom navigation bar
│   │   ├── _layout.tsx                    # Root app setup and providers
│   │   └── index.tsx                      # App entry point
│   ├── components/
│   │   ├── common/                        # Reusable buttons, cards, text, badges
│   │   │   ├── AppLogo.tsx                # Official vector logo component
│   │   │   ├── AppText.tsx                # Cairo text wrapper
│   │   │   ├── AppTextInput.tsx           # Cairo input wrapper
│   │   │   ├── Button.tsx                 # Styled buttons
│   │   │   ├── Card.tsx                   # Surface cards
│   │   │   ├── Badge.tsx                  # Status badges
│   │   │   └── ConfirmModal.tsx           # Custom themed confirmation dialog
│   │   ├── time/
│   │   │   └── SmartTimePicker.tsx        # Time picker dialog
│   │   └── timeline/
│   │       └── DayTimelineBar.tsx         # 24-hour visual progress timeline
│   ├── db/
│   │   ├── client.ts                      # SQLite and Drizzle connection
│   │   ├── schema.ts                      # Table definitions
│   │   ├── init.ts                        # Database setup and migrations
│   │   └── repositories/                  # Data access functions
│   │       ├── dayRepo.ts                 # Today items queries
│   │       ├── profileRepo.ts             # Profile, task, and to-do operations
│   │       ├── emergencyRepo.ts           # Emergency operations
│   │       ├── backupRepo.ts              # Backup dump and restore
│   │       └── settingsRepo.ts            # Saved settings
│   ├── domain/                            # Core planning logic
│   │   ├── resolveDay.ts                  # Daily schedule resolution engine
│   │   ├── conflicts.ts                   # Overlap and collision checks
│   │   ├── emergencies.ts                 # Emergency schedule math
│   │   ├── freeSlots.ts                   # Free waking hours counter
│   │   ├── time.ts                        # Time math and bitmask helpers
│   │   ├── types.ts                       # Shared TypeScript models
│   │   └── __tests__/                     # Automated test suites
│   ├── features/                          # Screen-specific modals and sections
│   │   ├── today/                         # Today modals and subtasks list
│   │   ├── profiles/                      # Profile, task, and to-do editors
│   │   ├── emergencies/                   # Emergency editor modal
│   │   ├── backup/                        # Backup and restore dialogs
│   │   ├── notifications/                 # Notification settings
│   │   ├── onboarding/                    # Welcome walkthrough
│   │   └── widgets/                       # Home screen widget previews
│   ├── i18n/                              # Translations and RTL helpers
│   │   ├── i18n.ts                        # Translation setup
│   │   ├── formatters.ts                  # Arabic-Indic number formatters
│   │   └── locales/                       # Arabic (ar.json) and English (en.json)
│   ├── services/                          # Device services
│   │   ├── backup/                        # JSON export and import
│   │   ├── notifications/                 # Local reminder notifications
│   │   ├── prayer.ts                      # Prayer calculation service
│   │   └── location.ts                    # GPS location service
│   ├── theme/                             # Styling
│   │   ├── colors.ts                      # Color palettes
│   │   ├── fonts.ts                       # Cairo font constants
│   │   └── ThemeContext.tsx               # Theme and direction provider
│   ├── utils/                             # Small helper tools
│   │   ├── taskColors.ts                  # Automatic 12-color palette generator
│   │   ├── time.ts                        # Time formatting helpers
│   │   └── crypto.ts                      # Unique ID generators
│   └── widgets/                           # Android home screen widgets
├── package.json
├── tsconfig.json
└── jest.config.js
```

---

## Tech Stack

| Area | Tool | Why We Use It |
| :--- | :--- | :--- |
| **Framework** | [React Native 0.88](https://reactnative.dev/), [Expo SDK 52](https://expo.dev/) | Cross-platform mobile development with modern React. |
| **Navigation** | [Expo Router v4](https://docs.expo.dev/router/introduction/) | Simple, file-based routing. |
| **Database** | [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/), [Drizzle ORM](https://orm.drizzle.team/) | Fast, local-first database with type-safe queries. |
| **Typography** | [Cairo](https://fonts.google.com/specimen/Cairo) (`@expo-google-fonts/cairo`) | Beautiful, modern font for both Arabic and Latin text. |
| **Prayers** | [Adhan](https://github.com/batoulapps/adhan-js) | Accurate astronomical prayer calculations. |
| **Languages** | [i18next](https://www.i18next.com/), [react-i18next](https://react.i18next.com/) | Instant Arabic and English translation and RTL switching. |
| **Widgets** | [react-native-android-widget](https://github.com/okwasniewski/react-native-android-widget) | Native home screen widgets on Android. |
| **Testing** | [Jest](https://jestjs.io/), [jest-expo](https://docs.expo.dev/develop/unit-testing/) | Automated testing for domain logic, schedule resolution, and time math. |

---

## Getting Started and Setup

### What You Need

- **Node.js**: Version 18 or newer
- **npm** or **yarn**
- The **Expo Go** app on your iOS or Android phone, or a simulator.

### Setup Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MAHMOUDGAD123/DayFlow-App.git
   cd dayflow
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

### Running the App

```bash
# Start the development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run in a web browser
npm run web
```

- **Open on your phone**: Scan the QR code shown in the terminal using the Expo Go app on Android or the Camera app on iOS.
- **Switch Language or Theme**: Open the **Settings** tab in the app to switch between English and Arabic, or toggle Dark and Light mode.

---

## Testing

Dayflow has an automated unit test suite covering schedule calculations, overlap detection, emergency filters, and backups.

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Check for TypeScript errors
npm run typecheck

# Check code formatting with ESLint
npm run lint
```

### What the Tests Check

- `smoke.test.ts`: Verifies basic setup.
- `conflicts.test.ts`: Verifies that task overlaps and profile day collisions are caught correctly.
- `dayEngine.test.ts`: Tests schedule building, mandatory sleep time, and emergency filtering.
- `prayer.test.ts`: Tests prayer calculation accuracy and relative reminder timing.
- `backup.test.ts`: Ensures database export and import work without losing data.
- `notifications.test.ts`: Tests notification math and offsets.
- `widgets.test.ts`: Tests widget data transforms.

---

## License

This project is licensed under the [MIT License](LICENSE).
