import { Activity } from "@effect/workflow";
import { Effect, Layer, Schema } from "effect";

import { IngestCoppermind } from "@bella/cluster-schema";
import { Coppermind } from "@bella/core/coppermind";

export const IngestCoppermindLive = IngestCoppermind.toLayer(
	Effect.fn(function* () {
		const coppermind = yield* Coppermind;

		const pagesIds = yield* Activity.make({
			execute: Effect.gen(function* () {
				return yield* coppermind.getPagesIds();
			}),
			name: "getPagesIds",
			success: Schema.NonEmptyArray(Schema.NonEmptyString),
		});

		yield* Effect.forEach(pagesIds, (id, index) =>
			Activity.make({
				execute: Effect.gen(function* () {
					yield* coppermind.embedPage(id).pipe(Effect.tapError(Effect.log), Effect.orDie);
					yield* Effect.sleep("5 seconds");
				}),
				name: `embedPage-${index.toString()}`,
			}),
		);
	}),
).pipe(Layer.provide(Coppermind.Default));
