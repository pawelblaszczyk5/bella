import { eq, useLiveQuery } from "@tanstack/react-db";

import { assert } from "@bella/assert";
import { spacing } from "@bella/design-system/theme/spacing.stylex";
import stylex from "@bella/stylex";

import type { ConversationShape } from "#src/lib/collections.js";

import { Composer } from "#src/components/composer.js";
import { Message } from "#src/components/message.js";
import { conversationsCollection, messagesCollection } from "#src/lib/collections.js";
import { useContinueConversation } from "#src/lib/mutations.js";

const styles = stylex.create({
	composerContainer: { inlineSize: "max-content", insetBlockEnd: spacing[4], marginInline: "auto", position: "sticky" },
	messagesList: {
		display: "flex",
		flexDirection: "column",
		flexGrow: "1",
		gap: spacing[5],
		inlineSize: 1_024,
		marginInline: "auto",
		minBlockSize: "100%",
	},
	root: { display: "flex", flexDirection: "column", gap: spacing[6], minBlockSize: "100%", position: "relative" },
});

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

			<div {...stylex.props(styles.root)}>
				<div {...stylex.props(styles.messagesList)}>
					{messages.map((message) => (
						<Message id={message.id} key={message.id} />
					))}
				</div>
				<div {...stylex.props(styles.composerContainer)}>
					<Composer
						isGenerationInProgress={false}
						onStopGeneration={() => null}
						onSubmit={(userMessageText) => continueConversation({ conversationId: conversation.id, userMessageText })}
					/>
				</div>
			</div>
		</>
	);
};
