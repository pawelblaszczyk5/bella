import { AiInput, AiLanguageModel } from "@effect/ai";
import { GoogleAiClient, GoogleAiLanguageModel } from "@effect/ai-google";
import { FetchHttpClient } from "@effect/platform";
import { Array, Config, Effect, Layer, Match, Stream } from "effect";

import type { AssistantMessageModel, TextMessagePartModel, UserMessageModel } from "#src/database/schema.js";

const AiModel = GoogleAiLanguageModel.layer({ model: "gemini-2.5-flash" }).pipe(
	Layer.provide(GoogleAiClient.layerConfig({ apiKey: Config.redacted("GOOGLE_AI_API_KEY") })),
	Layer.provide(FetchHttpClient.layer),
);

export class Ai extends Effect.Service<Ai>()("@bella/core/Ai", {
	dependencies: [],
	effect: Effect.gen(function* () {
		const mapMessagePart = Match.type<Omit<TextMessagePartModel, "createdAt">>().pipe(
			Match.when({ type: "text" }, (part) => AiInput.TextPart.make({ text: part.data.text })),
			Match.exhaustive,
		);

		return {
			generateAnswer: Effect.fn("Bella/Ai/generateAnswer")(function* (
				messages: Array<
					| {
							id: AssistantMessageModel["id"];
							parts: Array<Pick<TextMessagePartModel, "data" | "id" | "messageId" | "type">>;
							role: AssistantMessageModel["role"];
					  }
					| {
							id: UserMessageModel["id"];
							parts: Array<Pick<TextMessagePartModel, "data" | "id" | "messageId" | "type">>;
							role: UserMessageModel["role"];
					  }
				>,
			) {
				const stream = AiLanguageModel.streamText({
					prompt: messages.map((message) => {
						if (message.role === "USER") {
							return AiInput.UserMessage.make({ parts: Array.map(message.parts, mapMessagePart) });
						}

						return AiInput.AssistantMessage.make({ parts: Array.map(message.parts, mapMessagePart) });
					}),
				}).pipe(Stream.provideLayer(AiModel));

				return stream;
			}),
		};
	}),
}) {}
