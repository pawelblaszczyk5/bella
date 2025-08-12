import { Entity } from "@effect/cluster";
import { Rpc } from "@effect/rpc";
import { Schema } from "effect";

import { MessageModel, TextMessagePartModel, TransactionId } from "@bella/core/database-schema";

const UserMessage = Schema.Struct({
	id: MessageModel.insert.fields.id,
	parts: Schema.Array(
		Schema.Union(
			Schema.Struct({
				data: TextMessagePartModel.insert.fields.data,
				id: TextMessagePartModel.insert.fields.id,
				type: TextMessagePartModel.insert.fields.type,
			}),
		),
	),
});

const AssistantMessage = Schema.Struct({ id: MessageModel.insert.fields.id });

export const Conversation = Entity.make("Conversation", [
	Rpc.make("Start", {
		payload: { assistantMessage: AssistantMessage, userMessage: UserMessage },
		success: TransactionId,
	}),
	Rpc.make("Continue", {
		payload: { assistantMessage: AssistantMessage, userMessage: UserMessage },
		success: TransactionId,
	}),
]);
