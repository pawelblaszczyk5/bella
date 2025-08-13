import { typography } from "@bella/design-system/styles/typography";
import { violet } from "@bella/design-system/theme/color.stylex";
import { spacing } from "@bella/design-system/theme/spacing.stylex";
import { fontWeight } from "@bella/design-system/theme/typography.stylex";
import stylex from "@bella/stylex";

import { Composer } from "#src/components/composer.js";
import { useStartNewConversation } from "#src/lib/mutations.js";

const styles = stylex.create({
	heading: {
		backgroundClip: "text",
		backgroundImage: `linear-gradient(to right, ${violet[12]}, ${violet[11]})`,
		color: "transparent",
		fontWeight: fontWeight.semibold,
	},
	headingTypographyOverride: { lineHeight: "1.1em" },
	root: {
		alignItems: "center",
		blockSize: "100%",
		display: "flex",
		flexDirection: "column",
		gap: spacing[8],
		inlineSize: "100%",
		justifyContent: "center",
	},
});

export const NewConversation = () => {
	const startNewConversation = useStartNewConversation();

	return (
		<div {...stylex.props(styles.root)}>
			<h1 {...stylex.props(styles.heading, typography[9], styles.headingTypographyOverride)}>
				What are you up to today?
			</h1>
			<Composer
				isGenerationInProgress={false}
				onStopGeneration={() => null}
				onSubmit={(userMessageText) => startNewConversation(userMessageText)}
			/>
		</div>
	);
};
