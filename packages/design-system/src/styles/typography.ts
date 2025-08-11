import stylex from "@bella/stylex";

import { fontSize, letterSpacing, lineHeight } from "#src/theme/typography.stylex.js";

export const typography = stylex.create({
	x1: { fontSize: fontSize[1], letterSpacing: letterSpacing.normal, lineHeight: lineHeight[1] },
	x2: { fontSize: fontSize[2], letterSpacing: letterSpacing.normal, lineHeight: lineHeight[2] },
	x3: { fontSize: fontSize[3], letterSpacing: letterSpacing.normal, lineHeight: lineHeight[3] },
	x4: { fontSize: fontSize[4], letterSpacing: letterSpacing.normal, lineHeight: lineHeight[4] },
	x5: { fontSize: fontSize[5], letterSpacing: letterSpacing.normal, lineHeight: lineHeight[5] },
	x6: { fontSize: fontSize[6], letterSpacing: letterSpacing.normal, lineHeight: lineHeight[6] },
	x7: { fontSize: fontSize[7], letterSpacing: letterSpacing.normal, lineHeight: lineHeight[7] },
	x8: { fontSize: fontSize[8], letterSpacing: letterSpacing.tight, lineHeight: lineHeight[8] },
	x9: { fontSize: fontSize[9], letterSpacing: letterSpacing.tight, lineHeight: lineHeight[9] },
});
