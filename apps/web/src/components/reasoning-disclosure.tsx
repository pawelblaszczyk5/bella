import { Button, Disclosure, DisclosurePanel, Heading } from "react-aria-components";

import { typography } from "@bella/design-system/styles/typography";
import { ring } from "@bella/design-system/styles/utilities";
import { duration } from "@bella/design-system/theme/animation.stylex";
import { radii } from "@bella/design-system/theme/radii.stylex";
import { spacing } from "@bella/design-system/theme/spacing.stylex";
import { fontWeight } from "@bella/design-system/theme/typography.stylex";
import stylex from "@bella/stylex";

import { Markdown } from "#src/components/markdown.js";
import { Icon } from "#src/lib/icon.js";

const styles = stylex.create({
	chevron: { transitionDuration: duration.x3, transitionProperty: "rotate", transitionTimingFunction: "ease-in-out" },
	chevronRotated: { rotate: "90deg" },
	heading: { fontWeight: fontWeight.medium },
	root: { paddingBlock: spacing[3] },
	trigger: {
		alignItems: "center",
		borderRadius: radii[4],
		display: "flex",
		gap: spacing[3],
		marginInline: `calc(-1 * ${spacing[3]})`,
		paddingBlock: spacing[2],
		paddingInline: spacing[3],
	},
});

export const ReasoningDisclosure = ({ text }: Readonly<{ text: string }>) => (
	<Disclosure {...stylex.props(styles.root)}>
		{(props) => (
			<>
				<Heading {...stylex.props(styles.heading, typography[2])}>
					<Button slot="trigger" {...stylex.props(styles.trigger, ring.focusVisible)}>
						<Icon
							name="24-chevron-right"
							{...stylex.props(styles.chevron, props.isExpanded && styles.chevronRotated)}
						/>
						Inspect reasoning 💡
					</Button>
				</Heading>
				<DisclosurePanel>
					<Markdown>{text}</Markdown>
				</DisclosurePanel>
			</>
		)}
	</Disclosure>
);
