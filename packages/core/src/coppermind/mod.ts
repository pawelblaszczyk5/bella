import { Array, Effect, Option, Order, pipe } from "effect";

import { IdGenerator } from "@bella/id-generator/effect";

import { Embedder } from "#src/coppermind/embedder.js";
import { Extractor } from "#src/coppermind/extractor.js";
import { Reranker } from "#src/coppermind/reranker.js";
import { Point } from "#src/coppermind/shared.js";
import { Storage } from "#src/coppermind/storage.js";

// cspell:disable
const BOOKS_PAGES_IDS = Array.make(
	"The Way of Kings",
	"Words of Radiance",
	"Oathbringer",
	"Rhythm of War",
	"Wind and Truth",
	"Edgedancer (novella)",
	"Dawnshard (novella)",
	"The Stormlight Archive",

	"Mistborn: The Final Empire",
	"The Well of Ascension",
	"The Hero of Ages",
	"The Alloy of Law",
	"Shadows of Self",
	"The Bands of Mourning",
	"The Lost Metal",
	"Mistborn: Secret History",
	"The Eleventh Metal",
	"Allomancer Jak and the Pits of Eltania",

	"Elantris (book)",
	"The Sunlit Man",
	"Tress of the Emerald Sea",
	"Warbreaker",
	"White Sand",
	"Yumi and the Nightmare Painter",
	"The Hope of Elantris",
	"Shadows for Silence in the Forests of Hell",
	"Sixth of the Dusk (novella)",
);

const CHARACTERS_PAGES_IDS = Array.make(
	"Kaladin",
	"Shallan Davar",
	"Dalinar Kholin",
	"Eshonai",
	"Venli",
	"Szeth",
	"Adolin Kholin",
	"Renarin Kholin",
	"Jasnah Kholin",
	"Navani Kholin",
	"Lift",
	"Moash",
	"Taravangian",
	"Talenel",

	"Vin",
	"Kelsier",
	"Sazed",
	"Elend Venture",
	"Marsh",
	"Spook",
	"Edgard Ladrian",
	"Hammond",
	"Cladent",
	"Dockson",
	"Straff Venture",
	"Zane Venture",
	"Ashweather Cett",
	"Tindwyl",
	"Allrianne Cett",
	"TenSoon",
	"Aradan Yomen",
	"Quellion",
	"Rashek",
	"Alendi",
	"Kwaan",

	"Waxillium Ladrian",
	"Wayne",
	"Marasi Colms",
	"Steris Harms",
	"MeLaan",
	"Miles Dagouter",
	"Ranette",
	"Edwarn Ladrian",
	"Paalm",
	"Claude Aradel",
	"Telsin Ladrian",

	"Raoden",
	"Sarene",
	"Hrathen",

	"Sigzil",

	"Hoid",

	"Tress",
	"Charlie",

	"Sisirinah",
	"Vivenna",
	"Lightsong",
	"Vasher",
	"Nightblood",

	"Yumi",
	"Nikaro",

	"Kenton",
	"Khrissalla",
);

const SUMMARIES_PAGES_IDS = Array.make(
	"Summary:The Way of Kings",
	"Summary:Words of Radiance",
	"Summary:Oathbringer",
	"Summary:Rhythm of War",
	"Summary:Wind and Truth",
	"Summary:Edgedancer",
	"Summary:Dawnshard",

	"Summary:Mistborn: The Final Empire",
	"Summary:The Well of Ascension",
	"Summary:The Hero of Ages",

	"Summary:The Alloy of Law",
	"Summary:Shadows of Self",
	"Summary:The Bands of Mourning",
	"Summary:The Lost Metal",

	"Summary:Elantris",
	"Summary:The Sunlit Man",
	"Summary:Tress of the Emerald Sea",
	"Summary:Warbreaker",
	"Summary:White Sand",
	"Summary:Yumi and the Nightmare Painter",
);

// cspell:enable

const POINT_RELEVANCE_THRESHOLD = 0.65;

export class Coppermind extends Effect.Service<Coppermind>()("@bella/core/Coppermind", {
	dependencies: [Extractor.Default, Embedder.Live, Storage.Default, IdGenerator.Default, Reranker.Default],
	effect: Effect.gen(function* () {
		const extractor = yield* Extractor;
		const embedder = yield* Embedder;
		const storage = yield* Storage;
		const reranker = yield* Reranker;

		return {
			embedPage: Effect.fn("Bella/Coppermind/embedPage")(function* (pageId: string) {
				const chunks = yield* extractor.extractChunkedPageContent(pageId);

				const chunksOfDocumentChunks = Array.chunksOf(chunks, 60);

				const points = yield* Effect.forEach(chunksOfDocumentChunks, embedder.embedDocument).pipe(
					Effect.map(Array.flatten),
					Effect.map((embeddedDocumentChunks) =>
						Array.map(embeddedDocumentChunks, (embeddedDocumentChunk) => {
							const id = crypto.randomUUID();

							return Point.make({
								id,
								payload: { content: embeddedDocumentChunk.chunk, pageId },
								vector: embeddedDocumentChunk.embedding,
							});
						}),
					),
				);

				yield* storage.insertPoints(points);
			}),
			flushStorage: Effect.fn("Bella/Coppermind/flushStorage")(function* () {
				yield* storage.flushStorage();
			}),
			getPagesIds: Effect.fn("Bella/Coppermind/getPagesIds")(function* () {
				return Array.appendAll(BOOKS_PAGES_IDS, Array.appendAll(CHARACTERS_PAGES_IDS, SUMMARIES_PAGES_IDS));
			}),
			getRelatedDataForQueries: Effect.fn("Bella/Coppermind/getRelatedDataForQueries")(function* ({
				subqueries,
				summarizedQuery,
			}: {
				subqueries: ReadonlyArray<string>;
				summarizedQuery: string;
			}) {
				const embeddedQueries = yield* embedder.embedQueries(subqueries);

				const nearestPoints = yield* Effect.forEach(
					embeddedQueries,
					Effect.fn(function* (embeddedQuery) {
						return yield* storage.queryPoints(embeddedQuery.embedding);
					}),
					{ concurrency: 5 },
				).pipe(
					Effect.map(Array.flatten),
					Effect.map(Array.dedupeWith((firstPoint, secondPoint) => firstPoint.id === secondPoint.id)),
				);

				const rerankedPoints = yield* reranker.rerankForQuery({ points: nearestPoints, query: summarizedQuery });

				return pipe(
					Array.filterMap(rerankedPoints, (point) => {
						if (point.relevance < POINT_RELEVANCE_THRESHOLD) {
							return Option.none();
						}

						return Option.some({
							content: point.payload.content,
							pageId: point.payload.pageId,
							relevance: point.relevance,
						});
					}),
					Array.sortWith((point) => point.relevance, Order.reverse(Order.number)),
				);
			}),
		};
	}),
}) {}
