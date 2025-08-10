import { createFileRoute } from "@tanstack/react-router";

const AppExampleRoute = () => (
	<div>
		<h2>App test</h2>
	</div>
);

export const Route = createFileRoute("/app/example")({ component: AppExampleRoute });
