import { Composer } from "#src/components/composer.js";
import { useStartNewConversation } from "#src/lib/mutations.js";

export const NewConversation = () => {
	const startNewConversation = useStartNewConversation();

	return <Composer onSubmit={(userMessageText) => startNewConversation(userMessageText)} />;
};
