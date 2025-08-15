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
