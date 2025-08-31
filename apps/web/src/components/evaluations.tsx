import type { MessageDescriptor } from "@lingui/core";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Array } from "effect";
import { useId } from "react";
import {
	Button,
	Cell,
	Checkbox,
	Column,
	Header,
	Menu,
	MenuItem,
	MenuSection,
	MenuTrigger,
	Popover,
	Row,
	Separator,
	Table,
	TableBody,
	TableHeader,
} from "react-aria-components";

import { assert } from "@bella/assert";
import { typography } from "@bella/design-system/styles/typography";
import { accessibility, ring } from "@bella/design-system/styles/utilities";
import { duration } from "@bella/design-system/theme/animation.stylex";
import { amber, cyan, mauve, tomato, violet } from "@bella/design-system/theme/color.stylex";
import { radii } from "@bella/design-system/theme/radii.stylex";
import { shadow } from "@bella/design-system/theme/shadow.stylex";
import { spacing } from "@bella/design-system/theme/spacing.stylex";
import { fontFamily, fontWeight } from "@bella/design-system/theme/typography.stylex";
import stylex from "@bella/stylex";

import type { ConversationShape } from "#src/lib/collections.js";
import type { IconName } from "#src/lib/icon.js";

import { UserExperienceEvaluationShape } from "#src/lib/collections.js";
import { Icon } from "#src/lib/icon.js";
import { Link } from "#src/lib/link.js";
import { useChangeUserExperienceEvaluationResolvedStatus } from "#src/lib/mutations.js";

const severityColorStyles = stylex.create({
	HIGH: { color: tomato[11] },
	LOW: { color: cyan[11] },
	MEDIUM: { color: amber[11] },
});

const SEVERITY_TEXT: Record<UserExperienceEvaluationShape["severity"], MessageDescriptor> = {
	HIGH: msg`High`,
	LOW: msg`Low`,
	MEDIUM: msg`Medium`,
};

const SEVERITY_ICON: Record<UserExperienceEvaluationShape["severity"], IconName> = {
	HIGH: "24-signal-high",
	LOW: "24-signal-low",
	MEDIUM: "24-signal-medium",
};

const CATEGORY_TEXT: Record<UserExperienceEvaluationShape["category"], MessageDescriptor> = {
	CONTEXT_IGNORED: msg`Ignored context`,
	FACTUAL_ERROR: msg`Factual error`,
	IRRELEVANT: msg`Irrelevant`,
	UNCLASSIFIED: msg`Unclassified`,
	UNNECESSARY_REFUSAL: msg`Unnecessary refusal`,
};

const CATEGORY_ICON: Record<UserExperienceEvaluationShape["category"], IconName> = {
	CONTEXT_IGNORED: "24-badge-help",
	FACTUAL_ERROR: "24-badge-swiss-franc",
	IRRELEVANT: "24-badge-japanese-yen",
	UNCLASSIFIED: "24-badge",
	UNNECESSARY_REFUSAL: "24-badge-x",
};

const viewSettingsStyles = stylex.create({
	check: {
		color: violet[12],
		opacity: 1,
		transitionDuration: duration[2],
		transitionProperty: "opacity",
		transitionTimingFunction: "ease-in-out",
	},
	checkHidden: { opacity: 0 },
	header: { color: mauve[12], fontWeight: fontWeight.medium, paddingBlock: spacing[2], paddingInline: spacing[4] },
	menu: {
		alignItems: "center",
		backgroundColor: mauve[1],
		borderColor: mauve[6],
		borderRadius: radii[5],
		borderStyle: "solid",
		borderWidth: 1,
		boxShadow: shadow.base,
		display: "grid",
		gap: spacing[3],
		inlineSize: 250,
		justifyItems: "center",
		paddingBlock: spacing[2],
	},
	menuItem: {
		alignItems: "center",
		backgroundColor: { ":is([data-hovered])": violet[4], default: null },
		borderRadius: radii[4],
		color: mauve[12],
		display: "grid",
		gap: spacing[2],
		gridTemplateColumns: "auto minmax(0, 1fr) auto",
		paddingBlock: spacing[2],
		paddingInline: spacing[4],
	},
	menuSection: { inlineSize: "100%" },
	separator: { borderBottomWidth: 1, borderColor: mauve[6], borderStyle: "solid", inlineSize: "85%" },
	trigger: {
		alignItems: "center",
		backgroundColor: { ":is([data-hovered])": violet[4], default: violet[3] },
		borderColor: { ":is([data-hovered])": mauve[8], default: mauve[7] },
		borderRadius: radii[4],
		borderStyle: "solid",
		borderWidth: 1,
		display: "flex",
		gap: spacing[3],
		paddingBlock: spacing[2],
		paddingInline: spacing[3],
		scale: { ":is([data-pressed])": 0.98, default: null },
		transitionDuration: duration[2],
		transitionProperty: "background-color, border-color, scale",
		transitionTimingFunction: "ease-in-out",
	},
});

const ViewSettings = () => {
	const navigate = useNavigate();

	const searchParams = useSearch({ from: "/app/evaluations" });

	const { t } = useLingui();

	return (
		<MenuTrigger>
			<Button {...stylex.props(viewSettingsStyles.trigger, ring.focusVisible)}>
				<Icon name="24-gallery-vertical-end" />
				<Trans>View settings</Trans>
			</Button>
			<Popover placement="bottom end">
				<Menu {...stylex.props(viewSettingsStyles.menu, ring.focusVisible)}>
					<MenuSection
						onSelectionChange={(selection) => {
							if (selection === "all") {
								void navigate({
									from: "/app/evaluations",
									search: (searchParams) => ({
										...searchParams,
										category: UserExperienceEvaluationShape.fields.category.literals,
									}),
									to: "/app/evaluations",
								});

								return;
							}

							const newCategories = UserExperienceEvaluationShape.fields.category.literals.filter((key) =>
								selection.has(key),
							);

							assert(Array.isNonEmptyArray(newCategories), "At least one category must be selected");

							void navigate({
								from: "/app/evaluations",
								search: (searchParams) => ({ ...searchParams, category: newCategories }),
								to: "/app/evaluations",
							});
						}}
						selectedKeys={searchParams.category}
						selectionMode="multiple"
						disallowEmptySelection
						{...stylex.props(viewSettingsStyles.menuSection)}
					>
						<Header {...stylex.props(viewSettingsStyles.header, typography[2])}>
							<Trans>Category</Trans>
						</Header>
						{UserExperienceEvaluationShape.fields.category.literals.map((value) => (
							<MenuItem id={value} key={value} {...stylex.props(viewSettingsStyles.menuItem, ring.focusVisible)}>
								{({ isSelected }) => (
									<>
										<Icon name={CATEGORY_ICON[value]} />
										{t(CATEGORY_TEXT[value])}
										<Icon
											name="24-check"
											{...stylex.props(viewSettingsStyles.check, isSelected ? null : viewSettingsStyles.checkHidden)}
										/>
									</>
								)}
							</MenuItem>
						))}
					</MenuSection>
					<Separator {...stylex.props(viewSettingsStyles.separator)} />
					<MenuSection
						onSelectionChange={(selection) => {
							if (selection === "all") {
								void navigate({
									from: "/app/evaluations",
									search: (searchParams) => ({
										...searchParams,
										severity: UserExperienceEvaluationShape.fields.severity.literals,
									}),
									to: "/app/evaluations",
								});

								return;
							}

							const newSeverities = UserExperienceEvaluationShape.fields.severity.literals.filter((key) =>
								selection.has(key),
							);

							assert(Array.isNonEmptyArray(newSeverities), "At least one category must be selected");

							void navigate({
								from: "/app/evaluations",
								search: (searchParams) => ({ ...searchParams, severity: newSeverities }),
								to: "/app/evaluations",
							});
						}}
						selectedKeys={searchParams.severity}
						selectionMode="multiple"
						disallowEmptySelection
						{...stylex.props(viewSettingsStyles.menuSection)}
					>
						<Header {...stylex.props(viewSettingsStyles.header, typography[2])}>
							<Trans>Severity</Trans>
						</Header>
						{UserExperienceEvaluationShape.fields.severity.literals.map((value) => (
							<MenuItem id={value} key={value} {...stylex.props(viewSettingsStyles.menuItem, ring.focusVisible)}>
								{({ isSelected }) => (
									<>
										<Icon name={SEVERITY_ICON[value]} {...stylex.props(severityColorStyles[value])} />
										{t(SEVERITY_TEXT[value])}
										<Icon
											name="24-check"
											{...stylex.props(viewSettingsStyles.check, isSelected ? null : viewSettingsStyles.checkHidden)}
										/>
									</>
								)}
							</MenuItem>
						))}
					</MenuSection>
					<Separator {...stylex.props(viewSettingsStyles.separator)} />
					<MenuSection
						selectedKeys={searchParams.hideResolved ? ["hideResolved"] : []}
						selectionMode="multiple"
						{...stylex.props(viewSettingsStyles.menuSection)}
					>
						<MenuItem
							onAction={() => {
								void navigate({
									from: "/app/evaluations",
									search: (searchParams) => ({ ...searchParams, hideResolved: !searchParams.hideResolved }),
									to: "/app/evaluations",
								});
							}}
							id="hideResolved"
							{...stylex.props(viewSettingsStyles.menuItem, ring.focusVisible)}
						>
							{({ isSelected }) => (
								<>
									<Icon name="24-eye-off" />
									<Trans>Hide resolved</Trans>
									<Icon
										name="24-check"
										{...stylex.props(viewSettingsStyles.check, isSelected ? null : viewSettingsStyles.checkHidden)}
									/>
								</>
							)}
						</MenuItem>
					</MenuSection>
				</Menu>
			</Popover>
		</MenuTrigger>
	);
};

const styles = stylex.create({
	category: { alignItems: "center", display: "flex", gap: spacing[2] },
	cell: { paddingBlock: spacing[3], paddingInline: spacing[4] },
	check: {
		color: violet[12],
		opacity: 1,
		transitionDuration: duration[2],
		transitionProperty: "opacity",
		transitionTimingFunction: "ease-in-out",
	},
	checkbox: {
		aspectRatio: "1/1",
		backgroundColor: { ":is([data-hovered])": mauve[2], default: null },
		borderColor: { ":is([data-hovered])": mauve[8], default: mauve[7] },
		borderRadius: radii[3],
		borderStyle: "solid",
		borderWidth: 1,
		display: "grid",
		inlineSize: 32,
		placeItems: "center",
		transitionDuration: duration[2],
		transitionProperty: "border-color, background-color",
		transitionTimingFunction: "ease-in-out",
	},
	checkHidden: { opacity: 0 },
	column: { color: mauve[11], fontWeight: fontWeight.medium, paddingBlock: spacing[3], paddingInline: spacing[4] },
	columnCategory: { inlineSize: 220 },
	columnConversation: { inlineSize: 220 },
	columnId: { inlineSize: 160 },
	columnResolvedState: { inlineSize: 130 },
	columnSeverity: { inlineSize: 130 },
	columnWithSortingContainer: { alignItems: "center", display: "flex", gap: spacing[2], justifyContent: "center" },
	conversationTitle: {
		borderRadius: radii[3],
		color: violet[12],
		display: "block",
		marginBlock: `calc(-1 * ${spacing[1]})`,
		marginInline: `calc(-1 * ${spacing[2]})`,
		maxInlineSize: "100%",
		overflow: "hidden",
		paddingBlock: spacing[1],
		paddingInline: spacing[2],
		textDecoration: "underline",
		textOverflow: "ellipsis",
		textUnderlineOffset: 2,
		whiteSpace: "nowrap",
	},
	description: { gridColumn: "1 / span 2", maxInlineSize: 1_200 },
	emptyState: {
		color: mauve[11],
		marginInline: "auto",
		maxInlineSize: 576,
		paddingBlock: spacing[6],
		paddingInline: spacing[3],
		textAlign: "center",
	},
	header: { display: "grid", gap: spacing[4], gridTemplateColumns: "minmax(0, 1fr) auto" },
	heading: { alignItems: "center", display: "flex", fontWeight: fontWeight.medium, gap: spacing[3] },
	id: { color: mauve[11], fontFamily: fontFamily.mono, fontWeight: fontWeight.light, textAlign: "center" },
	resolvedState: { display: "grid", placeItems: "center" },
	root: { display: "grid", gap: spacing[8] },
	row: { borderBlockEndWidth: 1, borderColor: mauve[6], borderStyle: "solid" },
	severity: { display: "grid", placeItems: "center" },
	severityHigh: { color: tomato[11] },
	severityLow: { color: cyan[11] },
	severityMedium: { color: amber[11] },
	table: { tableLayout: "fixed", width: "100%" },
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
	const { t } = useLingui();
	const navigate = useNavigate();

	const changeUserExperienceEvaluationResolvedStatus = useChangeUserExperienceEvaluationResolvedStatus();

	const searchParams = useSearch({ from: "/app/evaluations" });
	const headingId = useId();

	return (
		<div {...stylex.props(styles.root)}>
			<header {...stylex.props(styles.header)}>
				<h1 id={headingId} {...stylex.props(styles.heading, typography[8])}>
					<Icon name="24-hammer" />
					<Trans>Evaluations</Trans>
				</h1>
				<ViewSettings />
				<p {...stylex.props(styles.description)}>
					<Trans>
						While you're talking with Bella, we're constantly trying to check whether your experience is great! Here,
						you can find list of occurrences, where we think it didn't do as well as we wish for 🙈
					</Trans>
				</p>
			</header>
			<Table
				onSortChange={(sort) => {
					const newColumn = sort.column;

					assert(
						newColumn === "category"
							|| newColumn === "resolvedAt"
							|| newColumn === "createdAt"
							|| newColumn === "severity",
						"Sorting is only allowed for few selected columns",
					);

					void navigate({
						from: "/app/evaluations",
						search: (searchParams) => ({ ...searchParams, order: sort.direction, sort: newColumn }),
						to: "/app/evaluations",
					});
				}}
				aria-labelledby={headingId}
				sortDescriptor={{ column: searchParams.sort, direction: searchParams.order }}
				{...stylex.props(styles.table, ring.focusVisible)}
			>
				<TableHeader {...stylex.props(styles.table, styles.tableHeader)}>
					<Column
						id="createdAt"
						allowsSorting
						isRowHeader
						{...stylex.props(styles.column, styles.columnId, ring.focusVisible, typography[1])}
					>
						{({ sortDirection }) => (
							<div {...stylex.props(styles.columnWithSortingContainer)}>
								<Trans>ID</Trans>
								{sortDirection ?
									<Icon name={sortDirection === "ascending" ? "24-chevron-down" : "24-chevron-up"} />
								:	null}
							</div>
						)}
					</Column>
					<Column
						id="conversation"
						{...stylex.props(styles.column, styles.columnConversation, ring.focusVisible, typography[1])}
					>
						<Trans>Conversation</Trans>
					</Column>
					<Column
						id="category"
						allowsSorting
						{...stylex.props(styles.column, styles.columnCategory, ring.focusVisible, typography[1])}
					>
						{({ sortDirection }) => (
							<div {...stylex.props(styles.columnWithSortingContainer)}>
								<Trans>Category</Trans>
								{sortDirection ?
									<Icon name={sortDirection === "ascending" ? "24-chevron-down" : "24-chevron-up"} />
								:	null}
							</div>
						)}
					</Column>
					<Column
						id="severity"
						allowsSorting
						{...stylex.props(styles.column, styles.columnSeverity, ring.focusVisible, typography[1])}
					>
						{({ sortDirection }) => (
							<div {...stylex.props(styles.columnWithSortingContainer)}>
								<Trans>Severity</Trans>
								{sortDirection ?
									<Icon name={sortDirection === "ascending" ? "24-chevron-down" : "24-chevron-up"} />
								:	null}
							</div>
						)}
					</Column>
					<Column id="description" {...stylex.props(styles.column, ring.focusVisible, typography[1])}>
						Description
					</Column>
					<Column
						id="resolvedAt"
						allowsSorting
						{...stylex.props(styles.column, styles.columnResolvedState, ring.focusVisible, typography[1])}
					>
						{({ sortDirection }) => (
							<div {...stylex.props(styles.columnWithSortingContainer)}>
								<Trans>Resolved</Trans>
								{sortDirection ?
									<Icon name={sortDirection === "ascending" ? "24-chevron-down" : "24-chevron-up"} />
								:	null}
							</div>
						)}
					</Column>
				</TableHeader>
				<TableBody
					renderEmptyState={() => (
						<p {...stylex.props(styles.emptyState, typography[2])}>
							<Trans>
								It seems like we either don't have any evaluations ready yet, or the setting you've chosen doesn't match
								any of them 😞
							</Trans>
						</p>
					)}
					items={evaluations}
				>
					{(item) => (
						<Row id={item.id} key={item.id} {...stylex.props(styles.row, ring.focusVisible)}>
							<Cell {...stylex.props(styles.cell, styles.id, ring.focusVisible, typography[1])}>{item.id}</Cell>
							<Cell {...stylex.props(styles.cell, typography[2])}>
								<Link
									params={{ "conversation-id": item.conversationId }}
									to="/app/$conversation-id"
									{...stylex.props(styles.conversationTitle, ring.focusVisible)}
								>
									{item.conversationTitle}
								</Link>
							</Cell>
							<Cell {...stylex.props(styles.cell, ring.focusVisible, typography[2])}>
								<div {...stylex.props(styles.category)}>
									<Icon name={CATEGORY_ICON[item.category]} />
									{t(CATEGORY_TEXT[item.category])}
								</div>
							</Cell>
							<Cell {...stylex.props(styles.cell, ring.focusVisible, typography[2])}>
								<div {...stylex.props(styles.severity, severityColorStyles[item.severity])}>
									<Icon name={SEVERITY_ICON[item.severity]} />
									<span {...stylex.props(accessibility.srOnly)}>{t(SEVERITY_TEXT[item.severity])}</span>
								</div>
							</Cell>
							<Cell {...stylex.props(styles.cell, typography[2], ring.focusVisible)}>{item.description}</Cell>
							<Cell {...stylex.props(styles.cell, typography[2])}>
								<div {...stylex.props(styles.resolvedState)}>
									<Checkbox
										onChange={(isSelected) =>
											changeUserExperienceEvaluationResolvedStatus({
												conversationId: item.conversationId,
												evaluationId: item.id,
												isResolved: isSelected,
											})
										}
										isSelected={Boolean(item.resolvedAt)}
										{...stylex.props(styles.checkbox, ring.focusVisible)}
									>
										{({ isSelected }) => (
											<>
												<Icon name="24-check" {...stylex.props(styles.check, isSelected ? null : styles.checkHidden)} />
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
