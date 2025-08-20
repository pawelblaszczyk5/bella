import { Schema } from "effect";

export const Point = Schema.Struct({
	id: Schema.String.pipe(Schema.length(36)),
	payload: Schema.Struct({ content: Schema.NonEmptyString, pageId: Schema.String }),
	vector: Schema.Array(Schema.Number),
});

export type Point = Schema.Schema.Type<typeof Point>;

export const PointWithScore = Schema.Struct({ ...Point.fields, score: Schema.Number });

export type PointWithScore = Schema.Schema.Type<typeof PointWithScore>;

export const PointWithScoreAndRelevance = Schema.Struct({ ...PointWithScore.fields, relevance: Schema.Number });

export type PointWithScoreAndRelevance = Schema.Schema.Type<typeof PointWithScoreAndRelevance>;
