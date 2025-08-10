import { ClusterWorkflowEngine, Entity, EntityProxyServer, RunnerAddress } from "@effect/cluster";
import { HttpApiBuilder, HttpApiSwagger, HttpMiddleware } from "@effect/platform";
import { NodeClusterRunnerSocket, NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { Config, Effect, Layer, Option, Random } from "effect";
import { createServer } from "node:http";

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

		return {
			Continue: Effect.fn("Conversation/Continue")(function* () {
				return yield* Random.nextIntBetween(10, 50);
			}),
			Start: Effect.fn("Conversation/Start")(function* (envelope) {
				const result = yield* bella.startNewConversation({
					assistantMessageId: envelope.payload.assistantMessageId,
					conversationId,
					title: envelope.payload.title,
					userMessageId: envelope.payload.userMessageId,
					userMessageTextContent: envelope.payload.userMessageTextContent,
					userTextMessagePartId: envelope.payload.userTextMessagePartId,
				});

				return result.transactionId;
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
