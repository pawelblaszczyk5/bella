import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";

import { generateId } from "@bella/id-generator/promise";

import { startNewConversation } from "#src/lib/api.js";
import { conversationsCollection, messagePartsCollection, messagesCollection } from "#src/lib/collections.js";

const AppIndexRoute = () => {
	const { data: conversations } = useLiveQuery((q) => q.from({ conversationsCollection }));
	const { data: messages } = useLiveQuery((q) => q.from({ messagesCollection }));
	const { data: messageParts } = useLiveQuery((q) => q.from({ messagePartsCollection }));

	// eslint-disable-next-line no-console -- temporary for testing
	console.log(conversations, messages, messageParts);

	return (
		<>
			<p>Test lorem ipsum</p>
			<button
				onClick={async () => {
					const assistantMessageId = await generateId();
					const userMessageId = await generateId();
					const conversationId = await generateId();
					const userTextMessagePartId = await generateId();

					void startNewConversation({
						data: {
							assistantMessageId,
							conversationId,
							title: "Example title",
							userMessageId,
							userMessageTextContent:
								"Hello, write me a super long poem about horses writing React and considering switching to Svelte",
							userTextMessagePartId,
						},
					});
				}}
				type="button"
			>
				Start conversation test
			</button>
			{messageParts.map((messagePart) => (
				<p key={messagePart.id}>{messagePart.data.textContent}</p>
			))}
		</>
	);
};

export const Route = createFileRoute("/app/")({
	component: AppIndexRoute,
	loader: async () => {
		await Promise.all([
			conversationsCollection.preload(),
			messagesCollection.preload(),
			messagePartsCollection.preload(),
		]);
	},
});
