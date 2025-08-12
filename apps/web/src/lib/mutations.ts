import { createOptimisticAction } from "@tanstack/react-db";
import { useNavigate } from "@tanstack/react-router";
import { DateTime } from "effect";

import type { ConversationActionData } from "#src/lib/api.js";

import { continueConversationProcedure, startNewConversationProcedure } from "#src/lib/api.js";
import {
	conversationsCollection,
	ConversationShape,
	messagePartsCollection,
	messagesCollection,
	MessageShape,
	TextMessagePartShape,
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

			data.userMessage.parts.forEach((messagePart) => {
				messagePartsCollection.insert({
					createdAt: now,
					data: messagePart.data,
					id: messagePart.id,
					messageId: data.userMessage.id,
					type: messagePart.type,
				});
			});

			messagesCollection.insert({
				conversationId: data.conversationId,
				createdAt: now,
				id: data.assistantMessage.id,
				role: "ASSISTANT",
				status: "IN_PROGRESS",
			});
		},
	});

	const handler = (userMessageText: TextMessagePartShape["data"]["text"]) => {
		const conversationId = ConversationShape.fields.id.make(generateId());
		const userMessageId = MessageShape.fields.id.make(generateId());
		const assistantMessageId = MessageShape.fields.id.make(generateId());
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
				messagesCollection.utils.awaitTxId(transactionId),
				messagePartsCollection.utils.awaitTxId(transactionId),
			]);
		},
		onMutate: (data: ConversationActionData) => {
			const now = DateTime.unsafeNow();

			messagesCollection.insert({
				conversationId: data.conversationId,
				createdAt: now,
				id: data.userMessage.id,
				role: "USER",
				status: "COMPLETED",
			});

			data.userMessage.parts.forEach((messagePart) => {
				messagePartsCollection.insert({
					createdAt: now,
					data: messagePart.data,
					id: messagePart.id,
					messageId: data.userMessage.id,
					type: messagePart.type,
				});
			});

			messagesCollection.insert({
				conversationId: data.conversationId,
				createdAt: now,
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
		const userMessageId = MessageShape.fields.id.make(generateId());
		const assistantMessageId = MessageShape.fields.id.make(generateId());
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
