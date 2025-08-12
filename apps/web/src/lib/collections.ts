import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";
import { DateTime, Schema } from "effect";

import { ConversationModel, MessageModel, TextMessagePartModel } from "@bella/core/database-schema";

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

export const MessageShape = Schema.Struct({
	conversationId: ConversationShape.fields.id,
	createdAt: Schema.DateTimeUtcFromSelf,
	id: MessageModel.select.fields.id,
	role: MessageModel.select.fields.role,
	status: MessageModel.select.fields.status,
});

export type MessageShape = Schema.Schema.Type<typeof MessageShape>;

export const messagesCollection = createCollection(
	electricCollectionOptions({
		getKey: (message) => message.id,
		id: "messages",
		schema: Schema.standardSchemaV1(MessageShape),
		shapeOptions: {
			parser: { timestamptz: (date: string) => DateTime.unsafeMake(date) },
			url: new URL("/api/messages", import.meta.env.VITE_WEB_BASE_URL).toString(),
		},
	}),
);

const BaseMessagePartShape = Schema.Struct({
	createdAt: Schema.DateTimeUtcFromSelf,
	id: TextMessagePartModel.select.fields.id,
	messageId: MessageShape.fields.id,
});

export const TextMessagePartShape = Schema.Struct({
	...BaseMessagePartShape.fields,
	data: TextMessagePartModel.select.fields.data,
	type: TextMessagePartModel.select.fields.type,
});

export type TextMessagePartShape = Schema.Schema.Type<typeof TextMessagePartShape>;

export const messagePartsCollection = createCollection(
	electricCollectionOptions({
		getKey: (messagePart) => messagePart.id,
		id: "messages",
		schema: Schema.standardSchemaV1(TextMessagePartShape),
		shapeOptions: {
			parser: { timestamptz: (date: string) => DateTime.unsafeMake(date) },
			url: new URL("/api/message-parts", import.meta.env.VITE_WEB_BASE_URL).toString(),
		},
	}),
);
