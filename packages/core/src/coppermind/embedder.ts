import { FetchHttpClient, HttpBody, HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform";
import { Array, Config, Effect, Option, Schema } from "effect";

import type { PointWithScore } from "#src/coppermind/shared.js";

import { PointWithScoreAndRelevance } from "#src/coppermind/shared.js";

const Usage = Schema.Struct({
	totalTokens: Schema.Number.pipe(Schema.propertySignature, Schema.fromKey("total_tokens")),
});

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

const RerankModel = Schema.Literal("rerank-2.5");

const RerankRequest = Schema.Struct({
	documents: Schema.Array(Schema.String),
	model: RerankModel,
	query: Schema.String,
});

const RerankResponse = Schema.Struct({
	data: Schema.Array(
		Schema.Struct({
			index: Schema.Number,
			relevanceScore: Schema.Number.pipe(Schema.propertySignature, Schema.fromKey("relevance_score")),
		}),
	),
	model: RerankModel,
	object: Schema.Literal("list"),
	usage: Usage,
});

export class Embedder extends Effect.Service<Embedder>()("@bella/core/Embedder", {
	dependencies: [FetchHttpClient.layer],
	effect: Effect.gen(function* () {
		const API_KEY = yield* Config.redacted("VOYAGE_API_KEY");
		const BASE_URL = yield* Config.string("VOYAGE_API_BASE_URL");

		const httpClient = (yield* HttpClient.HttpClient).pipe(
			HttpClient.mapRequest((request) =>
				request.pipe(
					HttpClientRequest.prependUrl(BASE_URL),
					HttpClientRequest.bearerToken(API_KEY),
					HttpClientRequest.acceptJson,
				),
			),
			HttpClient.filterStatusOk,
		);

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
				const response = yield* httpClient
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
				const response = yield* httpClient
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
			rerankPointsForQuery: Effect.fn("Bella/Embedder/embedQuery")(function* ({
				points,
				query,
			}: {
				points: Array<PointWithScore>;
				query: string;
			}) {
				const documents = Array.map(points, (point) => point.payload.content);

				const body = yield* HttpBody.jsonSchema(RerankRequest)({ documents, model: "rerank-2.5", query });

				const response = yield* httpClient
					.post("rerank", { body })
					.pipe(Effect.flatMap(HttpClientResponse.schemaBodyJson(RerankResponse)));

				const pointsWithScoreAndRelevance = yield* Effect.forEach(
					response.data,
					Effect.fn(function* (result) {
						const originalPoint = yield* Array.get(points, result.index);

						return PointWithScoreAndRelevance.make({
							id: originalPoint.id,
							payload: originalPoint.payload,
							relevance: result.relevanceScore,
							score: originalPoint.score,
						});
					}),
				);

				return pointsWithScoreAndRelevance;
			}),
		};
	}),
}) {}
