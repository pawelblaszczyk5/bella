import { Metric } from "effect";

export const modelUsageTotal = Metric.counter("modelUsageTotal", {
	description: "Total count of each model usage in fulfillment path",
	incremental: true,
})

export const responseTotal = Metric.counter("responseTotal", {
	description: "Total count of response, tagged by response type",
	incremental: true,
});
