import { RunnerAddress } from "@effect/cluster";
import { NodeClusterShardManagerSocket, NodeRuntime } from "@effect/platform-node";
import { Config, Effect, Layer } from "effect";

import { ClusterStorageLayer } from "@bella/cluster-storage";

const ShardManagerLayer = Layer.unwrapEffect(
	Effect.gen(function* () {
		const HOST = yield* Config.string("CLUSTER_SHARD_MANAGER_HOST");
		const PORT = yield* Config.number("CLUSTER_SHARD_MANAGER_PORT");

		return NodeClusterShardManagerSocket.layer({
			shardingConfig: { shardManagerAddress: RunnerAddress.make(HOST, PORT) },
			storage: "sql",
		});
	}),
);

ShardManagerLayer.pipe(Layer.provide(ClusterStorageLayer), Layer.launch, NodeRuntime.runMain);
