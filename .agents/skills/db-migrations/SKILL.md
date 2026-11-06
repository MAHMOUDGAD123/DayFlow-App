---
name: db-migrations
description: Procedures for managing SQLite database schema with Drizzle ORM, versioning schema changes, and keeping the backup format synchronized.
---

# DB Migrations Skill

Dayflow stores all persistent user data locally in SQLite using `expo-sqlite` and `drizzle-orm`.

## Rules for Schema Evolution

1. **Schema Source of Truth:**
   - All tables are defined in `src/db/schema.ts`.
   - Never write raw unparameterized SQL queries in application code.

2. **Schema Versioning:**
   - Define a constant `CURRENT_SCHEMA_VERSION` in `src/db/constants.ts`.
   - Whenever a table, column, or relationship changes:
     - Increment `CURRENT_SCHEMA_VERSION`.
     - Add migration logic in `src/db/migrations/`.
     - Update backup serializer and migration transformer in `src/services/backup/migrations.ts`.

3. **Reactive Reads:**
   - Use `useLiveQuery` from `drizzle-orm/expo-sqlite` or custom repository hooks so changes immediately update the UI without manual refetching.
