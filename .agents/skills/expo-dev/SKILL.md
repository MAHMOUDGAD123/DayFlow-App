---
name: expo-dev
description: Guidelines and commands for Expo development, managing Expo Go compatibility, resolving dependency conflicts, and starting the local server.
---

# Expo Dev Skill

## Expo Development Workflow (M0–M6)
The app runs on Expo Go without requiring Android Studio or local builds.

### Key Commands
```bash
npx expo start              # Start dev server with interactive terminal and QR code
npx expo start --tunnel     # Start dev server via tunnel (if phone is on different network)
npx expo start -c           # Clear Metro bundler cache
npx expo-doctor             # Diagnose dependency issues and version mismatches
npx expo install <pkg>      # Always install Expo-compatible versions of packages
```

### Constraints in Phase 1
- Do NOT add custom native code or packages requiring custom native code to `package.json` until Milestone M7.
- Use only Expo Go compatible packages.
