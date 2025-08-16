import stylex from "@bella/stylex";

export const violet = stylex.defineVars({
	"1": stylex.types.color("oklch(0.9921 0.0028 308.03)"),
	"2": stylex.types.color("oklch(0.983 0.009 295.04)"),
	"3": stylex.types.color("oklch(0.9628 0.0189 296.58)"),
	"4": stylex.types.color("oklch(0.934 0.03915755180728223 295.3834222530955)"),
	"5": stylex.types.color("oklch(0.9039 0.0569 294.12)"),
	"6": stylex.types.color("oklch(0.8641 0.0725 293.86)"),
	"7": stylex.types.color("oklch(0.8065 0.0902 293.47)"),
	"8": stylex.types.color("oklch(0.7291 0.119 292.43)"),
	"9": stylex.types.color("oklch(0.5418 0.1789 288.1)"),
	"10": stylex.types.color("oklch(0.5107 0.177 287.64)"),
	"11": stylex.types.color("oklch(0.508 0.1591 288.59)"),
	"12": stylex.types.color("oklch(0.3127 0.0975 286.76)"),
});

export const mauve = stylex.defineVars({
	"1": stylex.types.color("oklch(0.9918 0.0018 321.13)"),
	"2": stylex.types.color("oklch(0.9832 0.0033 311.22)"),
	"3": stylex.types.color("oklch(0.9556 0.0059 314.24)"),
	"4": stylex.types.color("oklch(0.9316 0.0078 310.01)"),
	"5": stylex.types.color("oklch(0.909 0.0101 306.61)"),
	"6": stylex.types.color("oklch(0.886 0.0116 303.95)"),
	"7": stylex.types.color("oklch(0.8536 0.0143 300.59)"),
	"8": stylex.types.color("oklch(0.7936 0.0193 293.52)"),
	"9": stylex.types.color("oklch(0.6458 0.0195 292.62)"),
	"10": stylex.types.color("oklch(0.6106 0.0185 293.07)"),
	"11": stylex.types.color("oklch(0.5048 0.016 296.08)"),
	"12": stylex.types.color("oklch(0.2446 0.0134 298.05)"),
});

export const cyan = stylex.defineVars({
	"1": stylex.types.color("oklch(0.9921 0.0037 219.25)"),
	"2": stylex.types.color("oklch(0.9803 0.009 202.89)"),
	"3": stylex.types.color("oklch(0.9581 0.0265 203.61)"),
	"4": stylex.types.color("oklch(0.9319 0.041246 204.7361)"),
	"5": stylex.types.color("oklch(0.8998 0.0538 206.49)"),
	"6": stylex.types.color("oklch(0.8593 0.066 207.67)"),
	"7": stylex.types.color("oklch(0.8045 0.0817 209.58)"),
	"8": stylex.types.color("oklch(0.727 0.1099 211.67)"),
	"9": stylex.types.color("oklch(0.6609 0.1215 221.49)"),
	"10": stylex.types.color("oklch(0.6267 0.1141 221.32)"),
	"11": stylex.types.color("oklch(0.5403 0.127 223.72)"),
	"12": stylex.types.color("oklch(0.3317 0.0528 218.57)"),
});

export const mauveDark = stylex.createTheme(mauve, {
	"1": stylex.types.color("oklch(0.1799 0.0043 307.79)"),
	"2": stylex.types.color("oklch(0.2152 0.0041 307.84)"),
	"3": stylex.types.color("oklch(0.255 0.0055 306.48)"),
	"4": stylex.types.color("oklch(0.2845 0.0076 307.75)"),
	"5": stylex.types.color("oklch(0.3138 0.009 306.95)"),
	"6": stylex.types.color("oklch(0.3501 0.0101 303.98)"),
	"7": stylex.types.color("oklch(0.4016 0.0122 304.45)"),
	"8": stylex.types.color("oklch(0.4919 0.0159 300.74)"),
	"9": stylex.types.color("oklch(0.5405 0.0169 293.97)"),
	"10": stylex.types.color("oklch(0.5862 0.0167 295.36)"),
	"11": stylex.types.color("oklch(0.7698 0.014 296.61)"),
	"12": stylex.types.color("oklch(0.9494 0.0026 286.35)"),
});

export const violetDark = stylex.createTheme(violet, {
	"1": stylex.types.color("oklch(0.1914 0.0261 290.52)"),
	"2": stylex.types.color("oklch(0.2113 0.0315 299.46)"),
	"3": stylex.types.color("oklch(0.2709 0.0664 293.92)"),
	"4": stylex.types.color("oklch(0.3121 0.0929 291.75)"),
	"5": stylex.types.color("oklch(0.3484 0.0986 291.4)"),
	"6": stylex.types.color("oklch(0.3897 0.1021 291.82)"),
	"7": stylex.types.color("oklch(0.4446 0.1109 291.57)"),
	"8": stylex.types.color("oklch(0.5163 0.1306 290.2)"),
	"9": stylex.types.color("oklch(0.5418 0.1789 288.1)"),
	"10": stylex.types.color("oklch(0.5882 0.1695 289.68)"),
	"11": stylex.types.color("oklch(0.7782 0.1365 293.62)"),
	"12": stylex.types.color("oklch(0.9116 0.0452 292.61)"),
});

export const cyanDark = stylex.createTheme(cyan, {
	"1": stylex.types.color("oklch(0.1913 0.0172 219.89)"),
	"2": stylex.types.color("oklch(0.2141 0.0182 225.41)"),
	"3": stylex.types.color("oklch(0.2722 0.044 222.47)"),
	"4": stylex.types.color("oklch(0.315 0.0629 222.14)"),
	"5": stylex.types.color("oklch(0.3617 0.0703 221.51)"),
	"6": stylex.types.color("oklch(0.4135 0.0748 221.73)"),
	"7": stylex.types.color("oklch(0.4777 0.0827 221.41)"),
	"8": stylex.types.color("oklch(0.5577 0.0984 220.71)"),
	"9": stylex.types.color("oklch(0.6609 0.1215 221.49)"),
	"10": stylex.types.color("oklch(0.698 0.1195 219.12)"),
	"11": stylex.types.color("oklch(0.7856 0.1154 213.4)"),
	"12": stylex.types.color("oklch(0.9093 0.0568 211.73)"),
});
