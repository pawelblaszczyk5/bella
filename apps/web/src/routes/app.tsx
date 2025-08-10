import { createFileRoute, Outlet } from "@tanstack/react-router";

import { getRandomNumber } from "#src/lib/api.js";

const AppLayoutRoute = () => {
	const data = Route.useLoaderData();

	return (
		<div>
			<h1>AppLayout</h1>
			<p>Random number from cluster {data}</p>
			<Outlet />
		</div>
	);
};

export const Route = createFileRoute("/app")({
	component: AppLayoutRoute,
	loader: async () => getRandomNumber(),
	ssr: false,
});
