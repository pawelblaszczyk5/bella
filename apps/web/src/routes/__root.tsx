import type { ReactNode } from "react";

import { createRootRoute, Outlet, Scripts } from "@tanstack/react-router";

import stylesheetHref from "#src/styles.css?url";

const RootDocument = ({ children }: Readonly<{ children: ReactNode }>) => (
	<html lang="en-US">
		<head>
			<meta charSet="utf-8" />
			<link href="/vite.svg" rel="icon" type="image/svg+xml" />
			<link href={stylesheetHref} rel="stylesheet" />
			<meta content="width=device-width, initial-scale=1.0" name="viewport" />
		</head>
		<body>
			{children}
			<Scripts />
		</body>
	</html>
);

const RootComponent = () => (
	<RootDocument>
		<Outlet />
	</RootDocument>
);

export const Route = createRootRoute({ component: RootComponent });
