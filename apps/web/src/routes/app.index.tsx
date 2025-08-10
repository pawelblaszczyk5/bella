import { createFileRoute } from "@tanstack/react-router";

const AppIndexRoute = () => (
	<div>
		<h2>App index</h2>
	</div>
);

export const Route = createFileRoute("/app/")({ component: AppIndexRoute });
