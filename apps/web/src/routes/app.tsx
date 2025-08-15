import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Outlet } from "@tanstack/react-router";

import { typography } from "@bella/design-system/styles/typography";
import { ring } from "@bella/design-system/styles/utilities";
import { mauve, violet } from "@bella/design-system/theme/color.stylex";
import { radii } from "@bella/design-system/theme/radii.stylex";
import { spacing } from "@bella/design-system/theme/spacing.stylex";
import { fontWeight } from "@bella/design-system/theme/typography.stylex";
import stylex from "@bella/stylex";

import type { ConversationShape } from "#src/lib/collections.js";

import { conversationsCollection, messagePartsCollection, messagesCollection } from "#src/lib/collections.js";
import { Icon } from "#src/lib/icon.js";
import { Link } from "#src/lib/link.js";
import { useConversationState } from "#src/lib/use-conversation-state.js";

const styles = stylex.create({
	conversationLink: {
		backgroundColor: { ":is([data-current])": violet[5], default: null },
		borderRadius: radii[3],
		display: "grid",
		fontWeight: { ":is([data-current])": fontWeight.medium, default: null },
		gap: spacing[2],
		gridTemplateColumns: "minmax(0, 1fr) auto",
		paddingBlock: spacing[1],
		paddingInline: spacing[3],
	},
	conversationSectionTitle: {
		backgroundColor: mauve[1],
		fontWeight: fontWeight.medium,
		insetBlockStart: 0,
		paddingInline: spacing[3],
		position: "sticky",
	},
	conversationsSection: {
		display: "flex",
		flexDirection: "column",
		gap: spacing[3],
		marginInline: `calc(-1 * ${spacing[3]})`,
		overflowY: "auto",
	},
	conversationTitle: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
	heading: { alignItems: "center", color: violet[12], display: "flex", fontWeight: fontWeight.medium, gap: spacing[3] },
	hiddenSyncIcon: { opacity: 0 },
	main: { blockSize: "100vh", contain: "strict", isolation: "isolate", overflowY: "auto", padding: spacing[6] },
	mainLink: {
		alignItems: "center",
		borderRadius: radii[3],
		color: { ":is([data-current])": violet[12], default: null },
		display: "flex",
		fontWeight: { ":is([data-current])": fontWeight.medium, default: null },
		gap: spacing[2],
		marginInline: `calc(-1 * ${spacing[3]})`,
		paddingBlock: spacing[2],
		paddingInline: spacing[3],
	},
	mainLinks: {
		borderBlockEndWidth: 1,
		borderBlockStartWidth: 1,
		borderColor: mauve[6],
		borderStyle: "solid",
		display: "flex",
		flexDirection: "column",
		paddingBlock: spacing[4],
	},
	nav: {
		blockSize: "100vh",
		borderColor: mauve[6],
		borderInlineEndWidth: 1,
		borderStyle: "solid",
		display: "grid",
		gap: spacing[6],
		gridTemplateRows: "auto auto minmax(0, 1fr)",
		paddingBlock: spacing[5],
		paddingInline: spacing[6],
	},
	navList: { display: "flex", flexDirection: "column" },
	navListElement: { display: "contents" },
	root: { backgroundColor: mauve[1], color: mauve[12], display: "grid", gridTemplateColumns: "300px minmax(0, 1fr)" },
});

const ConversationLink = ({ conversation }: Readonly<{ conversation: ConversationShape }>) => {
	const conversationState = useConversationState(conversation.id);

	return (
		<li {...stylex.props(styles.navListElement)}>
			<Link
				params={{ "conversation-id": conversation.id }}
				to="/app/$conversation-id"
				{...stylex.props(styles.conversationLink, ring.focusVisible)}
			>
				<span {...stylex.props(styles.conversationTitle)}>{conversation.title}</span>
				<Icon name="24-sync" {...stylex.props(conversationState === "GENERATING" ? null : styles.hiddenSyncIcon)} />
			</Link>
		</li>
	);
};

const AppLayoutRoute = () => {
	const { data: conversations } = useLiveQuery((q) =>
		q
			.from({ conversationsCollection })
			.orderBy(({ conversationsCollection }) => conversationsCollection.updatedAt.epochMillis, "desc"),
	);

	return (
		<div {...stylex.props(styles.root)}>
			<nav {...stylex.props(styles.nav)}>
				<h1 {...stylex.props(styles.heading, typography[8])}>
					Bella <Icon name="24-shell" />
				</h1>
				<div {...stylex.props(styles.mainLinks)}>
					<Link
						activeOptions={{ exact: true }}
						to="/app"
						{...stylex.props(styles.mainLink, ring.focusVisible, typography[4])}
					>
						<Icon name="24-home" />
						Home
					</Link>
					<Link
						activeOptions={{ exact: true }}
						// @ts-expect-error -- purposefully broken link for now
						to="/todo"
						{...stylex.props(styles.mainLink, ring.focusVisible, typography[4])}
					>
						<Icon name="24-todo" />
						Todos
					</Link>
					<Link
						activeOptions={{ exact: true }}
						// @ts-expect-error -- purposefully broken link for now
						to="/judgments"
						{...stylex.props(styles.mainLink, ring.focusVisible, typography[4])}
					>
						<Icon name="24-hammer" />
						Judgments
					</Link>
				</div>
				<div {...stylex.props(styles.conversationsSection)}>
					<p {...stylex.props(styles.conversationSectionTitle, typography[4])}>Conversations</p>
					<ul {...stylex.props(styles.navList)}>
						{conversations.map((conversation) => (
							<ConversationLink conversation={conversation} key={conversation.id} />
						))}
					</ul>
				</div>
			</nav>
			<main {...stylex.props(styles.main)}>
				<Outlet />
			</main>
		</div>
	);
};

export const Route = createFileRoute("/app")({
	component: AppLayoutRoute,
	gcTime: 0,
	loader: async () => {
		await Promise.all([
			conversationsCollection.preload(),
			messagesCollection.preload(),
			messagePartsCollection.preload(),
		]);
	},
	shouldReload: false,
	ssr: false,
});
