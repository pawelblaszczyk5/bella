import { Entity } from "@effect/cluster";
import { Rpc } from "@effect/rpc";
import { Workflow } from "@effect/workflow";
import { Schema } from "effect";

import {
	AssistantMessageModel,
	ConversationModel,
	TextMessagePartModel,
	TransactionId,
	UserMessageModel,
} from "@bella/core/database-schema";

const UserMessage = Schema.Struct({
	id: UserMessageModel.insert.fields.id,
	parts: Schema.Array(Schema.Union(TextMessagePartModel.insert.pick("id", "type", "data"))),
});

const AssistantMessage = Schema.Struct({ id: AssistantMessageModel.insert.fields.id });

export class ConversationFlowError extends Schema.TaggedError<ConversationFlowError>(
	"@bella/core/ConversationFlowError",
)("ConversationFlowError", { type: Schema.Literal("GENERATION_ERROR", "DATA_ACCESS_ERROR", "STOPPING_IDLE") }) {
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
	Rpc.make("StopGeneration", {
		error: ConversationFlowError,
		payload: { assistantMessage: AssistantMessage },
		success: TransactionId,
	}),
]);

export const GenerateMessage = Workflow.make({
	error: ConversationFlowError,
	idempotencyKey: ({ assistantMessage, conversationId }) => `${conversationId}/${assistantMessage.id}`,
	name: "GenerateMessage",
	payload: { assistantMessage: AssistantMessage, conversationId: ConversationModel.select.fields.id },
	success: Schema.Void,
});
