import { eq, useLiveQuery } from "@tanstack/react-db";

import { assert } from "@bella/assert";
import { spacing } from "@bella/design-system/theme/spacing.stylex";
import stylex from "@bella/stylex";

import type { ConversationShape } from "#src/lib/collections.js";

import { Composer } from "#src/components/composer.js";
import { Message } from "#src/components/message.js";
import { conversationsCollection, messagesCollection } from "#src/lib/collections.js";
import { useContinueConversation, useStopGeneration } from "#src/lib/mutations.js";
import { useConversationState } from "#src/lib/use-conversation-state.js";

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
	const stopGeneration = useStopGeneration();

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
				.orderBy(({ messagesCollection }) => messagesCollection.createdAt.epochMillis, "asc"),
		[conversation.id],
	);

	const conversationState = useConversationState(conversation.id);

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
						onStopGeneration={() => {
							const assistantMessage = messages.at(-1);

							assert(assistantMessage, "Message must exist if stopping generation");
							assert(assistantMessage.role === "ASSISTANT", "Can stop generation only if assistant message is last");
							assert(assistantMessage.status === "IN_PROGRESS", "Can stop generation if message is already completed");

							stopGeneration({ assistantMessageId: assistantMessage.id, conversationId: conversation.id });
						}}
						isGenerationInProgress={conversationState === "GENERATING"}
						onSubmit={(userMessageText) => continueConversation({ conversationId: conversation.id, userMessageText })}
					/>
				</div>
			</div>
		</>
	);
};
