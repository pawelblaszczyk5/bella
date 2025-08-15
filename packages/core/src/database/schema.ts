import { Model } from "@effect/sql";
import { Schema } from "effect";

export const TransactionId = Schema.NumberFromString;

export const Id = Schema.String.pipe(Schema.length(16));

export class ConversationModel extends Model.Class<ConversationModel>("@bella/core/database/schema/ConversationModel")({
	createdAt: Model.DateTimeInsertFromDate,
	deletedAt: Model.DateTimeFromDate.pipe(Model.FieldOption),
	id: Model.GeneratedByApp(Id.pipe(Schema.brand("ConversationId"))),
	title: Schema.NonEmptyTrimmedString.pipe(Schema.maxLength(100)),
	updatedAt: Model.DateTimeUpdateFromDate,
}) {}

const BaseMessageFields = { conversationId: ConversationModel.fields.id, createdAt: Model.DateTimeInsertFromDate };

export class UserMessageModel extends Model.Class<UserMessageModel>("@bella/core/database/schema/UserMessageModel")({
	...BaseMessageFields,
	id: Model.GeneratedByApp(Id.pipe(Schema.brand("UserMessageId"))),
	role: Schema.Literal("USER"),
	status: Schema.Literal("COMPLETED"),
}) {}

export class AssistantMessageModel extends Model.Class<AssistantMessageModel>(
	"@bella/core/database/schema/AssistantMessageModel",
)({
	...BaseMessageFields,
	id: Model.GeneratedByApp(Id.pipe(Schema.brand("AssistantMessageId"))),
	role: Schema.Literal("ASSISTANT"),
	status: Schema.Literal("IN_PROGRESS", "INTERRUPTED", "COMPLETED"),
}) {}

const BaseMessagePartFields = { createdAt: Model.DateTimeInsertFromDate };

const SharedMessageId = Schema.Union(UserMessageModel.fields.id, AssistantMessageModel.fields.id);

export class TextMessagePartModel extends Model.Class<TextMessagePartModel>(
	"@bella/core/database/schema/TextMessagePartModel",
)({
	...BaseMessagePartFields,
	data: Schema.Struct({ text: Schema.NonEmptyString }),
	id: Model.GeneratedByApp(Id.pipe(Schema.brand("TextMessagePartId"))),
	messageId: SharedMessageId,
	type: Schema.Literal("text"),
}) {}

export class ReasoningMessagePartModel extends Model.Class<ReasoningMessagePartModel>(
	"@bella/core/database/schema/ReasoningMessagePartModel",
)({
	...BaseMessagePartFields,
	data: Schema.Struct({ text: Schema.NonEmptyString }),
	id: Model.GeneratedByApp(Id.pipe(Schema.brand("ReasoningMessagePartId"))),
	messageId: AssistantMessageModel.fields.id,
	type: Schema.Literal("reasoning"),
}) {}
