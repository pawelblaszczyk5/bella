import type { DeepMutable } from "effect/Types";

import { Trans } from "@lingui/react/macro";
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
import { useColorMode, useLanguage } from "#src/lib/use-user-preference.js";

const styles = stylex.create({
	activeBackground: { backgroundColor: violet[5], inset: 0, position: "absolute" },
	button: {
		aspectRatio: "1/1",
		backgroundColor: { ":is([data-hovered])": violet[4], default: null },
		display: "grid",
		inlineSize: 40,
		placeItems: "center",
		position: "relative",
		scale: { ":is([data-pressed])": 0.98, default: null },
		transitionDuration: duration[2],
		transitionProperty: "background-color, scale",
		transitionTimingFunction: "ease-in-out",
	},
	buttonGroup: {
		borderColor: mauve[7],
		borderRadius: radii[4],
		borderStyle: "solid",
		borderWidth: 1,
		display: "flex",
		overflow: "hidden",
		width: "max-content",
	},
	indicator: { position: "relative" },
	root: { display: "flex", justifyContent: "space-between" },
});

const ThemeSwitch = () => {
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
			disallowEmptySelection
			{...stylex.props(styles.buttonGroup)}
		>
			<ToggleButton id="LIGHT" {...stylex.props(styles.button)}>
				<span {...stylex.props(accessibility.srOnly)}>
					<Trans>Light mode</Trans>
				</span>
				{colorMode.value === "LIGHT" && (
					<motion.div
						layoutDependency={colorMode.value}
						layoutId="themeActiveBackground"
						{...stylex.props(styles.activeBackground)}
					/>
				)}
				<Icon name="24-sun" {...stylex.props(styles.indicator)} />
			</ToggleButton>
			<ToggleButton id="SYSTEM" {...stylex.props(styles.button)}>
				<span {...stylex.props(accessibility.srOnly)}>
					<Trans>Match system</Trans>
				</span>
				{colorMode.value === "SYSTEM" && (
					<motion.div
						layoutDependency={colorMode.value}
						layoutId="themeActiveBackground"
						{...stylex.props(styles.activeBackground)}
					/>
				)}
				<Icon name="24-monitor" {...stylex.props(styles.indicator)} />
			</ToggleButton>
			<ToggleButton id="DARK" {...stylex.props(styles.button)}>
				<span {...stylex.props(accessibility.srOnly)}>
					<Trans>Dark mode</Trans>
				</span>
				{colorMode.value === "DARK" && (
					<motion.div
						layoutDependency={colorMode.value}
						layoutId="themeActiveBackground"
						{...stylex.props(styles.activeBackground)}
					/>
				)}
				<Icon name="24-moon" {...stylex.props(styles.indicator)} />
			</ToggleButton>
		</ToggleButtonGroup>
	);
};

const LanguageSwitch = () => {
	const language = useLanguage();

	return (
		<ToggleButtonGroup
			onSelectionChange={(keys) => {
				const value = [...keys.values()][0];

				assert(value, "Key must exist here");
				assert(value === "pl-PL" || value === "en-US", "Key must exist here");

				if (userPreferencesCollection.has("LANGUAGE")) {
					userPreferencesCollection.update("LANGUAGE", (draft) => {
						const mutableDraft = draft as DeepMutable<typeof draft>;

						assert(mutableDraft.type === "LANGUAGE", "Selected by type, it must be proper type");

						mutableDraft.value = value;
					});
					return;
				}

				userPreferencesCollection.insert({ type: "LANGUAGE", value });
			}}
			selectedKeys={[language]}
			selectionMode="single"
			disallowEmptySelection
			{...stylex.props(styles.buttonGroup)}
		>
			<ToggleButton id="en-US" {...stylex.props(styles.button)}>
				<span {...stylex.props(accessibility.srOnly)}>
					<Trans>English</Trans>
				</span>
				{language === "en-US" && (
					<motion.div
						layoutDependency={language}
						layoutId="languageActiveBackground"
						{...stylex.props(styles.activeBackground)}
					/>
				)}
				<span aria-hidden {...stylex.props(styles.indicator)}>
					🇺🇸
				</span>
			</ToggleButton>
			<ToggleButton id="pl-PL" {...stylex.props(styles.button)}>
				<span {...stylex.props(accessibility.srOnly)}>
					<Trans>Polish</Trans>
				</span>
				{language === "pl-PL" && (
					<motion.div
						layoutDependency={language}
						layoutId="languageActiveBackground"
						{...stylex.props(styles.activeBackground)}
					/>
				)}
				<span aria-hidden {...stylex.props(styles.indicator)}>
					🇵🇱
				</span>
			</ToggleButton>
		</ToggleButtonGroup>
	);
};

export const UserPreferences = () => (
	<div {...stylex.props(styles.root)}>
		<ThemeSwitch />
		<LanguageSwitch />
	</div>
);
