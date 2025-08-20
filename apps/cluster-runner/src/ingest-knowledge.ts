import { Activity } from "@effect/workflow";
import { Effect, Layer, Schema } from "effect";

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

		yield* Effect.forEach(pagesIds, (pageId) =>
			Activity.make({
				execute: Effect.gen(function* () {
					yield* Effect.log("Ingesting knowledge for", pageId);
					yield* bella.ingestPageKnowledge(pageId).pipe(Effect.orDie);

					yield* Effect.sleep("5 seconds");
				}),
				name: `ingestsPage/${pageId}`,
			}),
		);
	}),
).pipe(Layer.provide(Bella.Default));
