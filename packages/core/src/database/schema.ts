import { Model } from "@effect/sql";
import { Schema } from "effect";

export const TransactionId = Schema.String.pipe(Schema.brand("TransactionId"));

export const Id = Schema.String.pipe(Schema.length(16));

export class ConversationModel extends Model.Class<ConversationModel>("@bella/core/database/schema/ConversationModel")({
	createdAt: Model.DateTimeInsertFromDate,
	deletedAt: Model.DateTimeFromDate.pipe(Model.FieldOption),
	id: Model.GeneratedByApp(Id.pipe(Schema.brand("ConversationId"))),
	title: Schema.NonEmptyTrimmedString.pipe(Schema.maxLength(100)),
	updatedAt: Model.DateTimeUpdateFromDate,
}) {}

export class MessageModel extends Model.Class<MessageModel>("@bella/core/database/schema/MessageModel")({
	conversationId: ConversationModel.fields.id,
	createdAt: Model.DateTimeInsertFromDate,
	id: Model.GeneratedByApp(Id.pipe(Schema.brand("MessageId"))),
	role: Schema.Literal("ASSISTANT", "USER"),
	status: Schema.Literal("IN_PROGRESS", "COMPLETED"),
}) {}

const BaseMessagePartFields = {
	createdAt: Model.DateTimeInsertFromDate,
	id: Model.GeneratedByApp(Id.pipe(Schema.brand("MessagePartId"))),
	messageId: MessageModel.fields.id,
};

export class TextMessagePartModel extends Model.Class<TextMessagePartModel>(
	"@bella/core/database/schema/TextMessagePartModel",
)({ ...BaseMessagePartFields, textContent: Schema.NonEmptyString, type: Schema.Literal("text") }) {}

export const MessagePartModel = Model.Union(TextMessagePartModel);
