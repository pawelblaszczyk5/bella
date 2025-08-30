import { HttpBody, HttpClientResponse } from "@effect/platform";
import { Array, Context, Effect, Layer, Option, pipe, Schema } from "effect";

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

export class EmbedderError extends Schema.TaggedError<EmbedderError>("@bella/core/EmbedderError")("EmbedderError", {
	cause: Schema.Defect,
}) {
	override get message() {
		return `Embedder failed`;
	}
}

export class Embedder extends Context.Tag("@bella/core/Embedder")<
	Embedder,
	{
		embedDocument: (
			documentChunks: ReadonlyArray<string>,
		) => Effect.Effect<ReadonlyArray<{ chunk: string; embedding: ReadonlyArray<number> }>, EmbedderError>;
		embedQueries: (
			queries: ReadonlyArray<string>,
		) => Effect.Effect<ReadonlyArray<{ embedding: ReadonlyArray<number>; query: string }>, EmbedderError>;
	}
>() {
	static Contextual = Layer.effect(
		this,
		Effect.gen(function* () {
			const voyageHttpClient = yield* VoyageHttpClient;

			return {
				embedDocument: Effect.fn("Bella/ContextualEmbedder/embedDocument")(
					function* (chunkedDocument) {
						const body = yield* HttpBody.jsonSchema(ContextualizedEmbeddingsRequest)({
							inputs: [chunkedDocument],
							inputType: Option.some("document"),
							model: "voyage-context-3",
						});

						// cspell:ignore contextualizedembeddings
						const response = yield* voyageHttpClient
							.post("contextualizedembeddings", { body })
							.pipe(Effect.flatMap(HttpClientResponse.schemaBodyJson(ContextualizedEmbeddingsResponse)));

						const allEmbeddings = yield* pipe(
							Array.map(response.data, ({ data }) => data.map(({ embedding }) => embedding)),
							Array.get(0),
						);

						return yield* Effect.forEach(
							chunkedDocument,
							Effect.fn(function* (chunk, index) {
								const embedding = yield* Array.get(allEmbeddings, index);

								return { chunk, embedding };
							}),
						);
					},
					Effect.mapError((error) => new EmbedderError({ cause: error })),
				),
				embedQueries: Effect.fn("Bella/ContextualEmbedder/embedQueries")(
					function* (queries) {
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
					},
					Effect.mapError((error) => new EmbedderError({ cause: error })),
				),
			};
		}),
	).pipe(Layer.provide(VoyageHttpClient.Live));

	static Live = Layer.unwrapEffect(
		Effect.gen(function* () {
			return Embedder.Contextual;
		}),
	);
}
