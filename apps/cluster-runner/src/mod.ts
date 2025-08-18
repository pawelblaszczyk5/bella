import { ClusterWorkflowEngine, EntityProxyServer, RunnerAddress } from "@effect/cluster";
import { HttpApiBuilder, HttpApiSwagger, HttpMiddleware } from "@effect/platform";
import { NodeClusterRunnerSocket, NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { WorkflowProxyServer } from "@effect/workflow";
import { Config, Effect, Layer, Option } from "effect";
import { createServer } from "node:http";

import { ClusterApi } from "@bella/cluster-api";
import { Conversation, IngestCoppermind } from "@bella/cluster-schema";
import { ClusterStorageLayer } from "@bella/cluster-storage";
import { OpentelemetryLive } from "@bella/opentelemetry";

import { ConversationLive } from "#src/conversation.js";
import { IngestCoppermindLive } from "#src/coppermind.js";
import { GenerateMessageLive } from "#src/generate-message.js";

const ClusterApiLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
	Layer.provide(HttpApiSwagger.layer({ path: "/docs" })),
	Layer.provide(
		HttpApiBuilder.api(ClusterApi).pipe(
			Layer.provide(EntityProxyServer.layerHttpApi(ClusterApi, "conversation", Conversation)),
			Layer.provide(WorkflowProxyServer.layerHttpApi(ClusterApi, "workflow", [IngestCoppermind])),
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

const WorkflowsLive = Layer.mergeAll(GenerateMessageLive, IngestCoppermindLive);

const EnvironmentLive = Layer.mergeAll(
	EntitiesLive.pipe(Layer.provide(WorkflowsLive), Layer.provide(WorkflowEngineLive)),
	ClusterApiLive.pipe(Layer.provide(WorkflowEngineLive)),
).pipe(Layer.provide(OpentelemetryLive));

EnvironmentLive.pipe(Layer.launch, NodeRuntime.runMain);
