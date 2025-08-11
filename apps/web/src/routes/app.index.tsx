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
					const conversationId = await generateId();

					void startNewConversation({
						data: {
							conversationId,
							userMessageText:
								"Hello, write me a super long poem about horses writing React and considering switching to Svelte",
						},
					});
				}}
				type="button"
			>
				Start conversation test
			</button>
			{messageParts.map((messagePart) => (
				<p key={messagePart.id}>{messagePart.data.text}</p>
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
