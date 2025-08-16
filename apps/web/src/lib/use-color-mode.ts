import { eq, useLiveQuery } from "@tanstack/react-db";
import { useSyncExternalStore } from "react";

import { assert } from "@bella/assert";

import { userPreferencesCollection } from "#src/lib/collections.js";

const subscribe = (callback: () => void) => {
	const mediaQuery = globalThis.matchMedia("(prefers-color-scheme: dark)");

	mediaQuery.addEventListener("change", callback);

	return () => {
		mediaQuery.removeEventListener("change", callback);
	};
};

const getSnapshot = () => globalThis.matchMedia("(prefers-color-scheme: dark)").matches;

export const useColorMode = () => {
	const { data: preferences } = useLiveQuery((q) =>
		q
			.from({ userPreferencesCollection })
			.where(({ userPreferencesCollection }) => eq(userPreferencesCollection.type, "COLOR_MODE")),
	);

	assert(preferences.length <= 1, "Can't have more than one preference for given type");

	const preference = preferences.at(0);

	const isSystemPreferredDark = useSyncExternalStore(subscribe, getSnapshot);

	if (!preference || preference.value === "SYSTEM") {
		return { calculated: isSystemPreferredDark ? "DARK" as const : "LIGHT" as const, value: "SYSTEM" as const };
	}

	return { calculated: preference.value, value: preference.value };
};
