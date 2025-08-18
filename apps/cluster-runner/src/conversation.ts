import { Entity } from "@effect/cluster";
import { Effect, Layer } from "effect";

import { Conversation, ConversationFlowError, GenerateMessage } from "@bella/cluster-schema";
import { Bella } from "@bella/core";
import { ConversationModel } from "@bella/core/database-schema";

export const ConversationLive = Conversation.toLayer(
	Effect.gen(function* () {
		const bella = yield* Bella;

		const entityAddress = yield* Entity.CurrentAddress;
		const conversationId = ConversationModel.fields.id.make(entityAddress.entityId);

		return {
			ChangeUserExperienceEvaluationResolvedStatus: Effect.fn(
				// eslint-disable-next-line no-secrets/no-secrets -- that's a real name
				"Conversation/ChangeUserExperienceEvaluationResolvedStatus",
			)(function* (envelope) {
				const transactionId = yield* bella
					.changeUserExperienceEvaluationResolvedStatus({
						id: envelope.payload.evaluationId,
						isResolved: envelope.payload.isResolved,
					})
					.pipe(Effect.mapError(() => new ConversationFlowError({ type: "DATA_ACCESS_ERROR" })));

				return transactionId;
			}),
			Continue: Effect.fn("Conversation/Continue")(function* (envelope) {
				const transactionId = yield* bella
					.continueConversation({
						assistantMessage: envelope.payload.assistantMessage,
						conversationId,
						userMessage: envelope.payload.userMessage,
					})
					.pipe(Effect.mapError(() => new ConversationFlowError({ type: "DATA_ACCESS_ERROR" })));

				yield* GenerateMessage.execute(
					{ assistantMessage: envelope.payload.assistantMessage, conversationId },
					{ discard: true },
				);

				return transactionId;
			}),
			Start: Effect.fn("Conversation/Start")(function* (envelope) {
				const transactionId = yield* bella
					.createNewConversation({
						assistantMessage: envelope.payload.assistantMessage,
						conversationId,
						userMessage: envelope.payload.userMessage,
					})
					.pipe(Effect.mapError(() => new ConversationFlowError({ type: "DATA_ACCESS_ERROR" })));

				yield* GenerateMessage.execute(
					{ assistantMessage: envelope.payload.assistantMessage, conversationId },
					{ discard: true },
				);

				return transactionId;
			}),
			StopGeneration: Effect.fn("Conversation/StopGeneration")(function* (envelope) {
				const executionId = yield* GenerateMessage.executionId({
					assistantMessage: envelope.payload.assistantMessage,
					conversationId,
				});

				yield* GenerateMessage.interrupt(executionId);

				const transactionId = yield* bella
					.markMessageAsInterrupted(envelope.payload.assistantMessage.id)
					.pipe(Effect.mapError(() => new ConversationFlowError({ type: "DATA_ACCESS_ERROR" })));

				return transactionId;
			}),
		};
	}),
).pipe(Layer.provide(Bella.Default));
