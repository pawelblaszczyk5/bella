import { Otlp } from "@effect/opentelemetry";
import { FetchHttpClient } from "@effect/platform";
import { Config, Effect, Layer } from "effect";

export const OpentelemetryLive = Layer.unwrapEffect(
	Effect.gen(function* () {
		const BASE_URL = yield* Config.string("OPENTELEMETRY_BASE_URL");
		const SERVICE_NAME = yield* Config.string("OPENTELEMETRY_SERVICE_NAME");

		return Otlp.layer({ baseUrl: BASE_URL, resource: { serviceName: SERVICE_NAME } });
	}),
).pipe(Layer.provide(FetchHttpClient.layer));
