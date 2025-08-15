import { defineConfig } from "eslint/config";

import core from "@bella/eslint-config/core";

export default defineConfig(
	{ languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } } },
	{ extends: [core], files: ["**/*.{ts,tsx,js,jsx}"] },
);
