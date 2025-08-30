import { HttpBody, HttpClientResponse } from "@effect/platform";
import { Array, Effect, Schema } from "effect";

import type { PointWithScore } from "#src/coppermind/shared.js";

import { PointWithScoreAndRelevance, Usage, VoyageHttpClient } from "#src/coppermind/shared.js";

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

export class Reranker extends Effect.Service<Reranker>()("@bella/core/Reranker", {
	dependencies: [VoyageHttpClient.Live],
	effect: Effect.gen(function* () {
		const voyageHttpClient = yield* VoyageHttpClient;

		return {
			rerankForQuery: Effect.fn("Bella/Reranker/rerankForQuery")(function* ({
				points,
				query,
			}: {
				points: Array<PointWithScore>;
				query: string;
			}) {
				const documents = Array.map(points, (point) => point.payload.content);

				const body = yield* HttpBody.jsonSchema(RerankRequest)({ documents, model: "rerank-2.5", query });

				const response = yield* voyageHttpClient
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
