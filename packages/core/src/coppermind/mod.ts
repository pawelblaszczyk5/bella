import { Array, Effect } from "effect";

import { IdGenerator } from "@bella/id-generator/effect";

import { Embedder } from "#src/coppermind/embedder.js";
import { Extractor } from "#src/coppermind/extractor.js";
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

export class Coppermind extends Effect.Service<Coppermind>()("@bella/core/Coppermind", {
	dependencies: [Extractor.Default, Embedder.Default, Storage.Default, IdGenerator.Default],
	effect: Effect.gen(function* () {
		const extractor = yield* Extractor;
		const embedder = yield* Embedder;
		const storage = yield* Storage;

		return {
			embedPages: Effect.fn("Bella/Coppermind/embedPages")(function* (pagesIds: ReadonlyArray<string>) {
				const chunkedPagesContents = yield* Effect.forEach(
					pagesIds,
					Effect.fn(function* (pageId) {
						return yield* extractor.extractChunkedPageContent(pageId);
					}),
				);

				const vectors = yield* embedder.embedDocumentsWithContext(chunkedPagesContents);

				const points = yield* Effect.forEach(
					vectors,
					Effect.fn(function* (vectorsForPage, index) {
						const pageId = yield* Array.get(pagesIds, index);

						const chunkedContentsPerPage = yield* Array.get(chunkedPagesContents, index);

						return yield* Effect.forEach(
							vectorsForPage,
							Effect.fn(function* (vector, index) {
								const content = yield* Array.get(chunkedContentsPerPage, index);

								const id = crypto.randomUUID();

								return Point.make({ id, payload: { content, pageId }, vector });
							}),
						);
					}),
				).pipe(Effect.map((pointsGroupedByPage) => Array.flatten(pointsGroupedByPage)));

				yield* storage.insertPoints(points);
			}),
			flushStorage: Effect.fn("Bella/Coppermind/flushStorage")(function* () {
				yield* storage.flushStorage();
			}),
			getContentForQueries: Effect.fn("Bella/Coppermind/getContentForQueries")(function* ({
				query,
				subqueries,
			}: {
				query: string;
				subqueries: ReadonlyArray<string>;
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

				const rerankedPoints = yield* embedder.rerankPointsForQuery({ points: nearestPoints, query });

				yield* Effect.log(rerankedPoints);
			}),
			getPagesIds: Effect.fn("Bella/Coppermind/getPagesIds")(function* () {
				return BOOKS_PAGES_IDS;
			}),
		};
	}),
}) {}
