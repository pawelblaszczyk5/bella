import { defineConfig } from "eslint/config";

import core from "@bella/eslint-config/core";
import node from "@bella/eslint-config/node";

export default defineConfig(
	{ languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } } },
	{ extends: [core, node], files: ["**/*.{ts,tsx,js,jsx}"] },
	{ files: ["src/mod.ts"], rules: { "import-x/no-default-export": "off" } },
);
