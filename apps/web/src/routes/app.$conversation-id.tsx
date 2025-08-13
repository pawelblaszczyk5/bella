import { createFileRoute } from "@tanstack/react-router";

import { ExistingConversation } from "#src/components/existing-conversation.js";
import { ConversationShape } from "#src/lib/collections.js";

const AppExampleRoute = () => {
	const { conversationId } = Route.useLoaderData();

	return <ExistingConversation conversationId={conversationId} />;
};

export const Route = createFileRoute("/app/$conversation-id")({
	component: AppExampleRoute,
	loader: (ctx) => {
		const conversationId = ConversationShape.fields.id.make(ctx.params["conversation-id"]);

		return { conversationId };
	},
});
