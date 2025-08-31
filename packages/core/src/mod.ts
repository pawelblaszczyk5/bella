import type { AiResponse } from "@effect/ai";

import { PgClient } from "@effect/sql-pg";
import { Array, DateTime, Effect, Match, Metric, Option, Struct } from "effect";

import type {
	AssistantMessageModel,
	ConversationModel,
	TextMessagePartModel,
	UserExperienceEvaluationModel,
	UserMessageModel,
} from "#src/database/schema.js";
import type { ResponsePlan } from "#src/shared.js";

import { Ai } from "#src/ai.js";
import { Coppermind } from "#src/coppermind/mod.js";
import { DatabaseDefault } from "#src/database/mod.js";
import { modelUsageTotal, responseTotal } from "#src/metrics.js";
import { Repository } from "#src/repository.js";
import { ResponseFulfillment, ResponseRefusal } from "#src/shared.js";

export class Bella extends Effect.Service<Bella>()("@bella/core/Bella", {
	dependencies: [DatabaseDefault, Repository.Default, Ai.Default, Coppermind.Default],
	effect: Effect.gen(function* () {
		const sql = yield* PgClient.PgClient;

		const ai = yield* Ai;
		const repository = yield* Repository;
		const coppermind = yield* Coppermind;

		return {
			changeUserExperienceEvaluationResolvedStatus: Effect.fn(function* ({
				id,
				isResolved,
			}: {
				id: UserExperienceEvaluationModel["id"];
				isResolved: boolean;
			}) {
				const transactionId = yield* Effect.gen(function* () {
					const now = yield* DateTime.now;

					yield* repository.updateUserExperienceEvaluationResolvedAt({
						id,
						resolvedAt: isResolved ? Option.some(now) : Option.none(),
					});
					return yield* repository.getTransactionId();
				}).pipe(sql.withTransaction);

				return transactionId;
			}),
			checkIsMessageInterrupted: Effect.fn("Bella/Core/checkIsMessageInterrupted")(function* (
				assistantMessageId: AssistantMessageModel["id"],
			) {
				const status = yield* repository.getMessageStatus(assistantMessageId);

				return status === "INTERRUPTED";
			}),
			continueConversation: Effect.fn("Bella/Core/continueConversation")(function* ({
				assistantMessage,
				conversationId,
				userMessage,
			}: {
				assistantMessage: { id: AssistantMessageModel["id"] };
				conversationId: ConversationModel["id"];
				userMessage: {
					id: UserMessageModel["id"];
					parts: ReadonlyArray<Pick<TextMessagePartModel, "data" | "id" | "type">>;
				};
			}) {
				const transactionId = yield* Effect.gen(function* () {
					yield* repository.updateConversationDate(conversationId);

					yield* repository.insertUserMessage({ conversationId, id: userMessage.id, status: "COMPLETED" });

					yield* Effect.forEach(
						userMessage.parts,
						Effect.fn(function* (messagePart) {
							yield* repository.insertTextMessagePart({
								data: messagePart.data,
								id: messagePart.id,
								messageId: userMessage.id,
							});
						}),
					);

					yield* repository.insertAssistantMessage({ conversationId, id: assistantMessage.id, status: "IN_PROGRESS" });

					return yield* repository.getTransactionId();
				}).pipe(sql.withTransaction);

				return transactionId;
			}),
			createNewConversation: Effect.fn("Bella/Core/createNewConversation")(function* ({
				assistantMessage,
				conversationId,
				userMessage,
			}: {
				assistantMessage: { id: AssistantMessageModel["id"] };
				conversationId: ConversationModel["id"];
				userMessage: {
					id: UserMessageModel["id"];
					parts: ReadonlyArray<Pick<TextMessagePartModel, "data" | "id" | "type">>;
				};
			}) {
				const title = yield* ai.generateTitle(userMessage.parts.map((part) => part.data.text).join(""));

				const transactionId = yield* Effect.gen(function* () {
					yield* repository.insertConversation({ id: conversationId, title });

					yield* repository.insertUserMessage({ conversationId, id: userMessage.id, status: "COMPLETED" });

					yield* Effect.forEach(
						userMessage.parts,
						Effect.fn(function* (messagePart) {
							yield* repository.insertTextMessagePart({
								data: messagePart.data,
								id: messagePart.id,
								messageId: userMessage.id,
							});
						}),
					);

					yield* repository.insertAssistantMessage({ conversationId, id: assistantMessage.id, status: "IN_PROGRESS" });

					return yield* repository.getTransactionId();
				}).pipe(sql.withTransaction);

				return transactionId;
			}),
			evaluateUserExperience: Effect.fn("Bella/Core/evaluateUserExperience")(function* (
				conversationId: ConversationModel["id"],
			) {
				const messages = yield* repository.getMessagesWithParts(conversationId);

				if (messages.length <= 2) {
					return;
				}

				const classification = yield* ai.classifyUserExperience(messages.slice(-3, -1));

				yield* Effect.log("User experience classification performed", classification);

				if (!classification.result) {
					return;
				}

				const message = yield* Array.get(messages, messages.length - 2);

				if (message.role === "ASSISTANT") {
					return yield* Effect.dieMessage("Second-last message can't be assistant one");
				}

				const evaluation = classification.result;

				yield* repository.insertUserExperienceEvaluation({
					category: evaluation.category,
					description: evaluation.description,
					messageId: message.id,
					severity: evaluation.severity,
				});
			}),
			getNewMessageStream: Effect.fn("Bella/Core/getNewMessageStream")(function* ({
				assistantMessageId,
				conversationId,
				responsePlan,
			}: {
				assistantMessageId: AssistantMessageModel["id"];
				conversationId: ConversationModel["id"];
				responsePlan: ResponsePlan;
			}) {
				const messages = yield* repository.getMessagesWithParts(conversationId);

				yield* Effect.log("Generating new message with given response plan", responsePlan);

				yield* responseTotal.pipe(
					Metric.tagged("type", responsePlan._tag === "ResponseFulfillment" ? "fulfillment" : "refusal"),
				)(Effect.succeed(1));

				if (responsePlan._tag === "ResponseFulfillment") {
					yield* modelUsageTotal.pipe(Metric.tagged("model", responsePlan.model))(Effect.succeed(1));
				}

				let additionalContext: Option.Option<string> = Option.none();

				if (responsePlan._tag === "ResponseFulfillment" && responsePlan.availableKnowledge.includes("COPPERMIND")) {
					const coppermindQueries = yield* ai.generateCoppermindQueries(messages);

					const messagePartId = yield* repository.insertCoppermindSearchMessagePart({
						data: { queries: coppermindQueries.subqueries, results: Option.none() },
						id: undefined,
						messageId: assistantMessageId,
					});

					const relatedData = yield* coppermind.getRelatedDataForQueries(coppermindQueries);

					yield* repository.addResultsToCoppermindSearch({
						data: {
							queries: coppermindQueries.subqueries,
							results: Option.some(relatedData.map((data) => Struct.pick(data, "content", "pageId"))),
						},
						id: messagePartId,
					});

					const stringifiedContent = relatedData
						.map((data, index) => `${index.toString()}. "${data.content}" quote from ${data.pageId}`)
						.join("\n");

					additionalContext = Option.some(stringifiedContent);
				}

				const stream = yield* ai.generateAnswer({ additionalContext, messages, responsePlan });

				return stream;
			}),
			getPagesForIngestion: Effect.fn("Bella/Core/getPagesForIngestion")(function* () {
				return yield* coppermind.getPagesIds();
			}),
			getResponsePlan: Effect.fn("Bella/Core/getResponsePlan")(function* (conversationId: ConversationModel["id"]) {
				const messages = yield* repository.getMessagesWithParts(conversationId);

				const classification = yield* ai.classifyIncomingMessage(messages.slice(-3));

				if (classification.tone === "HOSTILE") {
					return ResponseRefusal.make({ language: classification.language, reason: "USER_HOSTILITY" });
				}

				if (classification.topicsMentioned.includes("POLITICS")) {
					return ResponseRefusal.make({ language: classification.language, reason: "POLITICS" });
				}

				const answerStyle = Match.value(classification.tone).pipe(
					Match.withReturnType<ResponseFulfillment["answerStyle"]>(),
					Match.whenOr("PLAYFUL", "UNCLASSIFIED", "FRIENDLY", () => "FRIENDLY"),
					Match.when("FORMAL", () => "FORMAL"),
					Match.exhaustive,
				);

				const isProgrammingRelated = classification.topicsMentioned.includes("PROGRAMMING");

				if (isProgrammingRelated) {
					return ResponseFulfillment.make({
						answerStyle,
						availableKnowledge: [],
						language: classification.language,
						model: "ANTHROPIC:CLAUDE-4-SONNET",
						reasoningEnabled: true,
					});
				}

				const reasoningEnabled = classification.complexity >= 6;

				const model = Match.value(classification.complexity).pipe(
					Match.withReturnType<ResponseFulfillment["model"]>(),
					Match.when(
						(value) => value < 4,
						() => "GOOGLE:GEMINI-2.5-FLASH-LITE",
					),
					Match.when(
						(value) => value < 7,
						() => "GOOGLE:GEMINI-2.5-FLASH",
					),
					Match.when(
						(value) => value < 10,
						() => "GOOGLE:GEMINI-2.5-PRO",
					),
					Match.when(10, () => "ANTHROPIC:CLAUDE-4.1-OPUS"),
					Match.orElseAbsurd,
				);

				const availableKnowledge =
					classification.topicsMentioned.includes("BRANDON_SANDERSON_BOOKS") ? (["COPPERMIND"] as const) : [];

				return ResponseFulfillment.make({
					answerStyle,
					availableKnowledge,
					language: classification.language,
					model,
					reasoningEnabled,
				});
			}),
			handleStreamedPart: Effect.fn("Bella/Core/handleStreamedPart")(function* ({
				assistantMessageId,
				part,
			}: {
				assistantMessageId: AssistantMessageModel["id"];
				part: AiResponse.Part;
			}) {
				yield* Match.value(part).pipe(
					Match.tag("TextPart", (part) =>
						Effect.gen(function* () {
							yield* repository.insertTextMessagePart({
								data: { text: part.text },
								id: undefined,
								messageId: assistantMessageId,
							});
						}),
					),
					Match.tag("ReasoningPart", (part) =>
						Effect.gen(function* () {
							yield* repository.insertReasoningMessagePart({
								data: { text: part.reasoningText },
								id: undefined,
								messageId: assistantMessageId,
							});
						}),
					),
					Match.tag("FinishPart", () =>
						Effect.gen(function* () {
							yield* repository.updateMessageStatus({ id: assistantMessageId, status: "COMPLETED" });
						}),
					),
					Match.orElse(() => Effect.void),
				);
			}),
			ingestPageKnowledge: Effect.fn("Bella/Core/ingestPageKnowledge")(function* (pagesId: string) {
				yield* coppermind.embedPage(pagesId);
			}),
			markMessageAsCompleted: Effect.fn("Bella/Core/markMessageAsCompleted")(function* (
				assistantMessageId: AssistantMessageModel["id"],
			) {
				const transactionId = yield* Effect.gen(function* () {
					yield* repository.updateMessageStatus({ id: assistantMessageId, status: "COMPLETED" });

					return yield* repository.getTransactionId();
				}).pipe(sql.withTransaction);

				return transactionId;
			}),
			markMessageAsInterrupted: Effect.fn("Bella/Core/markMessageAsInterrupted")(function* (
				assistantMessageId: AssistantMessageModel["id"],
			) {
				const transactionId = yield* Effect.gen(function* () {
					yield* repository.updateMessageStatus({ id: assistantMessageId, status: "INTERRUPTED" });

					return yield* repository.getTransactionId();
				}).pipe(sql.withTransaction);

				return transactionId;
			}),
			setupStorageForKnowledgeIngestion: Effect.fn("Bella/Core/setupStorageForKnowledgeIngestion")(function* () {
				yield* coppermind.flushStorage();
			}),
		};
	}),
}) {}

export { ResponseFulfillment, ResponsePlan, ResponseRefusal } from "#src/shared.js";
