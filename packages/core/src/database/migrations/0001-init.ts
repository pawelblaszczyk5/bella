import type { ResolvedMigration } from "@effect/sql/Migrator";

import { PgClient } from "@effect/sql-pg";
import { Effect } from "effect";

const migration = Effect.gen(function* () {
	const sql = yield* PgClient.PgClient;

	yield* sql`
		CREATE TABLE ${sql("conversation")} (
			${sql("createdAt")} TIMESTAMPTZ NOT NULL,
			${sql("deletedAt")} TIMESTAMPTZ NULL,
			${sql("id")} VARCHAR(24) PRIMARY KEY,
			${sql("title")} TEXT NOT NULL,
			${sql("updatedAt")} TIMESTAMPTZ NOT NULL
		);
	`;

	yield* sql`
		CREATE TABLE ${sql("message")} (
			${sql("conversationId")} VARCHAR(24) NOT NULL,
			${sql("createdAt")} TIMESTAMPTZ NOT NULL,
			${sql("id")} VARCHAR(24) PRIMARY KEY,
			${sql("role")} TEXT NOT NULL,
			${sql("status")} TEXT NOT NULL,
			FOREIGN KEY (${sql("conversationId")}) REFERENCES ${sql("conversation")} (${sql("id")})
		);
	`;

	yield* sql`
		CREATE TABLE ${sql("messagePart")} (
			${sql("createdAt")} TIMESTAMPTZ NOT NULL,
			${sql("id")} VARCHAR(24) PRIMARY KEY,
			${sql("messageId")} VARCHAR(24) NOT NULL,
			${sql("type")} TEXT NOT NULL,
			${sql("textContent")} TEXT NULL,
			FOREIGN KEY (${sql("messageId")}) REFERENCES ${sql("message")} (${sql("id")})
		);
	`;
});

export const initMigration = [1, "init", Effect.succeed(migration)] satisfies ResolvedMigration;
