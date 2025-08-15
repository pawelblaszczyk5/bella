import { Button, Disclosure, DisclosurePanel, Heading } from "react-aria-components";

import { typography } from "@bella/design-system/styles/typography";
import { ring } from "@bella/design-system/styles/utilities";
import { duration } from "@bella/design-system/theme/animation.stylex";
import { mauve } from "@bella/design-system/theme/color.stylex";
import { radii } from "@bella/design-system/theme/radii.stylex";
import { spacing } from "@bella/design-system/theme/spacing.stylex";
import { fontWeight } from "@bella/design-system/theme/typography.stylex";
import stylex from "@bella/stylex";

import { Markdown } from "#src/components/markdown.js";
import { Icon } from "#src/lib/icon.js";

const reasoningDisclosureStyles = stylex.create({
	chevron: { transitionDuration: duration[3], transitionProperty: "rotate", transitionTimingFunction: "ease-in-out" },
	chevronRotated: { rotate: "90deg" },
	heading: { fontWeight: fontWeight.medium },
	root: { paddingBlock: spacing[3] },
	trigger: {
		alignItems: "center",
		borderRadius: radii[4],
		display: "flex",
		gap: spacing[2],
		marginInline: `calc(-1 * ${spacing[3]})`,
		paddingBlock: spacing[2],
		paddingInline: spacing[3],
	},
});

export const ReasoningDisclosure = ({ text }: Readonly<{ text: string }>) => (
	<Disclosure {...stylex.props(reasoningDisclosureStyles.root)}>
		{(props) => (
			<>
				<Heading {...stylex.props(reasoningDisclosureStyles.heading, typography[2])}>
					<Button slot="trigger" {...stylex.props(reasoningDisclosureStyles.trigger, ring.focusVisible)}>
						<Icon
							name="24-chevron-right"
							{...stylex.props(
								reasoningDisclosureStyles.chevron,
								props.isExpanded && reasoningDisclosureStyles.chevronRotated,
							)}
						/>
						Inspect reasoning&nbsp;&nbsp;💡
					</Button>
				</Heading>
				<DisclosurePanel>
					<Markdown>{text}</Markdown>
				</DisclosurePanel>
			</>
		)}
	</Disclosure>
);

const shimmerKeyframes = stylex.keyframes({
	"0%": { backgroundPosition: "200% 0" },
	"100%": { backgroundPosition: "-200% 0" },
});

const messageLoaderStyles = stylex.create({
	root: { display: "grid", gap: spacing[2] },
	shimmerPart: {
		animationDuration: duration[9],
		animationIterationCount: "infinite",
		animationName: shimmerKeyframes,
		animationTimingFunction: "ease-in-out",
		backgroundImage: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
		backgroundSize: "200% 100%",
		blockSize: 16,
		borderRadius: radii[3],
	},
	shimmerPartMedium: { inlineSize: 320 },
	shimmerPartNarrow: { inlineSize: 256 },
	shimmerPartWide: { inlineSize: 480 },
});

export const MessageLoader = () => (
	<div {...stylex.props(messageLoaderStyles.root)}>
		<p {...stylex.props(messageLoaderStyles.shimmerPart, messageLoaderStyles.shimmerPartMedium)} />
		<p {...stylex.props(messageLoaderStyles.shimmerPart, messageLoaderStyles.shimmerPartNarrow)} />
		<p {...stylex.props(messageLoaderStyles.shimmerPart, messageLoaderStyles.shimmerPartWide)} />
	</div>
);

const interruptionNotificationStyles = stylex.create({
	root: {
		alignItems: "center",
		backgroundColor: mauve[2],
		borderColor: mauve[6],
		borderRadius: radii[4],
		borderStyle: "solid",
		borderWidth: 1,
		color: mauve[11],
		display: "flex",
		gap: spacing[3],
		inlineSize: 672,
		maxInlineSize: "100%",
		paddingBlock: spacing[3],
		paddingInline: spacing[4],
	},
});

export const InterruptionNotification = ({ hasContent }: Readonly<{ hasContent: boolean }>) => (
	<div {...stylex.props(interruptionNotificationStyles.root, typography[2])}>
		<Icon name="24-message-warning" />
		{hasContent && <p>This message was stopped mid-generation, don't be surprised if content is cut-off 😉</p>}
		{!hasContent && <p>This message was stopped before we could generate any meaningful content 😞</p>}
	</div>
);
