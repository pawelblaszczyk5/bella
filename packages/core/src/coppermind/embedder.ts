import { HttpBody, HttpClientResponse } from "@effect/platform";
import { Array, Context, Effect, Layer, Match, Option, pipe, Schema } from "effect";

import { COPPERMIND_EMBEDDINGS_TYPE, Usage, VoyageHttpClient } from "#src/coppermind/shared.js";

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

const StandardEmbeddingsModel = Schema.Literal("voyage-3-large");

const StandardEmbeddingsRequest = Schema.Struct({
	input: Schema.Array(Schema.NonEmptyString),
	inputType: Schema.Literal("document", "query").pipe(
		Schema.OptionFromNullOr,
		Schema.propertySignature,
		Schema.fromKey("input_type"),
	),
	model: StandardEmbeddingsModel,
});

const StandardEmbeddingsResponse = Schema.Struct({
	data: Schema.Array(
		Schema.Struct({
			embedding: Schema.Array(Schema.Number),
			index: Schema.Number,
			object: Schema.Literal("embedding"),
		}),
	),
	model: StandardEmbeddingsModel,
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
	static Contextualized = Layer.effect(
		this,
		Effect.gen(function* () {
			const voyageHttpClient = yield* VoyageHttpClient;

			return {
				embedDocument: Effect.fn("Bella/ContextualizedEmbedder/embedDocument")(
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
				embedQueries: Effect.fn("Bella/ContextualizedEmbedder/embedQueries")(
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

	static Standard = Layer.effect(
		this,
		Effect.gen(function* () {
			const voyageHttpClient = yield* VoyageHttpClient;

			return {
				embedDocument: Effect.fn("Bella/StandardEmbedder/embedDocument")(
					function* (chunkedDocument) {
						const body = yield* HttpBody.jsonSchema(StandardEmbeddingsRequest)({
							input: chunkedDocument,
							inputType: Option.some("document"),
							model: "voyage-3-large",
						});

						const response = yield* voyageHttpClient
							.post("embeddings", { body })
							.pipe(Effect.flatMap(HttpClientResponse.schemaBodyJson(StandardEmbeddingsResponse)));

						const allEmbeddings = Array.map(response.data, ({ embedding }) => embedding);

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
				embedQueries: Effect.fn("Bella/StandardEmbedder/embedQueries")(
					function* (queries) {
						const body = yield* HttpBody.jsonSchema(StandardEmbeddingsRequest)({
							input: queries,
							inputType: Option.some("query"),
							model: "voyage-3-large",
						});

						const response = yield* voyageHttpClient
							.post("embeddings", { body })
							.pipe(Effect.flatMap(HttpClientResponse.schemaBodyJson(StandardEmbeddingsResponse)));

						const allEmbeddings = Array.map(response.data, ({ embedding }) => embedding);

						return yield* Effect.forEach(
							queries,
							Effect.fn(function* (query, index) {
								const embedding = yield* Array.get(allEmbeddings, index);

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
			const EMBEDDINGS_TYPE = yield* COPPERMIND_EMBEDDINGS_TYPE;

			return Match.value(EMBEDDINGS_TYPE).pipe(
				Match.when("CONTEXTUALIZED", () => Embedder.Contextualized),
				Match.when("STANDARD", () => Embedder.Standard),
				Match.exhaustive,
			);
		}),
	);
}
