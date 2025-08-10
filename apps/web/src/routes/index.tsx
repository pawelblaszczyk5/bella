import { createFileRoute } from "@tanstack/react-router";

const Home = () => (
	<>
		<title>Home | Bella</title>
		<h1>Example home screen that's SSR!</h1>
	</>
);

export const Route = createFileRoute("/")({ component: Home });
