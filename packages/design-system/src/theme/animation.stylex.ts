import stylex from "@bella/stylex";

export const duration = stylex.defineVars({
	1: stylex.types.time("50ms"),
	2: stylex.types.time("100ms"),
	3: stylex.types.time("150ms"),
	4: stylex.types.time("200ms"),
	5: stylex.types.time("300ms"),
	6: stylex.types.time("500ms"),
	7: stylex.types.time("700ms"),
	8: stylex.types.time("1000ms"),
	9: stylex.types.time("1500ms"),
} as const);
