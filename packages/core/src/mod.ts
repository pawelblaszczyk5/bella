import { AiInput, AiLanguageModel } from "@effect/ai";
import { GoogleAiClient, GoogleAiLanguageModel } from "@effect/ai-google";
import { FetchHttpClient } from "@effect/platform";
import { SqlSchema } from "@effect/sql";
import { PgClient } from "@effect/sql-pg";
import { Config, Effect, Layer, Option, Ref, Schema, Stream } from "effect";

import { IdGenerator } from "@bella/id-generator/effect";

import { DatabaseDefault } from "#src/database/mod.js";
import {
	ConversationModel,
	MessageModel,
	MessagePartModel,
	TextMessagePartModel,
	TransactionId,
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
			Request: MessageModel.insert,
		});

		const insertMessagePart = SqlSchema.void({
			execute: (request) => sql`
				INSERT INTO
					${sql("messagePart")} ${sql.insert({ ...request, data: sql.json(request.data) })};
			`,
			Request: MessagePartModel.insert,
		});

		const updateTextMessagePartData = SqlSchema.void({
			execute: (request) => sql`
				UPDATE ${sql("messagePart")}
				SET
					${sql.update({ data: sql.json(request.data) })}
				WHERE
					${sql("id")} = ${request.id};
			`,
			Request: TextMessagePartModel.update.pick("id", "data"),
		});

		const completeMessage = SqlSchema.void({
			execute: (request) => sql`
				UPDATE ${sql("message")}
				SET
					${sql.update({ status: "COMPLETED" })}
				WHERE
					${sql("id")} = ${request.id};
			`,
			Request: MessageModel.select.pick("id"),
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

		return {
			startNewConversation: Effect.fn("Bella/startNewConversation")(function* ({
				conversationId,
				userMessageText,
			}: {
				conversationId: ConversationModel["id"];
				userMessageText: TextMessagePartModel["data"]["text"];
			}) {
				const userMessageId = MessageModel.fields.id.make(yield* idGenerator.generate());
				const userTextMessagePartId = TextMessagePartModel.fields.id.make(yield* idGenerator.generate());
				const assistantMessageId = MessageModel.fields.id.make(yield* idGenerator.generate());

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
						id: userMessageId,
						role: "USER",
						status: "COMPLETED",
					});

					yield* insertMessagePart({
						createdAt: undefined,
						data: { text: userMessageText },
						id: userTextMessagePartId,
						messageId: userMessageId,
						type: "text",
					});

					yield* insertMessage({
						conversationId,
						createdAt: undefined,
						id: assistantMessageId,
						role: "ASSISTANT",
						status: "IN_PROGRESS",
					});

					return yield* getTransactionId();
				}).pipe(sql.withTransaction);

				yield* Effect.forkDaemon(
					Effect.gen(function* () {
						const stream = AiLanguageModel.streamText({
							prompt: [AiInput.UserMessage.make({ parts: [AiInput.TextPart.make({ text: userMessageText })] })],
						});

						const messagePartIdRef = yield* Ref.make<Option.Option<TextMessagePartModel["id"]>>(Option.none());
						const textContentRef = yield* Ref.make("");

						yield* Stream.runForEach(
							stream,
							Effect.fn(function* (response) {
								if (response.text.length === 0) {
									return;
								}

								const messagePartId = yield* Ref.get(messagePartIdRef);

								yield* Option.match(messagePartId, {
									onNone: Effect.fn(function* () {
										const messagePartId = TextMessagePartModel.fields.id.make(yield* idGenerator.generate());

										yield* insertMessagePart({
											createdAt: undefined,
											data: { text: response.text },
											id: messagePartId,
											messageId: assistantMessageId,
											type: "text",
										});

										yield* Ref.set(messagePartIdRef, Option.some(messagePartId));
										yield* Ref.update(textContentRef, (value) => value + response.text);
									}),
									onSome: Effect.fn(function* (id) {
										const accumulatedTextContent = yield* Ref.updateAndGet(
											textContentRef,
											(value) => value + response.text,
										);

										yield* updateTextMessagePartData({ data: { text: accumulatedTextContent }, id });
									}),
								});
							}),
						);

						yield* completeMessage({ id: assistantMessageId });
					}).pipe(
						Effect.provide(AiModel),
						Effect.provideService(GoogleAiLanguageModel.Config, {
							generationConfig: { thinkingConfig: { includeThoughts: true } },
						}),
					),
				);

				return result;
			}, Effect.orDie),
		};
	}),
}) {}
