import { ClusterWorkflowEngine, Entity, EntityProxyServer, RunnerAddress } from "@effect/cluster";
import { HttpApiBuilder, HttpApiSwagger, HttpMiddleware } from "@effect/platform";
import { NodeClusterRunnerSocket, NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { Activity } from "@effect/workflow";
import { Config, Effect, Layer, Match, Option, Stream } from "effect";
import { createServer } from "node:http";

import { ClusterApi } from "@bella/cluster-api";
import { Conversation, ConversationFlowError, GenerateMessage } from "@bella/cluster-schema";
import { ClusterStorageLayer } from "@bella/cluster-storage";
import { Bella } from "@bella/core";
import { ConversationModel } from "@bella/core/database-schema";
import { OpentelemetryLive } from "@bella/opentelemetry";

const ClusterApiLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
	Layer.provide(HttpApiSwagger.layer({ path: "/docs" })),
	Layer.provide(
		HttpApiBuilder.api(ClusterApi).pipe(
			Layer.provide(EntityProxyServer.layerHttpApi(ClusterApi, "conversation", Conversation)),
		),
	),
	Layer.provide(
		Layer.unwrapEffect(
			Effect.gen(function* () {
				const PORT = yield* Config.number("CLUSTER_API_PORT");

				return NodeHttpServer.layer(createServer, { port: PORT });
			}),
		),
	),
);

const ConversationLive = Conversation.toLayer(
	Effect.gen(function* () {
		const bella = yield* Bella;

		const entityAddress = yield* Entity.CurrentAddress;
		const conversationId = ConversationModel.fields.id.make(entityAddress.entityId);

		return {
			Continue: Effect.fn("Conversation/Continue")(function* (envelope) {
				const transactionId = yield* bella
					.continueConversation({
						assistantMessage: envelope.payload.assistantMessage,
						conversationId,
						userMessage: envelope.payload.userMessage,
					})
					.pipe(Effect.mapError(() => new ConversationFlowError({ type: "DATA_ACCESS_ERROR" })));

				yield* GenerateMessage.execute(
					{ assistantMessage: envelope.payload.assistantMessage, conversationId },
					{ discard: true },
				);

				return transactionId;
			}),
			Start: Effect.fn("Conversation/Start")(function* (envelope) {
				const transactionId = yield* bella
					.createNewConversation({
						assistantMessage: envelope.payload.assistantMessage,
						conversationId,
						userMessage: envelope.payload.userMessage,
					})
					.pipe(Effect.mapError(() => new ConversationFlowError({ type: "DATA_ACCESS_ERROR" })));

				yield* GenerateMessage.execute(
					{ assistantMessage: envelope.payload.assistantMessage, conversationId },
					{ discard: true },
				);

				return transactionId;
			}),
			StopGeneration: Effect.fn("Conversation/StopGeneration")(function* (envelope) {
				const executionId = yield* GenerateMessage.executionId({
					assistantMessage: envelope.payload.assistantMessage,
					conversationId,
				});

				yield* GenerateMessage.interrupt(executionId);

				const transactionId = yield* bella
					.markMessageAsInterrupted(envelope.payload.assistantMessage.id)
					.pipe(Effect.mapError(() => new ConversationFlowError({ type: "DATA_ACCESS_ERROR" })));

				return transactionId;
			}),
		};
	}),
);

const GenerateMessageLive = GenerateMessage.toLayer(
	Effect.fn(
		function* (payload) {
			const bella = yield* Bella;

			yield* Activity.make({
				error: ConversationFlowError,
				execute: Effect.gen(function* () {
					const messageStream = yield* bella
						.getNewMessageStream({
							assistantMessageId: payload.assistantMessage.id,
							conversationId: payload.conversationId,
						})
						.pipe(Effect.mapError(() => new ConversationFlowError({ type: "DATA_ACCESS_ERROR" })));

					yield* messageStream.pipe(
						Stream.takeUntilEffect(() => bella.checkIsMessageInterrupted(payload.assistantMessage.id)),
						Stream.runForEach(
							Effect.fn(function* (response) {
								yield* Effect.forEach(
									response.parts,
									Effect.fn(function* (part) {
										yield* Match.value(part).pipe(
											Match.tag("TextPart", (part) =>
												Effect.gen(function* () {
													yield* bella.insertAssistantTextMessagePart({
														assistantMessageId: payload.assistantMessage.id,
														text: part.text,
													});
												}),
											),
											Match.tag("FinishPart", () =>
												Effect.gen(function* () {
													yield* bella.markMessageAsCompleted(payload.assistantMessage.id);
												}),
											),
											Match.orElse(() => Effect.void),
										);
									}),
								);
							}),
						),
						Effect.mapError(() => new ConversationFlowError({ type: "GENERATION_ERROR" })),
					);
				}),
				name: "generateAnswerContent",
			}).pipe(GenerateMessage.withCompensation(() => Effect.log("compensating")));
		},
		GenerateMessage.withCompensation(() => Effect.log("compensating")),
	),
);

const WorkflowEngineLive = ClusterWorkflowEngine.layer.pipe(
	Layer.provideMerge(
		Layer.unwrapEffect(
			Effect.gen(function* () {
				const RUNNER_HOST = yield* Config.string("CLUSTER_RUNNER_HOST");
				const RUNNER_PORT = yield* Config.number("CLUSTER_RUNNER_PORT");

				const SHARD_MANAGER_HOST = yield* Config.string("CLUSTER_SHARD_MANAGER_HOST");
				const SHARD_MANAGER_PORT = yield* Config.number("CLUSTER_SHARD_MANAGER_PORT");

				return NodeClusterRunnerSocket.layer({
					shardingConfig: {
						runnerAddress: Option.some(RunnerAddress.make(RUNNER_HOST, RUNNER_PORT)),
						shardManagerAddress: RunnerAddress.make(SHARD_MANAGER_HOST, SHARD_MANAGER_PORT),
					},
					storage: "sql",
				});
			}),
		),
	),
	Layer.provideMerge(ClusterStorageLayer),
);

const EntitiesLive = Layer.mergeAll(ConversationLive);

const WorkflowsLive = Layer.mergeAll(GenerateMessageLive);

const EnvironmentLive = Layer.mergeAll(
	EntitiesLive.pipe(Layer.provide(WorkflowsLive), Layer.provide(WorkflowEngineLive)),
	ClusterApiLive.pipe(Layer.provide(WorkflowEngineLive)),
).pipe(Layer.provide(Bella.Default), Layer.provide(OpentelemetryLive));

EnvironmentLive.pipe(Layer.launch, NodeRuntime.runMain);
