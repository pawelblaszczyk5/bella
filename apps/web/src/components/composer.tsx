import { Trans } from "@lingui/react/macro";
import { useRef, useState } from "react";
import { Button, Form, Label, TextArea, TextField } from "react-aria-components";

import { assert } from "@bella/assert";
import { accessibility, ring } from "@bella/design-system/styles/utilities";
import { duration } from "@bella/design-system/theme/animation.stylex";
import { mauve, violet } from "@bella/design-system/theme/color.stylex";
import { radii } from "@bella/design-system/theme/radii.stylex";
import { spacing } from "@bella/design-system/theme/spacing.stylex";
import stylex from "@bella/stylex";

import type { TextMessagePartShape } from "#src/lib/collections.js";

import { Icon } from "#src/lib/icon.js";

const styles = stylex.create({
	action: {
		aspectRatio: "1/1",
		backgroundColor: { ":is([data-hovered])": violet[4], default: violet[3] },
		borderColor: { ":is([data-hovered])": mauve[8], default: mauve[7] },
		borderRadius: radii[4],
		borderStyle: "solid",
		borderWidth: 1,
		display: "grid",
		inlineSize: 48,
		insetBlockStart: "50%",
		insetInlineEnd: spacing[4],
		placeItems: "center",
		position: "absolute",
		scale: { ":is([data-pressed])": 0.98, default: null },
		transform: "translateY(-50%)",
		transitionDuration: duration[2],
		transitionProperty: "background-color, border-color, scale",
		transitionTimingFunction: "ease-in-out",
	},
	form: { blockSize: "fit-content", inlineSize: "fit-content", position: "relative" },
	textarea: {
		backgroundColor: mauve[1],
		borderColor: { ":is([data-hovered])": mauve[8], default: mauve[7] },
		borderRadius: radii[5],
		borderStyle: "solid",
		borderWidth: 1,
		inlineSize: 864,
		maxInlineSize: "100%",
		paddingBlock: spacing[4],
		paddingInlineEnd: `calc(${spacing[5]} + ${spacing[4]} + 48px)`,
		paddingInlineStart: spacing[5],
		resize: "none",
		transitionDuration: duration[2],
		transitionProperty: "border-color",
		transitionTimingFunction: "ease-in-out",
	},
});

export const Composer = ({
	isGenerationInProgress,
	onStopGeneration,
	onSubmit,
}: Readonly<{
	isGenerationInProgress: boolean;
	onStopGeneration: () => void;
	onSubmit: (userMessageText: TextMessagePartShape["data"]["text"]) => void;
}>) => {
	const formRef = useRef<HTMLFormElement>(null);

	const [messageContent, setMessageContent] = useState("");

	return (
		<Form
			onSubmit={(event) => {
				event.preventDefault();

				if (isGenerationInProgress) {
					return;
				}

				onSubmit(messageContent);
				setMessageContent("");
			}}
			ref={formRef}
			{...stylex.props(styles.form)}
		>
			<TextField
				onChange={(value) => {
					setMessageContent(value);
				}}
				value={messageContent}
				isRequired
			>
				<Label {...stylex.props(accessibility.srOnly)}>
					<Trans>Message content</Trans>
				</Label>
				<TextArea
					onKeyDown={(event) => {
						if (event.key !== "Enter" || event.shiftKey) {
							return;
						}

						assert(formRef.current, "Form must be rendered here");

						event.preventDefault();
						formRef.current.requestSubmit();
					}}
					rows={4}
					{...stylex.props(styles.textarea, ring.focus)}
				/>
			</TextField>
			{isGenerationInProgress && (
				<Button
					onPress={() => {
						onStopGeneration();
					}}
					type="button"
					{...stylex.props(styles.action, ring.focusVisible)}
				>
					<span {...stylex.props(accessibility.srOnly)}>
						<Trans>Stop generation</Trans>
					</span>
					<Icon name="24-unplug" />
				</Button>
			)}
			{!isGenerationInProgress && (
				<Button type="submit" {...stylex.props(styles.action, ring.focusVisible)}>
					<span {...stylex.props(accessibility.srOnly)}>
						<Trans>Send message</Trans>
					</span>
					<Icon name="24-send" />
				</Button>
			)}
		</Form>
	);
};
