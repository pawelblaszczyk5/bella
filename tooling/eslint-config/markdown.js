import tseslint from "typescript-eslint";
import markdown from "@eslint/markdown";

export default tseslint.config(markdown.configs.recommended, {
	language: "markdown/gfm",
	languageOptions: { frontmatter: "yaml" },
	name: "markdown overrides",
	rules: { "markdown/no-bare-urls": "error", "markdown/no-duplicate-headings": "error", "markdown/no-html": "error" },
});
