import type { DeepMutable } from "effect/Types";
import type { WritableDeep } from "type-fest";

import { createOptimisticAction } from "@tanstack/react-db";
import { useNavigate } from "@tanstack/react-router";
import { DateTime, Duration } from "effect";

import type {
	ChangeUserExperienceEvaluationResolvedStatusData,
	ConversationActionData,
	StopGenerationData,
} from "#src/lib/api.js";

import {
	changeUserExperienceEvaluationResolvedStatusProcedure,
	continueConversationProcedure,
	startNewConversationProcedure,
	stopGenerationProcedure,
} from "#src/lib/api.js";
import {
	AssistantMessageShape,
	conversationsCollection,
	ConversationShape,
	messagePartsCollection,
	messagesCollection,
	TextMessagePartShape,
	userExperienceEvaluationCollection,
	UserMessageShape,
} from "#src/lib/collections.js";
import { generateId } from "#src/lib/id-pool.js";

export const useStartNewConversation = () => {
	const navigate = useNavigate();

	const action = createOptimisticAction({
		mutationFn: async (data) => {
			const transactionId = await startNewConversationProcedure({ data });

			await Promise.all([
				conversationsCollection.utils.awaitTxId(transactionId),
				messagesCollection.utils.awaitTxId(transactionId),
				messagePartsCollection.utils.awaitTxId(transactionId),
			]);
		},
		onMutate: (data: ConversationActionData) => {
			// NOTE: Not 100% sure about this approach but also not sure about alternative 🤔
			const now = DateTime.unsafeNow();

			conversationsCollection.insert({
				createdAt: now,
				deletedAt: null,
				id: data.conversationId,
				title: "Loading..",
				updatedAt: now,
			});

			messagesCollection.insert({
				conversationId: data.conversationId,
				createdAt: now,
				id: data.userMessage.id,
				role: "USER",
				status: "COMPLETED",
			});

			data.userMessage.parts.forEach((messagePart, index) => {
				messagePartsCollection.insert({
					createdAt: now.pipe(DateTime.addDuration(Duration.millis(index))),
					data: messagePart.data,
					id: messagePart.id,
					messageId: data.userMessage.id,
					type: messagePart.type,
				});
			});

			messagesCollection.insert({
				conversationId: data.conversationId,
				createdAt: now.pipe(DateTime.addDuration(Duration.millis(data.userMessage.parts.length))),
				id: data.assistantMessage.id,
				role: "ASSISTANT",
				status: "IN_PROGRESS",
			});
		},
	});

	const handler = (userMessageText: TextMessagePartShape["data"]["text"]) => {
		const conversationId = ConversationShape.fields.id.make(generateId());
		const userMessageId = UserMessageShape.fields.id.make(generateId());
		const assistantMessageId = AssistantMessageShape.fields.id.make(generateId());
		const userMessageTextPartId = TextMessagePartShape.fields.id.make(generateId());

		const transaction = action({
			assistantMessage: { id: assistantMessageId },
			conversationId,
			userMessage: {
				id: userMessageId,
				parts: [{ data: { text: userMessageText }, id: userMessageTextPartId, type: "text" }],
			},
		});

		void navigate({ params: { "conversation-id": conversationId }, to: "/app/$conversation-id" });

		return transaction;
	};

	return handler;
};

// eslint-disable-next-line react-hooks-extra/no-redundant-custom-hook, react-hooks-extra/no-useless-custom-hooks -- let me live like this for now
export const useContinueConversation = () => {
	const action = createOptimisticAction({
		mutationFn: async (data) => {
			const transactionId = await continueConversationProcedure({ data });

			await Promise.all([
				conversationsCollection.utils.awaitTxId(transactionId),
				messagesCollection.utils.awaitTxId(transactionId),
				messagePartsCollection.utils.awaitTxId(transactionId),
			]);
		},
		onMutate: (data: ConversationActionData) => {
			const now = DateTime.unsafeNow();

			conversationsCollection.update(data.conversationId, (draft) => {
				const mutableDraft = draft as DeepMutable<typeof draft>;

				mutableDraft.updatedAt = now;
			});

			messagesCollection.insert({
				conversationId: data.conversationId,
				createdAt: now,
				id: data.userMessage.id,
				role: "USER",
				status: "COMPLETED",
			});

			data.userMessage.parts.forEach((messagePart, index) => {
				messagePartsCollection.insert({
					createdAt: now.pipe(DateTime.addDuration(Duration.millis(index))),
					data: messagePart.data,
					id: messagePart.id,
					messageId: data.userMessage.id,
					type: messagePart.type,
				});
			});

			messagesCollection.insert({
				conversationId: data.conversationId,
				createdAt: now.pipe(DateTime.addDuration(Duration.millis(data.userMessage.parts.length))),
				id: data.assistantMessage.id,
				role: "ASSISTANT",
				status: "IN_PROGRESS",
			});
		},
	});

	const handler = (payload: {
		conversationId: ConversationShape["id"];
		userMessageText: TextMessagePartShape["data"]["text"];
	}) => {
		const userMessageId = UserMessageShape.fields.id.make(generateId());
		const assistantMessageId = AssistantMessageShape.fields.id.make(generateId());
		const userMessageTextPartId = TextMessagePartShape.fields.id.make(generateId());

		const transaction = action({
			assistantMessage: { id: assistantMessageId },
			conversationId: payload.conversationId,
			userMessage: {
				id: userMessageId,
				parts: [{ data: { text: payload.userMessageText }, id: userMessageTextPartId, type: "text" }],
			},
		});

		return transaction;
	};

	return handler;
};

// eslint-disable-next-line react-hooks-extra/no-redundant-custom-hook, react-hooks-extra/no-useless-custom-hooks -- let me live like this for now
export const useStopGeneration = () => {
	const action = createOptimisticAction({
		mutationFn: async (data) => {
			const transactionId = await stopGenerationProcedure({ data });

			await messagesCollection.utils.awaitTxId(transactionId);
		},
		onMutate: (data: StopGenerationData) => {
			messagesCollection.update(data.assistantMessage.id, (draft) => {
				// NOTE this should be resolved after this https://github.com/TanStack/db/issues/407
				const mutableDraft = draft as WritableDeep<typeof draft>;

				mutableDraft.status = "INTERRUPTED";
			});
		},
	});

	const handler = (payload: {
		assistantMessageId: AssistantMessageShape["id"];
		conversationId: ConversationShape["id"];
	}) => {
		const transaction = action({
			assistantMessage: { id: payload.assistantMessageId },
			conversationId: payload.conversationId,
		});

		return transaction;
	};

	return handler;
};

// eslint-disable-next-line react-hooks-extra/no-redundant-custom-hook, react-hooks-extra/no-useless-custom-hooks -- let me live like this for now
export const useChangeUserExperienceEvaluationResolvedStatus = () => {
	const action = createOptimisticAction({
		mutationFn: async (data) => {
			const transactionId = await changeUserExperienceEvaluationResolvedStatusProcedure({ data });

			await userExperienceEvaluationCollection.utils.awaitTxId(transactionId);
		},
		onMutate: (data: ChangeUserExperienceEvaluationResolvedStatusData) => {
			userExperienceEvaluationCollection.update(data.evaluationId, (draft) => {
				// NOTE this should be resolved after this https://github.com/TanStack/db/issues/407
				const mutableDraft = draft as WritableDeep<typeof draft>;

				mutableDraft.resolvedAt = DateTime.unsafeNow();
			});
		},
	});

	const handler = (payload: ChangeUserExperienceEvaluationResolvedStatusData) => {
		const transaction = action(payload);

		return transaction;
	};

	return handler;
};
