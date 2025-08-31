import { Trans } from "@lingui/react/macro";
import { Button, Disclosure, DisclosurePanel, Heading } from "react-aria-components";

import type { CoppermindSearchResult } from "@bella/core/database-schema";

import { typography } from "@bella/design-system/styles/typography";
import { ring } from "@bella/design-system/styles/utilities";
import { duration } from "@bella/design-system/theme/animation.stylex";
import { mauve } from "@bella/design-system/theme/color.stylex";
import { radii } from "@bella/design-system/theme/radii.stylex";
import { spacing } from "@bella/design-system/theme/spacing.stylex";
import { fontWeight } from "@bella/design-system/theme/typography.stylex";
import stylex from "@bella/stylex";

import type { CoppermindSearchMessagePartShape } from "#src/lib/collections.js";

import { Markdown } from "#src/components/markdown.js";
import { Icon } from "#src/lib/icon.js";

const reasoningDisclosureStyles = stylex.create({
	chevron: { transitionDuration: duration[3], transitionProperty: "rotate", transitionTimingFunction: "ease-in-out" },
	chevronRotated: { rotate: "90deg" },
	heading: { fontWeight: fontWeight.medium },
	reasoningContent: { color: mauve[11] },
	root: { paddingBlock: spacing[2] },
	trigger: {
		alignItems: "center",
		backgroundColor: { ":is([data-hovered])": mauve[4], default: null },
		borderRadius: radii[4],
		display: "flex",
		gap: spacing[2],
		marginInline: `calc(-1 * ${spacing[3]})`,
		paddingBlock: spacing[2],
		paddingInline: spacing[3],
		scale: { ":is([data-pressed])": 0.98, default: null },
		transitionDuration: duration[2],
		transitionProperty: "background-color, scale",
		transitionTimingFunction: "ease-in-out",
	},
});

export const ReasoningDisclosure = ({ text }: Readonly<{ text: string }>) => (
	<Disclosure {...stylex.props(reasoningDisclosureStyles.root)}>
		{(props) => (
			<>
				<Heading {...stylex.props(reasoningDisclosureStyles.heading)}>
					<Button slot="trigger" {...stylex.props(reasoningDisclosureStyles.trigger, ring.focusVisible, typography[2])}>
						<Icon
							name="24-chevron-right"
							{...stylex.props(
								reasoningDisclosureStyles.chevron,
								props.isExpanded && reasoningDisclosureStyles.chevronRotated,
							)}
						/>
						<Trans>Inspect reasoning&nbsp;&nbsp;💡</Trans>
					</Button>
				</Heading>
				<DisclosurePanel {...stylex.props(reasoningDisclosureStyles.reasoningContent, typography[2])}>
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

const shimmerStyles = stylex.create({
	higher: { blockSize: 18 },
	medium: { inlineSize: 320 },
	narrow: { inlineSize: 256 },
	root: {
		animationDuration: "2000ms",
		animationIterationCount: "infinite",
		animationName: shimmerKeyframes,
		animationTimingFunction: "linear",
		backgroundImage: `linear-gradient(90deg, ${mauve[4]} 25%, ${mauve[7]} 50%, ${mauve[4]} 75%)`,
		backgroundSize: "200% 100%",
		blockSize: 16,
		borderRadius: radii[3],
	},
	wide: { inlineSize: 480 },
});

const searchResultStyles = stylex.create({
	content: {
		display: "-webkit-box",
		fontStyle: "italic",
		overflow: "hidden",
		textOverflow: "ellipsis",
		WebkitBoxOrient: "vertical",
		WebkitLineClamp: 6,
	},
	contentSkeleton: { display: "grid", gap: spacing[2] },
	pageId: { fontWeight: fontWeight.medium },
	root: {
		borderColor: mauve[6],
		borderRadius: radii[4],
		borderStyle: "solid",
		borderWidth: 1,
		display: "grid",
		flexShrink: 0,
		gap: spacing[2],
		gridTemplateRows: "auto minmax(0, 1fr)",
		inlineSize: 360,
		paddingBlock: spacing[4],
		paddingInline: spacing[5],
		scrollSnapAlign: "start",
	},
	rootSkeleton: { gap: spacing[5] },
});

const SearchResultLoader = () => (
	<li {...stylex.props(searchResultStyles.root, searchResultStyles.rootSkeleton)}>
		<p {...stylex.props(shimmerStyles.root, shimmerStyles.narrow, shimmerStyles.higher)} />
		<blockquote {...stylex.props(searchResultStyles.contentSkeleton)}>
			<p {...stylex.props(shimmerStyles.root, shimmerStyles.medium)} />
			<p {...stylex.props(shimmerStyles.root, shimmerStyles.medium)} />
			<p {...stylex.props(shimmerStyles.root, shimmerStyles.narrow)} />
			<p {...stylex.props(shimmerStyles.root, shimmerStyles.medium)} />
			<p {...stylex.props(shimmerStyles.root, shimmerStyles.medium)} />
			<p {...stylex.props(shimmerStyles.root, shimmerStyles.medium)} />
		</blockquote>
	</li>
);

const SearchResultCard = ({ result }: Readonly<{ result: CoppermindSearchResult }>) => (
	<li {...stylex.props(searchResultStyles.root)}>
		<p {...stylex.props(searchResultStyles.pageId, typography[4])}>{result.pageId}</p>
		<blockquote {...stylex.props(searchResultStyles.content)}>{result.content}</blockquote>
	</li>
);

const coppermindSearchStyles = stylex.create({
	info: { fontWeight: fontWeight.medium },
	queriesList: {
		display: "flex",
		flexDirection: "column",
		gap: spacing[1],
		listStylePosition: "inside",
		listStyleType: "disc",
	},
	query: { fontStyle: "italic", fontWeight: fontWeight.light },
	results: {
		display: "flex",
		gap: spacing[4],
		overflowX: "auto",
		paddingBottom: spacing[4],
		scrollbarGutter: "stable",
		scrollSnapType: "inline mandatory",
	},
	root: { display: "grid", gap: spacing[5] },
});

export const CoppermindSearch = ({ data }: Readonly<{ data: CoppermindSearchMessagePartShape["data"] }>) => (
	<div {...stylex.props(coppermindSearchStyles.root)}>
		<p {...stylex.props(coppermindSearchStyles.info, typography[4])}>
			{data.results ?
				<Trans>🔍 Performed Coppermind search</Trans>
			:	<Trans>🌀 Performing Coppermind search</Trans>}
		</p>
		<ul {...stylex.props(coppermindSearchStyles.queriesList)}>
			{data.queries.map((query) => (
				<li key={query} {...stylex.props(coppermindSearchStyles.query)}>
					{query}
				</li>
			))}
		</ul>
		<ul {...stylex.props(coppermindSearchStyles.results)}>
			{(data.results ?? Array.from({ length: 6 }, () => null)).map((maybeResult, index) =>
				maybeResult ? <SearchResultCard key={index} result={maybeResult} /> : <SearchResultLoader key={index} />,
			)}
		</ul>
	</div>
);

const messageLoaderStyles = stylex.create({ root: { display: "grid", gap: spacing[2] } });

export const MessageLoader = () => (
	<div {...stylex.props(messageLoaderStyles.root)}>
		<p {...stylex.props(shimmerStyles.root, shimmerStyles.medium)} />
		<p {...stylex.props(shimmerStyles.root, shimmerStyles.narrow)} />
		<p {...stylex.props(shimmerStyles.root, shimmerStyles.wide)} />
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
		inlineSize: 736,
		maxInlineSize: "100%",
		paddingBlock: spacing[3],
		paddingInline: spacing[4],
	},
});

export const InterruptionNotification = ({ hasContent }: Readonly<{ hasContent: boolean }>) => (
	<div {...stylex.props(interruptionNotificationStyles.root, typography[2])}>
		<Icon name="24-message-warning" />
		{hasContent && (
			<p>
				<Trans>This message was stopped mid-generation, don't be surprised if content is cut-off 😉</Trans>
			</p>
		)}
		{!hasContent && (
			<p>
				<Trans>This message was stopped before we could generate any meaningful content 😞</Trans>
			</p>
		)}
	</div>
);
