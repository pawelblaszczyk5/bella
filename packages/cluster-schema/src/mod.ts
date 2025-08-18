import { Entity } from "@effect/cluster";
import { Rpc } from "@effect/rpc";
import { Workflow } from "@effect/workflow";
import { Schema } from "effect";

import {
	AssistantMessageModel,
	ConversationModel,
	TextMessagePartModel,
	TransactionId,
	UserExperienceEvaluationModel,
	UserMessageModel,
} from "@bella/core/database-schema";

const UserMessage = Schema.Struct({
	id: UserMessageModel.insert.fields.id,
	parts: Schema.Array(Schema.Union(TextMessagePartModel.insert.pick("id", "type", "data"))),
});

const AssistantMessage = Schema.Struct({ id: AssistantMessageModel.insert.fields.id });

export class ConversationFlowError extends Schema.TaggedError<ConversationFlowError>(
	"@bella/core/ConversationFlowError",
)("ConversationFlowError", {
	type: Schema.Literal(
		"GENERATION_ERROR",
		"DATA_ACCESS_ERROR",
		"STOPPING_IDLE",
		"CLASSIFICATION_ERROR",
		"EVALUATION_ERROR",
	),
}) {
	override get message() {
		return `Conversation flow failed with type "${this.type}"`;
	}
}

export class CoppermindIngestionError extends Schema.TaggedError<CoppermindIngestionError>(
	"@bella/core/CoppermindIngestionError",
)("CoppermindIngestionError", { cause: Schema.Defect }) {
	override get message() {
		return `Coppermind ingestion failed`;
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
	// NOTE This shouldn't be there in reality, but it's a shortcut I'm willing to take for now
	// eslint-disable-next-line no-secrets/no-secrets -- that's real name
	Rpc.make("ChangeUserExperienceEvaluationResolvedStatus", {
		error: ConversationFlowError,
		payload: { evaluationId: UserExperienceEvaluationModel.select.fields.id, isResolved: Schema.Boolean },
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

export const IngestCoppermind = Workflow.make({
	error: CoppermindIngestionError,
	idempotencyKey: (payload) => payload.time.epochMillis.toString(),
	name: "IngestCoppermind",
	payload: { time: Schema.DateTimeUtc },
});
