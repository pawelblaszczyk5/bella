import { AiInput, AiLanguageModel } from "@effect/ai";
import { AnthropicClient, AnthropicLanguageModel } from "@effect/ai-anthropic";
import { GoogleAiClient, GoogleAiLanguageModel } from "@effect/ai-google";
import { FetchHttpClient } from "@effect/platform";
import {
	Array,
	Config,
	Duration,
	Effect,
	ExecutionPlan,
	Layer,
	LayerMap,
	Match,
	Option,
	Schedule,
	Schema,
	Stream,
	String,
} from "effect";

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
	topicsMentioned: Schema.Array(Schema.Literal("PROGRAMMING", "POLITICS", "BRANDON_SANDERSON_BOOKS")).annotations({
		description: `List of topics from predetermined list that user question is related to. "BRANDON_SANDERSON_BOOKS" relates to any of his books, whether it's Cosmere, Mistborn, Stormlight Archive or some specific question about any of these or other ones. Can be empty`,
	}),
});

const ExperienceClassification = Schema.Struct({
	result: Schema.Struct({
		category: Schema.Literal(
			"FACTUAL_ERROR",
			"UNNECESSARY_REFUSAL",
			"CONTEXT_IGNORED",
			"IRRELEVANT",
			"UNCLASSIFIED",
		).annotations({
			description:
				"Category of negative experience. FACTUAL_ERROR means user points out there were some incorrect information. UNNECESSARY_REFUSAL means user isn't happy and doesn't understand why his generation was refused. CONTEXT_IGNORED means user points out that message doesn't properly refer previously established facts. IRRELEVANT is an umbrella for any misunderstanding, off-topic or too generic, vague answers. Fallback to UNCLASSIFIED if experience is negative but doesn't fit any other category",
		}),
		description: Schema.NonEmptyTrimmedString.annotations({
			description: "Short, non-formatted description summarizing what went wrong. Max 1-2 sentences, keep it concise",
		}),
		severity: Schema.Literal("LOW", "MEDIUM", "HIGH").annotations({
			description:
				"Severity of user's negative experience. The higher the severity the less likely user is to try to continue the conversation or the issue is more serious",
		}),
	})
		.pipe(Schema.NullOr)
		.annotations({
			description:
				"Result is either null, when user experience wasn't negative or some basic diagnostics matching the provided schema when negative experience was detected",
		}),
});

const CoppermindQueries = Schema.Struct({
	subqueries: Schema.Array(Schema.NonEmptyString).annotations({
		description: "All relevant queries that will find information required to answer original question to the fullest.",
	}),
	summarizedQuery: Schema.NonEmptyString.annotations({
		description:
			"Summarized standalone question, based on the whole conversation, closest to user's original phrasing.",
	}),
});

const GoogleAiClientLive = GoogleAiClient.layerConfig({ apiKey: Config.redacted("GOOGLE_AI_API_KEY") }).pipe(
	Layer.provide(FetchHttpClient.layer),
);
const AnthropicClientLive = AnthropicClient.layerConfig({ apiKey: Config.redacted("ANTHROPIC_API_KEY") }).pipe(
	Layer.provide(FetchHttpClient.layer),
);

type InternalModels = "ANTHROPIC:CLAUDE-3.5-HAIKU";

class AiLanguageModelMap extends LayerMap.Service<AiLanguageModelMap>()("AiLanguageModelMap", {
	dependencies: [],
	idleTimeToLive: Duration.minutes(15),
	lookup: (name: InternalModels | ResponseFulfillment["model"]) =>
		Match.value(name).pipe(
			Match.when("ANTHROPIC:CLAUDE-4-SONNET", () =>
				AnthropicLanguageModel.layer({ model: "claude-4-sonnet-20250514" }).pipe(Layer.provide(AnthropicClientLive)),
			),
			Match.when("ANTHROPIC:CLAUDE-3.5-HAIKU", () =>
				AnthropicLanguageModel.layer({ model: "claude-3-5-haiku-20241022" }).pipe(Layer.provide(AnthropicClientLive)),
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

const ClassificationPlan = ExecutionPlan.make({
	attempts: 3,
	provide: AiLanguageModelMap.get("ANTHROPIC:CLAUDE-3.5-HAIKU"),
	schedule: Schedule.jittered(Schedule.exponential(Duration.millis(150), 1.2)),
});

export class Ai extends Effect.Service<Ai>()("@bella/core/Ai", {
	dependencies: [AiLanguageModelMap.Default],
	effect: Effect.gen(function* () {
		const aiLanguageModelMap = yield* AiLanguageModelMap;
		const executionPlan = yield* ClassificationPlan.withRequirements;

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
			additionalContext,
			messages,
			responseFulfillment,
		}: {
			additionalContext: Option.Option<string>;
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

			const additionalContextPromptPart = Option.match(additionalContext, {
				onNone: () => "",
				onSome: (value) =>
					String.stripMargin(`
				|<additional_context>
				|	Some additional context was provided to you by experts of the question niche, you should prioritize using it to answer user question. These are sorted from the highest relevance to the lowest. If using parts of it, please provide direct quotes without any modifications/translations:
				| 
				| ${value}
				|</additional_context>
				`),
			});

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
						|${additionalContextPromptPart}
						|	Be kind and respectful, no matter what happens you're supposed to be nice for the user. Don't always agree with him, you're welcome to challenge his ideas if you have a better one. Structure your answer hierarchically, use headings, list, tables where necessary. ${answerStylePromptPart}
						|</style>
						`),
			}).pipe(provideConfig, Stream.provideLayer(aiLanguageModelMap.get(responseFulfillment.model)));

			return stream;
		});

		return {
			classifyIncomingMessage: Effect.fn("Bella/Ai/classifyIncomingMessage")(function* (messages: MessagesWithParts) {
				const response = yield* AiLanguageModel.generateObject({
					prompt: mapMessagesWithPartsToPrompt(messages),
					schema: QuestionClassification,
					system: String.stripMargin(`
						|<task>
						|	You're a helpful assistant tasked with classifying user messages before your colleague will answer to them. Your job is to characterize incoming message according to provided schema. Focus on the last message, but few past messages are provided if additional context is needed.
						|</task>
						|<style>
						|	Be accurate. Don't make mistakes. Another colleague job is dependant on yours one. The output must be valid according to passed schema.
						|</style>
					`),
				}).pipe(Effect.withExecutionPlan(executionPlan));

				return response.value;
			}),
			classifyUserExperience: Effect.fn("Bella/Ai/classifyUserExperience")(function* (messages: MessagesWithParts) {
				const response = yield* AiLanguageModel.generateObject({
					prompt: mapMessagesWithPartsToPrompt(messages),
					schema: ExperienceClassification,
					system: String.stripMargin(`
						|<task>
						|	You're a helpful assistant tasked with evaluating user experience in this conversation. You're getting a part of conversation. Based on user latest answer you must catch all negative experiences. If negative experience is detected you must categorize it and provide basic description. Everything, whether it's positive or negative experience must be fitting schema. Result can be null in cases where there's no negative experience.
						|</task>
						|<style>
						|	Be accurate. Don't make mistakes. Another colleague job is dependant on yours one. The output must be valid according to passed schema. Always answer in english, regardless of the actual conversation language
						|</style>
					`),
				}).pipe(Effect.withExecutionPlan(executionPlan));

				return response.value;
			}),
			generateAnswer: Effect.fn("Bella/Ai/generateAnswer")(function* ({
				additionalContext,
				messages,
				responsePlan,
			}: {
				additionalContext: Option.Option<string>;
				messages: MessagesWithParts;
				responsePlan: ResponsePlan;
			}) {
				const stream = yield* Match.value(responsePlan).pipe(
					Match.tag("ResponseFulfillment", (responseFulfillment) =>
						generateFulfillmentAnswer({ additionalContext, messages, responseFulfillment }),
					),
					Match.tag("ResponseRefusal", (responseRefusal) => generateRefusalAnswer({ messages, responseRefusal })),
					Match.exhaustive,
				);

				return stream;
			}),
			generateCoppermindQueries: Effect.fn("Bella/Ai/generateCoppermindQueries")(function* (
				messages: MessagesWithParts,
			) {
				const response = yield* AiLanguageModel.generateObject({
					prompt: mapMessagesWithPartsToPrompt(messages),
					schema: CoppermindQueries,
					system: String.stripMargin(`
						|<task>
						|	You're a helpful assistant being a specialist in Brandon Sanderson books. Everything that spans from Cosmere, Stormlight Archive, Mistborn or any of his other books. You've read all of them and know details about any of these and its characters and all lore and fan content around it. Your job is to help your colleague find relevant information for answering question related to your niche. To do this you need to generate two things:
						|	<summarized_query>
						|		Summarized query is user question extracted from the whole conversation context. It should be as close as possible to original question. If user message contains any information irrelevant to the question - filter it out. If user refers to something that was mentioned in previous messages you need to extract relevant information so the question can be processed without this context. You must extract closest representation of user question.
						|	</summarized_query>
						|	<subqueries>
						|		This needs to be list of questions that can extract all information relevant to user question. Imagine you're doing a research and want to answer the user question. You want to list all "smaller questions" that you need to answer for research to be complete. Be creative, but don't make things up. For simple questions, like "What happened in chapter 28 of The Way of Kings" it'll be basically the same as the question and you don't need to provide more than one. For more complex question or when user asks for multiple questions at the same time this is useful for better information extraction. Also important is that this can include questions that have similar meanings, but are different semantically, because this will be used for semantic search. E.g. if user asks about character, using they nickname, it may be valuable to rephrase the same question with both nickname and original name, or if user asks about character looks, it may be valuable to split the question into multiple parts. This list should be the longer, the more complicated the question is. For many simple question it shouldn't be longer then 1-2 queries.
						|	</subqueries>
						|</task>
						|<style>
						|	Be accurate. Don't make mistakes. Another colleague job is dependant on yours one. The output must be valid according to passed schema. Always answer in english, regardless of the actual conversation language
						|</style>
					`),
				}).pipe(Effect.withExecutionPlan(executionPlan));

				return response.value;
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
