import type { AiResponse } from "@effect/ai";

import { PgClient } from "@effect/sql-pg";
import { Effect, Match, Metric } from "effect";

import type {
	AssistantMessageModel,
	ConversationModel,
	TextMessagePartModel,
	UserMessageModel,
} from "#src/database/schema.js";
import type { ResponsePlan } from "#src/shared.js";

import { Ai } from "#src/ai.js";
import { DatabaseDefault } from "#src/database/mod.js";
import { modelUsageTotal, responseTotal } from "#src/metrics.js";
import { Repository } from "#src/repository.js";
import { ResponseFulfillment, ResponseRefusal } from "#src/shared.js";

export class Bella extends Effect.Service<Bella>()("@bella/core/Bella", {
	dependencies: [DatabaseDefault, Repository.Default, Ai.Default],
	effect: Effect.gen(function* () {
		const sql = yield* PgClient.PgClient;

		const ai = yield* Ai;
		const repository = yield* Repository;

		return {
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
			getNewMessageStream: Effect.fn("Bella/Core/getNewMessageStream")(function* ({
				conversationId,
				responsePlan,
			}: {
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

				const stream = yield* ai.generateAnswer({ messages, responsePlan });

				return stream;
			}),
			getResponsePlan: Effect.fn("Bella/Core/getResponsePlan")(function* (conversationId: ConversationModel["id"]) {
				const messages = yield* repository.getMessagesWithParts(conversationId);

				const classification = yield* ai.classifyIncomingMessage(messages);

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

				return ResponseFulfillment.make({ answerStyle, language: classification.language, model, reasoningEnabled });
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
		};
	}),
}) {}

export { ResponseFulfillment, ResponsePlan, ResponseRefusal } from "#src/shared.js";
