import { eq, useLiveQuery } from "@tanstack/react-db";
import { Match } from "effect";

import { assert } from "@bella/assert";

import type { ConversationShape } from "#src/lib/collections.js";

import { messagesCollection } from "#src/lib/collections.js";

export const useConversationState = (conversationId: ConversationShape["id"]) => {
	const { data: messages } = useLiveQuery(
		(q) =>
			q
				.from({ messagesCollection })
				.where(({ messagesCollection }) => eq(messagesCollection.conversationId, conversationId))
				.orderBy(({ messagesCollection }) => messagesCollection.createdAt.epochMillis, "desc")
				.limit(1)
				.select(({ messagesCollection }) => ({
					id: messagesCollection.id,
					role: messagesCollection.role,
					status: messagesCollection.status,
				})),
		[conversationId],
	);

	const message = messages.at(0);

	assert(message, "At least one message must exist in each conversation");
	assert(message.role === "ASSISTANT", "Assistant message must always be latest");

	return Match.value(message.status).pipe(
		Match.when("COMPLETED", () => "IDLE" as const),
		Match.when("INTERRUPTED", () => "IDLE" as const),
		Match.when("IN_PROGRESS", () => "GENERATING" as const),
		Match.exhaustive,
	);
};
