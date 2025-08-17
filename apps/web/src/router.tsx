import { createRouter as createTanStackRouter, parseSearchWith, stringifySearchWith } from "@tanstack/react-router";
import { parse, stringify } from "jsurl2";

import { routeTree } from "#src/routeTree.gen.js";

export const createRouter = () => {
	const router = createTanStackRouter({
		parseSearch: parseSearchWith(parse),
		routeTree,
		scrollRestoration: true,
		stringifySearch: stringifySearchWith(stringify),
	});

	return router;
};

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof createRouter>;
	}
}
