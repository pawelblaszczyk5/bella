import { Model, SqlSchema } from "@effect/sql";
import { PgClient } from "@effect/sql-pg";
import { Array, Effect, Option, Record, Schema } from "effect";

import { IdGenerator } from "@bella/id-generator/effect";

import { DatabaseDefault } from "#src/database/mod.js";
import {
	AssistantMessageModel,
	ConversationModel,
	TextMessagePartModel,
	TransactionId,
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
			Request: Model.Union(TextMessagePartModel).insert,
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

		const findAllMessagePartsForMessages = SqlSchema.findAll({
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
			Request: Schema.Array(Schema.Union(AssistantMessageModel.select.fields.id, UserMessageModel.select.fields.id)),
			Result: Schema.Union(TextMessagePartModel.select.pick("id", "messageId", "type", "data")),
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

		return {
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

				const groupedParts = yield* findAllMessagePartsForMessages(messages.map((message) => message.id)).pipe(
					Effect.map(Array.groupBy((part) => part.messageId)),
				);

				const messagesWithParts = yield* Effect.forEach(
					messages,
					Effect.fn(function* (message) {
						return Record.get(groupedParts, message.id).pipe(Option.map((parts) => ({ ...message, parts })));
					}),
				).pipe(Effect.map(Array.filterMap((maybeMessage) => maybeMessage)));

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
			insertTextMessagePart: Effect.fn("Bella/Repository/insertTextMessagePart")(function* ({
				data,
				messageId,
			}: {
				data: TextMessagePartModel["data"];
				messageId: AssistantMessageModel["id"] | UserMessageModel["id"];
			}) {
				const textMessagePartId = TextMessagePartModel.fields.id.make(yield* idGenerator.generate());

				yield* insertMessagePart({ createdAt: undefined, data, id: textMessagePartId, messageId, type: "text" });
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
			updateMessageStatus: Effect.fn("Bella/Repository/markMessageAsInterrupted")(function* (
				data:
					| { id: AssistantMessageModel["id"]; status: AssistantMessageModel["status"] }
					| { id: UserMessageModel["id"]; status: UserMessageModel["status"] },
			) {
				yield* updateMessageStatus(data);
			}),
		};
	}),
}) {}
