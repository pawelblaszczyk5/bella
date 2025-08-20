import { Activity } from "@effect/workflow";
import { Array, Effect, Layer, Schema } from "effect";

import { IngestKnowledge } from "@bella/cluster-schema";
import { Bella } from "@bella/core";

export const IngestKnowledgeLive = IngestKnowledge.toLayer(
	Effect.fn(function* () {
		const bella = yield* Bella;

		yield* Activity.make({
			execute: Effect.gen(function* () {
				return yield* bella.setupStorageForKnowledgeIngestion().pipe(Effect.orDie);
			}),
			name: "setupStorage",
		});

		const pagesIds = yield* Activity.make({
			execute: Effect.gen(function* () {
				return yield* bella.getPagesForIngestion();
			}),
			name: "getPagesForIngestion",
			success: Schema.NonEmptyArray(Schema.NonEmptyString),
		});

		const pagesIdsChunks = Array.chunksOf(pagesIds, 5);

		yield* Effect.forEach(pagesIdsChunks, (pagesIds, index) =>
			Activity.make({
				execute: Effect.gen(function* () {
					yield* bella.ingestPagesKnowledge(pagesIds).pipe(Effect.orDie);

					yield* Effect.sleep("5 seconds");
				}),
				name: `ingestsPagesChunk/${index.toString()}`,
			}),
		);
	}),
).pipe(Layer.provide(Bella.Default));
