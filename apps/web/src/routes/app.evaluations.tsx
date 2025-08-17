import { useLingui } from "@lingui/react/macro";
import { eq, inArray, Query, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { Effect, Schema } from "effect";

import { Evaluations } from "#src/components/evaluations.js";
import {
	conversationsCollection,
	messagesCollection,
	userExperienceEvaluationCollection,
	UserExperienceEvaluationShape,
} from "#src/lib/collections.js";

const SEARCH_DEFAULTS = {
	category: UserExperienceEvaluationShape.fields.category.literals,
	hideResolved: true,
	order: "descending",
	severity: UserExperienceEvaluationShape.fields.severity.literals,
	sort: "createdAt",
} as const;

const Search = Schema.Struct({
	category: Schema.NonEmptyArray(UserExperienceEvaluationShape.fields.category)
		.pipe(Schema.optionalWith({ default: () => SEARCH_DEFAULTS.category, exact: true }))
		.annotations({ decodingFallback: () => Effect.succeed(SEARCH_DEFAULTS.category) }),
	hideResolved: Schema.Boolean.pipe(
		Schema.optionalWith({ default: () => SEARCH_DEFAULTS.hideResolved, exact: true }),
	).annotations({ decodingFallback: () => Effect.succeed(SEARCH_DEFAULTS.hideResolved) }),
	order: Schema.Literal("ascending", "descending")
		.pipe(Schema.optionalWith({ default: () => SEARCH_DEFAULTS.order, exact: true }))
		.annotations({ decodingFallback: () => Effect.succeed(SEARCH_DEFAULTS.order) }),
	severity: Schema.NonEmptyArray(UserExperienceEvaluationShape.fields.severity)
		.pipe(Schema.optionalWith({ default: () => SEARCH_DEFAULTS.severity, exact: true }))
		.annotations({ decodingFallback: () => Effect.succeed(SEARCH_DEFAULTS.severity) }),
	sort: Schema.Literal("createdAt", "resolvedAt", "category", "severity")
		.pipe(Schema.optionalWith({ default: () => SEARCH_DEFAULTS.sort, exact: true }))
		.annotations({ decodingFallback: () => Effect.succeed(SEARCH_DEFAULTS.sort) }),
});

type Search = Schema.Schema.Type<typeof Search>;

const RouteComponent = () => {
	const search = Route.useSearch();

	const { data: evaluations } = useLiveQuery(
		(q) => {
			const messagesWithConversationTitle = new Query()
				.from({ messagesCollection })
				.innerJoin({ conversationsCollection }, ({ conversationsCollection, messagesCollection }) =>
					eq(messagesCollection.conversationId, conversationsCollection.id),
				)
				.select(({ conversationsCollection, messagesCollection }) => ({
					conversationId: conversationsCollection.id,
					conversationTitle: conversationsCollection.title,
					id: messagesCollection.id,
				}));

			let query = q
				.from({ userExperienceEvaluationCollection })
				.innerJoin(
					{ messagesWithConversationTitle },
					({ messagesWithConversationTitle, userExperienceEvaluationCollection }) =>
						eq(userExperienceEvaluationCollection.messageId, messagesWithConversationTitle.id),
				);

			query = query.where(({ userExperienceEvaluationCollection }) =>
				inArray(userExperienceEvaluationCollection.category, search.category),
			);

			query = query.where(({ userExperienceEvaluationCollection }) =>
				inArray(userExperienceEvaluationCollection.severity, search.severity),
			);

			let nulls: "first" | "last" = "last";

			if (search.sort === "resolvedAt") {
				nulls = search.order === "ascending" ? "last" : "first";
			}

			query =
				search.sort === "createdAt" ?
					query.orderBy(
						({ userExperienceEvaluationCollection }) => userExperienceEvaluationCollection.createdAt.epochMillis,
						search.order === "ascending" ? "asc" : "desc",
					)
				:	query
						.orderBy(({ userExperienceEvaluationCollection }) => userExperienceEvaluationCollection[search.sort], {
							direction: search.order === "ascending" ? "asc" : "desc",
							nulls,
						})
						.orderBy(
							({ userExperienceEvaluationCollection }) => userExperienceEvaluationCollection.createdAt.epochMillis,
							"desc",
						);

			if (search.hideResolved) {
				query = query.where(({ userExperienceEvaluationCollection }) =>
					eq(userExperienceEvaluationCollection.resolvedAt, null),
				);
			}

			return query.select(({ messagesWithConversationTitle, userExperienceEvaluationCollection }) => ({
				category: userExperienceEvaluationCollection.category,
				conversationId: messagesWithConversationTitle.conversationId,
				conversationTitle: messagesWithConversationTitle.conversationTitle,
				createdAt: userExperienceEvaluationCollection.createdAt,
				description: userExperienceEvaluationCollection.description,
				id: userExperienceEvaluationCollection.id,
				resolvedAt: userExperienceEvaluationCollection.resolvedAt,
				severity: userExperienceEvaluationCollection.severity,
			}));
		},
		[search],
	);

	const { t } = useLingui();

	return (
		<>
			<title>{t`Evaluations | Bella`}</title>
			<Evaluations evaluations={evaluations} />
		</>
	);
};

export const Route = createFileRoute("/app/evaluations")({
	component: RouteComponent,
	loader: async () => {
		await userExperienceEvaluationCollection.preload();
	},
	search: { middlewares: [stripSearchParams(SEARCH_DEFAULTS)] },
	validateSearch: Schema.standardSchemaV1(Search),
});
