import type { ViteReactPluginApi } from "@vitejs/plugin-react";
import type { Plugin } from "vite";

// @ts-expect-error - untyped module
import stylexPlugin from "@stylexjs/postcss-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const typedStylexPlugin = stylexPlugin as (options: {
	babelConfig?: unknown;
	cwd?: string;
	exclude?: Array<string>;
	include?: Array<string>;
	useCSSLayers?: boolean;
}) => never;

const getBabelConfig = (isDevelopment: boolean) => ({
	plugins: [
		["@babel/plugin-syntax-jsx", {}],
		[
			"@stylexjs/babel-plugin",
			{
				dev: isDevelopment,
				enableMediaQueryOrder: true,
				importSources: ["@bella/stylex"],
				treeshakeCompensation: true,
				unstable_moduleResolution: { type: "commonJS" },
			},
		],
	],
	presets: ["@babel/preset-typescript"],
});

const disableReactCompilerInSsrContext = () =>
	({
		api: {
			reactBabel: (babelConfig, context) => {
				if (!context.ssr) {
					return;
				}

				babelConfig.plugins = babelConfig.plugins.filter((plugin) => {
					if (
						plugin === "babel-plugin-react-compiler"
						|| (Array.isArray(plugin) && plugin[0] === "babel-plugin-react-compiler")
					) {
						return false;
					}

					return true;
				});
			},
		} satisfies ViteReactPluginApi,
		name: "disable-react-compiler-in-ssr-context",
	}) satisfies Plugin;

export default defineConfig((environment) => {
	const isDevelopment = environment.command === "serve";

	return {
		css: {
			postcss: {
				plugins: [
					typedStylexPlugin({
						babelConfig: { ...getBabelConfig(isDevelopment), babelrc: false },
						include: ["./src/**/*.{js,jsx,ts,tsx}", "../../packages/*/dist/src/**/*.{js,jsx}"],
						useCSSLayers: true,
					}),
				],
			},
		},
		plugins: [
			tanstackStart({ customViteReactPlugin: true, tsr: { addExtensions: true } }),
			react({ babel: getBabelConfig(isDevelopment) }),
			disableReactCompilerInSsrContext(),
		],
		server: { host: true, port: 5_821, strictPort: true },
	};
});
