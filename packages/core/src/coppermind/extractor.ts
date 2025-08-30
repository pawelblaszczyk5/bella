import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform";
import * as cheerio from "cheerio";
import { Config, Effect, Schema } from "effect";

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
		const BASE_URL = yield* Config.string("COPPERMIND_API_BASE_URL");

		const httpClient = (yield* HttpClient.HttpClient).pipe(
			HttpClient.mapRequest((request) =>
				request.pipe(HttpClientRequest.prependUrl(BASE_URL), HttpClientRequest.acceptJson),
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
			extractChunkedPageContent: Effect.fn("Extractor/extractChunkedPageContent")(function* (id: string) {
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

				return chunks;
			}),
		};
	}),
}) {}
