# Dayflow Specification: Persistent Local Backup & Import/Export

## Overview
Dayflow stores user routines, tasks, and history offline. To protect against app uninstall or data loss, Dayflow implements a persistent local backup folder using Android Storage Access Framework (SAF).

## Folder & Storage Mechanics
- Designated directory: `Documents/dayflow_backup/`.
- Access granted via Android SAF directory picker during onboarding (or Settings).
- The returned URI permission is persisted (`takePersistableUriPermission`).
- The directory survives application uninstallation because it resides in shared `Documents/`.

## Auto-Backup Execution
- **Debounced Writing:** Data changes trigger an auto-backup after 3 seconds of inactivity, or immediately when the app transitions to the background.
- **Atomic File Writing:** Write to temporary file `dayflow_backup.tmp` -> verify sha256 checksum -> atomically replace `dayflow_backup.json`.
- **Daily Snapshot Rotation:** First backup of each day copies to `snapshots/YYYY-MM-DD.json`. Keeps the last 7 daily snapshots.
- **Custom Sounds Storage:** User-picked audio files are copied into `dayflow_backup/sounds/`.

## Reinstallation & Restoration
- On a fresh install (empty DB), Dayflow displays a prompt: "Restore from your backup folder?".
- User selects the folder once via SAF picker.
- Dayflow reads `dayflow_backup.json`, validates the checksum and schema version, and displays a summary dialog ("Found backup from [Date] with X profiles and Y history entries").
- User chooses "Restore" or "Start Fresh".
- If data already exists, user can choose "Replace" or "Merge" (newer `updatedAt` wins).

## Manual Export & Import
- Export: Generates a single `.dayflow` package (zip containing JSON and custom sound files) that the user can save anywhere or share via email/cloud.
- Import: Validates and loads any valid `.dayflow` or `.json` backup file.
