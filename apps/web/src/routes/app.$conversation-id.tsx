import { eq, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";

import { assert } from "@bella/assert";

import type { MessageShape } from "#src/lib/collections.js";

import { Composer } from "#src/components/composer.js";
import { Markdown } from "#src/components/markdown.js";
import {
	conversationsCollection,
	ConversationShape,
	messagePartsCollection,
	messagesCollection,
} from "#src/lib/collections.js";
import { useContinueConversation } from "#src/lib/mutations.js";

const Message = ({ id }: Readonly<{ id: MessageShape["id"] }>) => {
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

	const content = messageParts.map((messagePart) => messagePart.data.text).join("");

	if (message.role === "USER") {
		return content;
	}

	return <Markdown>{content}</Markdown>;
};

const AppExampleRoute = () => {
	const { conversationId: conversationIdFromUrl } = Route.useLoaderData();

	const continueConversation = useContinueConversation();

	const { data: conversations } = useLiveQuery(
		(q) =>
			q
				.from({ conversationsCollection })
				.where(({ conversationsCollection }) => eq(conversationsCollection.id, conversationIdFromUrl)),
		[conversationIdFromUrl],
	);

	const conversation = conversations.at(0);

	assert(conversation, "Conversation for given ID must always exist");

	const { data: messages } = useLiveQuery(
		(q) =>
			q
				.from({ messagesCollection })
				.where(({ messagesCollection }) => eq(messagesCollection.conversationId, conversation.id))
				.orderBy(({ messagesCollection }) => messagesCollection.createdAt.epochMillis, "asc")
				.select(({ messagesCollection }) => ({ id: messagesCollection.id })),
		[conversation.id],
	);

	return (
		<>
			<title>{`${conversation.title} | Bella`}</title>
			<p>{conversation.id}</p>
			<p>{conversation.title}</p>
			<div>
				{messages.map((message) => (
					<Message id={message.id} key={message.id} />
				))}
			</div>
			<Composer
				onSubmit={(userMessageText) => continueConversation({ conversationId: conversation.id, userMessageText })}
			/>
		</>
	);
};

export const Route = createFileRoute("/app/$conversation-id")({
	component: AppExampleRoute,
	loader: (ctx) => {
		const conversationId = ConversationShape.fields.id.make(ctx.params["conversation-id"]);

		return { conversationId };
	},
});
