import { AiInput, AiLanguageModel } from "@effect/ai";
import { GoogleAiClient, GoogleAiLanguageModel } from "@effect/ai-google";
import { FetchHttpClient } from "@effect/platform";
import { Model, SqlSchema } from "@effect/sql";
import { PgClient } from "@effect/sql-pg";
import { Array, Config, Effect, Layer, Match, Option, Record, Schema, Stream } from "effect";

import { IdGenerator } from "@bella/id-generator/effect";

import { DatabaseDefault } from "#src/database/mod.js";
import {
	AssistantMessageModel,
	ConversationModel,
	TextMessagePartModel,
	TransactionId,
	UserMessageModel,
} from "#src/database/schema.js";

const AiModel = GoogleAiLanguageModel.layer({ model: "gemini-2.5-flash" }).pipe(
	Layer.provide(GoogleAiClient.layerConfig({ apiKey: Config.redacted("GOOGLE_AI_API_KEY") })),
	Layer.provide(FetchHttpClient.layer),
);

export class Bella extends Effect.Service<Bella>()("@bella/core/Bella", {
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

		const completeMessage = SqlSchema.void({
			execute: (request) => sql`
				UPDATE ${sql("message")}
				SET
					${sql.update({ status: "COMPLETED" })}
				WHERE
					${sql("id")} = ${request};
			`,
			Request: AssistantMessageModel.select.fields.id,
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

		const mapMessagePart = Match.type<Omit<TextMessagePartModel, "createdAt">>().pipe(
			Match.when({ type: "text" }, (part) => AiInput.TextPart.make({ text: part.data.text })),
			Match.exhaustive,
		);

		return {
			continueConversation: Effect.fn("Bella/continueConversation")(function* ({
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
				const result = yield* Effect.gen(function* () {
					yield* insertMessage({
						conversationId,
						createdAt: undefined,
						id: userMessage.id,
						role: "USER",
						status: "COMPLETED",
					});

					yield* Effect.forEach(
						userMessage.parts,
						Effect.fn(function* (messagePart) {
							yield* insertMessagePart({
								createdAt: undefined,
								data: messagePart.data,
								id: messagePart.id,
								messageId: userMessage.id,
								type: messagePart.type,
							});
						}),
					);

					yield* insertMessage({
						conversationId,
						createdAt: undefined,
						id: assistantMessage.id,
						role: "ASSISTANT",
						status: "IN_PROGRESS",
					});

					return yield* getTransactionId();
				}).pipe(sql.withTransaction);

				return result.transactionId;
			}),
			createNewConversation: Effect.fn("Bella/createNewConversation")(function* ({
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
				const result = yield* Effect.gen(function* () {
					yield* insertConversation({
						createdAt: undefined,
						deletedAt: Option.none(),
						id: conversationId,
						title: "Example title",
						updatedAt: undefined,
					});

					yield* insertMessage({
						conversationId,
						createdAt: undefined,
						id: userMessage.id,
						role: "USER",
						status: "COMPLETED",
					});

					yield* Effect.forEach(
						userMessage.parts,
						Effect.fn(function* (messagePart) {
							yield* insertMessagePart({
								createdAt: undefined,
								data: messagePart.data,
								id: messagePart.id,
								messageId: userMessage.id,
								type: messagePart.type,
							});
						}),
					);

					yield* insertMessage({
						conversationId,
						createdAt: undefined,
						id: assistantMessage.id,
						role: "ASSISTANT",
						status: "IN_PROGRESS",
					});

					return yield* getTransactionId();
				}).pipe(sql.withTransaction);

				return result.transactionId;
			}),
			getNewMessageStream: Effect.fn(function* ({
				assistantMessageId,
				conversationId,
			}: {
				assistantMessageId: AssistantMessageModel["id"];
				conversationId: ConversationModel["id"];
			}) {
				const messages = yield* findAllMessagesForConversation(conversationId).pipe(
					Effect.map((messages) => messages.filter((message) => message.id !== assistantMessageId)),
				);
				const groupedParts = yield* findAllMessagePartsForMessages(messages.map((message) => message.id)).pipe(
					Effect.map(Array.groupBy((part) => part.messageId)),
				);

				const messagesWithParts = yield* Effect.forEach(
					messages,
					Effect.fn(function* (message) {
						const partsForThisMessage = yield* Record.get(groupedParts, message.id);

						return { id: message.id, parts: partsForThisMessage, role: message.role };
					}),
				);

				const stream = AiLanguageModel.streamText({
					prompt: messagesWithParts.map((message) => {
						if (message.role === "USER") {
							return AiInput.UserMessage.make({ parts: Array.map(message.parts, mapMessagePart) });
						}

						return AiInput.AssistantMessage.make({ parts: Array.map(message.parts, mapMessagePart) });
					}),
				}).pipe(Stream.provideLayer(AiModel));

				return stream;
			}),
			insertAssistantTextMessagePart: Effect.fn(function* ({
				assistantMessageId,
				text,
			}: {
				assistantMessageId: AssistantMessageModel["id"];
				text: TextMessagePartModel["data"]["text"];
			}) {
				const assistantTextMessagePartId = TextMessagePartModel.fields.id.make(yield* idGenerator.generate());

				yield* insertMessagePart({
					createdAt: undefined,
					data: { text },
					id: assistantTextMessagePartId,
					messageId: assistantMessageId,
					type: "text",
				});
			}),
			markMessageAsCompleted: Effect.fn(function* (assistantMessageId: AssistantMessageModel["id"]) {
				yield* completeMessage(assistantMessageId);
			}),
		};
	}),
}) {}
