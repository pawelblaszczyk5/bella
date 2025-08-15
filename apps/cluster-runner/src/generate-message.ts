import { Activity } from "@effect/workflow";
import { Duration, Effect, Stream } from "effect";

import { ConversationFlowError, GenerateMessage } from "@bella/cluster-schema";
import { Bella, ResponsePlan } from "@bella/core";

export const GenerateMessageLive = GenerateMessage.toLayer(
	Effect.fn(function* (payload) {
		const bella = yield* Bella;

		const responsePlan = yield* Activity.make({
			error: ConversationFlowError,
			execute: Effect.gen(function* () {
				const responsePlan = yield* bella
					.getResponsePlan(payload.conversationId)
					.pipe(Effect.mapError(() => new ConversationFlowError({ type: "CLASSIFICATION_ERROR" })));

				return responsePlan;
			}),
			name: "determineResponsePlan",
			success: ResponsePlan,
		});

		yield* Activity.make({
			error: ConversationFlowError,
			execute: Effect.gen(function* () {
				yield* Effect.log(responsePlan);

				const messageStream = yield* bella
					.getNewMessageStream({ conversationId: payload.conversationId, responsePlan })
					.pipe(Effect.mapError(() => new ConversationFlowError({ type: "DATA_ACCESS_ERROR" })));

				const cachedIsMessageInterrupted = yield* Effect.cachedWithTTL(
					bella.checkIsMessageInterrupted(payload.assistantMessage.id),
					Duration.millis(150),
				);

				yield* messageStream.pipe(
					Stream.takeUntilEffect(() => cachedIsMessageInterrupted),
					Stream.runForEach(
						Effect.fn(function* (response) {
							yield* Effect.forEach(
								response.parts,
								Effect.fn(function* (part) {
									const isMessageInterrupted = yield* cachedIsMessageInterrupted;

									if (isMessageInterrupted) {
										return;
									}

									yield* bella.handleStreamedPart({ assistantMessageId: payload.assistantMessage.id, part });
								}),
							);
						}),
					),
					Effect.mapError(() => new ConversationFlowError({ type: "GENERATION_ERROR" })),
				);
			}),
			name: "generateAnswerContent",
		});
	}),
);
