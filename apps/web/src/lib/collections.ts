import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection, localStorageCollectionOptions } from "@tanstack/react-db";
import { DateTime, Schema } from "effect";

import {
	AssistantMessageModel,
	ConversationModel,
	CoppermindSearchMessagePartModel,
	CoppermindSearchResult,
	ReasoningMessagePartModel,
	TextMessagePartModel,
	UserExperienceEvaluationModel,
	UserMessageModel,
} from "@bella/core/database-schema";

export const ConversationShape = Schema.Struct({
	createdAt: Schema.DateTimeUtcFromSelf,
	deletedAt: Schema.NullOr(Schema.DateTimeUtcFromSelf),
	id: ConversationModel.select.fields.id,
	title: ConversationModel.select.fields.title,
	updatedAt: Schema.DateTimeUtcFromSelf,
});

export type ConversationShape = Schema.Schema.Type<typeof ConversationShape>;

export const conversationsCollection = createCollection(
	electricCollectionOptions({
		getKey: (conversation) => conversation.id,
		id: "conversations",
		schema: Schema.standardSchemaV1(ConversationShape),
		shapeOptions: {
			parser: { timestamptz: (date: string) => DateTime.unsafeMake(date) },
			url: new URL("/api/conversations", import.meta.env.VITE_WEB_BASE_URL).toString(),
		},
	}),
);

const BaseMessageShapeFields = { conversationId: ConversationShape.fields.id, createdAt: Schema.DateTimeUtcFromSelf };

export const AssistantMessageShape = Schema.Struct({
	...BaseMessageShapeFields,
	id: AssistantMessageModel.select.fields.id,
	role: AssistantMessageModel.select.fields.role,
	status: AssistantMessageModel.select.fields.status,
});

export type AssistantMessageShape = Schema.Schema.Type<typeof AssistantMessageShape>;

export const UserMessageShape = Schema.Struct({
	...BaseMessageShapeFields,
	id: UserMessageModel.select.fields.id,
	role: UserMessageModel.select.fields.role,
	status: UserMessageModel.select.fields.status,
});

export type UserMessageShape = Schema.Schema.Type<typeof UserMessageShape>;

export const messagesCollection = createCollection(
	electricCollectionOptions({
		getKey: (message) => message.id,
		id: "messages",
		schema: Schema.standardSchemaV1(Schema.Union(AssistantMessageShape, UserMessageShape)),
		shapeOptions: {
			parser: { timestamptz: (date: string) => DateTime.unsafeMake(date) },
			url: new URL("/api/messages", import.meta.env.VITE_WEB_BASE_URL).toString(),
		},
	}),
);

const BaseMessagePartShapeFields = { createdAt: Schema.DateTimeUtcFromSelf };

export const TextMessagePartShape = Schema.Struct({
	...BaseMessagePartShapeFields,
	data: TextMessagePartModel.select.fields.data,
	id: TextMessagePartModel.select.fields.id,
	messageId: TextMessagePartModel.select.fields.messageId,
	type: TextMessagePartModel.select.fields.type,
});

export type TextMessagePartShape = Schema.Schema.Type<typeof TextMessagePartShape>;

export const ReasoningMessagePartShape = Schema.Struct({
	...BaseMessagePartShapeFields,
	data: ReasoningMessagePartModel.select.fields.data,
	id: ReasoningMessagePartModel.select.fields.id,
	messageId: ReasoningMessagePartModel.select.fields.messageId,
	type: ReasoningMessagePartModel.select.fields.type,
});

export type ReasoningMessagePartShape = Schema.Schema.Type<typeof ReasoningMessagePartShape>;

export const CoppermindSearchMessagePartShape = Schema.Struct({
	...BaseMessagePartShapeFields,
	data: Schema.Struct({
		queries: CoppermindSearchMessagePartModel.select.fields.data.fields.queries,
		results: Schema.Array(CoppermindSearchResult).pipe(Schema.NullOr),
	}),
	id: CoppermindSearchMessagePartModel.select.fields.id,
	messageId: CoppermindSearchMessagePartModel.select.fields.messageId,
	type: CoppermindSearchMessagePartModel.select.fields.type,
});

export type CoppermindSearchMessagePartShape = Schema.Schema.Type<typeof CoppermindSearchMessagePartShape>;

export const messagePartsCollection = createCollection(
	electricCollectionOptions({
		getKey: (messagePart) => messagePart.id,
		id: "messageParts",
		schema: Schema.standardSchemaV1(
			Schema.Union(TextMessagePartShape, ReasoningMessagePartShape, CoppermindSearchMessagePartShape),
		),
		shapeOptions: {
			parser: { timestamptz: (date: string) => DateTime.unsafeMake(date) },
			url: new URL("/api/message-parts", import.meta.env.VITE_WEB_BASE_URL).toString(),
		},
	}),
);

const UserPreferenceShape = Schema.Union(
	Schema.Struct({ type: Schema.Literal("COLOR_MODE"), value: Schema.Literal("DARK", "LIGHT", "SYSTEM") }),
	Schema.Struct({ type: Schema.Literal("LANGUAGE"), value: Schema.Literal("pl-PL", "en-US") }),
);

export const userPreferencesCollection = createCollection(
	localStorageCollectionOptions({
		getKey: (userPreference) => userPreference.type,
		id: "userPreferences",
		schema: Schema.standardSchemaV1(UserPreferenceShape),
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, n/no-unsupported-features/node-builtins -- come on
		storage: globalThis.localStorage ?? {},
		storageEventApi: globalThis,
		storageKey: "bella-user-preferences",
	}),
);

export const UserExperienceEvaluationShape = Schema.Struct({
	category: UserExperienceEvaluationModel.select.fields.category,
	createdAt: Schema.DateTimeUtcFromSelf,
	description: UserExperienceEvaluationModel.select.fields.description,
	id: UserExperienceEvaluationModel.select.fields.id,
	messageId: UserExperienceEvaluationModel.select.fields.messageId,
	resolvedAt: Schema.NullOr(Schema.DateTimeUtcFromSelf),
	severity: UserExperienceEvaluationModel.select.fields.severity,
});

export type UserExperienceEvaluationShape = Schema.Schema.Type<typeof UserExperienceEvaluationShape>;

export const userExperienceEvaluationCollection = createCollection(
	electricCollectionOptions({
		getKey: (userExperienceEvaluation) => userExperienceEvaluation.id,
		id: "userExperienceEvaluation",
		schema: Schema.standardSchemaV1(UserExperienceEvaluationShape),
		shapeOptions: {
			parser: { timestamptz: (date: string) => DateTime.unsafeMake(date) },
			url: new URL("/api/user-experience-evaluations", import.meta.env.VITE_WEB_BASE_URL).toString(),
		},
	}),
);
