import { eq, useLiveQuery } from "@tanstack/react-db";
import Markdown from "react-markdown";

import { assert } from "@bella/assert";

import type { AssistantMessageShape, TextMessagePartShape, UserMessageShape } from "#src/lib/collections.js";

import { messagePartsCollection, messagesCollection } from "#src/lib/collections.js";

const UserMessage = ({
	messageParts,
}: Readonly<{ message: UserMessageShape; messageParts: Array<TextMessagePartShape> }>) => {
	const content = messageParts.map((messagePart) => messagePart.data.text).join("");

	return content;
};

const AssistantMessage = ({
	messageParts,
}: Readonly<{ message: AssistantMessageShape; messageParts: Array<TextMessagePartShape> }>) => {
	const content = messageParts.map((messagePart) => messagePart.data.text).join("");

	return <Markdown>{content}</Markdown>;
};

export const Message = ({ id }: Readonly<{ id: AssistantMessageShape["id"] | UserMessageShape["id"] }>) => {
	const { data: messages } = useLiveQuery(
		(q) => q.from({ messagesCollection }).where(({ messagesCollection }) => eq(messagesCollection.id, id)),
		[id],
	);

	const message = messages.at(0);

	assert(message, "Message for given ID must always exist");

	const { data: messageParts } = useLiveQuery(
		(q) =>
			q
				.from({ messagePartsCollection })
				.where(({ messagePartsCollection }) => eq(messagePartsCollection.messageId, message.id))
				.orderBy(({ messagePartsCollection }) => messagePartsCollection.createdAt.epochMillis, "asc"),
		[message.id],
	);

	if (message.role === "USER") {
		return <UserMessage message={message} messageParts={messageParts} />;
	}

	return <AssistantMessage message={message} messageParts={messageParts} />;
};
