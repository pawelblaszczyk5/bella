import { SqlSchema } from "@effect/sql";
import { PgClient } from "@effect/sql-pg";
import { DateTime, Effect } from "effect";

import { DatabaseDefault } from "#src/database/mod.js";
import { TodoModel } from "#src/database/schema.js";

export class TodoService extends Effect.Service<TodoService>()("@bella/core/TodoService", {
	dependencies: [DatabaseDefault],
	effect: Effect.gen(function* () {
		const sql = yield* PgClient.PgClient;

		const insertTodo = SqlSchema.void({
			execute: (request) => sql`
				INSERT INTO
				${sql("todo")} ${sql.insert(request)};
			`,
			Request: TodoModel.insert,
		});

		return {
			createMock: Effect.fn("TodoService/createMock")(function* () {
				const now = yield* DateTime.now;

				const id = TodoModel.fields.id.make(crypto.randomUUID().slice(0, 24));

				yield* insertTodo({ completed: false, id, text: `Lorem ipsum ${now.pipe(DateTime.formatIso)}` });
			}),
		};
	}),
}) {}
