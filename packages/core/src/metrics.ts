import { Metric } from "effect";

export const modelUsageTotal = Metric.counter("model_usage_total", {
	description: "Total count of each model usage in fulfillment path",
	incremental: true,
});

export const responseTotal = Metric.counter("response_total", {
	description: "Total count of response, tagged by response type",
	incremental: true,
});
