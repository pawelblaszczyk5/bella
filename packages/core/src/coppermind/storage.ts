import { FetchHttpClient, HttpBody, HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform";
import { Config, Effect, Option, Schema } from "effect";

import { COPPERMIND_COLLECTION_NAME, Point, PointWithScore } from "#src/coppermind/shared.js";

const CollectionDetailsResponse = Schema.Struct({
	result: Schema.Struct({ status: Schema.Literal("green", "yellow", "grey", "red") }),
	status: Schema.Literal("ok"),
});

const DeleteCollectionResponse = Schema.Struct({ result: Schema.Literal(true), status: Schema.Literal("ok") });

const CreateCollectionRequest = Schema.Struct({
	vectors: Schema.Struct({ distance: Schema.Literal("Cosine"), size: Schema.Int }),
});

const CreateCollectionResponse = Schema.Struct({ result: Schema.Literal(true), status: Schema.Literal("ok") });

const UpsertPointsRequest = Schema.Struct({ points: Schema.Array(Point) });

const UpsertPointsResponse = Schema.Struct({
	result: Schema.Struct({ status: Schema.Literal("acknowledged", "completed") }),
	status: Schema.Literal("ok"),
});

const QueryPointsRequest = Schema.Struct({
	limit: Schema.Number.pipe(Schema.OptionFromNullOr),
	query: Schema.Array(Schema.Number),
	withPayload: Schema.Boolean.pipe(Schema.propertySignature, Schema.fromKey("with_payload")),
});

const QueryPointsResponse = Schema.Struct({
	result: Schema.Struct({ points: Schema.Array(PointWithScore) }),
	status: Schema.Literal("ok"),
});

export class Storage extends Effect.Service<Storage>()("@bella/core/Storage", {
	dependencies: [FetchHttpClient.layer],
	effect: Effect.gen(function* () {
		const BASE_URL = yield* Config.string("QDRANT_API_BASE_URL");
		const COLLECTION_NAME = yield* COPPERMIND_COLLECTION_NAME;

		const httpClient = (yield* HttpClient.HttpClient).pipe(
			HttpClient.mapRequest((request) =>
				request.pipe(HttpClientRequest.prependUrl(BASE_URL), HttpClientRequest.acceptJson),
			),
			HttpClient.filterStatusOk,
		);

		return {
			flushStorage: Effect.fn("Bella/Storage/flushStorage")(function* () {
				const existingCollection = yield* httpClient
					.get(`/collections/${COLLECTION_NAME}`)
					.pipe(Effect.flatMap(HttpClientResponse.schemaBodyJson(CollectionDetailsResponse)), Effect.option);

				if (Option.isSome(existingCollection)) {
					yield* httpClient
						.del(`/collections/${COLLECTION_NAME}`)
						.pipe(Effect.flatMap(HttpClientResponse.schemaBodyJson(DeleteCollectionResponse)));
				}

				const body = yield* HttpBody.jsonSchema(CreateCollectionRequest)({
					vectors: { distance: "Cosine", size: 1_024 },
				});

				yield* httpClient
					.put(`/collections/${COLLECTION_NAME}`, { body })
					.pipe(Effect.flatMap(HttpClientResponse.schemaBodyJson(CreateCollectionResponse)));
			}),
			insertPoints: Effect.fn("Bella/Storage/insertPoints")(function* (points: ReadonlyArray<Point>) {
				const body = yield* HttpBody.jsonSchema(UpsertPointsRequest)({ points });

				yield* httpClient.put(`/collections/${COLLECTION_NAME}/points`, { body, urlParams: { wait: true } }).pipe(
					Effect.tapErrorTag("ResponseError", (error) => error.response.json.pipe(Effect.tap(Effect.log))),
					Effect.flatMap(HttpClientResponse.schemaBodyJson(UpsertPointsResponse)),
				);
			}),
			queryPoints: Effect.fn("Bella/Storage/queryPoints")(function* (vector: ReadonlyArray<number>) {
				const body = yield* HttpBody.jsonSchema(QueryPointsRequest)({
					limit: Option.some(20),
					query: vector,
					withPayload: true,
				});

				const response = yield* httpClient
					.post(`/collections/${COLLECTION_NAME}/points/query`, { body })
					.pipe(Effect.flatMap(HttpClientResponse.schemaBodyJson(QueryPointsResponse)));

				return response.result.points;
			}),
		};
	}),
}) {}
