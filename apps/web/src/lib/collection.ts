import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection, createOptimisticAction } from "@tanstack/react-db";
import { Schema } from "effect";

import { TodoModel } from "@bella/core/schema";

const todoStandardSchema = Schema.standardSchemaV1(TodoModel.select);

export const todoCollection = createCollection(
	electricCollectionOptions({
		getKey: (todo) => todo.id,
		id: "todos",
		schema: todoStandardSchema,
		shapeOptions: { url: new URL("/api/todos", import.meta.env.VITE_WEB_BASE_URL).toString() },
	}),
);

export const addTodo = createOptimisticAction({
	mutationFn: async () => {
		await new Promise<void>((resolve) => {
			setTimeout(() => {
				resolve();
			}, 3_000);
		});

		return;
	},
	onMutate: (text: string) => {
		todoCollection.insert({ completed: true, id: TodoModel.fields.id.make(crypto.randomUUID().slice(0, 24)), text });
	},
});
