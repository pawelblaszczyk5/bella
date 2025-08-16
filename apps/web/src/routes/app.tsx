import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Outlet } from "@tanstack/react-router";

import { assert } from "@bella/assert";
import { typography } from "@bella/design-system/styles/typography";
import { ring } from "@bella/design-system/styles/utilities";
import { duration } from "@bella/design-system/theme/animation.stylex";
import { cyanDark, mauve, mauveDark, violet, violetDark } from "@bella/design-system/theme/color.stylex";
import { radii } from "@bella/design-system/theme/radii.stylex";
import { spacing } from "@bella/design-system/theme/spacing.stylex";
import { fontWeight } from "@bella/design-system/theme/typography.stylex";
import stylex from "@bella/stylex";

import type { ConversationShape } from "#src/lib/collections.js";

import { UserPreferences } from "#src/components/user-preferences.js";
import {
	conversationsCollection,
	messagePartsCollection,
	messagesCollection,
	userPreferencesCollection,
} from "#src/lib/collections.js";
import { Icon } from "#src/lib/icon.js";
import { Link } from "#src/lib/link.js";
import { useConversationState } from "#src/lib/use-conversation-state.js";
import { DEFAULT_LANGUAGE, useColorMode, useLanguage } from "#src/lib/use-user-preference.js";
import { messages as englishMessages } from "#src/locales/en-US.po";
import { messages as polishMessages } from "#src/locales/pl-PL.po";

const styles = stylex.create({
	conversationLink: {
		backgroundColor: { ":is([data-current])": violet[5], ":is([data-hovered])": violet[4], default: null },
		borderRadius: radii[3],
		display: "grid",
		fontWeight: { ":is([data-current])": fontWeight.medium, default: null },
		gap: spacing[2],
		gridTemplateColumns: "minmax(0, 1fr) auto",
		paddingBlock: spacing[1],
		paddingInline: spacing[3],
		transitionDuration: duration[2],
		transitionProperty: "background-color",
		transitionTimingFunction: "ease-in-out",
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
		backgroundColor: { ":is([data-hovered])": violet[4], default: null },
		borderRadius: radii[3],
		color: { ":is([data-current])": violet[12], default: null },
		display: "flex",
		fontWeight: { ":is([data-current])": fontWeight.medium, default: null },
		gap: spacing[2],
		marginInline: `calc(-1 * ${spacing[3]})`,
		paddingBlock: spacing[2],
		paddingInline: spacing[3],
		transitionDuration: duration[2],
		transitionProperty: "background-color",
		transitionTimingFunction: "ease-in-out",
	},
	mainLinks: {
		borderBlockEndWidth: 1,
		borderBlockStartWidth: 1,
		borderColor: mauve[6],
		borderStyle: "solid",
		paddingBlock: spacing[4],
	},
	nav: {
		blockSize: "100vh",
		borderColor: mauve[6],
		borderInlineEndWidth: 1,
		borderStyle: "solid",
		display: "grid",
		gap: spacing[6],
		gridTemplateRows: "auto auto minmax(0, 1fr) auto",
		paddingBlock: spacing[5],
		paddingInline: spacing[6],
	},
	root: { backgroundColor: mauve[1], color: mauve[12], display: "grid", gridTemplateColumns: "300px minmax(0, 1fr)" },
});

const ConversationLink = ({ conversation }: Readonly<{ conversation: ConversationShape }>) => {
	const conversationState = useConversationState(conversation.id);

	return (
		<li>
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
	const { i18n } = Route.useLoaderData();
	const colorMode = useColorMode();
	const language = useLanguage();

	const { data: conversations } = useLiveQuery((q) =>
		q
			.from({ conversationsCollection })
			.orderBy(({ conversationsCollection }) => conversationsCollection.updatedAt.epochMillis, "desc"),
	);

	if (language !== i18n.locale) {
		i18n.activate(language);
	}

	return (
		<I18nProvider i18n={i18n}>
			<div {...stylex.props(styles.root, colorMode.calculated === "DARK" && [cyanDark, violetDark, mauveDark])}>
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
							<Trans>Home</Trans>
						</Link>
						<Link
							activeOptions={{ exact: true }}
							// @ts-expect-error -- purposefully broken link for now
							to="/todo"
							{...stylex.props(styles.mainLink, ring.focusVisible, typography[4])}
						>
							<Icon name="24-todo" />
							<Trans>Todos</Trans>
						</Link>
						<Link
							activeOptions={{ exact: true }}
							// @ts-expect-error -- purposefully broken link for now
							to="/judgments"
							{...stylex.props(styles.mainLink, ring.focusVisible, typography[4])}
						>
							<Icon name="24-hammer" />
							<Trans>Judgments</Trans>
						</Link>
					</div>
					<div {...stylex.props(styles.conversationsSection)}>
						<p {...stylex.props(styles.conversationSectionTitle, typography[4])}>
							<Trans>Conversations</Trans>
						</p>
						<ul>
							{conversations.map((conversation) => (
								<ConversationLink conversation={conversation} key={conversation.id} />
							))}
						</ul>
					</div>
					<UserPreferences />
				</nav>
				<main {...stylex.props(styles.main)}>
					<Outlet />
				</main>
			</div>
		</I18nProvider>
	);
};

export const Route = createFileRoute("/app")({
	component: AppLayoutRoute,
	gcTime: 0,
	loader: async () => {
		const i18n = setupI18n();

		await Promise.all([
			conversationsCollection.preload(),
			messagesCollection.preload(),
			messagePartsCollection.preload(),
			userPreferencesCollection.preload(),
		]);

		let language = DEFAULT_LANGUAGE;

		const maybeUserPreference = userPreferencesCollection.get("LANGUAGE");

		if (maybeUserPreference) {
			assert(maybeUserPreference.type === "LANGUAGE", "Selected by key, it must be language");

			language = maybeUserPreference.value;
		}

		i18n.load("pl-PL", polishMessages);
		i18n.load("en-US", englishMessages);

		i18n.activate(language);

		return { i18n };
	},
	shouldReload: false,
	ssr: false,
});
