import type { ResolvedMigration } from "@effect/sql/Migrator";

import { initMigration } from "#src/database/migrations/0001-init.js";
import { userExperienceEvaluationMigration } from "#src/database/migrations/0002-user-experience-evaluation.js";

export const allMigrations: Array<ResolvedMigration> = [initMigration, userExperienceEvaluationMigration];
