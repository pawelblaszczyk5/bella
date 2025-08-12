import { ClusterWorkflowEngine, Entity, EntityProxyServer, RunnerAddress } from "@effect/cluster";
import { HttpApiBuilder, HttpApiSwagger, HttpMiddleware } from "@effect/platform";
import { NodeClusterRunnerSocket, NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { Config, Effect, Layer, Match, Option, Stream } from "effect";
import { createServer } from "node:http";

import type { MessageModel } from "@bella/core/database-schema";

import { ClusterApi } from "@bella/cluster-api";
import { Conversation } from "@bella/cluster-schema";
import { ClusterStorageLayer } from "@bella/cluster-storage";
import { Bella } from "@bella/core";
import { ConversationModel } from "@bella/core/database-schema";

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

		const handleGeneratingNewMessage = Effect.fn(function* (assistantMessageId: MessageModel["id"]) {
			const messageStream = yield* bella.getNewMessageStream({ assistantMessageId, conversationId });

			yield* Stream.runForEach(
				messageStream,
				Effect.fn(function* (response) {
					yield* Effect.forEach(
						response.parts,
						Effect.fn(function* (part) {
							yield* Match.value(part).pipe(
								Match.tag("TextPart", (part) =>
									Effect.gen(function* () {
										yield* bella.insertAssistantTextMessagePart({ assistantMessageId, text: part.text });
									}),
								),
								Match.tag("FinishPart", () =>
									Effect.gen(function* () {
										yield* bella.markMessageAsCompleted(assistantMessageId);
									}),
								),
								Match.orElse(() => Effect.void),
							);
						}),
					);
				}),
			);
		});

		return {
			Continue: Effect.fn("Conversation/Continue")(function* (envelope) {
				const transactionId = yield* bella
					.continueConversation({
						assistantMessage: envelope.payload.assistantMessage,
						conversationId,
						userMessage: envelope.payload.userMessage,
					})
					.pipe(Effect.orDie);

				yield* handleGeneratingNewMessage(envelope.payload.assistantMessage.id).pipe(Effect.forkDaemon);

				return transactionId;
			}),
			Start: Effect.fn("Conversation/Start")(function* (envelope) {
				const transactionId = yield* bella
					.createNewConversation({
						assistantMessage: envelope.payload.assistantMessage,
						conversationId,
						userMessage: envelope.payload.userMessage,
					})
					.pipe(Effect.orDie);

				yield* handleGeneratingNewMessage(envelope.payload.assistantMessage.id).pipe(Effect.forkDaemon);

				return transactionId;
			}),
		};
	}),
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

const WorkflowsLive = Layer.empty;

const EnvironmentLive = Layer.mergeAll(
	EntitiesLive.pipe(Layer.provide(WorkflowsLive), Layer.provide(WorkflowEngineLive)),
	ClusterApiLive.pipe(Layer.provide(WorkflowEngineLive)),
).pipe(Layer.provide(Bella.Default));

EnvironmentLive.pipe(Layer.launch, NodeRuntime.runMain);
