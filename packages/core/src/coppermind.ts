import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform";
import * as cheerio from "cheerio";
import { Array, Effect, Schema } from "effect";
import { writeFile } from "node:fs";

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

const PageContent = Schema.Struct({
	parse: Schema.Struct({
		// cspell:ignore pageid
		pageid: Schema.Int,
		text: Schema.Struct({ "*": Schema.NonEmptyString }),
		title: Schema.NonEmptyString,
	}),
});

const MAX_ACCUMULATED_CHUNK_SIZE = 1_500;

export class Extractor extends Effect.Service<Extractor>()("@bella/core/Extractor", {
	dependencies: [FetchHttpClient.layer],
	effect: Effect.gen(function* () {
		const httpClient = (yield* HttpClient.HttpClient).pipe(
			HttpClient.mapRequest((request) =>
				request.pipe(HttpClientRequest.prependUrl("https://coppermind.net/w/api.php"), HttpClientRequest.acceptJson),
			),
			HttpClient.filterStatusOk,
		);

		const getPageContent = Effect.fn("Extractor/getPageContent")(function* (id: string) {
			const response = yield* httpClient
				.get("", {
					// eslint-disable-next-line unicorn/prevent-abbreviations -- that's how it's named in the API
					urlParams: { action: "parse", format: "json", page: id, prop: "text" },
				})
				.pipe(Effect.flatMap(HttpClientResponse.schemaBodyJson(PageContent)));

			return response.parse.text["*"];
		});

		return {
			extractPage: Effect.fn("Extractor/extractPage")(function* (id: string) {
				const content = yield* getPageContent(id);

				const $ = cheerio.load(content);

				// cspell:ignore navaid, infobox, editsection
				$(".navaid").remove(); // insert with links to different articles
				$(".infobox").remove(); // tables with generic information, translations etc.
				$(".hide-for-print").remove(); // as the class suggests
				$(".notice").remove(); // meta information
				$(".mw-references-wrap").prev().remove(); // references heading
				$(".mw-references-wrap").remove(); // references themselves
				$(".mw-editsection").remove(); // Edit links
				$(".reference").remove(); // as the class suggests
				$(".toc").remove(); // as the class suggests
				$("#See_Also").parent().nextUntil("h2").remove(); // See also doesn't really make sense here
				$("#See_Also").parent().remove(); // See also doesn't really make sense here
				$(".pillars").remove();
				$("dl").remove();

				$("h2").each((_, element) => {
					const $h2 = $(element);
					const $mainSection = $(`<div class="main-section"></div>`);

					$h2.before($mainSection);
					$mainSection.append($h2.nextUntil("h2"));
					$mainSection.prepend($h2);

					$mainSection.children("h3").each((_, element) => {
						const $h3 = $(element);
						const $subSection = $(`<div class="sub-section"></div>`);

						$h3.before($subSection);
						$subSection.append($h3.nextUntil("h3"));
						$subSection.prepend($h3);
					});
				});

				const additionalMainSection = $(`<div class="main-section"></div>`);

				$(".mw-parser-output")
					.children()
					.not(".main-section")
					.each((_, element) => {
						const child = $(element);

						additionalMainSection.append(child);
					});

				$(".mw-parser-output").prepend(additionalMainSection);

				$(".sub-section").each((_, element) => {
					const subSection = $(element);

					if (subSection.children().not("h3").length === 0) {
						subSection.remove();
					}
				});

				$(".main-section").each((_, element) => {
					const mainSection = $(element);

					if (mainSection.children().not("h2").length === 0) {
						mainSection.remove();
					}
				});

				const chunks: Array<string> = [];

				$(".main-section").each((_, element) => {
					const mainSection = $(element);

					const subsections = mainSection.children(".sub-section");

					const heading = mainSection.children("h2").first().prop("innerText");

					let prefix = id;

					if (heading && heading.length > 0) {
						prefix = `${prefix} ${heading}`;
					}

					if (subsections.length === 0) {
						let accumulator = "";

						mainSection
							.children()
							.not("h2")
							.each((_, element) => {
								let childText = $(element).prop("innerText");

								if (!childText) {
									return;
								}

								childText = childText.trim();

								if (accumulator.length > 0 && accumulator.length + childText.length >= MAX_ACCUMULATED_CHUNK_SIZE) {
									chunks.push(`${prefix} ${accumulator}`);

									accumulator = childText;
									return;
								}

								accumulator += ` ${childText}`;
							});

						if (accumulator.length > 0) {
							chunks.push(`${prefix} ${accumulator}`);
						}

						return;
					}

					subsections.each((_, element) => {
						const subsection = $(element);

						const heading = subsection.children("h3").first().prop("innerText");

						let subsectionPrefix = prefix;

						if (heading && heading.length > 0) {
							subsectionPrefix = `${prefix} ${heading}`;
						}

						let accumulator = "";

						subsection
							.children()
							.not("h3")
							.each((_, element) => {
								let childText = $(element).prop("innerText");

								if (!childText) {
									return;
								}

								childText = childText.trim();

								if (accumulator.length + childText.length >= MAX_ACCUMULATED_CHUNK_SIZE) {
									chunks.push(`${subsectionPrefix} ${accumulator}`);

									accumulator = childText;
									return;
								}

								accumulator += ` ${childText}`;
							});

						if (accumulator.length > 0) {
							chunks.push(`${subsectionPrefix} ${accumulator}`);
						}
					});
				});

				// eslint-disable-next-line n/prefer-promises/fs -- that's for testing purposes
				writeFile(`${id}-embeddings.txt`, chunks.join("\n\n"), { encoding: "utf8" }, () => {
					void null;
				});
				// eslint-disable-next-line n/prefer-promises/fs -- that's for testing purposes
				writeFile(`${id}-embeddings-html.txt`, $.html(), { encoding: "utf8" }, () => {
					void null;
				});
			}),
		};
	}),
}) {}

export class Coppermind extends Effect.Service<Coppermind>()("@bella/core/Coppermind", {
	dependencies: [Extractor.Default],
	effect: Effect.gen(function* () {
		const extractor = yield* Extractor;

		return {
			embedPage: Effect.fn(function* (id: string) {
				yield* extractor.extractPage(id);
			}),
			getPagesIds: Effect.fn("Coppermind/getPagesIds")(function* () {
				return Array.appendAll(Array.appendAll(BOOKS_PAGES_IDS, CHARACTERS_PAGES_IDS), SUMMARIES_PAGES_IDS);
			}),
		};
	}),
}) {}
