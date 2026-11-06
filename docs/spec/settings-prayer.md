# Dayflow Specification: Settings & Prayer Times

## Purpose
System configuration, notifications, geolocation, prayer time engine, themes, and language preferences.

## Features

1. **Location & Islamic Prayer Times:**
   - One-tap "Detect Location" button queries device GPS (`expo-location`) and reverse geocodes city, country, latitude, and longitude.
   - Automatically re-checks location on application launch.
   - Offline calculation of prayer times using `adhan` library (Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha).
   - Calculation method auto-selection based on country (e.g. Umm al-Qura for KSA, Egyptian General Authority for Egypt, ISNA for North America, Karachi, etc.).
   - User adjustments: fine-tune minutes (+/- offset) per prayer time.
   - Smart Time Picker: Prayer times appear as quick-selection chips ONLY when coordinates are known. Choosing a prayer time resolves to the fixed clock minute for the day.

2. **Language & Formatting:**
   - Language selector: English / العربية.
   - Switching language changes layout direction (LTR / RTL) and triggers immediate UI re-render.
   - Arabic mode renders all numerals as Arabic-Indic (`٠١٢٣٤٥٦٧٨٩`).
   - Time format setting: 12-hour (AM/PM) vs 24-hour.

3. **Theming & Color Palette:**
   - Dark / Light / System mode.
   - Custom accent color picker: supports predefined color names (e.g. `orangered`, `royalblue`) or custom hex (`#5fd8a6`).
   - Automatic contrast validation against background colors for WCAG AA compliance.

4. **Notifications & Sounds:**
   - Toggles for tasks, todos, emergencies, and pinned ongoing notification.
   - Default bundled sounds or custom sound imported from local storage.
