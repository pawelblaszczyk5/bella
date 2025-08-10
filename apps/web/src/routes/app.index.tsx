import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";

import { addTodo, todoCollection } from "#src/lib/collection.js";

const AppIndexRoute = () => {
	const { data: todos } = useLiveQuery((q) => q.from({ todoCollection }));

	return (
		<>
			<p>Todos list:</p>
			<button
				onClick={() => {
					addTodo("Example todo text!");
				}}
				type="button"
			>
				Add todo optimistic without persistence
			</button>
			<ul>
				{todos.map((todo) => (
					<li key={todo.id}>
						{todo.text} {todo.completed ? "✅" : "❌"}
					</li>
				))}
			</ul>
		</>
	);
};

export const Route = createFileRoute("/app/")({
	component: AppIndexRoute,
	loader: async () => {
		await todoCollection.preload();
	},
});
