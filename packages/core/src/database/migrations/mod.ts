import type { ResolvedMigration } from "@effect/sql/Migrator";

import { initMigration } from "#src/database/migrations/0001-init.js";

export const allMigrations: Array<ResolvedMigration> = [initMigration];
