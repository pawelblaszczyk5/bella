import { createFileRoute } from "@tanstack/react-router";

import { NewConversation } from "#src/components/new-conversation.js";

const AppIndexRoute = () => (
	<>
		<title>Bella</title>
		<NewConversation />
	</>
);

export const Route = createFileRoute("/app/")({ component: AppIndexRoute });
