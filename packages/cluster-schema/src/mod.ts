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

export class ConversationFlowError extends Schema.TaggedError<ConversationFlowError>(
	"@bella/core/ConversationFlowError",
)("ConversationFlowError", { type: Schema.Literal("AI_PROVIDER_ERROR", "DATA_ACCESS_ERROR") }) {
	override get message() {
		return `Conversation flow failed with type "${this.type}"`;
	}
}

export const Conversation = Entity.make("Conversation", [
	Rpc.make("Start", {
		error: ConversationFlowError,
		payload: { assistantMessage: AssistantMessage, userMessage: UserMessage },
		success: TransactionId,
	}),
	Rpc.make("Continue", {
		error: ConversationFlowError,
		payload: { assistantMessage: AssistantMessage, userMessage: UserMessage },
		success: TransactionId,
	}),
]);
