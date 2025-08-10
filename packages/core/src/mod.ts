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
					${sql("messagePart")} ${sql.insert(request)};
			`,
			Request: MessagePartModel.insert,
		});

		const updateTextMessagePartWithNewContent = SqlSchema.void({
			execute: (request) => sql`
				UPDATE ${sql("messagePart")}
				SET
					${sql("textContent")} = ${sql("textContent")} || ${request.textContent}
				WHERE
					${sql("id")} = ${request.id};
			`,
			Request: TextMessagePartModel.update.pick("id", "textContent"),
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
				assistantMessageId,
				conversationId,
				title,
				userMessageId,
				userMessageTextContent,
				userTextMessagePartId,
			}: {
				assistantMessageId: MessageModel["id"];
				conversationId: ConversationModel["id"];
				title: ConversationModel["title"];
				userMessageId: MessageModel["id"];
				userMessageTextContent: TextMessagePartModel["textContent"];
				userTextMessagePartId: TextMessagePartModel["id"];
			}) {
				const result = yield* Effect.gen(function* () {
					yield* insertConversation({
						createdAt: undefined,
						deletedAt: Option.none(),
						id: conversationId,
						title,
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
						id: userTextMessagePartId,
						messageId: userMessageId,
						textContent: userMessageTextContent,
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
							prompt: [AiInput.UserMessage.make({ parts: [AiInput.TextPart.make({ text: userMessageTextContent })] })],
						});

						const messagePartIdRef = yield* Ref.make<Option.Option<TextMessagePartModel["id"]>>(Option.none());

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
											id: messagePartId,
											messageId: assistantMessageId,
											textContent: response.text,
											type: "text",
										});

										yield* Ref.set(messagePartIdRef, Option.some(messagePartId));
									}),
									onSome: Effect.fn(function* (id) {
										yield* updateTextMessagePartWithNewContent({ id, textContent: response.text });
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
