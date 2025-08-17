import { Trans } from "@lingui/react/macro";
import { Match } from "effect";
import { useId } from "react";
import { Cell, Checkbox, Column, Row, Table, TableBody, TableHeader } from "react-aria-components";

import { typography } from "@bella/design-system/styles/typography";
import { accessibility } from "@bella/design-system/styles/utilities";
import { duration } from "@bella/design-system/theme/animation.stylex";
import { amber, cyan, mauve, tomato, violet } from "@bella/design-system/theme/color.stylex";
import { radii } from "@bella/design-system/theme/radii.stylex";
import { spacing } from "@bella/design-system/theme/spacing.stylex";
import { fontFamily, fontWeight } from "@bella/design-system/theme/typography.stylex";
import stylex from "@bella/stylex";

import type { ConversationShape, UserExperienceEvaluationShape } from "#src/lib/collections.js";

import { Icon } from "#src/lib/icon.js";
import { Link } from "#src/lib/link.js";

const styles = stylex.create({
	category: { alignItems: "center", display: "flex", gap: spacing[2] },
	cell: { paddingBlock: spacing[3], paddingInline: spacing[4] },
	checkbox: {
		aspectRatio: "1/1",
		backgroundColor: { ":is([data-hovered])": mauve[2], default: null },
		borderColor: { ":is([data-hovered])": mauve[8], default: mauve[7] },
		borderRadius: radii[3],
		borderStyle: "solid",
		borderWidth: 1,
		color: violet[12],
		display: "grid",
		inlineSize: 32,
		placeItems: "center",
		transitionDuration: duration[2],
		transitionProperty: "border-color, background-color",
		transitionTimingFunction: "ease-in-out",
	},
	column: { color: mauve[11], fontWeight: fontWeight.medium, paddingBlock: spacing[3], paddingInline: spacing[4] },
	columnCategory: { inlineSize: 220 },
	columnConversation: { inlineSize: 220 },
	columnId: { inlineSize: 160 },
	columnResolvedState: { inlineSize: 100 },
	columnSeverity: { inlineSize: 100 },
	conversationTitle: {
		color: violet[12],
		overflow: "hidden",
		textDecoration: "underline",
		textOverflow: "ellipsis",
		textUnderlineOffset: 2,
		whiteSpace: "nowrap",
	},
	description: {},
	header: {},
	heading: {},
	id: { color: mauve[11], fontFamily: fontFamily.mono, fontWeight: fontWeight.light, textAlign: "center" },
	resolvedState: { display: "grid", placeItems: "center" },
	row: { borderBlockEndWidth: 1, borderColor: mauve[6], borderStyle: "solid" },
	severity: { display: "grid", placeItems: "center" },
	severityHigh: { color: tomato[11] },
	severityLow: { color: cyan[11] },
	severityMedium: { color: amber[11] },
	table: { tableLayout: "fixed", width: "100%" },
	tableBody: {},
	tableHeader: { borderBlockEndWidth: 1, borderColor: mauve[6], borderStyle: "solid" },
});

export const Evaluations = ({
	evaluations,
}: Readonly<{
	evaluations: Array<
		Omit<UserExperienceEvaluationShape, "messageId">
			& Readonly<{ conversationId: ConversationShape["id"]; conversationTitle: ConversationShape["title"] }>
	>;
}>) => {
	const headingId = useId();

	return (
		<div>
			<header>
				<h1 id={headingId}>
					<Trans>Evaluations</Trans>
				</h1>
				<p>This view showcase evaluations</p>
			</header>
			<Table aria-labelledby={headingId} {...stylex.props(styles.table)}>
				<TableHeader {...stylex.props(styles.table, styles.tableHeader)}>
					<Column {...stylex.props(styles.column, styles.columnId, typography[1])}>ID</Column>
					<Column {...stylex.props(styles.column, styles.columnConversation, typography[1])}>Conversation</Column>
					<Column {...stylex.props(styles.column, styles.columnCategory, typography[1])}>Category</Column>
					<Column {...stylex.props(styles.column, styles.columnSeverity, typography[1])}>Severity</Column>
					<Column {...stylex.props(styles.column, typography[1])}>Description</Column>
					<Column {...stylex.props(styles.column, styles.columnResolvedState, typography[1])}>Resolved</Column>
				</TableHeader>
				<TableBody items={evaluations} renderEmptyState={() => <p>Empty</p>} {...stylex.props(styles.tableBody)}>
					{(item) => (
						<Row {...stylex.props(styles.row)}>
							<Cell {...stylex.props(styles.cell, styles.id, typography[1])}>{item.id}</Cell>
							<Cell {...stylex.props(styles.cell, styles.conversationTitle, typography[2])}>
								<Link params={{ "conversation-id": item.conversationId }} to="/app/$conversation-id">
									{item.conversationTitle}
								</Link>
							</Cell>
							<Cell {...stylex.props(styles.cell, typography[2])}>
								{Match.value(item.category).pipe(
									Match.when("CONTEXT_IGNORED", () => (
										<div {...stylex.props(styles.category)}>
											<Icon name="24-badge-help" />
											<Trans>Ignored context</Trans>
										</div>
									)),
									Match.when("FACTUAL_ERROR", () => (
										<div {...stylex.props(styles.category)}>
											<Icon name="24-badge-swiss-franc" />
											<Trans>Factual error</Trans>
										</div>
									)),
									Match.when("IRRELEVANT", () => (
										<div {...stylex.props(styles.category)}>
											<Icon name="24-badge-japanese-yen" />
											<Trans>Irrelevant</Trans>
										</div>
									)),
									Match.when("UNNECESSARY_REFUSAL", () => (
										<div {...stylex.props(styles.category)}>
											<Icon name="24-badge-x" />
											<Trans>Unnecessary refusal</Trans>
										</div>
									)),
									Match.when("UNCLASSIFIED", () => (
										<div {...stylex.props(styles.category)}>
											<Icon name="24-badge" />
											<Trans>Unclassified</Trans>
										</div>
									)),
									Match.exhaustive,
								)}
							</Cell>
							<Cell {...stylex.props(styles.cell, typography[2])}>
								{Match.value(item.severity).pipe(
									Match.when("LOW", () => (
										<div {...stylex.props(styles.severity, styles.severityLow)}>
											<Icon name="24-signal-low" />
											<span {...stylex.props(accessibility.srOnly)}>
												<Trans>Low</Trans>
											</span>
										</div>
									)),
									Match.when("MEDIUM", () => (
										<div {...stylex.props(styles.severity, styles.severityMedium)}>
											<Icon name="24-signal-medium" />
											<span {...stylex.props(accessibility.srOnly)}>
												<Trans>Medium</Trans>
											</span>
										</div>
									)),
									Match.when("HIGH", () => (
										<div {...stylex.props(styles.severity, styles.severityHigh)}>
											<Icon name="24-signal-high" />
											<span {...stylex.props(accessibility.srOnly)}>
												<Trans>High</Trans>
											</span>
										</div>
									)),
									Match.exhaustive,
								)}
							</Cell>
							<Cell {...stylex.props(styles.cell, typography[2])}>{item.description}</Cell>
							<Cell {...stylex.props(styles.cell, typography[2])}>
								<div {...stylex.props(styles.resolvedState)}>
									<Checkbox {...stylex.props(styles.checkbox)}>
										{({ isSelected }) => (
											<>
												{isSelected && <Icon name="24-check" />}
												<span {...stylex.props(accessibility.srOnly)}>Resolve</span>
											</>
										)}
									</Checkbox>
								</div>
							</Cell>
						</Row>
					)}
				</TableBody>
			</Table>
		</div>
	);
};
