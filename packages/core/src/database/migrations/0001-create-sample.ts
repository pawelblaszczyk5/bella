import type { ResolvedMigration } from "@effect/sql/Migrator";

import { PgClient } from "@effect/sql-pg";
import { Effect } from "effect";

const migration = Effect.gen(function* () {
	const sql = yield* PgClient.PgClient;

	yield* sql`
		CREATE TABLE ${sql("todo")} (
			${sql("id")} CHAR(24) PRIMARY KEY,
			${sql("text")} TEXT NOT NULL,
			${sql("completed")} BOOLEAN NOT NULL
		);
	`;
});

export const createSampleMigration = [1, "create-sample", Effect.succeed(migration)] satisfies ResolvedMigration;
