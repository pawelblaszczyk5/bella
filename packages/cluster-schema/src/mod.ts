import { Entity } from "@effect/cluster";
import { Rpc } from "@effect/rpc";

import { TextMessagePartModel, TransactionId } from "@bella/core/database-schema";

export const Conversation = Entity.make("Conversation", [
	Rpc.make("Start", {
		payload: { userMessageText: TextMessagePartModel.fields.data.fields.text },
		success: TransactionId,
	}),
	Rpc.make("Continue", { payload: { userMessageText: TextMessagePartModel.fields.data.fields.text } }),
]);
