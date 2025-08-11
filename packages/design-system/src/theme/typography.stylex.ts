import stylex from "@bella/stylex";

export const fontSize = stylex.defineVars({
	"1": "0.75rem",
	"2": "0.875rem",
	"3": "1rem",
	"4": "1.125rem",
	"5": "1.25rem",
	"6": "1.5rem",
	"7": "1.75rem",
	"8": "2.1875rem",
	"9": "3.75rem",
} as const);

/* eslint-disable perfectionist/sort-objects  -- disabling so it's sorted semantically */

export const letterSpacing = stylex.defineVars({
	tighter: "-0.05em",
	tight: "-0.025em",
	normal: "0em",
	wide: "0.025em",
	wider: "0.05em",
	widest: "0.1em",
} as const);

/* eslint-enable perfectionist/sort-objects  -- disabling so it's sorted semantically */

export const lineHeight = stylex.defineVars({
	"1": "1rem",
	"2": "1.25rem",
	"3": "1.5rem",
	"4": "1.625rem",
	"5": "1.75rem",
	"6": "1.875rem",
	"7": "2.25rem",
	"8": "2.5rem",
	"9": "3.75rem",
} as const);

/* eslint-disable perfectionist/sort-objects  -- disabling so it's sorted semantically */

export const fontWeight = stylex.defineVars({
	thin: stylex.types.number(100),
	extralight: stylex.types.number(200),
	light: stylex.types.number(300),
	normal: stylex.types.number(400),
	medium: stylex.types.number(500),
	semibold: stylex.types.number(600),
	bold: stylex.types.number(700),
	extrabold: stylex.types.number(800),
	black: stylex.types.number(900),
} as const);

/* eslint-enable perfectionist/sort-objects  -- disabling so it's sorted semantically */

// cspell:ignore Segoe, Noto, Menlo, Consolas
export const fontFamily = stylex.defineVars({
	mono: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`,
	sans: `ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`,
} as const);
