import type { ReactNode } from "react";

import { createRootRoute, Outlet, Scripts, useNavigate } from "@tanstack/react-router";
import { I18nProvider, RouterProvider } from "react-aria-components";
import { preload } from "react-dom";

import iconsSpritesheet from "#src/assets/icons-spritesheet.svg";

import stylesheetHref from "#src/styles.css?url";

const RootDocument = ({ children }: Readonly<{ children: ReactNode }>) => {
	preload(iconsSpritesheet, { as: "image" });

	return (
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
};

const RouterBridge = ({ children }: Readonly<{ children: ReactNode }>) => {
	const navigate = useNavigate();

	return <RouterProvider navigate={(href) => void navigate({ href })}>{children}</RouterProvider>;
};

const RootComponent = () => (
	<I18nProvider locale="en-US">
		<RouterBridge>
			<RootDocument>
				<Outlet />
			</RootDocument>
		</RouterBridge>
	</I18nProvider>
);

export const Route = createRootRoute({ component: RootComponent });
