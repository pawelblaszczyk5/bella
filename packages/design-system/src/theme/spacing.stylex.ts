import stylex from "@bella/stylex";

export const spacing = stylex.defineVars({
	"1": stylex.types.length("4px"),
	"2": stylex.types.length("8px"),
	"3": stylex.types.length("12px"),
	"4": stylex.types.length("16px"),
	"5": stylex.types.length("24px"),
	"6": stylex.types.length("32px"),
	"7": stylex.types.length("40px"),
	"8": stylex.types.length("48px"),
	"9": stylex.types.length("64px"),
} as const);
