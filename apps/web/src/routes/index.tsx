import { createFileRoute, useRouter } from "@tanstack/react-router";

import { Button } from "@bella/design-system/components/button";
import stylex from "@bella/stylex";

const styles = stylex.create({ root: { backgroundColor: "violet" } });

const Home = () => {
	const router = useRouter();
	const state = Route.useLoaderData();

	return (
		<>
			<title>Test</title>
			<button
				onClick={() => {
					void router.invalidate();
				}}
				type="button"
				{...stylex.props(styles.root)}
			>
				Add 1 to {state}?
			</button>
			<Button />
		</>
	);
};

export const Route = createFileRoute("/")({ component: Home, loader: () => Math.random() });
