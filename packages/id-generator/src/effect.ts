import { Effect, Schema } from "effect";

import { generateId, verifyId } from "#src/promise.js";

export class IdVerificationFailed extends Schema.TaggedError<IdVerificationFailed>(
	"@bella/id-generator/IdVerificationFailed",
)("IdVerificationFailed", { id: Schema.String }) {
	override get message() {
		return `ID verification failed for id "${this.id}"`;
	}
}

export class IdGenerator extends Effect.Service<IdGenerator>()("@bella/id-generator/IdGenerator", {
	dependencies: [],
	succeed: {
		generate: Effect.fn(function* () {
			return yield* Effect.tryPromise(async () => generateId()).pipe(Effect.orDie);
		}),
		verify: Effect.fn(function* (id: string) {
			return yield* Effect.tryPromise(async () => verifyId(id)).pipe(
				Effect.orDie,
				Effect.flatMap((isVerified) => {
					if (isVerified) {
						return Effect.void;
					}

					return Effect.fail(new IdVerificationFailed({ id }));
				}),
			);
		}),
	},
}) {}
