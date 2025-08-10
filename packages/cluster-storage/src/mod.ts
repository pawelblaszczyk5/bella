// cspell:ignore onnotice

import { PgClient } from "@effect/sql-pg";
import { Config, Function } from "effect";

export const ClusterStorageLayer = PgClient.layerConfig({
	database: Config.string("CLUSTER_STORAGE_DATABASE"),
	host: Config.string("CLUSTER_STORAGE_HOST"),
	onnotice: Config.sync(() => Function.constVoid),
	password: Config.redacted("CLUSTER_STORAGE_PASSWORD"),
	port: Config.number("CLUSTER_STORAGE_PORT"),
	username: Config.string("CLUSTER_STORAGE_USERNAME"),
});
