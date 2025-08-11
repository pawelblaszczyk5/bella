import { FetchHttpClient, HttpApiClient } from "@effect/platform";
import { createServerFn } from "@tanstack/react-start";
import { Config, Effect, Layer, ManagedRuntime, Schema } from "effect";

import { ClusterApi } from "@bella/cluster-api";
import { ConversationModel, TextMessagePartModel } from "@bella/core/database-schema";
import { IdGenerator } from "@bella/id-generator/effect";

class Api extends Effect.Service<Api>()("@bella/web/Api", {
	dependencies: [FetchHttpClient.layer, IdGenerator.Default],
	effect: Effect.gen(function* () {
		const BASE_URL = yield* Config.url("CLUSTER_API_BASE_URL");

		const clusterHttpClient = yield* HttpApiClient.make(ClusterApi, { baseUrl: BASE_URL });

		return {
			startNewConversation: Effect.fn("Api/startNewConversation")(function* ({
				conversationId,
				...payload
			}: {
				conversationId: ConversationModel["id"];
				userMessageText: TextMessagePartModel["data"]["text"];
			}) {
				const transactionId = yield* clusterHttpClient.conversation.Start({
					path: { entityId: conversationId },
					payload,
				});

				return transactionId;
			}),
		};
	}),
}) {}

const runtime = ManagedRuntime.make(Layer.mergeAll(Api.Default));

export const startNewConversation = createServerFn({ method: "POST" })
	.validator(
		Schema.standardSchemaV1(
			Schema.Struct({
				conversationId: ConversationModel.insert.fields.id,
				userMessageText: TextMessagePartModel.insert.fields.data.fields.text,
			}),
		),
	)
	.handler(async (ctx) => {
		const value = await runtime.runPromise(
			Effect.gen(function* () {
				const api = yield* Api;

				return yield* api.startNewConversation(ctx.data);
			}),
		);

		return value.toString();
	});
