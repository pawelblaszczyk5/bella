import { defineConfig } from "eslint/config";

import core from "@bella/eslint-config/core";
import react from "@bella/eslint-config/react";
import node from "@bella/eslint-config/node";

export default defineConfig(
	{ languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } } },
	{ extends: [core, react, node], files: ["**/*.{ts,tsx,js,jsx}"] },
	{ files: ["vite.config.ts", "src/framework/entry.rsc.tsx"], rules: { "import-x/no-default-export": "off" } },
	{ files: ["src/**"], rules: { "@typescript-eslint/require-await": "off" } },
	{
		files: ["src/routes/**"],
		rules: { "canonical/filename-no-index": "off", "@typescript-eslint/no-use-before-define": "off" },
	},
	{ ignores: ["src/routeTree.gen.ts"] },
);
