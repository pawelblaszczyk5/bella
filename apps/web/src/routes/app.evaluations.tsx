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
	nonResolvedOnly: true,
	order: "desc",
	severity: UserExperienceEvaluationShape.fields.severity.literals,
	sort: "createdAt",
} as const;

const Search = Schema.Struct({
	category: Schema.Array(UserExperienceEvaluationShape.fields.category)
		.pipe(Schema.optionalWith({ default: () => SEARCH_DEFAULTS.category, exact: true }))
		.annotations({ decodingFallback: () => Effect.succeed(SEARCH_DEFAULTS.category) }),
	nonResolvedOnly: Schema.Boolean.pipe(
		Schema.optionalWith({ default: () => SEARCH_DEFAULTS.nonResolvedOnly, exact: true }),
	).annotations({ decodingFallback: () => Effect.succeed(SEARCH_DEFAULTS.nonResolvedOnly) }),
	order: Schema.Literal("asc", "desc")
		.pipe(Schema.optionalWith({ default: () => SEARCH_DEFAULTS.order, exact: true }))
		.annotations({ decodingFallback: () => Effect.succeed(SEARCH_DEFAULTS.order) }),
	severity: Schema.Array(UserExperienceEvaluationShape.fields.severity)
		.pipe(Schema.optionalWith({ default: () => SEARCH_DEFAULTS.severity, exact: true }))
		.annotations({ decodingFallback: () => Effect.succeed(SEARCH_DEFAULTS.severity) }),
	sort: Schema.Literal("createdAt", "resolvedAt", "category", "severity")
		.pipe(Schema.optionalWith({ default: () => SEARCH_DEFAULTS.sort, exact: true }))
		.annotations({ decodingFallback: () => Effect.succeed(SEARCH_DEFAULTS.sort) }),
});

type Search = Schema.Schema.Type<typeof Search>;

const buildEvaluationsQuery = (search: Search) => {
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

	let query = new Query()
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

	query = query.orderBy(
		({ userExperienceEvaluationCollection }) => userExperienceEvaluationCollection[search.sort],
		search.order,
	);

	if (search.sort !== "createdAt") {
		query.orderBy(({ userExperienceEvaluationCollection }) => userExperienceEvaluationCollection.createdAt, "desc");
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
};

const RouteComponent = () => {
	const search = Route.useSearch();

	const query = buildEvaluationsQuery(search);

	const { data: evaluations } = useLiveQuery((q) => q.from({ evaluations: query }), [query]);

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
