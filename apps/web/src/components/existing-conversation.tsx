import { eq, useLiveQuery } from "@tanstack/react-db";

import { assert } from "@bella/assert";

import type { ConversationShape } from "#src/lib/collections.js";

import { Composer } from "#src/components/composer.js";
import { Message } from "#src/components/message.js";
import { conversationsCollection, messagesCollection } from "#src/lib/collections.js";
import { useContinueConversation } from "#src/lib/mutations.js";

export const ExistingConversation = ({ conversationId }: Readonly<{ conversationId: ConversationShape["id"] }>) => {
	const continueConversation = useContinueConversation();

	const { data: conversations } = useLiveQuery(
		(q) =>
			q
				.from({ conversationsCollection })
				.where(({ conversationsCollection }) => eq(conversationsCollection.id, conversationId)),
		[conversationId],
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
