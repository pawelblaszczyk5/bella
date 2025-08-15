import type { WritableDeep } from "type-fest";

import { eq, useLiveQuery } from "@tanstack/react-db";

import { assert } from "@bella/assert";
import { mauve, violet } from "@bella/design-system/theme/color.stylex";
import { radii } from "@bella/design-system/theme/radii.stylex";
import { spacing } from "@bella/design-system/theme/spacing.stylex";
import stylex from "@bella/stylex";

import type {
	AssistantMessageShape,
	ReasoningMessagePartShape,
	TextMessagePartShape,
	UserMessageShape,
} from "#src/lib/collections.js";

import { Markdown } from "#src/components/markdown.js";
import { ReasoningDisclosure } from "#src/components/reasoning-disclosure.js";
import { messagePartsCollection, messagesCollection } from "#src/lib/collections.js";

const styles = stylex.create({
	assistantMessage: { alignSelf: "flex-start" },
	assistantMessageStatus: { color: mauve[11] },
	assistantMessageStretched: { inlineSize: "100%" },
	base: { borderRadius: radii[5], maxInlineSize: "90%", paddingBlock: spacing[4], paddingInline: spacing[5] },
	userMessage: {
		alignSelf: "flex-end",
		backgroundColor: violet[3],
		borderColor: violet[6],
		borderRadius: radii[4],
		borderStyle: "solid",
		borderWidth: 1,
	},
});

const mergeMessageParts = (messageParts: Array<ReasoningMessagePartShape | TextMessagePartShape>) =>
	messageParts.reduce<Array<ReasoningMessagePartShape | TextMessagePartShape>>((accumulator, messagePart) => {
		const lastPart = accumulator.at(-1);

		if (lastPart?.type !== messagePart.type) {
			const clonedPart = structuredClone(messagePart);

			accumulator.push(clonedPart);

			return accumulator;
		}

		// NOTE: That's a little hacky, maybe I could do it prettier
		const writableLastPart = lastPart as WritableDeep<typeof lastPart>;

		writableLastPart.data.text += messagePart.data.text;

		return accumulator;
	}, []);

const UserMessage = ({
	messageParts,
}: Readonly<{ message: UserMessageShape; messageParts: Array<TextMessagePartShape> }>) => {
	const content = messageParts.map((messagePart) => messagePart.data.text).join("");

	return <p {...stylex.props(styles.base, styles.userMessage)}>{content}</p>;
};

const AssistantMessage = ({
	message,
	messageParts,
}: Readonly<{
	message: AssistantMessageShape;
	messageParts: Array<ReasoningMessagePartShape | TextMessagePartShape>;
}>) => {
	const mergedMessageParts = mergeMessageParts(messageParts);

	if (mergedMessageParts.length === 0) {
		if (message.status === "INTERRUPTED") {
			return (
				<div {...stylex.props(styles.base, styles.assistantMessage, styles.assistantMessageStatus)}>
					Generation stopped before could generate anything 😞
				</div>
			);
		}

		return (
			<div {...stylex.props(styles.base, styles.assistantMessage, styles.assistantMessageStatus)}>
				Generation launching 🚀
			</div>
		);
	}

	const hasTextContent = mergedMessageParts.some((messagePart) => messagePart.type === "text");
	const hasReasoning = mergedMessageParts.some((messagePart) => messagePart.type === "reasoning");

	return (
		<div {...stylex.props(styles.base, styles.assistantMessage, hasReasoning && styles.assistantMessageStretched)}>
			{message.status === "INTERRUPTED" && (
				<div {...stylex.props(styles.assistantMessageStatus)}>
					Generation stopped while generating, below is partial content
				</div>
			)}
			{mergedMessageParts.map((messagePart) => {
				if (messagePart.type === "text") {
					return <Markdown key={messagePart.id}>{messagePart.data.text}</Markdown>;
				}

				return <ReasoningDisclosure key={messagePart.id} text={messagePart.data.text} />;
			})}
			{!hasTextContent && message.status !== "INTERRUPTED" && <p>Generation in progress ⚙️</p>}
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
		const assertedMessageParts = messageParts.filter((messagePart) => {
			assert(messagePart.type === "text", "User message parts can only be text");

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- that's for proper typescript inference
			return messagePart.type === "text";
		});

		return <UserMessage message={message} messageParts={assertedMessageParts} />;
	}

	return <AssistantMessage message={message} messageParts={messageParts} />;
};
