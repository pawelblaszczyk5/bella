import { Model } from "@effect/sql";
import { Schema } from "effect";

export const Id = Schema.String.pipe(Schema.length(24));

export class TodoModel extends Model.Class<TodoModel>("@bella/core/database/schema/Todo")({
	completed: Schema.Boolean,
	id: Model.GeneratedByApp(Id.pipe(Schema.brand("TodoId"))),
	text: Schema.String,
}) {}
