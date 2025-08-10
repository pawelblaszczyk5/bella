import { NodeContext } from "@effect/platform-node";
import { PgClient, PgMigrator } from "@effect/sql-pg";
import { Config, Effect, Layer } from "effect";

import { allMigrations } from "#src/database/migrations/mod.js";

const HOST = Config.string("POSTGRES_HOST");
const USERNAME = Config.string("POSTGRES_USERNAME");
const PASSWORD = Config.redacted("POSTGRES_PASSWORD");
const PORT = Config.number("POSTGRES_PORT");
const DATABASE = Config.string("POSTGRES_DATABASE");

const PgConfig = Config.all([HOST, USERNAME, PASSWORD, PORT, DATABASE]).pipe(
	Config.map(
		([host, username, password, port, database]) =>
			({ database, host, password, port, username }) satisfies PgClient.PgClientConfig,
	),
);

const MysqlDefault = PgClient.layerConfig(PgConfig);

const MigratorDefault = PgMigrator.layer({ loader: Effect.succeed(allMigrations) }).pipe(
	Layer.provide(NodeContext.layer),
	Layer.provideMerge(MysqlDefault),
);

export const DatabaseDefault = Layer.mergeAll(MigratorDefault);
