import { FetchHttpClient, HttpApiClient } from "@effect/platform";
import { createServerFn } from "@tanstack/react-start";
import { Config, Effect, Layer, ManagedRuntime } from "effect";

import { ClusterApi } from "@bella/cluster-api";

class Api extends Effect.Service<Api>()("@bella/web/Api", {
	dependencies: [FetchHttpClient.layer],
	effect: Effect.gen(function* () {
		const BASE_URL = yield* Config.url("CLUSTER_API_BASE_URL");

		const ClusterHttpClient = yield* HttpApiClient.make(ClusterApi, { baseUrl: BASE_URL });

		return {
			getRandomNumber: Effect.fn("Api/getRandomNumber")(function* () {
				const value = yield* ClusterHttpClient["number-generator"].Get({
					path: { entityId: "test" },
					payload: undefined,
				});

				return value;
			}),
		};
	}),
}) {}

const runtime = ManagedRuntime.make(Layer.mergeAll(Api.Default));

export const getRandomNumber = createServerFn({ method: "POST" }).handler(async () => {
	const value = await runtime.runPromise(
		Effect.gen(function* () {
			const api = yield* Api;

			return yield* api.getRandomNumber();
		}),
	);

	return value;
});
