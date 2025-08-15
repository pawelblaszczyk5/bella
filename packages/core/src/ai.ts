import { AiInput, AiLanguageModel } from "@effect/ai";
import { AnthropicClient, AnthropicLanguageModel } from "@effect/ai-anthropic";
import { GoogleAiClient, GoogleAiLanguageModel } from "@effect/ai-google";
import { FetchHttpClient } from "@effect/platform";
import { Array, Config, Duration, Effect, Layer, LayerMap, Match, Option, Schema, Stream, String } from "effect";

import type { ReasoningMessagePartModel, TextMessagePartModel } from "#src/database/schema.js";
import type { MessagesWithParts, ResponseFulfillment, ResponsePlan, ResponseRefusal } from "#src/shared.js";

const QuestionClassification = Schema.Struct({
	complexity: Schema.Number.pipe(Schema.between(0, 10)).annotations({
		description:
			"Complexity rating. If can't be interpreted as a question - e.g. it's acknowledgment, feel free to stay in lower bounds",
	}),
	language: Schema.NonEmptyTrimmedString.annotations({
		description: "User last message language, e.g. en-US or pl-PL",
	}),
	tone: Schema.Literal("FRIENDLY", "FORMAL", "PLAYFUL", "HOSTILE", "UNCLASSIFIED").annotations({
		description: "User tone, fallback to UNCLASSIFIED if can't match",
	}),
	topicsMentioned: Schema.Array(Schema.Literal("PROGRAMMING", "POLITICS")).annotations({
		description: "List of topics from predetermined list that user question is related to. Can be empty",
	}),
});

const GoogleAiClientLive = GoogleAiClient.layerConfig({ apiKey: Config.redacted("GOOGLE_AI_API_KEY") }).pipe(
	Layer.provide(FetchHttpClient.layer),
);
const AnthropicClientLive = AnthropicClient.layerConfig({ apiKey: Config.redacted("ANTHROPIC_API_KEY") }).pipe(
	Layer.provide(FetchHttpClient.layer),
);

class AiLanguageModelMap extends LayerMap.Service<AiLanguageModelMap>()("AiLanguageModelMap", {
	dependencies: [],
	idleTimeToLive: Duration.minutes(15),
	lookup: (name: ResponseFulfillment["model"]) =>
		Match.value(name).pipe(
			Match.when("ANTHROPIC:CLAUDE-4-SONNET", () =>
				AnthropicLanguageModel.layer({ model: "claude-4-sonnet-20250514" }).pipe(Layer.provide(AnthropicClientLive)),
			),
			Match.when("ANTHROPIC:CLAUDE-4.1-OPUS", () =>
				AnthropicLanguageModel.layer({ model: "claude-opus-4-1-20250805" }).pipe(Layer.provide(AnthropicClientLive)),
			),
			Match.when("GOOGLE:GEMINI-2.5-FLASH-LITE", () =>
				GoogleAiLanguageModel.layer({ model: "gemini-2.5-flash-lite" }).pipe(Layer.provide(GoogleAiClientLive)),
			),
			Match.when("GOOGLE:GEMINI-2.5-FLASH", () =>
				GoogleAiLanguageModel.layer({ model: "gemini-2.5-flash" }).pipe(Layer.provide(GoogleAiClientLive)),
			),
			Match.when("GOOGLE:GEMINI-2.5-PRO", () =>
				GoogleAiLanguageModel.layer({ model: "gemini-2.5-pro" }).pipe(Layer.provide(GoogleAiClientLive)),
			),
			Match.exhaustive,
		),
}) {}

export class Ai extends Effect.Service<Ai>()("@bella/core/Ai", {
	dependencies: [AiLanguageModelMap.Default],
	effect: Effect.gen(function* () {
		const aiLanguageModelMap = yield* AiLanguageModelMap;

		const mapMessagePart = Match.type<Omit<ReasoningMessagePartModel | TextMessagePartModel, "createdAt">>().pipe(
			Match.when({ type: "text" }, (part) => Option.some(AiInput.TextPart.make({ text: part.data.text }))),
			Match.when({ type: "reasoning" }, () => Option.none()),
			Match.exhaustive,
		);

		const mapMessagesWithPartsToPrompt = (messages: MessagesWithParts) =>
			messages.map((message) => {
				if (message.role === "USER") {
					return AiInput.UserMessage.make({ parts: Array.filterMap(message.parts, mapMessagePart) });
				}

				return AiInput.AssistantMessage.make({ parts: Array.filterMap(message.parts, mapMessagePart) });
			});

		const generateRefusalAnswer = Effect.fn(function* ({
			messages,
			responseRefusal,
		}: {
			messages: MessagesWithParts;
			responseRefusal: ResponseRefusal;
		}) {
			const stream = AiLanguageModel.streamText({
				prompt: mapMessagesWithPartsToPrompt(messages),
				system: String.stripMargin(`
						|<task>
						|	You're a helpful assistant named Bella. Your job is to help the user as much possible. Currently you need to refuse message generation because user message wasn't proper. Elaborate on the refusal reason so user will know what they did wrong and how they can do better.
						|</task>
						|<refusal_reason>
						| ${responseRefusal.reason}
						|</refusal_reason>
						|<output_language>
						|	Output language must be "${responseRefusal.language}". Regardless of anything other. It must be this language.
						|</output_language>
						|<style>
						|	Be substantive about the refusal, you don't need to be apologetic or anything like this. User is the one who did wrong, they should be aware of this. If they were hostile, don't be too nice. If the reason is politics be kinder, they could not know that you don't like to talk about politics.
						|</style>
						`),
			}).pipe(
				Stream.provideService(GoogleAiLanguageModel.Config, {
					generationConfig: { thinkingConfig: { includeThoughts: false, thinkingBudget: 0 } },
				}),
				Stream.provideLayer(aiLanguageModelMap.get("GOOGLE:GEMINI-2.5-FLASH-LITE")),
			);

			return stream;
		});

		const generateFulfillmentAnswer = Effect.fn(function* ({
			messages,
			responseFulfillment,
		}: {
			messages: MessagesWithParts;
			responseFulfillment: ResponseFulfillment;
		}) {
			const provideConfig: <A, E, R>(self: Stream.Stream<A, E, R>) => Stream.Stream<A, E, R> = Match.value(
				responseFulfillment,
			).pipe(
				Match.whenOr(
					{ model: "ANTHROPIC:CLAUDE-4-SONNET" },
					{ model: "ANTHROPIC:CLAUDE-4.1-OPUS" },
					(responseFulfillment) =>
						Stream.provideService(AnthropicLanguageModel.Config, {
							thinking:
								responseFulfillment.reasoningEnabled ? { budget_tokens: 2_000, type: "enabled" } : { type: "disabled" },
						}),
				),
				Match.whenOr(
					{ model: "GOOGLE:GEMINI-2.5-FLASH-LITE" },
					{ model: "GOOGLE:GEMINI-2.5-FLASH" },
					{ model: "GOOGLE:GEMINI-2.5-PRO" },
					() =>
						Stream.provideService(GoogleAiLanguageModel.Config, {
							generationConfig: {
								thinkingConfig:
									responseFulfillment.reasoningEnabled ?
										{ includeThoughts: true, thinkingBudget: 2_000 }
									:	{ includeThoughts: false, thinkingBudget: 0 },
							},
						}),
				),
				Match.exhaustive,
			);

			const answerStylePromptPart = Match.value(responseFulfillment.answerStyle).pipe(
				Match.when("FORMAL", () => "Be formal about the topic."),
				Match.when(
					"FRIENDLY",
					() =>
						"Try to answer in visually engaging way, use emojis if appropriate, but don't overuse them. The answer must be pleasant to read and user should be happy with it. Be really friendly.",
				),
				Match.exhaustive,
			);

			const stream = AiLanguageModel.streamText({
				prompt: mapMessagesWithPartsToPrompt(messages),
				system: String.stripMargin(`
						|<task>
						|	You're a helpful assistant named Bella. Your job is to help the user as much possible.
						|</task>
						|<output_language>
						|	Output language must be "${responseFulfillment.language}". Regardless of anything other. It must be this language.
						|</output_language>
						|<style>
						|	Be kind and respectful, no matter what happens you're supposed to be nice for the user. Don't always agree with him, you're welcome to challenge his ideas if you have a better one. Structure your answer hierarchically, use headings, list, tables where necessary. ${answerStylePromptPart}
						|</style>
						`),
			}).pipe(provideConfig, Stream.provideLayer(aiLanguageModelMap.get(responseFulfillment.model)));

			return stream;
		});

		return {
			classifyIncomingMessage: Effect.fn("Bella/Ai/classifyIncomingMessage")(function* (messages: MessagesWithParts) {
				const response = yield* AiLanguageModel.generateObject({
					prompt: mapMessagesWithPartsToPrompt(messages.slice(-3)),
					schema: QuestionClassification,
					system: String.stripMargin(`
						|<task>
						|	You're a helpful assistant tasked with classifying user messages before your colleague will answer to them. Your job is to characterize incoming message according to provided schema. Focus on the last message, but few past messages are provided if additional context is needed.
						|</task
						|<style>
						|	Be accurate. Don't make mistakes. Another colleague job is dependant on yours one. The output must be valid according to passed schema.
						|</style>
					`),
				}).pipe(Effect.provide(aiLanguageModelMap.get("ANTHROPIC:CLAUDE-4-SONNET")));

				return response.value;
			}),
			generateAnswer: Effect.fn("Bella/Ai/generateAnswer")(function* ({
				messages,
				responsePlan,
			}: {
				messages: MessagesWithParts;
				responsePlan: ResponsePlan;
			}) {
				const stream = yield* Match.value(responsePlan).pipe(
					Match.tag("ResponseFulfillment", (responseFulfillment) =>
						generateFulfillmentAnswer({ messages, responseFulfillment }),
					),
					Match.tag("ResponseRefusal", (responseRefusal) => generateRefusalAnswer({ messages, responseRefusal })),
					Match.exhaustive,
				);

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
				}).pipe(Effect.provide(aiLanguageModelMap.get("GOOGLE:GEMINI-2.5-FLASH-LITE")));

				return response.text.trim();
			}),
		};
	}),
}) {}
