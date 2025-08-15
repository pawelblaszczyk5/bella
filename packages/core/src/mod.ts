import type { AiResponse } from "@effect/ai";

import { PgClient } from "@effect/sql-pg";
import { Effect, Match } from "effect";

import type {
	AssistantMessageModel,
	ConversationModel,
	TextMessagePartModel,
	UserMessageModel,
} from "#src/database/schema.js";

import { Ai } from "#src/ai.js";
import { DatabaseDefault } from "#src/database/mod.js";
import { Repository } from "#src/repository.js";

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
			getNewMessageStream: Effect.fn("Bella/Core/getNewMessageStream")(function* (
				conversationId: ConversationModel["id"],
			) {
				const messages = yield* repository.getMessagesWithParts(conversationId);

				const stream = yield* ai.generateAnswer(messages);

				return stream;
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
					Match.orElse(Effect.log),
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
