import { FetchHttpClient, HttpApiClient } from "@effect/platform";
import { createServerFn } from "@tanstack/react-start";
import { Config, Effect, Layer, ManagedRuntime, Schema, Struct } from "effect";

import { ClusterApi } from "@bella/cluster-api";
import {
	AssistantMessageModel,
	ConversationModel,
	TextMessagePartModel,
	UserMessageModel,
} from "@bella/core/database-schema";
import { IdGenerator } from "@bella/id-generator/effect";

const UserMessage = Schema.Struct({
	id: UserMessageModel.insert.fields.id,
	parts: Schema.Array(Schema.Union(TextMessagePartModel.insert.pick("id", "type", "data"))),
});

const AssistantMessage = Schema.Struct({ id: AssistantMessageModel.insert.fields.id });

export const ConversationActionData = Schema.Struct({
	assistantMessage: AssistantMessage,
	conversationId: ConversationModel.insert.fields.id,
	userMessage: UserMessage,
});

export type ConversationActionData = Schema.Schema.Type<typeof ConversationActionData>;

export const StopGenerationData = Schema.Struct({
	assistantMessage: AssistantMessage,
	conversationId: ConversationModel.insert.fields.id,
});

export type StopGenerationData = Schema.Schema.Type<typeof StopGenerationData>;

class Api extends Effect.Service<Api>()("@bella/web/Api", {
	dependencies: [FetchHttpClient.layer, IdGenerator.Default],
	effect: Effect.gen(function* () {
		const BASE_URL = yield* Config.url("CLUSTER_API_BASE_URL");

		const idGenerator = yield* IdGenerator;

		const clusterHttpClient = yield* HttpApiClient.make(ClusterApi, { baseUrl: BASE_URL });

		const verifyConversationActionData = Effect.fn(function* (conversationActionData: ConversationActionData) {
			yield* idGenerator.verify(conversationActionData.conversationId);
			yield* idGenerator.verify(conversationActionData.assistantMessage.id);
			yield* idGenerator.verify(conversationActionData.userMessage.id);

			yield* Effect.forEach(conversationActionData.userMessage.parts, (messagePart) =>
				idGenerator.verify(messagePart.id),
			);
		});

		return {
			continueConversation: Effect.fn("Api/startNewConversation")(function* (
				conversationActionData: ConversationActionData,
			) {
				yield* verifyConversationActionData(conversationActionData);

				const transactionId = yield* clusterHttpClient.conversation.Continue({
					path: { entityId: conversationActionData.conversationId },
					payload: Struct.omit(conversationActionData, "conversationId"),
				});

				return transactionId;
			}),
			startNewConversation: Effect.fn("Api/startNewConversation")(function* (
				conversationActionData: ConversationActionData,
			) {
				yield* verifyConversationActionData(conversationActionData);

				const transactionId = yield* clusterHttpClient.conversation.Start({
					path: { entityId: conversationActionData.conversationId },
					payload: Struct.omit(conversationActionData, "conversationId"),
				});

				return transactionId;
			}),
			stopGeneration: Effect.fn("Api/stopGeneration")(function* (stopGenerationData: StopGenerationData) {
				const transactionId = yield* clusterHttpClient.conversation.StopGeneration({
					path: { entityId: stopGenerationData.conversationId },
					payload: Struct.omit(stopGenerationData, "conversationId"),
				});

				return transactionId;
			}),
		};
	}),
}) {}

const runtime = ManagedRuntime.make(Layer.mergeAll(Api.Default));

export const startNewConversationProcedure = createServerFn({ method: "POST" })
	.validator(Schema.standardSchemaV1(ConversationActionData))
	.handler(async (ctx) => {
		const value = await runtime.runPromise(
			Effect.gen(function* () {
				const api = yield* Api;

				return yield* api.startNewConversation(ctx.data);
			}),
		);

		return value;
	});

export const continueConversationProcedure = createServerFn({ method: "POST" })
	.validator(Schema.standardSchemaV1(ConversationActionData))
	.handler(async (ctx) => {
		const value = await runtime.runPromise(
			Effect.gen(function* () {
				const api = yield* Api;

				return yield* api.continueConversation(ctx.data);
			}),
		);

		return value;
	});

export const stopGenerationProcedure = createServerFn({ method: "POST" })
	.validator(Schema.standardSchemaV1(StopGenerationData))
	.handler(async (ctx) => {
		const value = await runtime.runPromise(
			Effect.gen(function* () {
				const api = yield* Api;

				return yield* api.stopGeneration(ctx.data);
			}),
		);

		return value;
	});
