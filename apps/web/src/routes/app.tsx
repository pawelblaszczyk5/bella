import { createFileRoute, Outlet } from "@tanstack/react-router";

const AppLayoutRoute = () => (
	<div>
		<h1>AppLayout</h1>
		<Outlet />
	</div>
);

export const Route = createFileRoute("/app")({ component: AppLayoutRoute, ssr: false });
