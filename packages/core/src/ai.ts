import { AiInput, AiLanguageModel } from "@effect/ai";
import { GoogleAiClient, GoogleAiLanguageModel } from "@effect/ai-google";
import { FetchHttpClient } from "@effect/platform";
import { Array, Config, Effect, Layer, Match, Stream, String } from "effect";

import type { AssistantMessageModel, TextMessagePartModel, UserMessageModel } from "#src/database/schema.js";

const GoogleAiClientLive = GoogleAiClient.layerConfig({ apiKey: Config.redacted("GOOGLE_AI_API_KEY") });

const GeminiFlash = GoogleAiLanguageModel.layer({ model: "gemini-2.5-flash" }).pipe(
	Layer.provide(GoogleAiClientLive),
	Layer.provide(FetchHttpClient.layer),
);

// NOTE Leaving it here for later
// const GeminiPro = GoogleAiLanguageModel.layer({ model: "gemini-2.5-pro" }).pipe(
// 	Layer.provide(GoogleAiClientLive),
// 	Layer.provide(FetchHttpClient.layer),
// );

const GeminiFlashLite = GoogleAiLanguageModel.layer({ model: "gemini-2.5-flash-lite" }).pipe(
	Layer.provide(GoogleAiClientLive),
	Layer.provide(FetchHttpClient.layer),
);

export class Ai extends Effect.Service<Ai>()("@bella/core/Ai", {
	dependencies: [],
	effect: Effect.gen(function* () {
		const mapMessagePart = Match.type<Omit<TextMessagePartModel, "createdAt">>().pipe(
			Match.when({ type: "text" }, (part) => AiInput.TextPart.make({ text: part.data.text })),
			Match.exhaustive,
		);

		return {
			generateAnswer: Effect.fn("Bella/Ai/generateAnswer")(function* (
				messages: Array<
					| {
							id: AssistantMessageModel["id"];
							parts: Array<Pick<TextMessagePartModel, "data" | "id" | "messageId" | "type">>;
							role: AssistantMessageModel["role"];
					  }
					| {
							id: UserMessageModel["id"];
							parts: Array<Pick<TextMessagePartModel, "data" | "id" | "messageId" | "type">>;
							role: UserMessageModel["role"];
					  }
				>,
			) {
				const stream = AiLanguageModel.streamText({
					prompt: messages.map((message) => {
						if (message.role === "USER") {
							return AiInput.UserMessage.make({ parts: Array.map(message.parts, mapMessagePart) });
						}

						return AiInput.AssistantMessage.make({ parts: Array.map(message.parts, mapMessagePart) });
					}),
					system: String.stripMargin(`
						|<task>
						|	You're a helpful assistant named Bella. Your job is to help the user as much possible.
						|</task>
						|<style>
						|	Be kind and respectful, no matter what happens you're supposed to be nice for the user. Don't always agree with him, you're welcome to challenge his ideas if you have a better one. Try to answer in visually engaging way, use emojis if appropriate, but don't overused them. Structure your answer hierarchically, use headings, list, tables where necessary. 
						|</style>
						`),
				}).pipe(Stream.provideLayer(GeminiFlash));

				return stream;
			}),
			generateTitle: Effect.fn("Bella/Ai/generateTitle")(function* (
				textMessagePartContentToGenerateTitleFrom: TextMessagePartModel["data"]["text"],
			) {
				const response = yield* AiLanguageModel.generateText({
					prompt: [
						// cspell:ignore cześć, obecnie, dzieje, polsce
						AiInput.UserMessage.make({
							parts: [AiInput.TextPart.make({ text: "Cześć, co obecnie dzieje się w Polsce?" })],
						}),
						// cspell:ignore wydarzenia
						AiInput.AssistantMessage.make({ parts: [AiInput.TextPart.make({ text: "Wydarzenia w Polsce" })] }),
						AiInput.UserMessage.make({
							parts: [
								AiInput.TextPart.make({
									text: "Generate me a code for React component, using React Aria Components, which will be responsible for managing booking date",
								}),
							],
						}),
						AiInput.AssistantMessage.make({
							parts: [AiInput.TextPart.make({ text: "Booking date component generation" })],
						}),
						AiInput.UserMessage.make({ parts: [AiInput.TextPart.make({ text: "Who is the current US president?" })] }),
						AiInput.AssistantMessage.make({ parts: [AiInput.TextPart.make({ text: "US president" })] }),
						AiInput.UserMessage.make({
							parts: [AiInput.TextPart.make({ text: textMessagePartContentToGenerateTitleFrom })],
						}),
					],
					system: String.stripMargin(`
						|<task>
						|	You're a helpful assistant tasked with generating titles for conversations in ai chat app. In each message you're receiving user message and you should respond with exactly one title suggestion. You shouldn't respond with anything else, it should include only the title suggestion
						|</task>
						|<style>
						|	The title should be concise, ideally a few words being a quintessence and a summary of the user message. It shouldn't ever directly answer user question. It must be a summary. It must be in the same language as the user message.
						|</style> 
					`),
				}).pipe(Effect.provide(GeminiFlashLite));

				return response.text.trim();
			}),
		};
	}),
}) {}
