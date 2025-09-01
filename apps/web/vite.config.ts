import { lingui } from "@lingui/vite-plugin";
import optimizeLocales from "@react-aria/optimize-locales-plugin";
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
		["@lingui/babel-plugin-lingui-macro", {}],
		["babel-plugin-react-compiler", {}],
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

export default defineConfig((environment) => {
	const isDevelopment = environment.command === "serve";

	return {
		build: { assetsInlineLimit: 0 },
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
			{ ...optimizeLocales.vite({ locales: ["en-US"] }), enforce: "pre" },
			tanstackStart({ customViteReactPlugin: true, tsr: { addExtensions: true } }),
			react({ babel: getBabelConfig(isDevelopment) }),
			lingui(),
		],
		server: { host: true, port: 5_821, strictPort: true },
	};
});
