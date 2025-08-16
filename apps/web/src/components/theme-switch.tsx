import type { DeepMutable } from "effect/Types";

import { motion } from "motion/react";
import { ToggleButton, ToggleButtonGroup } from "react-aria-components";

import { assert } from "@bella/assert";
import { accessibility } from "@bella/design-system/styles/utilities";
import { duration } from "@bella/design-system/theme/animation.stylex";
import { mauve, violet } from "@bella/design-system/theme/color.stylex";
import { radii } from "@bella/design-system/theme/radii.stylex";
import stylex from "@bella/stylex";

import { userPreferencesCollection } from "#src/lib/collections.js";
import { Icon } from "#src/lib/icon.js";
import { useColorMode } from "#src/lib/use-color-mode.js";

const styles = stylex.create({
	activeBackground: { backgroundColor: violet[5], inset: 0, position: "absolute" },
	button: {
		aspectRatio: "1/1",
		backgroundColor: { ":is([data-hovered])": violet[4], default: null },
		borderRadius: radii[4],
		display: "grid",
		inlineSize: 40,
		placeItems: "center",
		position: "relative",
		scale: { ":is([data-pressed])": 0.98, default: null },
		transitionDuration: duration[2],
		transitionProperty: "background-color, scale",
		transitionTimingFunction: "ease-in-out",
	},
	icon: { position: "relative" },
	root: {
		borderColor: mauve[7],
		borderRadius: radii[4],
		borderStyle: "solid",
		borderWidth: 1,
		display: "flex",
		width: "max-content",
	},
});

export const ThemeSwitch = () => {
	const colorMode = useColorMode();

	return (
		<ToggleButtonGroup
			onSelectionChange={(keys) => {
				const value = [...keys.values()][0];

				assert(value, "Key must exist here");
				assert(value === "DARK" || value === "SYSTEM" || value === "LIGHT", "Key must exist here");

				if (userPreferencesCollection.has("COLOR_MODE")) {
					userPreferencesCollection.update("COLOR_MODE", (draft) => {
						const mutableDraft = draft as DeepMutable<typeof draft>;

						mutableDraft.value = value;
					});
					return;
				}

				userPreferencesCollection.insert({ type: "COLOR_MODE", value });
			}}
			selectedKeys={[colorMode.value]}
			selectionMode="single"
			{...stylex.props(styles.root)}
		>
			<ToggleButton id="LIGHT" {...stylex.props(styles.button)}>
				<span {...stylex.props(accessibility.srOnly)}>Light mode</span>
				{colorMode.value === "LIGHT" && (
					<motion.div
						layoutDependency={colorMode.value}
						layoutId="activeBackground"
						{...stylex.props(styles.activeBackground)}
					/>
				)}
				<Icon name="24-sun" {...stylex.props(styles.icon)} />
			</ToggleButton>
			<ToggleButton id="SYSTEM" {...stylex.props(styles.button)}>
				<span {...stylex.props(accessibility.srOnly)}>Match system</span>
				{colorMode.value === "SYSTEM" && (
					<motion.div
						layoutDependency={colorMode.value}
						layoutId="activeBackground"
						{...stylex.props(styles.activeBackground)}
					/>
				)}
				<Icon name="24-monitor" {...stylex.props(styles.icon)} />
			</ToggleButton>
			<ToggleButton id="DARK" {...stylex.props(styles.button)}>
				<span {...stylex.props(accessibility.srOnly)}>Dark mode</span>
				{colorMode.value === "DARK" && (
					<motion.div
						layoutDependency={colorMode.value}
						layoutId="activeBackground"
						{...stylex.props(styles.activeBackground)}
					/>
				)}
				<Icon name="24-moon" {...stylex.props(styles.icon)} />
			</ToggleButton>
		</ToggleButtonGroup>
	);
};
