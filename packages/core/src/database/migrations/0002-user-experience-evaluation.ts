import type { ResolvedMigration } from "@effect/sql/Migrator";

import { PgClient } from "@effect/sql-pg";
import { Effect } from "effect";

const migration = Effect.gen(function* () {
	const sql = yield* PgClient.PgClient;

	yield* sql`
		CREATE TABLE ${sql("userExperienceEvaluation")} (
			${sql("category")} TEXT NOT NULL,
			${sql("createdAt")} TIMESTAMPTZ NOT NULL,
			${sql("description")} TEXT NOT NULL,
			${sql("id")} VARCHAR(24) PRIMARY KEY,
			${sql("messageId")} VARCHAR(24) NOT NULL,
			${sql("resolvedAt")} TIMESTAMPTZ NULL,
			${sql("severity")} TEXT NOT NULL,
			FOREIGN KEY (${sql("messageId")}) REFERENCES ${sql("message")} (${sql("id")})
		);
	`;
});

export const userExperienceEvaluationMigration = [
	2,
	"user-experience-evaluation",
	Effect.succeed(migration),
] satisfies ResolvedMigration;
