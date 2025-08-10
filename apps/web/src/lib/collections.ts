import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";
import { DateTime, Schema } from "effect";

import { ConversationModel, MessageModel, MessagePartModel } from "@bella/core/database-schema";

export const conversationsCollection = createCollection(
	electricCollectionOptions({
		getKey: (conversation) => conversation.id,
		id: "conversations",
		schema: Schema.standardSchemaV1(ConversationModel.select),
		shapeOptions: { url: new URL("/api/conversations", import.meta.env.VITE_WEB_BASE_URL).toString() },
	}),
);

export const messagesCollection = createCollection(
	electricCollectionOptions({
		getKey: (message) => message.id,
		id: "messages",
		schema: Schema.standardSchemaV1(MessageModel.select),
		shapeOptions: {
			parser: { timestamptz: (date: string) => DateTime.unsafeMake(date) },
			url: new URL("/api/messages", import.meta.env.VITE_WEB_BASE_URL).toString(),
		},
	}),
);

export const messagePartsCollection = createCollection(
	electricCollectionOptions({
		getKey: (messagePart) => messagePart.id,
		id: "messages",
		schema: Schema.standardSchemaV1(MessagePartModel.select),
		shapeOptions: { url: new URL("/api/message-parts", import.meta.env.VITE_WEB_BASE_URL).toString() },
	}),
);
