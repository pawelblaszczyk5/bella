import { Entity } from "@effect/cluster";
import { Rpc } from "@effect/rpc";

import { ConversationModel, MessageModel, TextMessagePartModel, TransactionId } from "@bella/core/database-schema";

export const Conversation = Entity.make("Conversation", [
	Rpc.make("Start", {
		payload: {
			assistantMessageId: MessageModel.insert.fields.id,
			title: ConversationModel.insert.fields.title,
			userMessageId: MessageModel.insert.fields.id,
			userMessageTextContent: TextMessagePartModel.insert.fields.data.fields.textContent,
			userTextMessagePartId: TextMessagePartModel.insert.fields.id,
		},
		success: TransactionId,
	}),
	Rpc.make("Continue", { payload: { messageTextContent: TextMessagePartModel.fields.data.fields.textContent } }),
]);
