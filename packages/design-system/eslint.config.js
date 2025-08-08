import { defineConfig } from "eslint/config";

import core from "@bella/eslint-config/core";
import react from "@bella/eslint-config/react";

export default defineConfig(
	{ languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } } },
	{ extends: [core, react], files: ["**/*.{ts,tsx,js,jsx}"] },
);
