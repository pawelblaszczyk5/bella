import { Schema } from "effect";

import type {
	AssistantMessageModel,
	ReasoningMessagePartModel,
	TextMessagePartModel,
	UserMessageModel,
} from "#src/database/schema.js";

export type MessagesWithParts = Array<
	| {
			id: AssistantMessageModel["id"];
			parts: Array<
				| Pick<ReasoningMessagePartModel, "data" | "id" | "messageId" | "type">
				| Pick<TextMessagePartModel, "data" | "id" | "messageId" | "type">
			>;
			role: AssistantMessageModel["role"];
	  }
	| {
			id: UserMessageModel["id"];
			parts: Array<Pick<TextMessagePartModel, "data" | "id" | "messageId" | "type">>;
			role: UserMessageModel["role"];
	  }
>;

export class ResponseRefusal extends Schema.TaggedClass<ResponseRefusal>("Bella/Core/ResponseRefusal")(
	"ResponseRefusal",
	{ language: Schema.NonEmptyTrimmedString, reason: Schema.Literal("USER_HOSTILITY", "POLITICS") },
) {}

export class ResponseFulfillment extends Schema.TaggedClass<ResponseFulfillment>("Bella/Core/ResponseFulfillment")(
	"ResponseFulfillment",
	{
		answerStyle: Schema.Literal("FORMAL", "FRIENDLY"),
		language: Schema.NonEmptyTrimmedString,
		model: Schema.Literal(
			"GOOGLE:GEMINI-2.5-PRO",
			"GOOGLE:GEMINI-2.5-FLASH",
			"GOOGLE:GEMINI-2.5-FLASH-LITE",
			"ANTHROPIC:CLAUDE-4-SONNET",
		),
		reasoningEnabled: Schema.Boolean,
	},
) {}

export const ResponsePlan = Schema.Union(ResponseRefusal, ResponseFulfillment);

export type ResponsePlan = Schema.Schema.Type<typeof ResponsePlan>;
