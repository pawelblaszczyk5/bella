import type { ResolvedMigration } from "@effect/sql/Migrator";

import { createSampleMigration } from "#src/database/migrations/0001-create-sample.js";

export const allMigrations: Array<ResolvedMigration> = [createSampleMigration];
