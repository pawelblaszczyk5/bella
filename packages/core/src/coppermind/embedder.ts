import { HttpBody, HttpClientResponse } from "@effect/platform";
import { Array, Effect, Option, Schema } from "effect";

import { Usage, VoyageHttpClient } from "#src/coppermind/shared.js";

const ContextualizedEmbeddingsModel = Schema.Literal("voyage-context-3");

const ContextualizedEmbeddingsRequest = Schema.Struct({
	inputs: Schema.Array(Schema.Array(Schema.NonEmptyString)),
	inputType: Schema.Literal("document", "query").pipe(
		Schema.OptionFromNullOr,
		Schema.propertySignature,
		Schema.fromKey("input_type"),
	),
	model: ContextualizedEmbeddingsModel,
});

const ContextualizedEmbeddingsResponse = Schema.Struct({
	data: Schema.Array(
		Schema.Struct({
			data: Schema.Array(
				Schema.Struct({
					embedding: Schema.Array(Schema.Number),
					index: Schema.Number,
					object: Schema.Literal("embedding"),
				}),
			),
			index: Schema.Number,
			object: Schema.Literal("list"),
		}),
	),
	model: ContextualizedEmbeddingsModel,
	object: Schema.Literal("list"),
	usage: Usage,
});

export class Embedder extends Effect.Service<Embedder>()("@bella/core/Embedder", {
	dependencies: [VoyageHttpClient.Live],
	effect: Effect.gen(function* () {
		const voyageHttpClient = yield* VoyageHttpClient;

		return {
			embedDocumentsWithContext: Effect.fn("Bella/Embedder/embedDocumentsWithContext")(function* (
				chunkedDocuments: ReadonlyArray<ReadonlyArray<string>>,
			) {
				const body = yield* HttpBody.jsonSchema(ContextualizedEmbeddingsRequest)({
					inputs: chunkedDocuments,
					inputType: Option.some("document"),
					model: "voyage-context-3",
				});

				// cspell:ignore contextualizedembeddings
				const response = yield* voyageHttpClient
					.post("contextualizedembeddings", { body })
					.pipe(Effect.flatMap(HttpClientResponse.schemaBodyJson(ContextualizedEmbeddingsResponse)));

				return Array.map(response.data, ({ data }) => data.map(({ embedding }) => embedding));
			}),
			embedQueriesWithContext: Effect.fn("Bella/Embedder/embedQueriesWithContext")(function* (
				queries: ReadonlyArray<string>,
			) {
				const body = yield* HttpBody.jsonSchema(ContextualizedEmbeddingsRequest)({
					inputs: queries.map((query) => [query]),
					inputType: Option.some("query"),
					model: "voyage-context-3",
				});

				// cspell:ignore contextualizedembeddings
				const response = yield* voyageHttpClient
					.post("contextualizedembeddings", { body })
					.pipe(Effect.flatMap(HttpClientResponse.schemaBodyJson(ContextualizedEmbeddingsResponse)));

				const allEmbeddings = Array.map(response.data, ({ data }) => data.map(({ embedding }) => embedding));

				return yield* Effect.forEach(
					queries,
					Effect.fn(function* (query, index) {
						const embeddings = yield* Array.get(allEmbeddings, index);
						const embedding = yield* Array.get(embeddings, 0);

						return { embedding, query };
					}),
				);
			}),
		};
	}),
}) {}
