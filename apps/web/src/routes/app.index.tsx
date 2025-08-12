import { createFileRoute } from "@tanstack/react-router";

import { Composer } from "#src/components/composer.js";
import { useStartNewConversation } from "#src/lib/mutations.js";

const AppIndexRoute = () => {
	const startNewConversation = useStartNewConversation();

	return (
		<>
			<title>Bella</title>
			<Composer onSubmit={(userMessageText) => startNewConversation(userMessageText)} />
		</>
	);
};

export const Route = createFileRoute("/app/")({ component: AppIndexRoute });
