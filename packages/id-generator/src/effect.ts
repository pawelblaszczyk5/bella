import { Effect } from "effect";

import { generateId, verifyId } from "#src/promise.js";

export class IdGenerator extends Effect.Service<IdGenerator>()("@bella/id-generator/IdGenerator", {
	dependencies: [],
	succeed: {
		generate: Effect.fn(function* () {
			return yield* Effect.tryPromise(async () => generateId()).pipe(Effect.orDie);
		}),
		verify: Effect.fn(function* (id: string) {
			return yield* Effect.tryPromise(async () => verifyId(id)).pipe(Effect.orDie);
		}),
	},
}) {}
