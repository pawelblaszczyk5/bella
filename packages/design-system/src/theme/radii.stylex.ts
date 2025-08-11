import stylex from "@bella/stylex";

export const radii = stylex.defineVars({
	"1": stylex.types.length("3px"),
	"2": stylex.types.length("4px"),
	"3": stylex.types.length("6px"),
	"4": stylex.types.length("8px"),
	"5": stylex.types.length("12px"),
	"6": stylex.types.length("16px"),
	"7": stylex.types.length("24px"),
	full: stylex.types.length("9999px"),
} as const);
