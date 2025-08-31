import { Model, SqlSchema } from "@effect/sql";
import { PgClient } from "@effect/sql-pg";
import { Array, Effect, Option, Record, Schema } from "effect";

import { IdGenerator } from "@bella/id-generator/effect";

import type { MessagesWithParts } from "#src/shared.js";

import { DatabaseDefault } from "#src/database/mod.js";
import {
	AssistantMessageModel,
	ConversationModel,
	CoppermindSearchMessagePartModel,
	ReasoningMessagePartModel,
	TextMessagePartModel,
	TransactionId,
	UserExperienceEvaluationModel,
	UserMessageModel,
} from "#src/database/schema.js";

export class Repository extends Effect.Service<Repository>()("@bella/core/Repository", {
	dependencies: [DatabaseDefault, IdGenerator.Default],
	effect: Effect.gen(function* () {
		const sql = yield* PgClient.PgClient;

		const idGenerator = yield* IdGenerator;

		const insertConversation = SqlSchema.void({
			execute: (request) => sql`
				INSERT INTO
					${sql("conversation")} ${sql.insert(request)};
			`,
			Request: ConversationModel.insert,
		});

		const insertMessage = SqlSchema.void({
			execute: (request) => sql`
				INSERT INTO
					${sql("message")} ${sql.insert(request)};
			`,
			Request: Model.Union(UserMessageModel, AssistantMessageModel).insert,
		});

		const insertMessagePart = SqlSchema.void({
			execute: (request) => sql`
				INSERT INTO
					${sql("messagePart")} ${sql.insert({ ...request, data: sql.json(request.data) })};
			`,
			Request: Model.Union(TextMessagePartModel, ReasoningMessagePartModel, CoppermindSearchMessagePartModel).insert,
		});

		const insertUserExperienceEvaluation = SqlSchema.void({
			execute: (request) => sql`
				INSERT INTO
					${sql("userExperienceEvaluation")} ${sql.insert(request)};
			`,
			Request: UserExperienceEvaluationModel.insert,
		});

		const updateMessageStatus = SqlSchema.void({
			execute: (request) => sql`
				UPDATE ${sql("message")}
				SET
					${sql.update(request, ["id"])}
				WHERE
					${sql("id")} = ${request.id};
			`,
			Request: Schema.Union(
				AssistantMessageModel.update.pick("id", "status"),
				UserMessageModel.update.pick("id", "status"),
			),
		});

		const getTransactionId = SqlSchema.single({
			// cspell:ignore xact
			execute: () => sql`
				SELECT
					PG_CURRENT_XACT_ID()::XID::TEXT AS ${sql("transactionId")}
			`,
			Request: Schema.Void,
			Result: Schema.Struct({ transactionId: TransactionId }),
		});

		const findAllMessagesForConversation = SqlSchema.findAll({
			execute: (request) => sql`
				SELECT
					${sql("id")},
					${sql("role")}
				FROM
					${sql("message")}
				WHERE
					${sql("conversationId")} = ${request}
				ORDER BY
					${sql("createdAt")} ASC;
			`,
			Request: ConversationModel.select.fields.id,
			Result: Schema.Union(AssistantMessageModel.select.pick("id", "role"), UserMessageModel.select.pick("id", "role")),
		});

		const findAllUserMessagePartsForMessages = SqlSchema.findAll({
			execute: (request) => sql`
				SELECT
					${sql("id")},
					${sql("messageId")},
					${sql("type")},
					${sql("data")}
				FROM
					${sql("messagePart")}
				WHERE
					${sql.in("messageId", request)}
				ORDER BY
					${sql("createdAt")} ASC;
			`,
			Request: Schema.Array(UserMessageModel.select.fields.id),
			Result: Schema.Union(TextMessagePartModel.select.pick("id", "messageId", "type", "data")),
		});

		const findAllAssistantMessagePartsForMessages = SqlSchema.findAll({
			execute: (request) => sql`
				SELECT
					${sql("id")},
					${sql("messageId")},
					${sql("type")},
					${sql("data")}
				FROM
					${sql("messagePart")}
				WHERE
					${sql.in("messageId", request)}
				ORDER BY
					${sql("createdAt")} ASC;
			`,
			Request: Schema.Array(AssistantMessageModel.select.fields.id),
			Result: Schema.Union(
				TextMessagePartModel.select.pick("id", "messageId", "type", "data"),
				ReasoningMessagePartModel.select.pick("id", "messageId", "type", "data"),
				CoppermindSearchMessagePartModel.select.pick("id", "messageId", "type", "data"),
			),
		});

		const getMessageStatus = SqlSchema.single({
			execute: (request) => sql`
				SELECT
					${sql("status")}
				FROM
					${sql("message")}
				WHERE
					${sql("id")} = ${request};
			`,
			Request: Schema.Union(AssistantMessageModel.select.fields.id, UserMessageModel.select.fields.id),
			Result: Schema.Union(AssistantMessageModel.select.pick("status"), UserMessageModel.select.pick("status")),
		});

		const updateConversationDate = SqlSchema.void({
			execute: (request) => sql`
				UPDATE ${sql("conversation")}
				SET
					${sql.update(request, ["id"])}
				WHERE
					${sql("id")} = ${request.id};
			`,
			Request: ConversationModel.update.pick("id", "updatedAt"),
		});

		const updateUserExperienceEvaluationResolvedAt = SqlSchema.void({
			execute: (request) => sql`
				UPDATE ${sql("userExperienceEvaluation")}
				SET
					${sql.update(request, ["id"])}
				WHERE
					${sql("id")} = ${request.id};
			`,
			Request: UserExperienceEvaluationModel.update.pick("id", "resolvedAt"),
		});

		const addResultsToCoppermindSearch = SqlSchema.void({
			execute: (request) => sql`
				UPDATE ${sql("messagePart")}
				SET
					${sql.update({ data: sql.json(request.data) })}
				WHERE
					${sql("id")} = ${request.id};
			`,
			Request: CoppermindSearchMessagePartModel.update.pick("data", "id"),
		});

		return {
			addResultsToCoppermindSearch: Effect.fn("Bella/Repository/addResultsToCoppermindSearch")(function* (
				data: Pick<CoppermindSearchMessagePartModel, "data" | "id">,
			) {
				yield* addResultsToCoppermindSearch(data);
			}),
			getMessageStatus: Effect.fn("Bella/Repository/getMessageStatus")(function* (
				messageId: AssistantMessageModel["id"] | UserMessageModel["id"],
			) {
				const message = yield* getMessageStatus(messageId);

				return message.status;
			}),
			getMessagesWithParts: Effect.fn("Bella/Repository/getMessagesWithParts")(function* (
				conversationId: ConversationModel["id"],
			) {
				const messages = yield* findAllMessagesForConversation(conversationId);

				const { assistantMessageParts, userMessageParts } = yield* Effect.all(
					{
						assistantMessageParts: findAllAssistantMessagePartsForMessages(
							Array.filterMap(messages, (message) =>
								message.role === "ASSISTANT" ? Option.some(message.id) : Option.none(),
							),
						).pipe(Effect.map(Array.groupBy((part) => part.messageId))),
						userMessageParts: findAllUserMessagePartsForMessages(
							Array.filterMap(messages, (message) =>
								message.role === "USER" ? Option.some(message.id) : Option.none(),
							),
						).pipe(Effect.map(Array.groupBy((part) => part.messageId))),
					},
					{ concurrency: 2 },
				);

				const messagesWithParts = Array.reduce<(typeof messages)[number], MessagesWithParts>(
					messages,
					[],
					(accumulator, message) => {
						if (message.role === "USER") {
							const maybeMessageParts = Record.get(userMessageParts, message.id);

							return Option.match(maybeMessageParts, {
								onNone: () => accumulator,
								onSome: (messageParts) => {
									const messageWithParts = { ...message, parts: messageParts };

									accumulator.push(messageWithParts);

									return accumulator;
								},
							});
						}

						const maybeMessageParts = Record.get(assistantMessageParts, message.id);

						return Option.match(maybeMessageParts, {
							onNone: () => accumulator,
							onSome: (messageParts) => {
								const messageWithParts = { ...message, parts: messageParts };

								accumulator.push(messageWithParts);

								return accumulator;
							},
						});
					},
				);

				return messagesWithParts;
			}),
			getTransactionId: Effect.fn("Bella/Repository/getTransactionId")(function* () {
				const result = yield* getTransactionId();

				return result.transactionId;
			}),
			insertAssistantMessage: Effect.fn("Bella/Repository/insertAssistantMessage")(function* (
				message: Pick<AssistantMessageModel, "conversationId" | "id" | "status">,
			) {
				yield* insertMessage({
					conversationId: message.conversationId,
					createdAt: undefined,
					id: message.id,
					role: "ASSISTANT",
					status: message.status,
				});
			}),
			insertConversation: Effect.fn("Bella/Repository/insertConversation")(function* (
				conversation: Pick<ConversationModel, "id" | "title">,
			) {
				yield* insertConversation({
					createdAt: undefined,
					deletedAt: Option.none(),
					id: conversation.id,
					title: conversation.title,
					updatedAt: undefined,
				});
			}),
			insertCoppermindSearchMessagePart: Effect.fn("Bella/Repository/insertCoppermindSearchMessagePart")(function* ({
				data,
				id,
				messageId,
			}: {
				data: CoppermindSearchMessagePartModel["data"];
				id: CoppermindSearchMessagePartModel["id"] | undefined;
				messageId: CoppermindSearchMessagePartModel["messageId"];
			}) {
				const coppermindSearchMessagePartId =
					id ?? CoppermindSearchMessagePartModel.fields.id.make(yield* idGenerator.generate());

				yield* insertMessagePart({
					createdAt: undefined,
					data,
					id: coppermindSearchMessagePartId,
					messageId,
					type: "coppermindSearch",
				});

				return coppermindSearchMessagePartId;
			}),
			insertReasoningMessagePart: Effect.fn("Bella/Repository/insertReasoningMessagePart")(function* ({
				data,
				id,
				messageId,
			}: {
				data: ReasoningMessagePartModel["data"];
				id: ReasoningMessagePartModel["id"] | undefined;
				messageId: ReasoningMessagePartModel["messageId"];
			}) {
				const reasoningMessagePartId = id ?? ReasoningMessagePartModel.fields.id.make(yield* idGenerator.generate());

				yield* insertMessagePart({
					createdAt: undefined,
					data,
					id: reasoningMessagePartId,
					messageId,
					type: "reasoning",
				});

				return reasoningMessagePartId;
			}),
			insertTextMessagePart: Effect.fn("Bella/Repository/insertTextMessagePart")(function* ({
				data,
				id,
				messageId,
			}: {
				data: TextMessagePartModel["data"];
				id: TextMessagePartModel["id"] | undefined;
				messageId: TextMessagePartModel["messageId"];
			}) {
				const textMessagePartId = id ?? TextMessagePartModel.fields.id.make(yield* idGenerator.generate());

				yield* insertMessagePart({ createdAt: undefined, data, id: textMessagePartId, messageId, type: "text" });

				return textMessagePartId;
			}),
			insertUserExperienceEvaluation: Effect.fn("Bella/Repository/insertUserExperienceEvaluation")(function* (
				userExperienceEvaluation: Pick<
					UserExperienceEvaluationModel,
					"category" | "description" | "messageId" | "severity"
				>,
			) {
				const id = UserExperienceEvaluationModel.fields.id.make(yield* idGenerator.generate());

				yield* insertUserExperienceEvaluation({
					category: userExperienceEvaluation.category,
					createdAt: undefined,
					description: userExperienceEvaluation.description,
					id,
					messageId: userExperienceEvaluation.messageId,
					resolvedAt: Option.none(),
					severity: userExperienceEvaluation.severity,
				});
			}),
			insertUserMessage: Effect.fn("Bella/Repository/insertUserMessage")(function* (
				message: Pick<UserMessageModel, "conversationId" | "id" | "status">,
			) {
				yield* insertMessage({
					conversationId: message.conversationId,
					createdAt: undefined,
					id: message.id,
					role: "USER",
					status: message.status,
				});
			}),
			updateConversationDate: Effect.fn("Bella/Repository/updateConversationDate")(function* (
				conversationId: ConversationModel["id"],
			) {
				yield* updateConversationDate({ id: conversationId, updatedAt: undefined });
			}),
			updateMessageStatus: Effect.fn("Bella/Repository/markMessageAsInterrupted")(function* (
				data:
					| { id: AssistantMessageModel["id"]; status: AssistantMessageModel["status"] }
					| { id: UserMessageModel["id"]; status: UserMessageModel["status"] },
			) {
				yield* updateMessageStatus(data);
			}),
			updateUserExperienceEvaluationResolvedAt: Effect.fn("Bella/updateUserExperienceEvaluationResolvedAt")(function* (
				data: Pick<UserExperienceEvaluationModel, "id" | "resolvedAt">,
			) {
				yield* updateUserExperienceEvaluationResolvedAt(data);
			}),
		};
	}),
}) {}
