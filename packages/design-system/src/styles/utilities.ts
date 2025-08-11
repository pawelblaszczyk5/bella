import stylex from "@bella/stylex";

import { cyan } from "#src/theme/color.stylex.js";

export const accessibility = stylex.create({
	srOnly: {
		borderWidth: 0,
		clip: "rect(0, 0, 0, 0)",
		height: 1,
		margin: -1,
		overflow: "hidden",
		padding: 0,
		position: "absolute",
		whiteSpace: "nowrap",
		width: 1,
	},
});

export const ring = stylex.create({
	focus: {
		outlineColor: cyan[7],
		outlineOffset: -2,
		outlineStyle: { ":is([data-rac][data-focused])": "solid", default: "none" },
		outlineWidth: 2,
	},
	focusVisible: {
		outlineColor: cyan[7],
		outlineOffset: -2,
		outlineStyle: { ":is([data-rac][data-focus-visible])": "solid", default: "none" },
		outlineWidth: 2,
	},
});
