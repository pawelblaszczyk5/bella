import type { SVGProps } from "react";

import iconsSpritesheet from "#src/assets/icons-spritesheet.svg";

export type IconName =
	| "24-badge"
	| "24-badge-help"
	| "24-badge-japanese-yen"
	| "24-badge-swiss-franc"
	| "24-badge-x"
	| "24-check"
	| "24-chevron-down"
	| "24-chevron-right"
	| "24-chevron-up"
	| "24-eye-off"
	| "24-gallery-vertical-end"
	| "24-hammer"
	| "24-home"
	| "24-lightbulb"
	| "24-message-warning"
	| "24-monitor"
	| "24-moon"
	| "24-send"
	| "24-shell"
	| "24-signal-high"
	| "24-signal-low"
	| "24-signal-medium"
	| "24-sun"
	| "24-sync"
	| "24-unplug";

export const Icon = ({ height, name, width, ...props }: Readonly<SVGProps<SVGSVGElement> & { name: IconName }>) => {
	const defaultSize = 24;

	return (
		<svg height={height ?? defaultSize} width={width ?? defaultSize} aria-hidden {...props}>
			<use href={`${iconsSpritesheet}#${name}`} />
		</svg>
	);
};
