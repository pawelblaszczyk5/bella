import { ClusterCron, ClusterWorkflowEngine, EntityProxyServer, RunnerAddress } from "@effect/cluster";
import { HttpApiBuilder, HttpApiSwagger, HttpMiddleware } from "@effect/platform";
import { NodeClusterRunnerSocket, NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { Activity, DurableClock, WorkflowProxyServer } from "@effect/workflow";
import { Config, Cron, DateTime, Duration, Effect, Layer, Option, Random, Schema } from "effect";
import { createServer } from "node:http";

import { ClusterApi } from "@bella/cluster-api";
import { NumberGenerator, SendEmail } from "@bella/cluster-schema";
import { ClusterStorageLayer } from "@bella/cluster-storage";

const ClusterApiLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
	Layer.provide(HttpApiSwagger.layer({ path: "/docs" })),
	Layer.provide(
		HttpApiBuilder.api(ClusterApi).pipe(
			Layer.provide(EntityProxyServer.layerHttpApi(ClusterApi, "number-generator", NumberGenerator)),
			Layer.provide(WorkflowProxyServer.layerHttpApi(ClusterApi, "workflow", [SendEmail])),
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

const NumberGeneratorLive = NumberGenerator.toLayer(
	Effect.gen(function* () {
		return {
			Get: Effect.fn("NumberGenerator/Get")(function* () {
				return yield* Random.nextIntBetween(10, 50);
			}),
		};
	}),
);

const SendEmailLive = SendEmail.toLayer(
	Effect.fn(function* (payload) {
		yield* Activity.make({
			error: Schema.Never,
			execute: Effect.gen(function* () {
				yield* Effect.log(`Sending email to ${payload.to}, awaiting delivery`);
			}),
			name: "TriggerSend",
		});

		yield* DurableClock.sleep({ duration: Duration.minutes(1), name: "AwaitDelivery" });

		yield* Activity.make({
			error: Schema.Never,
			execute: Effect.gen(function* () {
				yield* Effect.log(`Email is confirmed to be delivered to ${payload.to} by now`);
			}),
			name: "NotifyBeingDelivered",
		});
	}),
);

const CronTest = ClusterCron.make({
	cron: Cron.unsafeParse("* * * * *"),
	execute: Effect.gen(function* () {
		const now = yield* DateTime.now;

		yield* Effect.log(`Running cron at ${DateTime.formatIso(now)}`);
	}),
	name: "CronTest",
});

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

const EntitiesLive = Layer.mergeAll(NumberGeneratorLive, CronTest);

const WorkflowsLive = Layer.mergeAll(SendEmailLive);

const EnvironmentLive = Layer.mergeAll(
	EntitiesLive.pipe(Layer.provide(WorkflowsLive), Layer.provide(WorkflowEngineLive)),
	ClusterApiLive.pipe(Layer.provide(WorkflowEngineLive)),
);

EnvironmentLive.pipe(Layer.launch, NodeRuntime.runMain);
