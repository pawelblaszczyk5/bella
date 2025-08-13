import { eq, useLiveQuery } from "@tanstack/react-db";

import { assert } from "@bella/assert";
import { mauve, violet } from "@bella/design-system/theme/color.stylex";
import { radii } from "@bella/design-system/theme/radii.stylex";
import { spacing } from "@bella/design-system/theme/spacing.stylex";
import stylex from "@bella/stylex";

import type { AssistantMessageShape, TextMessagePartShape, UserMessageShape } from "#src/lib/collections.js";

import { Markdown } from "#src/components/markdown.js";
import { messagePartsCollection, messagesCollection } from "#src/lib/collections.js";

const styles = stylex.create({
	assistantMessage: { alignSelf: "flex-start" },
	assistantMessageThinking: { color: mauve[11] },
	base: { borderRadius: radii[5], maxInlineSize: "90%", paddingBlock: spacing[4], paddingInline: spacing[6] },
	userMessage: { alignSelf: "flex-end", backgroundColor: violet[2] },
});

const UserMessage = ({
	messageParts,
}: Readonly<{ message: UserMessageShape; messageParts: Array<TextMessagePartShape> }>) => {
	const content = messageParts.map((messagePart) => messagePart.data.text).join("");

	return <p {...stylex.props(styles.base, styles.userMessage)}>{content}</p>;
};

const AssistantMessage = ({
	messageParts,
}: Readonly<{ message: AssistantMessageShape; messageParts: Array<TextMessagePartShape> }>) => {
	const content = messageParts.map((messagePart) => messagePart.data.text).join("");

	if (messageParts.length === 0) {
		return (
			<div {...stylex.props(styles.base, styles.assistantMessage, styles.assistantMessageThinking)}>Thinking 🤔</div>
		);
	}

	return (
		<div {...stylex.props(styles.base, styles.assistantMessage)}>
			<Markdown>{content}</Markdown>
		</div>
	);
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
