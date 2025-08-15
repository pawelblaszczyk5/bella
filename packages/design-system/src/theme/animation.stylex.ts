import stylex from "@bella/stylex";

export const duration = stylex.defineVars({
	x1: stylex.types.time("50ms"),
	x2: stylex.types.time("100ms"),
	x3: stylex.types.time("150ms"),
	x4: stylex.types.time("200ms"),
	x5: stylex.types.time("300ms"),
	x6: stylex.types.time("500ms"),
	x7: stylex.types.time("700ms"),
	x8: stylex.types.time("1000ms"),
} as const);
