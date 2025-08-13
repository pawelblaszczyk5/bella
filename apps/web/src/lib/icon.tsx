import type { SVGProps } from "react";

import iconsSpritesheet from "#src/assets/icons-spritesheet.svg";

export type IconName = "24-hammer" | "24-home" | "24-send" | "24-shell" | "24-todo" | "24-unplug";

export const Icon = ({ height, name, width, ...props }: Readonly<SVGProps<SVGSVGElement> & { name: IconName }>) => {
	const defaultSize = 24;

	return (
		<svg height={height ?? defaultSize} width={width ?? defaultSize} aria-hidden {...props}>
			<use href={`${iconsSpritesheet}#${name}`} />
		</svg>
	);
};
