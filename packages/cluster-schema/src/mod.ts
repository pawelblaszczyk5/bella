import { Entity } from "@effect/cluster";
import { Rpc } from "@effect/rpc";
import { Workflow } from "@effect/workflow";
import { Schema } from "effect";

export const NumberGenerator = Entity.make("NumberGenerator", [Rpc.make("Get", { success: Schema.Int })]);

export const SendEmail = Workflow.make({
	error: Schema.Never,
	idempotencyKey: ({ id }) => id,
	name: "SendEmail",
	payload: { id: Schema.String, to: Schema.String },
	success: Schema.Void,
});
