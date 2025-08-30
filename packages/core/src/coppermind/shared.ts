import type { HttpClientError } from "@effect/platform";

import { FetchHttpClient, HttpClient, HttpClientRequest } from "@effect/platform";
import { Config, Context, Effect, Layer, Match, Schema } from "effect";

export const Point = Schema.Struct({
	id: Schema.String.pipe(Schema.length(36)),
	payload: Schema.Struct({ content: Schema.NonEmptyString, pageId: Schema.String }),
	vector: Schema.Array(Schema.Number),
});

export type Point = Schema.Schema.Type<typeof Point>;

export const PointWithScore = Schema.Struct({ ...Point.omit("vector").fields, score: Schema.Number });

export type PointWithScore = Schema.Schema.Type<typeof PointWithScore>;

export const PointWithScoreAndRelevance = Schema.Struct({ ...PointWithScore.fields, relevance: Schema.Number });

export type PointWithScoreAndRelevance = Schema.Schema.Type<typeof PointWithScoreAndRelevance>;

export const Usage = Schema.Struct({
	totalTokens: Schema.Number.pipe(Schema.propertySignature, Schema.fromKey("total_tokens")),
});

export class VoyageHttpClient extends Context.Tag("@bella/core/VoyageHttpClient")<
	VoyageHttpClient,
	HttpClient.HttpClient.With<HttpClientError.HttpClientError>
>() {
	static Live = Layer.effect(
		this,
		Effect.gen(function* () {
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

			return httpClient;
		}),
	).pipe(Layer.provide(FetchHttpClient.layer));
}

export const COPPERMIND_EMBEDDINGS_TYPE = Schema.Config(
	"COPPERMIND_EMBEDDINGS_TYPE",
	Schema.Literal("STANDARD", "CONTEXTUALIZED"),
);

export const COPPERMIND_COLLECTION_NAME = Config.map(COPPERMIND_EMBEDDINGS_TYPE, (embeddingsType) =>
	Match.value(embeddingsType).pipe(
		Match.when("CONTEXTUALIZED", () => "coppermind_contextualized"),
		Match.when("STANDARD", () => "coppermind_standard"),
		Match.exhaustive,
	),
);
